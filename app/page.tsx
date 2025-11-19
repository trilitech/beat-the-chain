"use client"; // This is CRITICAL for React Hooks to work in the App Router

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Variants, HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import html2canvas from "html2canvas";
import dictionary from "../lib/dictionary";
import shuffle from "../lib/shuffle";
import { saveGameResult, getLeaderboard, getUserBestScore, getUserProfile, clearPlayerData, getStoredPlayerName, setStoredPlayerName, restoreUserDataFromDB } from "../lib/scores";
import type { LeaderboardEntry } from "../lib/types";
import OnboardingOverlay from "../components/OnboardingOverlay";
import CountUp from "../components/CountUp";
import { Confetti, type ConfettiRef } from "../components/Confetti";

// --- GAME CONSTANTS ---
const SUB_BLOCK_SPEED_MS = 200;
const GAME_MODES = [15, 30, 60] as const; // Word counts
type GameMode = typeof GAME_MODES[number];
// Removed accuracy threshold - all players get ranks based on speed

const DEFAULT_RESULTS = {
  score: "0",
  lps: "0",
  accuracy: "0%",
  rank: "",
  time: "",
  msPerLetter: "0",
  comparison: "0",
};

const FALLBACK_SENTENCES = [
  "ten word sentence this is exactly 35",
  "another fast one for you to type quick",
  "etherlink sub block latency is so fast",
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

// Define types for React state and refs
type Results = {
  score: string;
  lps: string;
  accuracy: string;
  rank: string;
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

// Pacer Squares Component
interface PacerSquaresProps {
  totalLetters: number;
  testActive: boolean;
  speedMs: number;
}

const PacerSquares = ({ totalLetters, testActive, speedMs }: PacerSquaresProps) => {
  const [visibleSquares, setVisibleSquares] = useState<number[]>([]);
  
  useEffect(() => {
    if (!testActive) {
      setVisibleSquares([]);
      return;
    }
    
    // Reset and start showing squares one by one
    setVisibleSquares([]);
    
    const timeouts: NodeJS.Timeout[] = [];
    for (let i = 0; i < totalLetters; i++) {
      const timeout = setTimeout(() => {
        setVisibleSquares(prev => [...prev, i]);
      }, i * speedMs);
      timeouts.push(timeout);
    }
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [testActive, totalLetters, speedMs]);
  
  return (
    <div className="absolute bottom-[-20px] left-0 right-0 flex flex-wrap gap-1 justify-start items-center">
      <AnimatePresence initial={false}>
        {visibleSquares.map((index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              backgroundColor: testActive 
                ? ["#38ff9c", "#0d63f8", "#ff0088", "#38ff9c"]
                : "#38ff9c"
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              backgroundColor: {
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 0.4 },
              scale: { type: "spring", duration: 0.4, bounce: 0.5 }
            }}
            style={{
              width: 20,
              height: 20,
              opacity: 0.5,
            }}
          />
        ))}
      </AnimatePresence>
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
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // NEW: State for overlay and player name
  const [showOverlay, setShowOverlay] = useState(false); // Will be set based on localStorage check
  const [playerName, setPlayerName] = useState("you");
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<LeaderboardEntry | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [hoveredMode, setHoveredMode] = useState<number | null>(null);
  const [animatedNumber, setAnimatedNumber] = useState<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [wavyReplay, setWavyReplay] = useState(false);
  const [totalLetters, setTotalLetters] = useState(0);
  const [pacerResetKey, setPacerResetKey] = useState(0);

  const appBodyRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const subBlockBarRef = useRef<HTMLDivElement>(null);
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
  });

  const tabPressedRef = useRef(false);
  const tabTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const moveCursor = useCallback((index: number) => {
    const cursor = cursorRef.current;
    const container = wordsRef.current;
    const letters = stateRef.current.letterElements;
    if (!cursor || !container || letters.length === 0) return;

    const target = index < letters.length ? letters[index] : letters[letters.length - 1];
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const left = index < letters.length ? rect.left - containerRect.left : rect.right - containerRect.left;

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
    setResults({ ...DEFAULT_RESULTS });
    setTestStarted(false);
    setTestFinished(false);
    setTextFocused(false);
    setPacerResetKey(prev => prev + 1); // Force pacer squares to reset
    populateWords();
    
    // Reset pacer bar for 60 words mode
    if (subBlockBarRef.current && gameMode === 60) {
      subBlockBarRef.current.style.transition = 'none';
      subBlockBarRef.current.style.width = '0%';
    }

    requestAnimationFrame(() => moveCursor(0));
  }, [moveCursor, populateWords, gameMode]);

  const startTest = useCallback(() => {
    if (stateRef.current.testActive) return;
    stateRef.current.testActive = true;
    stateRef.current.startTime = performance.now();
    setTestStarted(true);
    setTestFinished(false);

    // Animate pacer bar for 60 words mode
    if (subBlockBarRef.current && gameMode === 60) {
      const totalLetters = stateRef.current.totalLetters;
      const subBlockDuration = (totalLetters * SUB_BLOCK_SPEED_MS) / 1000;
      
      // Apply dynamic duration and trigger animation
      subBlockBarRef.current.style.transition = `width ${subBlockDuration}s linear`;
      
      // We must force a reflow for the new duration to apply before changing width
      void subBlockBarRef.current.offsetWidth; 
      
      subBlockBarRef.current.style.width = '100%';
    }
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
    const accuracy = ((lettersCount - stateRef.current.errorCount) / lettersCount) * 100;
    // Score factors in accuracy more heavily by squaring the accuracy percentage
    // This ensures accuracy is weighted more than just a simple multiplication
    const accuracyDecimal = accuracy / 100;
    const finalScore = lettersPerSecond * (accuracyDecimal * accuracyDecimal);
    const msPerLetter = durationMs / lettersCount;
    const comparisonMs = msPerLetter - SUB_BLOCK_SPEED_MS;

    // Rank based on typing speed AND accuracy
    // Adjust effective msPerLetter based on accuracy to penalize errors
    // Lower accuracy = higher effective msPerLetter (worse rank)
    // Formula: effectiveMsPerLetter = msPerLetter / (accuracyDecimal ^ accuracyWeight)
    // Using accuracyWeight of 2 means accuracy is weighted more heavily
    const accuracyWeight = 2;
    const effectiveMsPerLetter = msPerLetter / Math.pow(accuracyDecimal, accuracyWeight);
    
    // Categories: Sub-blocks (200ms), Solana (400ms), ETH L2s (1000ms), Polygon (2000ms), Ethereum Mainnet (12000ms), Bitcoin (600000ms)
    // Rank is determined by effective speed which accounts for accuracy
    let rank = "Bitcoin";
    if (effectiveMsPerLetter <= 200) rank = "Sub-blocks";
    else if (effectiveMsPerLetter <= 400) rank = "Solana";
    else if (effectiveMsPerLetter <= 1000) rank = "ETH L2s";
    else if (effectiveMsPerLetter <= 2000) rank = "Polygon";
    else if (effectiveMsPerLetter <= 12000) rank = "Ethereum Mainnet";
    else rank = "Bitcoin";

    const resultsData = {
      score: finalScore.toFixed(2),
      lps: lettersPerSecond.toFixed(2),
      accuracy: `${Math.max(accuracy, 0).toFixed(1)}%`,
      rank,
      time: `${durationSec.toFixed(2)}s`,
      msPerLetter: msPerLetter.toFixed(0),
      comparison: `${comparisonMs > 0 ? "+" : ""}${comparisonMs.toFixed(0)}`,
    };

    setResults(resultsData);

    // Save to Supabase only if it's a new best score (fire and forget - don't block UI)
    // Rank is already "Sub-blocks" if applicable
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
    }).then((result) => {
      if (result.isNewBest) {
        console.log("New personal best saved!");
      } else {
        console.log("Score not saved - not a new best");
      }
      // Fetch updated rankings after saving
      fetchRankings();
    }).catch((error) => {
      console.error("Failed to save game result:", error);
      // Silently fail - don't interrupt user experience
    });
  }, [playerName, gameMode]);

  // Fetch rankings for the current game mode
  const fetchRankings = useCallback(async () => {
    setRankingsLoading(true);
    const { data, error } = await getLeaderboard(gameMode, 4); // Get top 4 for display
    if (!error && data) {
      setRankings(data);
    }
    setRankingsLoading(false);
  }, [gameMode]);

  // Fetch rankings when game mode changes or when test finishes
  useEffect(() => {
    if (testFinished) {
      fetchRankings();
    }
  }, [testFinished, fetchRankings]);

  // Reset game when game mode changes
  useEffect(() => {
    initGame();
  }, [gameMode, initGame]);

  // Trigger confetti if user is faster than Sub-blocks
  useEffect(() => {
    if (testFinished && results.rank === "Sub-blocks") {
      const msPerLetter = parseFloat(results.msPerLetter) || 0;
      if (msPerLetter < 200 && confettiRef.current) {
        setTimeout(() => {
          confettiRef.current?.fire();
        }, 500);
      }
    }
  }, [testFinished, results.rank, results.msPerLetter]);

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

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      // NEW: Block all game input if overlay is visible
      if (showOverlay) return;

      if (event.key === "Tab") {
        event.preventDefault();
        tabPressedRef.current = true;
        if (tabTimeoutRef.current) clearTimeout(tabTimeoutRef.current);
        tabTimeoutRef.current = setTimeout(() => { tabPressedRef.current = false; }, 1000);
        return;
      }
      
      if (event.key === "Enter" && tabPressedRef.current) {
        event.preventDefault();
        tabPressedRef.current = false;
        if (tabTimeoutRef.current) clearTimeout(tabTimeoutRef.current);
        initGame();
        return;
      }
      
      if (event.key === 'Escape') {
        event.preventDefault();
        initGame();
        return;
      }

      // If finished, only allow Esc or Tab+Enter restart; ignore other keys
      if (stateRef.current.testFinished) {
        return;
      }

      if (stateRef.current.testActive && ["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
        return;
      }

      if (!stateRef.current.testActive && !event.metaKey && event.key.length === 1) {
        startTest();
      }

      if (!stateRef.current.testActive) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        if (stateRef.current.currentIndex > 0) {
          stateRef.current.currentIndex -= 1;
          const letter = stateRef.current.letterElements[stateRef.current.currentIndex];
          if (letter) {
            letter.classList.remove("text-dark-main", "text-dark-error", "underline");
            // Remove inline color to allow parent color to show
            letter.style.color = "";
          }
          moveCursor(stateRef.current.currentIndex);
        }
        return;
      }

      if (event.key.length === 1 && stateRef.current.currentIndex < stateRef.current.letterElements.length) {
        const currentLetter = stateRef.current.letterElements[stateRef.current.currentIndex];
        if (!currentLetter) return;

        // Remove inline color so Tailwind classes can work
        currentLetter.style.color = "";

        if (event.key === currentLetter.textContent) {
          currentLetter.classList.add("text-dark-main");
          currentLetter.classList.remove("text-dark-error", "underline");
        } else {
          currentLetter.classList.add("text-dark-error", "underline");
          currentLetter.classList.remove("text-dark-main");
          stateRef.current.errorCount += 1;
        }

        stateRef.current.currentIndex += 1;

        if (stateRef.current.currentIndex === stateRef.current.letterElements.length) {
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
      focusFrame = window.requestAnimationFrame(() => appBodyRef.current?.focus());
    }

    return () => {
      window.removeEventListener("keydown", keyListener);
      if (focusFrame) { // <-- check if focusFrame was set
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

  // Check for existing player profile on mount
  useEffect(() => {
    const loadStoredPlayer = async () => {
      const storedName = getStoredPlayerName();
      if (storedName) {
        setPlayerName(storedName);
        // Restore user data from database if available
        const hasData = await restoreUserDataFromDB(storedName);
        if (hasData) {
          // If data was restored, fetch and set the user profile for display
          const profile = getUserProfile(storedName);
          if (profile.hasProfile && profile.bestGameMode) {
            const result = await getUserBestScore(storedName, profile.bestGameMode);
            if (result.data) {
              setUserProfile(result.data);
            }
          }
        }
        setShowOverlay(false);
      } else {
        setShowOverlay(true);
      }
    };
    loadStoredPlayer();
  }, []);

  const handleRestart = useCallback(() => {
    initGame();
    appBodyRef.current?.focus();
  }, [initGame]);

  const handleShare = useCallback(async (platform?: "twitter" | "facebook" | "linkedin") => {
    const shareText = `I scored ${results.score} on Proof of Speed! ${results.lps} letters per second with ${results.accuracy} accuracy. Can you beat Etherlink's sub-blocks?`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    
    // Capture screenshot of results screen
    let screenshotFile: File | null = null;
    if (resultsScreenRef.current) {
      try {
        const canvas = await html2canvas(resultsScreenRef.current, {
          backgroundColor: null,
          scale: 2, // Higher quality
          logging: false,
        });
        
        // Convert canvas to blob and then to File
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/png");
        });
        
        if (blob) {
          screenshotFile = new File([blob], "beat-the-chain-results.png", { type: "image/png" });
        }
      } catch (err) {
        console.log("Failed to capture screenshot:", err);
      }
    }
    
    if (platform === "twitter") {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
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
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
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
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
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
              console.log("Share cancelled or failed:", err2);
            }
          } else {
            console.log("Share cancelled");
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
          console.log("Share cancelled or failed:", err);
        }
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          alert("Results copied to clipboard!");
        } catch (err) {
          console.log("Failed to copy to clipboard:", err);
        }
      }
    }
  }, [results]);
  
  // NEW: Handler for when the overlay is completed
  const handleOnboardingComplete = async (name: string) => {
    const finalName = name || "you";
    setPlayerName(finalName);
    setStoredPlayerName(finalName);
    
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

  const handleResetPlayer = () => {
    clearPlayerData(playerName);
    setPlayerName("you");
    setUserProfile(null);
    setShowUserMenu(false);
    setShowOverlay(true);
  };

  // We use the `group` class here to control UI state with Tailwind
  const containerClasses = [
    "flex h-screen flex-col group font-sans",
    testFinished ? "test-finished overflow-y-auto" : "overflow-hidden",
    testStarted ? "test-started" : "",
  ].filter(Boolean).join(" ");

  return (
    <div id="app-body" className={containerClasses} ref={appBodyRef} tabIndex={-1}>
      <Confetti ref={confettiRef} className="fixed top-0 left-0 z-[100] w-full h-full pointer-events-none" />
      
      {/* NEW: Render the overlay with AnimatePresence */}
      <AnimatePresence>
        {showOverlay && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {/* How to Play Overlay */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHowToPlay(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg bg-dark-kbd p-8 shadow-2xl border border-dark-dim/20 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pb-5">
                <h1 className="text-4xl font-bold text-dark-highlight font-nfs text-center">
                  Proof of Speed
                </h1>

                <div className="mt-6 text-dark-main font-mono">
                  <p className="mt-2 text-dark-dim">
                    Etherlink's new <span className="font-bold text-dark-main">sub-blocks</span> are so fast, they can lock in transactions in <span className="font-bold text-dark-main">&lt;=200 milliseconds</span>.
                  </p>
                  <p className="mt-2 text-dark-dim">
                    We built this game to help you feel that speed. The pacer bar moves at 200ms per letter. Your goal is to beat it.
                  </p>
        </div>

                <div className="mt-6 text-dark-main font-mono">
                  <h2 className="text-xl font-bold">How to Win</h2>
                  <ol className="list-none space-y-3 mt-3 text-dark-dim">
                    <li className="flex items-center">
                      <i className="fa fa-tachometer h-5 w-5 text-dark-highlight mr-3 flex-shrink-0" />
                      <span><span className="font-bold text-dark-main">Race the Pacer:</span> Type the full text before the green blocks are completely formed.</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fa fa-trophy h-5 w-5 text-dark-highlight mr-3 flex-shrink-0" />
                      <span><span className="font-bold text-dark-main">Get a Rank:</span> Your rank is based on your typing speed and accuracy.</span>
                    </li>
                  </ol>
                </div>

                <div className="mt-6 rounded-lg border border-dark-dim/30 bg-dark-bg/50 p-4 text-sm font-mono">
                  <div className="text-dark-main">
                    <div className="mb-1">
                      <span className="font-bold text-dark-highlight">Blockchain Speed Ranks</span>
                    </div>
                    <div className="text-dark-dim">
                      Your typing speed determines which blockchain you match. Can you beat Unichain's 200ms?
                    </div>
                  </div>
                  <ul className="list-disc list-inside pl-4 mt-3 space-y-1 text-sm text-dark-dim">
                    <li><span className="font-bold text-dark-main">Unichain/Base/Etherlink:</span> 150-200ms / letter (Lightning fast!)</li>
                    <li><span className="font-bold text-dark-main">Solana:</span> 201-400ms / letter (Super fast!)</li>
                    <li><span className="font-bold text-dark-main">ETH Layer2s:</span> 401-1000ms / letter (Fast!)</li>
                    <li><span className="font-bold text-dark-main">Polygon:</span> 1001-2000ms / letter (Quick!)</li>
                    <li><span className="font-bold text-dark-main">Ethereum Mainnet:</span> 2001-12000ms / letter (Standard speed)</li>
                    <li><span className="font-bold text-dark-main">Bitcoin:</span> &gt; 12000ms / letter (Slow and steady)</li>
                  </ul>
                </div>

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


      <div id="app-content" className="flex flex-grow flex-col">
        <header className="p-6">
          <nav className="flex items-center justify-between text-xl">
            <div className="flex items-center space-x-6">
              <button 
                onClick={initGame}
                className="hidden items-center space-x-3 text-dark-highlight hover:opacity-80 transition-opacity cursor-pointer"
                title="Reset game"
              >
                <img src="/etherlink-desktop-logo.svg" alt="Etherlink" className="h-12 w-auto" />
              </button>
              <div className="flex space-x-4">
                <button 
                  onClick={() => {
                    // Cycle through game modes: 15 -> 30 -> 60 -> 15
                    const currentIndex = GAME_MODES.indexOf(gameMode);
                    const nextIndex = (currentIndex + 1) % GAME_MODES.length;
                    setGameMode(GAME_MODES[nextIndex]);
                  }}
                  className="text-dark-dim hover:text-dark-highlight transition-colors" 
                  title="start typing to play"
                >
                  <i className="fa-solid fa-keyboard h-6 w-6" />
                </button>
                <a
                  href="/leaderboard"
                  className="text-dark-dim hover:text-dark-highlight transition-colors"
                  title="Leaderboards"
                >
                  <i className="fa-solid fa-star h-6 w-6" />
                </a>
                <a
                  href="https://etherlink.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark-dim hover:text-dark-highlight transition-colors"
                  title="About Etherlink Sub-blocks"
                >
                  <i className="fa-solid fa-circle-info h-6 w-6" />
                </a>
              <div className="relative">
              <button
                onClick={() => {
                    // Toggle user profile menu
                  if (playerName && playerName !== "you") {
                    const profile = getUserProfile(playerName);
                    if (profile.hasProfile && profile.bestGameMode) {
                      getUserBestScore(playerName, profile.bestGameMode).then((result) => {
                        if (result.data) {
                          setUserProfile(result.data);
                        } else {
                          setUserProfile(null);
                        }
                        setShowUserMenu(!showUserMenu);
                      });
                    } else {
                      setUserProfile(null);
                      setShowUserMenu(!showUserMenu);
                    }
                    } else {
                      // Still toggle the dropdown even if no player name
                      setShowUserMenu(!showUserMenu);
                  }
                }}
                  className="text-dark-dim hover:text-dark-highlight transition-colors cursor-pointer"
                  title="Settings"
              >
                  <i className="fa-solid fa-gear h-6 w-6" />
              </button>
              {/* User Profile Dropdown */}
              <AnimatePresence>
                {showUserMenu && playerName && playerName !== "you" && (
                  <motion.div
                    ref={userMenuRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-dark-kbd border border-dark-dim/20 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 space-y-3 font-mono">
                      <div className="border-b border-dark-dim/20 pb-3">
                        <div className="text-sm text-dark-dim mb-1">name</div>
                        <div className="text-lg font-bold text-dark-highlight">{playerName}</div>
                      </div>
                      {userProfile ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-dark-dim mb-1">rank</div>
                              <div className="text-sm font-bold text-dark-main">{userProfile.rank}</div>
                            </div>
                            <div>
                              <div className="text-xs text-dark-dim mb-1">score</div>
                              <div className="text-sm font-bold text-dark-main">{userProfile.score.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-dark-dim mb-1">letter per second</div>
                              <div className="text-sm font-bold text-dark-main">{userProfile.lps.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-dark-dim mb-1">mode</div>
                              <div className="text-sm font-bold text-dark-main">{userProfile.game_mode} words</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-dark-dim mb-1">rank</div>
                            <div className="text-sm font-bold text-dark-dim">-</div>
                          </div>
                          <div>
                            <div className="text-xs text-dark-dim mb-1">score</div>
                            <div className="text-sm font-bold text-dark-dim">-</div>
                          </div>
                          <div>
                            <div className="text-xs text-dark-dim mb-1">letter per second</div>
                            <div className="text-sm font-bold text-dark-dim">-</div>
                          </div>
                          <div>
                            <div className="text-xs text-dark-dim mb-1">mode</div>
                            <div className="text-sm font-bold text-dark-dim">-</div>
                          </div>
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
              className="flex items-center space-x-2 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm"
              title="Explore Etherlink"
            >
              <span>Explore Etherlink</span>
              <i className="fa-solid fa-arrow-up-right-from-square h-4 w-4" />
            </a>
          </nav>
        </header>

        <div className="relative z-10 flex flex-col items-center px-6 py-4 space-y-4">
          <div className="text-center">
            <span className="font-nfs text-[2.8125rem] text-dark-highlight">Proof of Speed</span>
          </div>
          <div className="flex items-center space-x-6 rounded-lg bg-dark-kbd p-2 text-sm font-mono">
            <button className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors" title="Time">
              <i className="fa-solid fa-clock h-4 w-4" />
              <span className="lowercase tracking-wider">time</span>
            </button>
            <button className="flex items-center space-x-1 text-dark-highlight hover:text-dark-highlight transition-colors" title="Words">
              <i className="fa-solid fa-hashtag h-4 w-4" />
              <span className="lowercase tracking-wider">words</span>
            </button>
            <div className="h-5 w-px bg-dark-dim" />
            <div className="flex items-center space-x-3 text-dark-main">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode}
                  className={`lowercase tracking-wider transition-colors cursor-pointer relative ${gameMode === mode ? "text-dark-highlight" : "hover:text-dark-main"}`}
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
                    {hoveredMode === mode && animatedNumber !== null ? animatedNumber : mode}
                  </motion.span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="relative z-0 -mt-16 flex flex-grow flex-col items-center justify-center group-[.test-finished]:overflow-y-auto group-[.test-finished]:justify-start group-[.test-finished]:py-8">
          <button
            id="language-btn"
            className="mb-4 inline-flex items-center gap-2 text-sm text-dark-dim hover:text-dark-highlight font-mono lowercase tracking-wider transition-colors"
          >
            <i className="fa-solid fa-globe h-4 w-4" />
            <span>english</span>
          </button>
          
          <div
            id="test-area"
            className="relative flex min-h-[200px] w-full max-w-5xl items-center justify-center group-[.test-finished]:hidden"
            onClick={() => appBodyRef.current?.focus()}
          >
            <div id="focus-message" className="absolute z-10 cursor-pointer text-lg font-mono group-[.test-started]:hidden">
              Click here or press any key to focus
            </div>
            
            <div id="words-wrapper" className="relative max-w-5xl mx-auto font-mono">
              <div id="cursor" ref={cursorRef} className="animate-blink absolute mt-[-2px] h-[2.25rem] w-[2px] bg-dark-highlight transition-all duration-100 hidden group-[.test-started]:block" />
              
              <div 
                id="words" 
                ref={wordsRef} 
                className="max-w-5xl min-h-[12.5rem] flex flex-wrap content-start overflow-y-auto transition-all duration-300 font-mono cursor-text" 
                style={{ 
                  fontSize: "32px", 
                  lineHeight: "1.5em", 
                  color: "#646669",
                  opacity: textFocused || testStarted ? 1 : 0.2
                }}
                onClick={() => {
                  if (!testStarted && !testFinished) {
                    setTextFocused(true);
                    // Focus the app body to capture keyboard input
                    appBodyRef.current?.focus();
                  }
                }}
              />
              
              {gameMode === 60 ? (
                <>
                  <div 
                    id="sub-block-bar" 
                    ref={subBlockBarRef}
                    className="absolute bottom-[-20px] left-0 h-[2px] w-0 bg-dark-highlight opacity-50"
                  />
                  {testStarted && (
                    <div className="absolute bottom-[-40px] left-0 text-sm text-dark-dim font-mono">
                      Creating Sub-blocks in &lt;200ms on Etherlink.......
                    </div>
                  )}
                </>
              ) : (
                <>
                  <PacerSquares 
                    key={pacerResetKey}
                    totalLetters={totalLetters}
                    testActive={testStarted}
                    speedMs={SUB_BLOCK_SPEED_MS}
                  />
                  {testStarted && (
                    <div className="absolute bottom-[-40px] left-0 text-sm text-dark-dim font-mono">
                      Creating Sub-blocks in &lt;200ms on Etherlink.......
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* --- NEW RESULTS SCREEN LAYOUT --- */}
          <div id="results-screen" ref={resultsScreenRef} className="text-center font-mono hidden group-[.test-finished]:block w-full max-w-4xl px-6">
            {/* 1. Big Score */}
            <div className="text-center mb-10">
              <div className="text-lg text-dark-dim">Final Score</div>
              <div id="result-score" className="text-7xl font-bold text-dark-highlight">
                <CountUp value={parseFloat(results.score) || 0} decimals={2} />
              </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* Column 1: Core Stats */}
              <div className="flex flex-col space-y-6">
                <div>
                  <div className="text-lg text-dark-dim text-left">letter per second</div>
                  <div id="result-lps" className="text-4xl font-bold text-dark-main text-left">
                    <CountUp value={parseFloat(results.lps) || 0} decimals={2} />
                  </div>
                </div>
                <div>
                  <div className="text-lg text-dark-dim text-left">acc</div>
                  <div id="result-acc" className="text-4xl font-bold text-dark-main text-left">
                    <CountUp value={parseFloat(results.accuracy.replace('%', '')) || 0} decimals={1} suffix="%" />
                  </div>
                </div>
              </div>

              {/* Column 2: Comparison Stats */}
              <div className="flex flex-col space-y-6">
                <div>
                  <div className="text-lg text-dark-dim text-left">your speed</div>
                  <div id="result-ms" className="text-3xl font-bold text-dark-main text-left">
                    <CountUp value={parseFloat(results.msPerLetter) || 0} decimals={0} /> <span className="text-xl">ms/letter</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg text-dark-dim text-left">time</div>
                  <div id="result-time" className="text-3xl font-bold text-dark-main text-left">
                    <CountUp value={parseFloat(results.time.replace('s', '')) || 0} decimals={2} suffix="s" />
                  </div>
                </div>
              </div>

              {/* Column 3: Real Leaderboard */}
              <div className="flex flex-col space-y-2">
                <div className="text-lg text-dark-dim text-left">rankings (words: {gameMode})</div>
                {rankingsLoading ? (
                  <div className="text-sm text-dark-dim">Loading...</div>
                ) : rankings.length === 0 ? (
                  <div className="text-sm text-dark-dim">No rankings yet</div>
                ) : (
                  rankings.slice(0, 4).map((entry, idx) => {
                    const isCurrentUser = entry.player_name === playerName;
                    const textColor = idx === 0 
                      ? "text-dark-highlight" 
                      : isCurrentUser 
                        ? "text-dark-main" 
                        : "text-dark-dim";
                    return (
                      <div key={entry.id} className={`flex justify-between text-xl ${textColor}`}>
                        <span className="truncate mr-2">{idx + 1}. {entry.player_name}</span>
                        <span className="flex-shrink-0">{entry.score.toFixed(2)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="mt-10 pt-6 border-t border-dark-kbd mb-20">
              <div className="text-center mb-6">
                {(() => {
                  const msPerLetter = parseFloat(results.msPerLetter) || 0;
                  const isFasterThanSubblocks = msPerLetter < 200 && results.rank === "Sub-blocks";
                  
                  return (
                    <>
                      <div className="text-lg text-dark-dim mb-2">
                        {isFasterThanSubblocks ? "You were faster than" : "You were as fast as"}
                      </div>
                      <div id="result-rank" className="text-3xl font-bold font-nfs text-dark-highlight mb-6">
                  {results.rank}
                </div>
                    </>
                  );
                })()}
              </div>
              
              {/* Rank Progress Bar */}
              {(() => {
                // Map the user's rank directly to the marker position
                // This ensures the triangle marker is always on top of the correct rank marker
                const rankToPosition: Record<string, number> = {
                  'Bitcoin': 0,
                  'Ethereum Mainnet': 20,
                  'Polygon': 40,
                  'ETH L2s': 60,
                  'Solana': 80,
                  'Sub-blocks': 100,
                };
                
                // Get the position directly from the rank
                const speedValue = rankToPosition[results.rank] ?? 0;
                
                // Clamp between 0 and 100
                const clampedSpeedValue = Math.max(0, Math.min(100, speedValue));
                
                // Helper function to calculate relative luminance
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

                // Helper function to calculate contrast ratio
                const getContrast = (color1: string, color2: string) => {
                  const lum1 = getLuminance(color1);
                  const lum2 = getLuminance(color2);
                  const lighter = Math.max(lum1, lum2);
                  const darker = Math.min(lum1, lum2);
                  return (lighter + 0.05) / (darker + 0.05);
                };

                // Background color (dark)
                const bgColor = '#323437';

                // Colors from logos: [background color, white/light color]
                const logoColors: Record<string, string[]> = {
                  'btc': ['#F7931A', '#FFFFFF'], // Bitcoin: orange bg, white symbol
                  'eth': ['#627EEA', '#FFFFFF'], // Ethereum: purple bg, white symbol
                  'matic': ['#6F41D8', '#FFFFFF'], // Polygon: purple bg, white symbol
                  'sol': ['#66F9A1', '#FFFFFF'], // Solana: green bg, white symbol
                  'xtz': ['#A6E000', '#FFFFFF'], // Tezos: lime green bg, white symbol
                };

                // Function to get best contrast color from logo
                const getBestContrastColor = (iconKey: string | null, defaultColor: string) => {
                  if (!iconKey || !logoColors[iconKey]) return defaultColor;
                  const colors = logoColors[iconKey];
                  const contrasts = colors.map(color => getContrast(color, bgColor));
                  const maxContrastIndex = contrasts.indexOf(Math.max(...contrasts));
                  return colors[maxContrastIndex];
                };

                // Define blockchain positions with equal spacing
                // Bitcoin at beginning (left), Sub-blocks at end (right)
                // Extract colors from logo icons (background colors from SVGs)
                const chains = [
                  { name: 'Bitcoin', ms: 600000, color: getBestContrastColor('btc', '#ff8c00'), icon: 'btc', displayTime: '10mins', gradientColor: '#F7931A' }, // Bitcoin orange from logo
                  { name: 'Ethereum', ms: 12000, color: getBestContrastColor('eth', '#ffd700'), icon: 'eth', displayTime: null, gradientColor: '#627EEA' }, // Ethereum purple from logo
                  { name: 'Polygon', ms: 2000, color: getBestContrastColor('matic', '#7B3FE4'), icon: 'matic', displayTime: null, gradientColor: '#6F41D8' }, // Polygon purple from logo
                  { name: 'ETH L2s', ms: 1000, color: getBestContrastColor('eth', '#87ceeb'), icon: 'eth', displayTime: null, gradientColor: '#627EEA' }, // Ethereum purple
                  { name: 'Solana', ms: 400, color: getBestContrastColor('sol', '#DC1FFF'), icon: 'sol', displayTime: null, gradientColor: '#66F9A1' }, // Solana green from logo
                  { name: 'Sub-blocks', ms: 200, color: getBestContrastColor('xtz', '#38FF9C'), icon: 'etherlink', displayTime: null, gradientColor: '#A6E000' }, // Etherlink logo
                ];
                
                // Equal spacing: 0%, 20%, 40%, 60%, 80%, 100%
                const blockchainPositions = chains.map((chain, index) => ({
                  ...chain,
                  position: (index / (chains.length - 1)) * 100
                }));
                
                // Calculate chart start and end positions based on label positions
                // Chart should start from Bitcoin icon (left edge of first label)
                // and end at the right edge of Sub-blocks text (last label)
                const chartStartOffset = 2.5; // Offset to align with Bitcoin icon
                const chartEndOffset = 5; // Offset to extend past Sub-blocks text
                const chartWidth = 100 - chartStartOffset - chartEndOffset;
                
                // Build smooth gradient from chain icon colors
                // Gradient extends full width, but colors align with marker positions
                // Map blockchain positions (0%, 20%, 40%, 60%, 80%, 100%) to actual positions on full-width gradient
                const getGradientPosition = (blockchainPosition: number) => {
                  // Convert blockchain position (0-100%) to actual position on full-width chart
                  return chartStartOffset + (blockchainPosition / 100) * chartWidth;
                };
                
                const gradientStops = chains.map((chain, index) => {
                  const blockchainPosition = (index / (chains.length - 1)) * 100;
                  const actualPosition = getGradientPosition(blockchainPosition);
                  return `${chain.gradientColor} ${actualPosition}%`;
                }).join(', ');
                // Add edge colors to fill the tips
                const gradientString = `${chains[0].gradientColor} 0%, ${gradientStops}, ${chains[chains.length - 1].gradientColor} 100%`;
                
                // Helper to lighten a hex color
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
                
                // Brighter version for animation (20% lighter)
                const brighterGradientStops = chains.map((chain, index) => {
                  const blockchainPosition = (index / (chains.length - 1)) * 100;
                  const actualPosition = getGradientPosition(blockchainPosition);
                  const lighterColor = lightenColor(chain.gradientColor, 0.2);
                  return `${lighterColor} ${actualPosition}%`;
                }).join(', ');
                const brighterGradientString = `${lightenColor(chains[0].gradientColor, 0.2)} 0%, ${brighterGradientStops}, ${lightenColor(chains[chains.length - 1].gradientColor, 0.2)} 100%`;
                
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
                              `linear-gradient(to right, ${gradientString})`,
                              `linear-gradient(to right, ${brighterGradientString})`,
                              `linear-gradient(to right, ${gradientString})`,
                            ]
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          style={{
                            background: `linear-gradient(to right, ${gradientString})`
                          }}
                        />
                        {/* Animated Shimmer Overlay */}
                        <motion.div
                          className="absolute inset-0 h-1 rounded-sm pointer-events-none"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                            backgroundSize: '200% 100%'
                          }}
                          animate={{
                            backgroundPosition: ['200% 0', '-200% 0']
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                </div>
                      
                      {/* Vertical Marker Lines for Each Blockchain - Adjusted for chart width */}
                      {blockchainPositions.map((blockchain) => {
                        // Adjust position to account for chart padding
                        const adjustedPosition = chartStartOffset + (blockchain.position / 100) * chartWidth;
                        return (
                          <div
                            key={blockchain.name}
                            className="absolute top-0"
                            style={{
                              left: `${adjustedPosition}%`,
                              transform: 'translateX(-50%)',
                              zIndex: 10,
                            }}
                          >
                            {/* Vertical Line */}
                            <div
                              className="w-px bg-dark-dim"
                              style={{ height: '24px' }}
                            />
                            
                            {/* Chain Label - Directly under marker */}
                            <div
                              className="absolute top-full mt-2"
                              style={{
                                left: '50%',
                                transform: 'translateX(-50%)',
                                minWidth: '100px',
                              }}
                            >
                              <div className="flex items-center gap-1">
                                {/* Icons - Using cryptocurrency-icons */}
                                {blockchain.icon && (
                                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    <img 
                                      src={blockchain.icon === 'etherlink' ? '/etherlink-logo.svg' : `/crypto-icons/${blockchain.icon}.svg`}
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
                                    {blockchain.displayTime || `${blockchain.ms.toLocaleString()}ms`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* User Position Indicator - Triangle only - Sliding animation */}
                      {clampedSpeedValue >= 0 && clampedSpeedValue <= 100 && (() => {
                        // Adjust user position to account for chart padding
                        const adjustedUserPosition = chartStartOffset + (clampedSpeedValue / 100) * chartWidth;
                        return (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, left: `${chartStartOffset}%` }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1,
                              left: `${adjustedUserPosition}%`
                            }}
                            transition={{ 
                              duration: 1.2,
                              ease: "easeOut"
                            }}
                            className="absolute z-50"
                            style={{ 
                              top: '2px',
                              transform: 'translateX(-50%) translateY(-18px)',
                              pointerEvents: 'none'
                            }}
                          >
                            {/* Arrow/Triangle pointing up - positioned on the line */}
                            <div
                              className="relative"
                              style={{
                                width: 0,
                                height: 0,
                                borderLeft: '12px solid transparent',
                                borderRight: '12px solid transparent',
                                borderBottom: '18px solid #38FF9C',
                                filter: 'drop-shadow(0 0 10px rgba(56, 255, 156, 1))',
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
                <span className="ml-1">restart</span>
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
                <div className="text-sm text-dark-dim font-mono lowercase tracking-wider">share your score</div>
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
                  onClick={() => handleShare("facebook")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share on Facebook"
                >
                  <i className="fa-brands fa-facebook h-4 w-4" />
                  <span>facebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("linkedin")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share on LinkedIn"
                >
                  <i className="fa-brands fa-linkedin h-4 w-4" />
                  <span>linkedin</span>
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

        <footer className="p-6">
          <div className="flex justify-center mb-4">
            <div className="flex space-x-4">
              <span className="flex items-center space-x-1 text-dark-dim font-mono">
                <kbd>tab</kbd>
                <span>+</span>
                <kbd>enter</kbd>
                <span>or</span>
                <kbd>esc</kbd>
                <span>- restart game</span>
              </span>
            </div>
          </div>
            <div className="flex justify-between text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <button
                onClick={() => setShowHowToPlay(true)}
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa-solid fa-circle-question h-4 w-4" />
                <span>how to play</span>
              </button>
              <a
                href="https://discord.gg/etherlink"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa-brands fa-discord h-4 w-4" />
                <span>discord</span>
              </a>
              <a
                href="https://twitter.com/etherlink"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa-brands fa-twitter h-4 w-4" />
                <span>twitter</span>
              </a>
              <a href="https://tezos.com/privacy-notice/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors">
                <i className="fa-solid fa-circle-info h-4 w-4" />
                <span>terms</span>
              </a>
              <a href="https://tezos.com/privacy-notice/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors">
                <i className="fa-solid fa-lock h-4 w-4" />
                <span>privacy</span>
              </a>
            </div>
            <div className="flex space-x-2 text-dark-dim">
              <span>etherlink</span>
              <a href="https://medium.com/@etherlink/announcing-ebisu-a-5th-upgrade-proposal-for-etherlink-mainnet-4dfdd1c8819e" target="_blank" rel="noopener noreferrer" className="hover:text-dark-highlight transition-colors">
                <span>v:5.0.0 ebisu</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
