"use client"; // This is CRITICAL for React Hooks to work in the App Router

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion, Variants, HTMLMotionProps, animate, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import html2canvas from "html2canvas";
import dictionary from "../lib/dictionary";
import shuffle from "../lib/shuffle";
import { saveGameResult, getLeaderboard, getUserBestScore, getUserProfile, clearPlayerData, getStoredPlayerName, setStoredPlayerName, restoreUserDataFromDB, getAllUserScores, getStoredTwitterAvatar, setStoredTwitterAvatar, clearStoredTwitterAvatar } from "../lib/scores";
import type { LeaderboardEntry } from "../lib/types";
import OnboardingOverlay from "../components/OnboardingOverlay";
import CountUp from "../components/CountUp";
import { Confetti, type ConfettiRef } from "../components/Confetti";
import Footer from "../components/Footer";
import WelcomeToProofOfSpeed from "../components/WelcomeToProofOfSpeed";
import { supabase } from "../lib/supabase";
import { GAME_MODES, SUB_BLOCK_SPEED_MS, type GameMode } from "../lib/constants";

// Rank descriptions
const RANK_DESCRIPTIONS: Record<string, string> = {
  "Typing Rookie 🥉": "You just spawned in. Still learning WASD… and WPM.",
  "Latency Warrior 🥈": "Better timing, fewer missed blocks. Ping still questionable.",
  "Speed Operator 🥇": "Clean combos, crisp keystrokes. Starting to look pro.",
  "Chain Slayer ⚔️": "Outpaces block time like it's a low-level mob. Mechanical skill unlocked.",
  "Turbo Typelord 💎": "Butterfly-tapping the keyboard. Zero lag. Zero mercy.",
  "Grandmaster of Speed 👑": "S-tier reflexes. Full APM demon. The final boss of block speed.",
};

// Helper function to get rank name (returns as-is since we now use emoji format directly)
function getRankName(fullRank: string): string {
  if (!fullRank) return "";
  return fullRank;
}

// Helper function to format rank name for dropdown (emoji before text)
function getRankNameForDropdown(fullRank: string): string {
  const rankName = getRankName(fullRank);
  if (!rankName) return "";
  
  // Extract emoji and text
  const emojiMatch = rankName.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
  if (emojiMatch) {
    const emoji = emojiMatch[0];
    const text = rankName.replace(emoji, '').trim();
    return `${emoji} ${text}`;
  }
  return rankName;
}

const DEFAULT_RESULTS = {
  score: "0",
  lps: "0",
  accuracy: "0%",
  rank: "",
  speedComparison: "",
  time: "",
  msPerLetter: "0",
  comparison: "0",
};

const FALLBACK_SENTENCES = [
  "ten word sentence this is exactly 35",
  "another fast one for you to type quick",
  "etherlink instant confirmations are so fast",
  "proof of speed with this one simple test",
  "pro gamer speed could win this one game",
];

const generateSentence = (wordCount: number) => {
  try {
    const words = shuffle(dictionary);
    const sentenceWords = words.slice(0, wordCount);
    return sentenceWords.join(" ");
  } catch {
    return FALLBACK_SENTENCES[Math.floor(Math.random() * FALLBACK_SENTENCES.length)];
  }
};

// Static blockchain configuration - moved outside component to avoid recreation
const BLOCKCHAIN_THRESHOLDS = [
  { ms: 600000, position: 0 },   // Bitcoin
  { ms: 12000, position: 16.67 },    // Ethereum Mainnet
  { ms: 2000, position: 33.33 },     // Polygon
  { ms: 1000, position: 50 },     // ETH L2s
  { ms: 400, position: 66.67 },       // Solana
  { ms: 200, position: 83.33 },     // Base
  { ms: 20, position: 100 },     // Instant confirmations
];

const BG_COLOR = '#323437';

const LOGO_COLORS: Record<string, string[]> = {
  'btc': ['#F7931A', '#FFFFFF'], // Bitcoin: orange bg, white symbol
  'eth': ['#627EEA', '#FFFFFF'], // Ethereum: purple bg, white symbol
  'matic': ['#6F41D8', '#FFFFFF'], // Polygon: purple bg, white symbol
  'sol': ['#66F9A1', '#FFFFFF'], // Solana: green bg, white symbol
  'base': ['#0052FF', '#FFFFFF'], // Base: blue bg, white symbol
  'xtz': ['#A6E000', '#FFFFFF'], // Tezos: lime green bg, white symbol
};

// Static helper functions - moved outside component
const getLuminance = (hex: string) => {
  const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!rgb) return 0;
  const r = parseInt(rgb[1], 16) / 255;
  const g = parseInt(rgb[2], 16) / 255;
  const b = parseInt(rgb[3], 16) / 255;
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrast = (color1: string, color2: string) => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

const getBestContrastColor = (iconKey: string | null, defaultColor: string) => {
  if (!iconKey || !LOGO_COLORS[iconKey]) return defaultColor;
  const colors = LOGO_COLORS[iconKey];
  const contrasts = colors.map(color => getContrast(color, BG_COLOR));
  const maxContrastIndex = contrasts.indexOf(Math.max(...contrasts));
  return colors[maxContrastIndex];
};

const lightenColor = (hex: string, percent: number) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = ((num >> 16) & 0xff);
  const g = ((num >> 8) & 0xff);
  const b = (num & 0xff);
  const newR = Math.min(255, Math.round(r + (255 - r) * percent));
  const newG = Math.min(255, Math.round(g + (255 - g) * percent));
  const newB = Math.min(255, Math.round(b + (255 - b) * percent));
  return `#${[newR, newG, newB].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};

// Static chains configuration
const CHAINS = [
  { name: 'Bitcoin', ms: 600000, color: getBestContrastColor('btc', '#ff8c00'), icon: 'btc', displayTime: '10mins', gradientColor: '#F7931A' },
  { name: 'Ethereum', ms: 12000, color: getBestContrastColor('eth', '#ffd700'), icon: 'eth', displayTime: null, gradientColor: '#627EEA' },
  { name: 'Polygon', ms: 2000, color: getBestContrastColor('matic', '#7B3FE4'), icon: 'matic', displayTime: null, gradientColor: '#6F41D8' },
  { name: 'ETH L2s', ms: 1000, color: getBestContrastColor('eth', '#87ceeb'), icon: 'eth', displayTime: null, gradientColor: '#627EEA' },
  { name: 'Solana', ms: 400, color: getBestContrastColor('sol', '#DC1FFF'), icon: 'sol', displayTime: null, gradientColor: '#66F9A1' },
  { name: 'Base', ms: 200, color: getBestContrastColor('base', '#0052FF'), icon: 'base', displayTime: null, gradientColor: '#0052FF' },
  { name: 'Etherlink', ms: 50, color: getBestContrastColor('xtz', '#38FF9C'), icon: 'etherlink', displayTime: null, gradientColor: '#A6E000' },
];

const CHAIN_POSITIONS = CHAINS.map((chain, index) => ({
  ...chain,
  position: (index / (CHAINS.length - 1)) * 100
}));

const CHART_START_OFFSET = 2.5;
const CHART_END_OFFSET = 5;
const CHART_WIDTH = 100 - CHART_START_OFFSET - CHART_END_OFFSET;

const getGradientPosition = (blockchainPosition: number) => {
  return CHART_START_OFFSET + (blockchainPosition / 100) * CHART_WIDTH;
};

const GRADIENT_STOPS = CHAINS.map((chain, index) => {
  const blockchainPosition = (index / (CHAINS.length - 1)) * 100;
  const actualPosition = getGradientPosition(blockchainPosition);
  return `${chain.gradientColor} ${actualPosition}%`;
}).join(', ');

const GRADIENT_STRING = `${CHAINS[0].gradientColor} 0%, ${GRADIENT_STOPS}, ${CHAINS[CHAINS.length - 1].gradientColor} 100%`;

const BRIGHTER_GRADIENT_STOPS = CHAINS.map((chain, index) => {
  const blockchainPosition = (index / (CHAINS.length - 1)) * 100;
  const actualPosition = getGradientPosition(blockchainPosition);
  const lighterColor = lightenColor(chain.gradientColor, 0.2);
  return `${lighterColor} ${actualPosition}%`;
}).join(', ');

const BRIGHTER_GRADIENT_STRING = `${lightenColor(CHAINS[0].gradientColor, 0.2)} 0%, ${BRIGHTER_GRADIENT_STOPS}, ${lightenColor(CHAINS[CHAINS.length - 1].gradientColor, 0.2)} 100%`;

// Function to calculate position based on ms - only this depends on user input
const getSpeedPosition = (ms: number): number => {
  const clampedMs = Math.max(50, Math.min(600000, ms));
  
  for (let i = 0; i < BLOCKCHAIN_THRESHOLDS.length - 1; i++) {
    const lower = BLOCKCHAIN_THRESHOLDS[i + 1];
    const upper = BLOCKCHAIN_THRESHOLDS[i];
    
    if (clampedMs >= lower.ms && clampedMs <= upper.ms) {
      const logLower = Math.log10(lower.ms);
      const logUpper = Math.log10(upper.ms);
      const logValue = Math.log10(clampedMs);
      const segmentNormalized = (logValue - logLower) / (logUpper - logLower);
      const positionRange = upper.position - lower.position;
      return lower.position + (segmentNormalized * positionRange);
    }
  }
  
  if (clampedMs <= 20) return 100;
  if (clampedMs >= 600000) return 0;
  return 0;
};

// Define types for React state and refs
type Results = {
  score: string;
  lps: string;
  accuracy: string;
  rank: string;
  speedComparison: string; // For "You were as fast as" display (based on pure speed)
  time: string;
  msPerLetter: string;
  comparison: string;
};

type GameState = {
  letterElements: HTMLSpanElement[];
  currentIndex: number;
  testActive: boolean;
  startTime: number;
  errorCount: number;
  totalLetters: number;
  testFinished: boolean;
  errorPositions: Set<number>; // Track positions where errors occurred
  correctedErrors: Set<number>; // Track positions where errors were corrected
};

// Wavy Text Component
interface WavyTextProps extends HTMLMotionProps<"span"> {
  text: string;
  delay?: number;
  replay: boolean;
  duration?: number;
}

const WavyTextComponent = ({
  text,
  delay = 0,
  duration = 0.05,
  replay,
  ...props
}: WavyTextProps) => {
  const letters = Array.from(text);

  const container: Variants = {
    hidden: {
      opacity: 0
    },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: duration, delayChildren: i * delay }
    })
  };

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200
      }
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200
      }
    }
  };

  return (
    <motion.span
      style={{ display: "inline-flex", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate={replay ? "visible" : "hidden"}
      {...props}
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child}>
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  );
};

// Pacer Timer Component - counts down from totalLetters * 200ms to 0
interface PacerTimerProps {
  totalLetters: number;
  testActive: boolean;
  speedMs: number;
}

const PacerTimer = ({ totalLetters, testActive, speedMs }: PacerTimerProps) => {
  // Total time in seconds
  const totalTimeMs = totalLetters * speedMs;
  const totalTimeSec = totalTimeMs / 1000;
  
  // Motion value for countdown
  const count = useMotionValue(totalTimeSec);
  const displayValue = useTransform(count, (value) => Math.max(0, value).toFixed(1));
  
  useEffect(() => {
    if (!testActive) {
      // Reset to initial value when not active
      count.set(totalTimeSec);
      return;
    }
    
    // Start countdown animation from totalTimeSec to 0
    const controls = animate(count, 0, {
      duration: totalTimeSec,
      ease: "linear",
    });
    
    return () => controls.stop();
  }, [testActive, totalTimeSec, count]);
  
  if (!testActive) {
    return null;
  }
  
  return (
    <div className="absolute bottom-[-50px] left-1/2 transform -translate-x-1/2 z-0 text-center w-full">
      <motion.h1 
        className="text-dark-highlight font-mono mb-0"
        style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2.5rem', fontWeight: 'bold' }}
      >
        <motion.span>{displayValue}</motion.span>
        <span className="ml-2" style={{ fontSize: '1.25rem' }}>s</span>
      </motion.h1>
    </div>
  );
};

// --- COMPONENT ---
export default function Home() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [results, setResults] = useState<Results>(DEFAULT_RESULTS);
  const [gameMode, setGameMode] = useState<GameMode>(15);
  const [textFocused, setTextFocused] = useState(false);

  // NEW: State for overlay and player name
  // Initialize to safe defaults to avoid hydration mismatches
  // Will be updated in useEffect after client-side hydration
  const [playerName, setPlayerName] = useState("you");
  
  // Start with true on both server and client to avoid hydration mismatch
  // Will be updated in useEffect after mount
  const [showOverlay, setShowOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const hasLoadedInitialRankings = useRef(false);
  const [userProfile, setUserProfile] = useState<LeaderboardEntry | null>(null);
  const [allUserScores, setAllUserScores] = useState<LeaderboardEntry[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  // Twitter auth state - just track if user has Twitter avatar (derived from localStorage)
  const [isTwitterAuth, setIsTwitterAuth] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<number | null>(null);
  const [animatedNumber, setAnimatedNumber] = useState<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [wavyReplay, setWavyReplay] = useState(false);
  const [totalLetters, setTotalLetters] = useState(0);
  const [pacerResetKey, setPacerResetKey] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const appBodyRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const resultsScreenRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<GameState>({
    letterElements: [],
    currentIndex: 0,
    testActive: false,
    startTime: 0,
    errorCount: 0,
    totalLetters: 0,
    testFinished: false,
    errorPositions: new Set(),
    correctedErrors: new Set(),
  });

  const tabPressedRef = useRef(false);
  const tabTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const moveCursor = useCallback((index: number) => {
    const cursor = cursorRef.current;
    const container = wordsRef.current;
    const letters = stateRef.current.letterElements;
    if (!cursor || !container || letters.length === 0) return;

    const target =
      index < letters.length ? letters[index] : letters[letters.length - 1];
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const left =
      index < letters.length
        ? rect.left - containerRect.left
        : rect.right - containerRect.left;

    cursor.style.left = `${left}px`;
    cursor.style.top = `${rect.top - containerRect.top}px`;
  }, []);

  const populateWords = useCallback(() => {
    const container = wordsRef.current;
    if (!container) return;

    container.innerHTML = "";
    const sentence = generateSentence(gameMode);
    const words = sentence.split(" ");
    const letters: HTMLSpanElement[] = [];

    words.forEach((word, wordIndex) => {
      const wordDiv = document.createElement("div");
      wordDiv.className = "mx-2 flex whitespace-pre"; // Tailwind classes

      word.split("").forEach((char) => {
        const letterSpan = document.createElement("span");
        letterSpan.style.fontSize = "32px";
        letterSpan.style.lineHeight = "1.5em";
        letterSpan.style.fontFamily = "monospace";
        // Don't set inline color - let it inherit from parent, then Tailwind classes can override
        letterSpan.textContent = char;
        wordDiv.appendChild(letterSpan);
        letters.push(letterSpan);
      });

      if (wordIndex < words.length - 1) {
        const spaceSpan = document.createElement("span");
        spaceSpan.style.fontSize = "32px";
        spaceSpan.style.lineHeight = "1.5em";
        spaceSpan.style.fontFamily = "monospace";
        // Don't set inline color - let it inherit from parent, then Tailwind classes can override
        spaceSpan.textContent = " ";
        wordDiv.appendChild(spaceSpan);
        letters.push(spaceSpan);
      }

      container.appendChild(wordDiv);
    });

    stateRef.current.letterElements = letters;
    stateRef.current.totalLetters = letters.length;
    setTotalLetters(letters.length);
    stateRef.current.currentIndex = 0;
  }, [gameMode]);

  const initGame = useCallback(() => {
    stateRef.current.testActive = false;
    stateRef.current.testFinished = false;
    stateRef.current.startTime = 0;
    stateRef.current.errorCount = 0;
    stateRef.current.currentIndex = 0;
    stateRef.current.errorPositions.clear();
    stateRef.current.correctedErrors.clear();
    setResults({ ...DEFAULT_RESULTS });
    setTestStarted(false);
    setTestFinished(false);
    setTextFocused(false);
    setPacerResetKey((prev) => prev + 1); // Force pacer squares to reset
    populateWords();

    requestAnimationFrame(() => moveCursor(0));
  }, [moveCursor, populateWords, gameMode]);

  const startTest = useCallback(() => {
    if (stateRef.current.testActive) return;
    stateRef.current.testActive = true;
    stateRef.current.startTime = performance.now();
    setTestStarted(true);
    setTestFinished(false);
  }, [gameMode]); // Note: This function depends on gameMode

  const endGame = useCallback(() => {
    if (!stateRef.current.testActive) return;
    stateRef.current.testActive = false;
    stateRef.current.testFinished = true;
    setTestFinished(true);

    const endTime = performance.now();
    const lettersCount = stateRef.current.totalLetters || 1;
    const durationMs = endTime - stateRef.current.startTime;
    const durationSec = Math.max(durationMs / 1000, 0.001);
    const lettersPerSecond = lettersCount / durationSec;
    
    // Calculate corrected vs uncorrected errors
    const totalErrors = stateRef.current.errorPositions.size;
    const correctedErrors = stateRef.current.correctedErrors.size;
    const uncorrectedErrors = totalErrors - correctedErrors;
    
    // Accuracy based on uncorrected errors only (errors that remain at the end)
    const accuracy =
      ((lettersCount - uncorrectedErrors) / lettersCount) * 100;
    
    // Correction bonus: reward players who correct their mistakes
    // Bonus scales with correction rate, but also considers total error rate
    // Players with fewer errors who correct them get more bonus
    // Formula: correctionRate * (1 - errorRate) * 0.15
    // This gives up to 15% bonus, but only if you have low error rate AND correct them
    const correctionRate = totalErrors > 0 ? correctedErrors / totalErrors : 0;
    const errorRate = lettersCount > 0 ? totalErrors / lettersCount : 0;
    const correctionBonus = correctionRate * (1 - Math.min(errorRate * 10, 0.5)) * 0.15; // Up to 15% bonus, scales down with high error rates
    
    // Score factors in accuracy more heavily by squaring the accuracy percentage
    // This ensures accuracy is weighted more than just a simple multiplication
    const accuracyDecimal = accuracy / 100;
    let baseScore = lettersPerSecond * (accuracyDecimal * accuracyDecimal);
    
    // Apply correction bonus
    const scoreWithCorrection = baseScore * (1 + correctionBonus);
    
    // Game mode normalization: 30-word mode is harder, so apply a multiplier
    // Calibrated based on best player data:
    // - 15-word: 14.07 LPS, 100% acc → Base score 14.07
    // - 30-word: 11.79 LPS, 98.8% acc → Base score 11.50
    // To normalize: 11.50 × multiplier should ≈ 14.07
    // Multiplier = 14.07 / 11.50 = 1.223 (22.3% bonus)
    // Using 1.22x for cleaner number
    const gameModeMultiplier = gameMode === 30 ? 1.22 : 1.0;
    const normalizedScore = scoreWithCorrection * gameModeMultiplier;
    
    // Final score is the normalized score (no scaling factor)
    // Best player data:
    // - 15-word: 14.07 (100% acc) → reaches Grandmaster (≥14)
    // - 30-word: 11.50 × 1.22 = 14.03 (98.8% acc, normalized) → reaches Grandmaster (≥14)
    // Score directly reflects weighted LPS, making it more intuitive
    const finalScore = normalizedScore;
    const msPerLetter = durationMs / lettersCount;
    const comparisonMs = msPerLetter - SUB_BLOCK_SPEED_MS;

    // "You were as fast as" is based purely on speed (msPerLetter) - not accuracy-adjusted
    // Categories: Instant confirmations (50ms), Base (200ms), Solana (400ms), ETH L2s (1000ms), Polygon (2000ms), Ethereum Mainnet (12000ms), Bitcoin (600000ms)
    let speedComparison = "Bitcoin";
    if (msPerLetter <= 50) speedComparison = "Instant confirmations";
    else if (msPerLetter <= 200) speedComparison = "Base";
    else if (msPerLetter <= 400) speedComparison = "Solana";
    else if (msPerLetter <= 1000) speedComparison = "ETH L2s";
    else if (msPerLetter <= 2000) speedComparison = "Polygon";
    else if (msPerLetter <= 12000) speedComparison = "Ethereum Mainnet";
    else speedComparison = "Bitcoin";
    
    // Rank is based on score (6 levels) with minimum accuracy threshold
    // Calibrated using best player performance as benchmark:
    // - Best player: 14.07 score (15-word, 100% acc) and 14.03 score (30-word, 98.8% acc after normalization)
    // - Grandmaster threshold set at 14.0 to make best player achieve it
    // - Other thresholds set proportionally below
    let rank = "Typing Rookie 🥉";
    
    // Minimum accuracy thresholds for ranks (prevents spam-typing)
    // Based on best player achieving 98.8% in 30-word mode
    const MIN_ACCURACY_GRANDMASTER = 98;
    const MIN_ACCURACY_TURBO = 95;
    const MIN_ACCURACY_CHAIN = 90;
    const MIN_ACCURACY_SPEED = 85;
    const MIN_ACCURACY_LATENCY = 80;
    
    // Rank thresholds matching HowToPlayContent.tsx display
    // Grandmaster: ≥14, Turbo Typelord: ≥11, Chain Slayer: ≥7, Speed Operator: ≥4, Latency Warrior: ≥1, Typing Rookie: <1
    if (finalScore >= 14 && accuracy >= MIN_ACCURACY_GRANDMASTER) {
      rank = "Grandmaster of Speed 👑";
    } else if (finalScore >= 11 && accuracy >= MIN_ACCURACY_TURBO) {
      rank = "Turbo Typelord 💎";
    } else if (finalScore >= 7 && accuracy >= MIN_ACCURACY_CHAIN) {
      rank = "Chain Slayer ⚔️";
    } else if (finalScore >= 4 && accuracy >= MIN_ACCURACY_SPEED) {
      rank = "Speed Operator 🥇";
    } else if (finalScore >= 1 && accuracy >= MIN_ACCURACY_LATENCY) {
      rank = "Latency Warrior 🥈";
    } else {
      rank = "Typing Rookie 🥉";
    }

    const resultsData = {
      score: finalScore.toFixed(2),
      lps: lettersPerSecond.toFixed(2),
      accuracy: `${Math.max(accuracy, 0).toFixed(1)}%`,
      rank,
      speedComparison, // For "You were as fast as" display
      time: `${durationSec.toFixed(2)}s`,
      msPerLetter: msPerLetter.toFixed(0),
      comparison: `${comparisonMs > 0 ? "+" : ""}${comparisonMs.toFixed(0)}`,
    };

    setResults(resultsData);

    // Save to Supabase only if it's a new best score (fire and forget - don't block UI)
    // Rank is already "Instant confirmations" if applicable
    const rankForDB = rank;
    saveGameResult({
      player_name: playerName,
      score: parseFloat(finalScore.toFixed(2)),
      lps: parseFloat(lettersPerSecond.toFixed(2)),
      accuracy: parseFloat(Math.max(accuracy, 0).toFixed(1)),
      rank: rankForDB,
      time: parseFloat(durationSec.toFixed(2)),
      ms_per_letter: parseFloat(msPerLetter.toFixed(0)),
      game_mode: gameMode,
      isTwitterUser: isTwitterAuth,
    })
      .then((result) => {
      // Score saved (or not if not a new best)
      // Fetch updated rankings after saving
      fetchRankings();
      })
      .catch((error) => {
      // Silently fail - don't interrupt user experience
    });
  }, [playerName, gameMode]);

  // Fetch rankings for the current game mode
  const fetchRankings = useCallback(async () => {
    setRankingsLoading(true);
    try {
    // Fetch more entries to find current user's position
    const { data, error } = await getLeaderboard(gameMode, 100); // Get top 100 to find user position

      if (error) {
        setRankings([]);
      } else if (data) {
      setRankings(data);
      } else {
        setRankings([]);
    }
    } catch (err) {
      setRankings([]);
    } finally {
    setRankingsLoading(false);
    }
  }, [gameMode, playerName]);

  // Load leaderboard on initial mount (only once)
  useEffect(() => {
    if (!hasLoadedInitialRankings.current) {
      hasLoadedInitialRankings.current = true;
      fetchRankings();
    }
  }, [fetchRankings]);

  // Fetch rankings when game mode changes or when test finishes
  useEffect(() => {
    if (testFinished && hasLoadedInitialRankings.current) {
      fetchRankings();
    }
  }, [testFinished, fetchRankings]);

  // Reset game when game mode changes
  useEffect(() => {
    initGame();
  }, [gameMode, initGame]);

  // Prevent body scroll when How to Play overlay is open
  useEffect(() => {
    if (showHowToPlay) {
      const originalOverflow = document.body.style.overflow;
      const originalOverflowY = document.documentElement.style.overflowY;
      
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflowY = "hidden";
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflowY = originalOverflowY;
      };
    }
  }, [showHowToPlay]);

  // Trigger confetti if user has Speed Operator rank or higher
  useEffect(() => {
    if (testFinished && confettiRef.current) {
      const rankName = getRankName(results.rank);
      // Trigger for Speed Operator, Chain Slayer, Turbo Typelord, or Grandmaster of Speed
      if (
        rankName === "Speed Operator 🥇" ||
        rankName === "Chain Slayer ⚔️" ||
        rankName === "Turbo Typelord 💎" ||
        rankName === "Grandmaster of Speed 👑"
      ) {
        setTimeout(() => {
          confettiRef.current?.fire();
        }, 500);
      }
    }
  }, [testFinished, results.rank]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
      // Don't close if clicking on the settings button itself
      const settingsButton = target.closest('button[title="Settings"]');
      if (settingsButton) {
        return; // Let the button's onClick handle the toggle
      }
      
      // Close if clicking outside the menu
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
          setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Adjust dropdown position to prevent overflow and ensure it's under the button
  useEffect(() => {
    if (showUserMenu && userMenuRef.current) {
      // Use double requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!userMenuRef.current) return;
          
          const dropdown = userMenuRef.current;
          const viewportWidth = window.innerWidth;
          const padding = 16; // Padding from viewport edge
          const dropdownWidth = 256; // w-64 = 256px
          
          // Get the button element (settings button) - it's the sibling before the dropdown
          const parent = dropdown.parentElement;
          const settingsButton = parent?.querySelector(
            'button[title="Settings"]'
          ) as HTMLElement;
          
          if (settingsButton && parent) {
            const buttonRect = settingsButton.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            
            // Calculate button's right edge position relative to parent
            const buttonRightRelative = buttonRect.right - parentRect.left;
            const parentRight = parentRect.width;
            
            // Calculate offset needed to align dropdown's right edge with button's right edge
            // Since dropdown uses right: 0 (which is parent's right edge), we need to offset
            const offset = parentRight - buttonRightRelative;
            
            // Calculate where dropdown's right edge would be on screen
            const dropdownRightAbsolute = buttonRect.right;
            const dropdownLeftAbsolute = dropdownRightAbsolute - dropdownWidth;
            
            // Check for overflow and adjust
            if (dropdownRightAbsolute > viewportWidth - padding) {
              // Overflow on right - shift left
              const overflow =
                dropdownRightAbsolute - (viewportWidth - padding);
              dropdown.style.right = `${offset + overflow}px`;
            } else if (dropdownLeftAbsolute < padding) {
              // Overflow on left - shift right
              const leftOverflow = padding - dropdownLeftAbsolute;
              dropdown.style.right = `${offset - leftOverflow}px`;
            } else {
              // No overflow - align with button
              dropdown.style.right = `${offset}px`;
            }
          } else {
            // Fallback: just prevent right overflow
            const rect = dropdown.getBoundingClientRect();
            if (rect.right > viewportWidth - padding) {
              const overflow = rect.right - (viewportWidth - padding);
              dropdown.style.right = `${overflow}px`;
            } else {
              dropdown.style.right = "0px";
            }
          }
        });
      });
    }
  }, [showUserMenu]);

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      // NEW: Block all game input if overlay is visible
      if (showOverlay) return;

      if (event.key === "Tab") {
        event.preventDefault();
        tabPressedRef.current = true;
        if (tabTimeoutRef.current) clearTimeout(tabTimeoutRef.current);
        tabTimeoutRef.current = setTimeout(() => {
          tabPressedRef.current = false;
        }, 1000);
        return;
      }
      
      if (event.key === "Enter" && tabPressedRef.current) {
        event.preventDefault();
        tabPressedRef.current = false;
        if (tabTimeoutRef.current) clearTimeout(tabTimeoutRef.current);
        initGame();
        return;
      }
      
      if (event.key === "Escape") {
        event.preventDefault();
        initGame();
        return;
      }

      // If finished, only allow Esc or Tab+Enter restart; ignore other keys
      if (stateRef.current.testFinished) {
        return;
      }

      if (
        stateRef.current.testActive &&
        ["Shift", "Control", "Alt", "Meta"].includes(event.key)
      ) {
        return;
      }

      if (
        !stateRef.current.testActive &&
        !event.metaKey &&
        event.key.length === 1
      ) {
        startTest();
      }

      if (!stateRef.current.testActive) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        if (stateRef.current.currentIndex > 0) {
          stateRef.current.currentIndex -= 1;
          const letter =
            stateRef.current.letterElements[stateRef.current.currentIndex];
          if (letter) {
            // If this position had an error, mark it as corrected
            if (stateRef.current.errorPositions.has(stateRef.current.currentIndex)) {
              stateRef.current.correctedErrors.add(stateRef.current.currentIndex);
            }
            letter.classList.remove(
              "text-dark-main",
              "text-dark-error",
              "underline"
            );
            // Remove inline color to allow parent color to show
            letter.style.color = "";
          }
          moveCursor(stateRef.current.currentIndex);
        }
        return;
      }

      if (
        event.key.length === 1 &&
        stateRef.current.currentIndex < stateRef.current.letterElements.length
      ) {
        const currentLetter =
          stateRef.current.letterElements[stateRef.current.currentIndex];
        if (!currentLetter) return;

        // Remove inline color so Tailwind classes can work
        currentLetter.style.color = "";

        if (event.key === currentLetter.textContent) {
          currentLetter.classList.add("text-dark-main");
          currentLetter.classList.remove("text-dark-error", "underline");
          // If this position had an error and is now correct, mark as corrected
          if (stateRef.current.errorPositions.has(stateRef.current.currentIndex)) {
            stateRef.current.correctedErrors.add(stateRef.current.currentIndex);
          }
        } else {
          currentLetter.classList.add("text-dark-error", "underline");
          currentLetter.classList.remove("text-dark-main");
          stateRef.current.errorCount += 1;
          // Track this error position
          stateRef.current.errorPositions.add(stateRef.current.currentIndex);
        }

        stateRef.current.currentIndex += 1;

        if (
          stateRef.current.currentIndex ===
          stateRef.current.letterElements.length
        ) {
          endGame();
        } else {
          moveCursor(stateRef.current.currentIndex);
        }
      }
    },
    [endGame, initGame, moveCursor, startTest, showOverlay] // NEW: Added showOverlay dependency
  );

  useEffect(() => {
    const keyListener = (event: Event) => handleKeydown(event as KeyboardEvent);
    window.addEventListener("keydown", keyListener);

    // NEW: Only focus the game if the overlay is not visible
    let focusFrame: number | undefined;
    if (!showOverlay) {
      focusFrame = window.requestAnimationFrame(() =>
        appBodyRef.current?.focus()
      );
    }

    return () => {
      window.removeEventListener("keydown", keyListener);
      if (focusFrame) {
        // <-- check if focusFrame was set
        window.cancelAnimationFrame(focusFrame);
      }
      if (tabTimeoutRef.current) {
        clearTimeout(tabTimeoutRef.current);
      }
    };
  }, [handleKeydown, showOverlay]); // NEW: Added showOverlay dependency

  // Re-init when mode changes
  useEffect(() => {
    initGame();
  }, [gameMode, initGame]);

  // Continuously trigger wavy animation
  useEffect(() => {
    if (bannerVisible) {
      const interval = setInterval(() => {
        setWavyReplay(false);
        setTimeout(() => setWavyReplay(true), 50);
      }, 2000); // Repeat every 2 seconds
      return () => clearInterval(interval);
    }
  }, [bannerVisible]);

  // Initial trigger
  useEffect(() => {
    if (bannerVisible) {
      setWavyReplay(true);
    }
  }, [bannerVisible]);

  // Check for OAuth callback and restore state from localStorage
  // Check for OAuth callback and restore state from localStorage
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for OAuth callback - Supabase uses implicit flow (tokens in hash)
        // Check for OAuth errors first
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = urlParams.get("error") || hashParams.get("error");
        
        if (error) {
          window.history.replaceState({}, "", window.location.pathname);
          // Continue to restore from localStorage
        }
        
        // Check if there's an OAuth callback (tokens in hash or code in URL)
        const hasOAuthCallback = window.location.hash.includes("access_token") || 
                                  window.location.hash.includes("refresh_token") ||
                                  urlParams.get("code") || 
                                  hashParams.get("code");
        
        if (hasOAuthCallback) {
          // OAuth callback detected - wait for Supabase to process it
          // Give Supabase time to process the hash and create session
          // Try multiple times with increasing delays
          let session = null;
          let sessionError = null;
          
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
            const result = await supabase.auth.getSession();
            session = result.data?.session;
            sessionError = result.error;
            
            if (session?.user) {
              break;
            }
          }
          
          if (session?.user) {
            const twitterHandle = session.user.user_metadata?.user_name;
            const avatarUrl = session.user.user_metadata?.avatar_url;
            
            if (twitterHandle) {
              // Store handle and avatar in localStorage
              setStoredPlayerName(twitterHandle);
              if (avatarUrl) {
                setStoredTwitterAvatar(twitterHandle, avatarUrl);
                setIsTwitterAuth(true); // Flag to show avatar
              }
              
              // Set player name and close overlay
              setPlayerName(twitterHandle);
              setShowOverlay(false);
              
              // Restore user data from database (non-blocking)
              restoreUserDataFromDB(twitterHandle)
                .then((hasData) => {
                  if (hasData) {
                    const profile = getUserProfile(twitterHandle);
                    if (profile.hasProfile && profile.bestGameMode) {
                      getUserBestScore(twitterHandle, profile.bestGameMode)
                        .then((result) => {
                          if (result.data) {
                            setUserProfile(result.data);
                          }
                        })
                        .catch(() => {
                          // Silently fail
                        });
                    }
                  }
                })
                .catch(() => {
                  // Silently fail
                });
            }
          } else {
            // Fallback: try to extract from hash if session isn't available
            try {
              const hash = window.location.hash;
              if (hash.includes("access_token")) {
                // Try to decode the JWT token to extract user data
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get("access_token");
                if (accessToken) {
                  // Decode JWT payload (base64)
                  const parts = accessToken.split(".");
                  if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const twitterHandle = payload?.user_name || payload?.preferred_username;
                    const avatarUrl = payload?.avatar_url || payload?.picture;
                    
                    if (twitterHandle) {
                      setStoredPlayerName(twitterHandle);
                      if (avatarUrl) {
                        setStoredTwitterAvatar(twitterHandle, avatarUrl);
                        setIsTwitterAuth(true);
                      }
                      setPlayerName(twitterHandle);
                      setShowOverlay(false);
                    }
                  }
                }
              }
            } catch (err) {
              // Silently fail
            }
          }
          
          // Sign out immediately to discard session
          await supabase.auth.signOut();
          
          // Clean up URL
          window.history.replaceState({}, "", window.location.pathname);
          
          // After OAuth callback, check if we successfully stored the name
          // If so, ensure overlay is closed
          const storedNameAfterCallback = getStoredPlayerName();
          if (storedNameAfterCallback && storedNameAfterCallback !== "you") {
            setPlayerName(storedNameAfterCallback);
            setShowOverlay(false);
          }
          
          return; // Done with OAuth callback
        }

        // No OAuth callback - restore from localStorage (works for both name-based and Twitter users)
      const storedName = getStoredPlayerName();
        if (storedName && storedName !== "you") {
        setPlayerName(storedName);
          setShowOverlay(false);
          
          // Check if this is a Twitter user (has avatar stored)
          const avatarUrl = getStoredTwitterAvatar(storedName);
          if (avatarUrl) {
            setIsTwitterAuth(true);
          }
          
          // Restore user data from database (non-blocking)
          restoreUserDataFromDB(storedName)
            .then((hasData) => {
        if (hasData) {
          const profile = getUserProfile(storedName);
          if (profile.hasProfile && profile.bestGameMode) {
                  getUserBestScore(storedName, profile.bestGameMode)
                    .then((result) => {
            if (result.data) {
              setUserProfile(result.data);
            }
                    })
                    .catch(() => {
                      // Silently fail
                    });
          }
        }
            })
            .catch(() => {
              // Silently fail
            });
      } else {
          // No stored name - show overlay
        setShowOverlay(true);
        }
      } catch (error) {
        // Fallback: show overlay if something goes wrong
        setShowOverlay(true);
      } finally {
        // Mark as mounted after initialization
        setMounted(true);
      }
    };

    initializeApp();
  }, []);


  // Overlay is already set synchronously in useState initializer above
  // No need for this useEffect

  const handleRestart = useCallback(() => {
    initGame();
    appBodyRef.current?.focus();
  }, [initGame]);

  const handleShare = useCallback(
    async (platform?: "twitter" | "facebook" | "linkedin") => {
      const rankName = getRankName(results.rank);
      const shareText = `Rank: ${rankName}

I scored ${results.score} on Proof of Speed! ${results.lps} letters per second with ${results.accuracy} accuracy.

Can you beat Etherlink's instant confirmations? 

https://proofofspeed.vercel.app/`;
      const shareUrl = "https://proofofspeed.vercel.app/";
    
    // Capture screenshot of results screen
    let screenshotFile: File | null = null;
    if (resultsScreenRef.current) {
      try {
        const canvas = await html2canvas(resultsScreenRef.current, {
          backgroundColor: null,
          scale: 2, // Higher quality
          logging: false,
          useCORS: true,
          allowTaint: false,
          windowWidth: resultsScreenRef.current?.scrollWidth,
          windowHeight: resultsScreenRef.current?.scrollHeight,
        });
        
        // Convert canvas to blob and then to File
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/png");
        });
        
        if (blob) {
            screenshotFile = new File([blob], "beat-the-chain-results.png", {
              type: "image/png",
            });
        }
      } catch (err) {
        // Failed to capture screenshot - continue without it
      }
    }
    
    if (platform === "twitter") {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
      // Download screenshot for manual attachment
      if (screenshotFile) {
        const url = URL.createObjectURL(screenshotFile);
        const a = document.createElement("a");
        a.href = url;
        a.download = "beat-the-chain-results.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else if (platform === "facebook") {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl
        )}`;
      window.open(facebookUrl, "_blank", "width=550,height=420");
      // Download screenshot for manual attachment
      if (screenshotFile) {
        const url = URL.createObjectURL(screenshotFile);
        const a = document.createElement("a");
        a.href = url;
        a.download = "beat-the-chain-results.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else if (platform === "linkedin") {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          shareUrl
        )}`;
      window.open(linkedinUrl, "_blank", "width=550,height=420");
      // Download screenshot for manual attachment
      if (screenshotFile) {
        const url = URL.createObjectURL(screenshotFile);
        const a = document.createElement("a");
        a.href = url;
        a.download = "beat-the-chain-results.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else {
      // Generic share (no specific platform) - use native share API
      if (navigator.share && screenshotFile) {
        try {
          await navigator.share({
            title: "Proof of Speed - Typing Test Results",
            text: shareText,
            url: shareUrl,
            files: [screenshotFile],
          });
        } catch (err) {
          // User cancelled or error occurred, fallback to text-only share
          if (err instanceof Error && err.name !== "AbortError") {
            try {
              await navigator.share({
                title: "Proof of Speed - Typing Test Results",
                text: shareText,
                url: shareUrl,
              });
            } catch (err2) {
              // Share cancelled or failed
            }
          } else {
            // Share cancelled
          }
        }
      } else if (navigator.share) {
        // Fallback: text-only share if screenshot failed
        try {
          await navigator.share({
            title: "Proof of Speed - Typing Test Results",
            text: shareText,
            url: shareUrl,
          });
        } catch (err) {
          // Share cancelled or failed
        }
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          alert("Results copied to clipboard!");
        } catch (err) {
          // Failed to copy to clipboard
        }
      }
    }
    },
    [results]
  );
  
  // NEW: Handler for when the overlay is completed
  const handleOnboardingComplete = async (name: string) => {
    const finalName = name || "you";
    setPlayerName(finalName);
    setStoredPlayerName(finalName);

    // Mark as NOT Twitter auth when using name
    setIsTwitterAuth(false);
    
    // Check if user exists in database and restore their data
    const hasData = await restoreUserDataFromDB(finalName);
    
    if (hasData) {
      // If data was restored, fetch and set the user profile for display
      const profile = getUserProfile(finalName);
      if (profile.hasProfile && profile.bestGameMode) {
        const result = await getUserBestScore(finalName, profile.bestGameMode);
        if (result.data) {
          setUserProfile(result.data);
        }
      }
    }
    
    setShowOverlay(false);
    // Focus the game window now that the overlay is gone
    requestAnimationFrame(() => appBodyRef.current?.focus());
  };

  // Handler for Twitter sign-in - just start OAuth flow
  // The OAuth callback will extract handle/avatar and discard session
  const handleSignInWithTwitter = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "twitter",
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        alert(`Sign in error: ${error.message}`);
      }
      // The redirect will happen automatically, and we'll handle it in the OAuth callback useEffect
    } catch (err) {
      alert(
        `Unexpected error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleResetPlayer = async () => {
    clearPlayerData(playerName); // This clears localStorage including avatar
    
    setIsTwitterAuth(false);
    setPlayerName("you");
    setUserProfile(null);
    setAllUserScores([]);
    setShowUserMenu(false);
    setShowOverlay(true);
  };

  // We use the `group` class here to control UI state with Tailwind
  const containerClasses = [
    "flex h-screen flex-col group font-sans",
    testFinished ? "test-finished overflow-y-auto" : "overflow-hidden",
    testStarted ? "test-started" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id="app-body"
      className={containerClasses}
      ref={appBodyRef}
      tabIndex={-1}
    >
      <Confetti
        ref={confettiRef}
        className="fixed top-0 left-0 z-[100] w-full h-full pointer-events-none"
      />
      
      {/* NEW: Render the overlay with AnimatePresence */}
      <AnimatePresence>
        {mounted && showOverlay && (
          <OnboardingOverlay
            onComplete={handleOnboardingComplete}
            onSignInWithTwitter={handleSignInWithTwitter}
          />
        )}
      </AnimatePresence>

      <div id="app-content" className="flex flex-grow flex-col">
        <header className="p-6">
          <nav className="flex items-center justify-between text-xl">
            <div className="flex items-center space-x-6">
              <div className="flex flex-col space-y-4 font-mono text-sm">
                <button
                  onClick={initGame}
                  className="text-dark-dim hover:text-dark-highlight transition-colors text-left"
                >
                  New Game
                </button>
                <Link
                  href="/leaderboard"
                  className="text-dark-dim hover:text-dark-highlight transition-colors text-left"
                >
                  Leaderboard
                </Link>
                <button
                  onClick={() => setShowHowToPlay(true)}
                  className="text-dark-dim hover:text-dark-highlight transition-colors text-left"
                >
                  How to Play
                </button>
                <div className="relative">
              <button
                    onClick={async () => {
                      // Toggle user profile menu
                  if (playerName && playerName !== "you") {
                        // Always toggle the menu first for immediate feedback
                        const newMenuState = !showUserMenu;
                        setShowUserMenu(newMenuState);

                        // Only fetch scores if we're opening the menu
                        if (newMenuState) {
                          setScoresLoading(true);

                          // Queries are public reads and work immediately
                          // Same logic for name-based and Twitter users

                          try {
                            // No session check needed - queries are public reads by player_name
                            // Works the same way for both name-based and Twitter auth users

                        // Fetch all scores for all game modes
                            const result = await getAllUserScores(playerName);

                          if (result.data && result.data.length > 0) {
                            setAllUserScores(result.data);
                            // Set the best score as the primary profile (for backward compatibility)
                              const bestScore = result.data.reduce(
                                (best, current) =>
                              current.score > best.score ? current : best
                            );
                            setUserProfile(bestScore);
                        } else {
                            setAllUserScores([]);
                          setUserProfile(null);
                        }
                          } catch (error) {
                            setAllUserScores([]);
                            setUserProfile(null);
                          } finally {
                            setScoresLoading(false);
                          }
                        } else {
                          // Closing menu, reset loading state
                          setScoresLoading(false);
                        }
                    } else {
                        // Still toggle the dropdown even if no player name
                        setAllUserScores([]);
                      setUserProfile(null);
                      setShowUserMenu(!showUserMenu);
                  }
                }}
                    className="text-dark-dim hover:text-dark-highlight transition-colors cursor-pointer text-left"
                    title="Settings"
              >
                    Settings
              </button>
              {/* User Profile Dropdown */}
              <AnimatePresence>
                    {showUserMenu && (
                  <motion.div
                    ref={userMenuRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                        className="absolute top-full mt-2 w-64 rounded-lg bg-dark-kbd border border-dark-dim/20 shadow-2xl z-50 overflow-hidden"
                        style={{ 
                          right: 0,
                          transform: "translateX(0)",
                          maxWidth: "min(256px, calc(100vw - 3rem))",
                        }}
                  >
                    <div className="p-4 space-y-3 font-mono">
                          {playerName && playerName !== "you" && (
                      <div className="border-b border-dark-dim/20 pb-3">
                              <div className="flex items-center gap-3">
                                {isTwitterAuth && getStoredTwitterAvatar(playerName) ? (
                                  <img
                                    src={getStoredTwitterAvatar(playerName)!}
                                    alt="Profile"
                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                  />
                                ) : (
                                  <div
                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: "#39ff9c" }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-lg font-bold text-dark-highlight truncate">
                                    @{playerName}
                                  </div>
                                </div>
                              </div>
                      </div>
                          )}
                          {scoresLoading ? (
                            // Loading state with rectangular loaders
                            <div className="space-y-3">
                              {/* Scores loading placeholders */}
                              {GAME_MODES.map((mode) => (
                                <div
                                  key={mode}
                                  className="flex items-center justify-between"
                                >
                                  <motion.div
                                    className="h-4 rounded bg-dark-dim/30"
                                    style={{ width: "80px" }}
                                    animate={{
                                      opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                  />
                                  <motion.div
                                    className="h-4 rounded bg-dark-dim/30"
                                    style={{ width: "60px" }}
                                    animate={{
                                      opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                      delay: 0.2,
                                    }}
                                  />
                                </div>
                              ))}
                              {/* Best rank and score loading placeholders */}
                              <div className="border-t border-dark-dim/20 pt-3 mt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <motion.div
                                    className="h-4 rounded bg-dark-dim/30"
                                    style={{ width: "70px" }}
                                    animate={{
                                      opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                  />
                                  <motion.div
                                    className="h-4 rounded bg-dark-dim/30"
                                    style={{ width: "90px" }}
                                    animate={{
                                      opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                      delay: 0.3,
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <motion.div
                                    className="h-4 rounded bg-dark-dim/30"
                                    style={{ width: "75px" }}
                                    animate={{
                                      opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                  />
                                  <motion.div
                                    className="h-4 rounded bg-dark-dim/30"
                                    style={{ width: "65px" }}
                                    animate={{
                                      opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                      delay: 0.4,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : allUserScores.length > 0 ? (
                            <>
                              <div className="space-y-2">
                                {allUserScores.map((score) => (
                                  <div
                                    key={score.game_mode}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="text-xs text-dark-dim">
                                      {score.game_mode} words
                            </div>
                                    <div className="text-sm font-bold text-dark-main">
                                      {score.lps.toFixed(2)} lps
                            </div>
                            </div>
                                ))}
                            </div>
                              {userProfile && (
                                <div className="border-t border-dark-dim/20 pt-3 mt-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-dark-dim">
                                      best rank
                                    </div>
                                    <div className="text-sm font-bold text-dark-main">
                                      {getRankNameForDropdown(userProfile.rank)}
                                    </div>
                          </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-dark-dim">
                                      best score
                                    </div>
                                    <div className="text-sm font-bold text-dark-main">
                                      {userProfile.score.toFixed(2)}
                                    </div>
                          </div>
                        </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-dark-dim">
                              No scores yet
                            </div>
                      )}
                      <div className="border-t border-dark-dim/20 pt-3 mt-3">
                        <button
                          onClick={handleResetPlayer}
                          className="w-full px-3 py-2 rounded-md bg-dark-bg hover:bg-dark-highlight hover:text-black text-dark-main text-sm font-mono transition-colors"
                        >
                              <i className="fa-solid fa-rotate mr-2" />
                          Reset player
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </div>
            </div>
            <a
              href="https://etherlink.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 rounded-full border border-dark-dim/30 py-2 px-4 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer"
              style={{ backgroundColor: "#39ff9c" }}
              title="Explore Etherlink"
            >
              <span>Explore Etherlink</span>
              <i className="fa-solid fa-arrow-up-right-from-square h-4 w-4" />
            </a>
          </nav>
        </header>

        <div className="relative z-10 flex flex-col items-center px-6 py-4 space-y-4 -mt-5 group-[.test-finished]:-mt-5">
          <div className="text-center">
            <span className="font-nfs text-[2.8125rem] text-dark-highlight">
              Proof of Speed
            </span>
          </div>
          <div className="flex items-center space-x-6 rounded-lg bg-dark-kbd p-2 text-sm font-mono group-[.test-finished]:hidden">
            <button
              className="flex items-center space-x-1 text-dark-highlight hover:text-dark-highlight transition-colors"
              title="Words"
            >
              <i className="fa-solid fa-hashtag h-4 w-4" />
              <span className="lowercase tracking-wider">words</span>
            </button>
            <div className="h-5 w-px bg-dark-dim" />
            <div className="flex items-center space-x-3 text-dark-main">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode}
                  className={`lowercase tracking-wider transition-colors cursor-pointer relative ${
                    gameMode === mode
                      ? "text-dark-highlight"
                      : "hover:text-dark-main"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setGameMode(mode as GameMode);
                  }}
                  onMouseEnter={() => {
                    if (animationTimeoutRef.current) {
                      clearTimeout(animationTimeoutRef.current);
                    }
                    setHoveredMode(mode);
                    
                    // Animate through random numbers for 100ms
                    const startTime = Date.now();
                    const duration = 100;
                    
                    const animate = () => {
                      const elapsed = Date.now() - startTime;
                      
                      if (elapsed < duration) {
                        // Generate random number between 10-99, but avoid the target number
                        let randomNum;
                        do {
                          randomNum = Math.floor(Math.random() * 90) + 10;
                        } while (randomNum === mode);
                        
                        setAnimatedNumber(randomNum);
                        requestAnimationFrame(animate);
                      } else {
                        // Land on the target number
                        setAnimatedNumber(mode);
                      }
                    };
                    animate();
                  }}
                  onMouseLeave={() => {
                    if (animationTimeoutRef.current) {
                      clearTimeout(animationTimeoutRef.current);
                    }
                    setHoveredMode(null);
                    setAnimatedNumber(null);
                  }}
                >
                  <motion.span
                    key={hoveredMode === mode ? animatedNumber : mode}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.05 }}
                    className="inline-block pointer-events-none"
                  >
                    {hoveredMode === mode && animatedNumber !== null
                      ? animatedNumber
                      : mode}
                  </motion.span>
                </button>
              ))}
            </div>
          </div>
          {!showOverlay && playerName && playerName !== "you" && (
            <div className="text-sm font-mono text-dark-dim group-[.test-finished]:hidden">
              Hi, @{playerName}
            </div>
          )}
        </div>

        <main className="relative z-0 -mt-16 flex flex-grow flex-col items-center justify-center group-[.test-finished]:overflow-y-auto group-[.test-finished]:justify-start group-[.test-finished]:py-8">
          <button
            id="language-btn"
              className={`mb-4 inline-flex items-center gap-2 text-sm font-mono lowercase tracking-wider transition-colors group-[.test-finished]:hidden ${
                testStarted
                  ? "text-dark-dim hover:text-dark-highlight"
                  : "text-dark-highlight"
              }`}
          >
              <i className="fa-solid fa-globe h-4 w-4" />
              <span>Click or press the first letter to begin</span>
          </button>
          
          <div
            id="test-area"
            className="relative flex min-h-[200px] w-full max-w-5xl items-center justify-center group-[.test-finished]:hidden"
            onClick={() => appBodyRef.current?.focus()}
          >
            <div
              id="words-wrapper"
              className="relative max-w-5xl mx-auto font-mono"
              style={{
                paddingBottom:
                  gameMode === 30 ? "3rem" : "2rem",
              }}
            >
              <div
                id="cursor"
                ref={cursorRef}
                className="animate-blink absolute mt-[-2px] h-[2.25rem] w-[2px] bg-dark-highlight transition-all duration-100 hidden group-[.test-started]:block z-10"
              />
              
              <div 
                id="words" 
                ref={wordsRef} 
                className="max-w-5xl min-h-[12.5rem] flex flex-wrap content-start overflow-y-auto transition-all duration-300 font-mono cursor-text relative z-10" 
                style={{ 
                  fontSize: "32px", 
                  lineHeight: "1.5em", 
                  color: "#646669",
                  opacity: textFocused || testStarted ? 1 : 0.2,
                }}
                onClick={() => {
                  if (!testStarted && !testFinished) {
                    setTextFocused(true);
                    // Focus the app body to capture keyboard input
                    appBodyRef.current?.focus();
                  }
                }}
              />
              
                  <PacerTimer 
                    key={pacerResetKey}
                    totalLetters={totalLetters}
                    testActive={testStarted}
                    speedMs={200}
                  />
            </div>
          </div>

          {/* --- NEW RESULTS SCREEN LAYOUT --- */}
          <div
            id="results-screen"
            ref={resultsScreenRef}
            className="text-center font-mono hidden group-[.test-finished]:block w-full max-w-4xl px-6"
          >
            {/* 1. Big Score */}
            <div className="text-center mb-10">
              <div
                className="text-lg text-dark-dim"
                title="score = letter per second x accuracy"
              >
                Final Score
              </div>
              <div
                id="result-score"
                className="text-7xl font-bold text-dark-highlight"
                title="score = letter per second x accuracy"
              >
                <CountUp value={parseFloat(results.score) || 0} decimals={2} />
              </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* Column 1: Core Stats */}
              <div className="flex flex-col space-y-6">
                <div>
                  <div
                    className="text-lg text-dark-dim text-left"
                    title="letter per second"
                  >
                    letter per second
                  </div>
                  <div
                    id="result-lps"
                    className="text-4xl font-bold text-dark-main text-left"
                    title="letter per second"
                  >
                    <CountUp
                      value={parseFloat(results.lps) || 0}
                      decimals={2}
                    />
                  </div>
                </div>
                <div>
                  <div
                    className="text-lg text-dark-dim text-left"
                    title="accuracy"
                  >
                    acc
                  </div>
                  <div
                    id="result-acc"
                    className="text-4xl font-bold text-dark-main text-left"
                    title="accuracy"
                  >
                    <CountUp
                      value={parseFloat(results.accuracy.replace("%", "")) || 0}
                      decimals={1}
                      suffix="%"
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Comparison Stats */}
              <div className="flex flex-col space-y-6">
                <div>
                  <div className="text-lg text-dark-dim text-left">
                    your speed
                  </div>
                  <div
                    id="result-ms"
                    className="text-3xl font-bold text-dark-main text-left"
                  >
                    <CountUp
                      value={parseFloat(results.msPerLetter) || 0}
                      decimals={0}
                    />{" "}
                    <span className="text-xl">ms/letter</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg text-dark-dim text-left">time</div>
                  <div
                    id="result-time"
                    className="text-3xl font-bold text-dark-main text-left"
                  >
                    <CountUp
                      value={parseFloat(results.time.replace("s", "")) || 0}
                      decimals={2}
                      suffix="s"
                    />
                  </div>
                </div>
              </div>

              {/* Column 3: Real Leaderboard */}
              <div className="flex flex-col space-y-2 pb-2">
                <div className="text-lg text-dark-dim text-left">
                  rankings (words: {gameMode})
                </div>
                {rankingsLoading ? (
                  <div className="text-sm text-dark-dim">Loading...</div>
                ) : rankings.length === 0 ? (
                  <div className="text-sm text-dark-dim">No rankings yet</div>
                ) : (
                  (() => {
                  // Find current user's position
                    const userIndex = rankings.findIndex(
                      (entry) => entry.player_name === playerName
                    );
                  const userPosition = userIndex >= 0 ? userIndex + 1 : null;
                  
                  // Get top 4 entries
                  const top4 = rankings.slice(0, 4);
                  
                  // Check if user is in top 4
                  const isUserInTop4 = userIndex >= 0 && userIndex < 4;
                  
                  // If user is in top 4, show top 4. Otherwise, show top 3 + user
                  const displayEntries = isUserInTop4
                    ? top4
                    : userIndex >= 0
                      ? [...rankings.slice(0, 3), rankings[userIndex]]
                      : top4;
                  
                  return (
                    <>
                      {displayEntries.map((entry, idx) => {
                          const isCurrentUser =
                            entry.player_name === playerName;
                        // Calculate actual position
                          const actualPosition =
                            isCurrentUser && userPosition
                          ? userPosition 
                          : isUserInTop4
                            ? idx + 1
                            : idx < 3
                              ? idx + 1
                              : userPosition;
                          const textColor =
                            idx === 0 && !isCurrentUser
                          ? "text-dark-highlight" 
                          : isCurrentUser 
                            ? "text-white" 
                            : "text-dark-dim";
                        return (
                            <div
                              key={entry.id}
                              className={`flex justify-between text-xl ${textColor}`}
                              style={{
                                lineHeight: "1.6",
                                minHeight: "1.75rem",
                                paddingBottom: "0.125rem",
                              }}
                            >
                              <span
                                className="truncate mr-2"
                                style={{
                                  lineHeight: "1.6",
                                  display: "inline-block",
                                }}
                              >
                                {actualPosition}. {entry.player_name}
                              </span>
                              <span
                                className="flex-shrink-0"
                                style={{ lineHeight: "1.6" }}
                              >
                                {entry.score.toFixed(2)}
                              </span>
                          </div>
                        );
                      })}
                    </>
                  );
                  })()
                )}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="mt-10 pt-6 border-t border-dark-kbd mb-20">
              <div className="text-center mb-6">
                <div className="flex flex-col items-center">
                  <div className="text-lg text-dark-dim mb-2">
                    Your Rank
                  </div>
                  <div
                    id="result-rank"
                    className="text-3xl font-bold font-nfs text-dark-highlight mb-2"
                  >
                    {getRankName(results.rank)}
                  </div>
                  {RANK_DESCRIPTIONS[getRankName(results.rank)] && (
                    <div className="text-sm text-dark-dim font-mono max-w-md">
                      {RANK_DESCRIPTIONS[getRankName(results.rank)]}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Rank Progress Bar */}
              {(() => {
                // Calculate triangle position based on user's actual msPerLetter value
                // Only compute the position - everything else is static
                const userMsPerLetter = parseFloat(results.msPerLetter) || 0;
                const speedValue = getSpeedPosition(userMsPerLetter);
                const clampedSpeedValue = Math.max(
                  0,
                  Math.min(100, speedValue)
                );
                
                return (
                  <div className="w-full max-w-6xl mx-auto px-4">
                    {/* Horizontal Gradient Line - Full width with colors extending to edges */}
                    <div className="w-full relative mb-16 overflow-visible">
                      {/* Animated Gradient Line - Full width to fill the tips */}
                      <div className="w-full relative">
                        <motion.div 
                          className="h-1 rounded-sm w-full"
                          animate={{
                            background: [
                              `linear-gradient(to right, ${GRADIENT_STRING})`,
                              `linear-gradient(to right, ${BRIGHTER_GRADIENT_STRING})`,
                              `linear-gradient(to right, ${GRADIENT_STRING})`,
                            ],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{
                            background: `linear-gradient(to right, ${GRADIENT_STRING})`,
                          }}
                        />
                        {/* Animated Shimmer Overlay */}
                        <motion.div
                          className="absolute inset-0 h-1 rounded-sm pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)",
                            backgroundSize: "200% 100%",
                          }}
                          animate={{
                            backgroundPosition: ["200% 0", "-200% 0"],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                </div>
                      
                      {/* Vertical Marker Lines for Each Blockchain - Adjusted for chart width */}
                      {CHAIN_POSITIONS.map((blockchain) => {
                        // Adjust position to account for chart padding
                        const adjustedPosition =
                          CHART_START_OFFSET +
                          (blockchain.position / 100) * CHART_WIDTH;
                        return (
                          <div
                            key={blockchain.name}
                            className="absolute top-0"
                            style={{
                              left: `${adjustedPosition}%`,
                              transform: "translateX(-50%)",
                              zIndex: 10,
                            }}
                          >
                            {/* Vertical Line */}
                            <div
                              className="w-px bg-dark-dim"
                              style={{ height: "24px" }}
                            />
                            
                            {/* Chain Label - Directly under marker */}
                            <div
                              className="absolute top-full mt-2"
                              style={{
                                left: "50%",
                                transform: "translateX(-50%)",
                                minWidth: "100px",
                              }}
                            >
                              {blockchain.name === "Etherlink" ? (
                                // Special layout for Etherlink - icon inline with text, time below
                                <div className="flex items-center gap-1">
                                  {/* Text Content */}
                                  <div className="flex flex-col">
                                    {/* Name with icon inline beside the S */}
                                    <div className="flex items-center gap-1">
                                      {blockchain.icon && (
                                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                          <img
                                            src={
                                              blockchain.icon === "etherlink"
                                                ? "/etherlink-logo.svg"
                                                : `/crypto-icons/${blockchain.icon}.svg`
                                            }
                                            alt={blockchain.name}
                                            className="w-5 h-5"
                                          />
                                        </div>
                                      )}
                                      <div
                                        className="text-xs font-mono font-bold leading-tight whitespace-nowrap"
                                        style={{ color: blockchain.color }}
                                      >
                                        {blockchain.name}
                                      </div>
                                    </div>

                                    {/* Block Time - aligned same as other chains */}
                                    <div
                                      className="text-[10px] font-mono leading-tight"
                                      style={{ color: blockchain.color }}
                                    >
                                      50ms
                                    </div>
                                  </div>
                                </div>
                              ) : (
                              <div className="flex items-center gap-1">
                                {/* Icons - Using cryptocurrency-icons */}
                                {blockchain.icon && (
                                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    <img 
                                        src={
                                          blockchain.icon === "etherlink"
                                            ? "/etherlink-logo.svg"
                                            : `/crypto-icons/${blockchain.icon}.svg`
                                        }
                                      alt={blockchain.name}
                                      className="w-5 h-5"
                                    />
              </div>
                                )}
                                
                                {/* Text Content */}
                                <div className="flex flex-col">
                                  {/* Name */}
                                  <div 
                                    className="text-xs font-mono font-bold leading-tight"
                                    style={{ color: blockchain.color }}
                                  >
                                    {blockchain.name}
                                  </div>
                                  
                                  {/* Block Time */}
                                  <div 
                                    className="text-[10px] font-mono leading-tight"
                                    style={{ color: blockchain.color }}
                                  >
                                      {blockchain.displayTime ||
                                        `${blockchain.ms.toLocaleString()}ms`}
                                  </div>
                                </div>
                              </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* User Position Indicator - Triangle only - Sliding animation */}
                      {clampedSpeedValue >= 0 &&
                        clampedSpeedValue <= 100 &&
                        (() => {
                        // Adjust user position to account for chart padding
                          const adjustedUserPosition =
                            CHART_START_OFFSET +
                            (clampedSpeedValue / 100) * CHART_WIDTH;
                        return (
                          <motion.div
                              initial={{
                                opacity: 0,
                                scale: 0.8,
                                left: `${CHART_START_OFFSET}%`,
                              }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1,
                                left: `${adjustedUserPosition}%`,
                            }}
                            transition={{ 
                              duration: 1.2,
                                ease: "easeOut",
                            }}
                            className="absolute z-50"
                            style={{ 
                                top: "2px",
                                transform: "translateX(-50%) translateY(-18px)",
                                pointerEvents: "none",
                            }}
                          >
                            {/* Arrow/Triangle pointing up - positioned on the line */}
                            <div
                              className="relative"
                              style={{
                                width: 0,
                                height: 0,
                                  borderLeft: "12px solid transparent",
                                  borderRight: "12px solid transparent",
                                  borderBottom: "18px solid #38FF9C",
                                  filter:
                                    "drop-shadow(0 0 10px rgba(56, 255, 156, 1))",
                              }}
                            />
                          </motion.div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Restart Button and Leaderboard Link */}
            <div className="mt-16 flex items-center justify-center space-x-6">
              <button
                type="button"
                onClick={handleRestart}
                className="cursor text-lg text-dark-dim hover:text-dark-highlight font-mono lowercase tracking-wider transition-colors flex items-center"
              >
                <i className="fa-solid fa-rotate h-4 w-4" />
                <span className="ml-1">Play Again</span>
              </button>
              <Link
                href="/leaderboard"
                className="text-lg text-dark-dim hover:text-dark-highlight font-mono lowercase tracking-wider transition-colors flex items-center"
              >
                <i className="fa-solid fa-star h-4 w-4" />
                <span className="ml-1">leaderboard</span>
              </Link>
            </div>

            {/* Social Sharing */}
            <div className="mt-8 pt-6 border-t border-dark-kbd">
              <div className="text-center mb-4">
                <div className="text-sm text-dark-dim font-mono lowercase tracking-wider">
                  share your score
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleShare("twitter")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share on Twitter"
                >
                  <i className="fa-brands fa-twitter h-4 w-4" />
                  <span>twitter</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share"
                >
                  <i className="fa-solid fa-share-nodes h-4 w-4" />
                  <span>share</span>
                </button>
              </div>
            </div>
          </div>
          {/* --- END NEW RESULTS SCREEN --- */}
        </main>

        <Footer />
            </div>

      {/* How to Play Overlay */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden"
            onClick={() => setShowHowToPlay(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-5xl rounded-lg bg-dark-kbd p-8 shadow-2xl border border-dark-dim/20 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pb-5">
                <WelcomeToProofOfSpeed />

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowHowToPlay(false)}
                    className="rounded-md border border-dark-dim/30 bg-dark-highlight py-2 px-4 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-center"
                    style={{ backgroundColor: "#39ff9c" }}
                  >
                    <span className="font-mono mr-6">Close</span>
                    <i className="fa-solid fa-times h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
