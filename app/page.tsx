"use client"; // This is CRITICAL for React Hooks to work in the App Router

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Variants, HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import html2canvas from "html2canvas";
import dictionary from "../lib/dictionary";
import shuffle from "../lib/shuffle";
import { saveGameResult, getLeaderboard, getUserBestScore, getUserProfile } from "../lib/scores";
import type { LeaderboardEntry } from "../lib/types";
import OnboardingOverlay from "../components/OnboardingOverlay";

// --- GAME CONSTANTS ---
const SUB_BLOCK_SPEED_MS = 200;
const GAME_MODES = [15, 30, 60] as const; // Word counts
type GameMode = typeof GAME_MODES[number];
const ACCURACY_THRESHOLD = 90; // Minimum accuracy required to rank

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
  "beat the chain with this one simple test",
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

// --- COMPONENT ---
export default function Home() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [results, setResults] = useState<Results>(DEFAULT_RESULTS);
  const [gameMode, setGameMode] = useState<GameMode>(15);

  // NEW: State for overlay and player name
  const [showOverlay, setShowOverlay] = useState(true);
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

  const appBodyRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const subBlockBarRef = useRef<HTMLDivElement>(null);
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
        letterSpan.className = "text-2xl leading-[2.25rem]"; // Tailwind classes
        letterSpan.textContent = char;
        wordDiv.appendChild(letterSpan);
        letters.push(letterSpan);
      });

      if (wordIndex < words.length - 1) {
        const spaceSpan = document.createElement("span");
        spaceSpan.className = "text-2xl leading-[2.25rem]"; // Tailwind classes
        spaceSpan.textContent = " ";
        wordDiv.appendChild(spaceSpan);
        letters.push(spaceSpan);
      }

      container.appendChild(wordDiv);
    });

    stateRef.current.letterElements = letters;
    stateRef.current.totalLetters = letters.length;
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
    populateWords();
    
    // MODIFIED: Reset pacer bar logic added
    if (subBlockBarRef.current) {
      subBlockBarRef.current.style.transition = 'none';
      subBlockBarRef.current.style.width = '0%';
    }

    requestAnimationFrame(() => moveCursor(0));
  }, [moveCursor, populateWords]);

  const startTest = useCallback(() => {
    if (stateRef.current.testActive) return;
    stateRef.current.testActive = true;
    stateRef.current.startTime = performance.now();
    setTestStarted(true);
    setTestFinished(false);

    // MODIFIED: Pacer bar animation logic added
    if (subBlockBarRef.current) {
        const totalLetters = stateRef.current.totalLetters;
        const subBlockDuration = (totalLetters * SUB_BLOCK_SPEED_MS) / 1000;
        
        // Apply dynamic duration and trigger animation
        subBlockBarRef.current.style.transition = `width ${subBlockDuration}s linear`;
        
        // We must force a reflow for the new duration to apply before changing width
        void subBlockBarRef.current.offsetWidth; 
        
        subBlockBarRef.current.style.width = '100%';
    }
  }, []); // Note: This function has no dependencies, it only reads from refs

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
    const finalScore = lettersPerSecond * (accuracy / 100);
    const msPerLetter = durationMs / lettersCount;
    const comparisonMs = msPerLetter - SUB_BLOCK_SPEED_MS;

    // Rank is only awarded for high accuracy
    let rank = "Beginner";
    const highAccuracy = accuracy >= ACCURACY_THRESHOLD;
    if (highAccuracy) {
      if (msPerLetter <= SUB_BLOCK_SPEED_MS) rank = "Sub-blocks";
      else if (msPerLetter <= 350) rank = "Pro";
      else if (msPerLetter <= 500) rank = "Ether Link";
    }

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
    saveGameResult({
      player_name: playerName,
      score: parseFloat(finalScore.toFixed(2)),
      lps: parseFloat(lettersPerSecond.toFixed(2)),
      accuracy: parseFloat(Math.max(accuracy, 0).toFixed(1)),
      rank,
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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('button[title="User Profile"]')) {
          setShowUserMenu(false);
        }
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
          letter?.classList.remove("text-dark-main", "text-dark-error", "underline");
          moveCursor(stateRef.current.currentIndex);
        }
        return;
      }

      if (event.key.length === 1 && stateRef.current.currentIndex < stateRef.current.letterElements.length) {
        const currentLetter = stateRef.current.letterElements[stateRef.current.currentIndex];
        if (!currentLetter) return;

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

  const handleRestart = useCallback(() => {
    initGame();
    appBodyRef.current?.focus();
  }, [initGame]);

  const handleShare = useCallback(async (platform?: "twitter" | "facebook" | "linkedin") => {
    const shareText = `I scored ${results.score} on Beat the Chain! ${results.lps} letters per second with ${results.accuracy} accuracy. Can you beat Etherlink's sub-blocks?`;
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
      // Native Web Share API with screenshot
      if (navigator.share && screenshotFile) {
        try {
          await navigator.share({
            title: "Beat the Chain - Typing Test Results",
            text: shareText,
            url: shareUrl,
            files: [screenshotFile],
          });
        } catch (err) {
          // User cancelled or error occurred, fallback to text-only share
          if (err instanceof Error && err.name !== "AbortError") {
            try {
              await navigator.share({
                title: "Beat the Chain - Typing Test Results",
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
            title: "Beat the Chain - Typing Test Results",
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
  const handleOnboardingComplete = (name: string) => {
    setPlayerName(name || "you");
    setShowOverlay(false);
    // Focus the game window now that the overlay is gone
    requestAnimationFrame(() => appBodyRef.current?.focus());
  };

  // We use the `group` class here to control UI state with Tailwind
  const containerClasses = [
    "flex h-screen flex-col overflow-hidden group font-sans",
    testStarted ? "test-started" : "",
    testFinished ? "test-finished" : "",
  ].filter(Boolean).join(" ");

  return (
    <div id="app-body" className={containerClasses} ref={appBodyRef} tabIndex={-1}>
      
      {/* NEW: Render the overlay with AnimatePresence */}
      <AnimatePresence>
        {showOverlay && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {bannerVisible && (
        <div className="bg-gradient-to-r from-dark-highlight via-green-400 to-dark-highlight flex items-center justify-center px-4 py-2 text-sm text-black">
          <span>
            Are you faster than{" "}
            <a
              href="https://etherlink.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              Etherlink Sub-blocks
            </a>
            ? Go Ahead!{" "}
            <WavyTextComponent text="Beat the Chain!" replay={wavyReplay} className="font-bold" />
          </span>
        </div>
      )}

      <div id="app-content" className="flex flex-grow flex-col">
        <header className="p-6">
          <nav className="flex items-center justify-between text-xl">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex flex-col items-start space-y-1 text-dark-highlight">
                <img src="/etherlink-logo.svg" alt="Etherlink" className="h-12 w-auto" />
              </div>
              <div className="flex space-x-4">
                <button className="text-dark-dim hover:text-dark-highlight transition-colors" title="Test">
                  <i className="fa fa-keyboard-o h-6 w-6" />
                </button>
                <a
                  href="/leaderboard"
                  className="text-dark-dim hover:text-dark-highlight transition-colors"
                  title="Leaderboards"
                >
                  <i className="fa fa-star h-6 w-6" />
                </a>
                <button className="text-dark-dim hover:text-dark-highlight transition-colors" title="About">
                  <i className="fa fa-info-circle h-6 w-6" />
                </button>
                <button className="text-dark-dim hover:text-dark-highlight transition-colors" title="Settings">
                  <i className="fa fa-cog h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4 relative">
              <button
                onClick={() => {
                  const profile = getUserProfile(playerName);
                  if (profile.hasProfile && profile.bestGameMode) {
                    getUserBestScore(playerName, profile.bestGameMode).then((result) => {
                      if (result.data) {
                        setUserProfile(result.data);
                        setShowUserMenu(!showUserMenu);
                      }
                    });
                  } else {
                    setShowUserMenu(false);
                  }
                }}
                className="text-dark-dim hover:text-dark-highlight transition-colors relative mr-5 cursor-pointer"
                title="User Profile"
              >
                <i className="fa fa-user h-6 w-6" />
              </button>

              {/* User Profile Dropdown */}
              <AnimatePresence>
                {showUserMenu && userProfile && (
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
                        <div className="text-lg font-bold text-dark-highlight">{userProfile.player_name}</div>
                      </div>
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </header>

        <div className="relative z-10 flex justify-center px-6 py-4">
          <div className="flex items-center space-x-6 rounded-lg bg-dark-kbd p-2 text-sm font-mono">
            <button className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors" title="Time">
              <i className="fa fa-clock-o h-4 w-4" />
              <span className="lowercase tracking-wider">time</span>
            </button>
            <button className="flex items-center space-x-1 text-dark-highlight hover:text-dark-highlight transition-colors" title="Words">
              <i className="fa fa-hashtag h-4 w-4" />
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

        <main className="relative z-0 -mt-16 flex flex-grow flex-col items-center justify-center">
          <button
            id="language-btn"
            className="mb-4 inline-flex items-center gap-2 text-sm text-dark-dim hover:text-dark-highlight font-mono lowercase tracking-wider transition-colors"
          >
            <i className="fa fa-globe h-4 w-4" />
            <span>english</span>
          </button>
          
          <div
            id="test-area"
            className="relative flex h-[168px] w-full max-w-5xl items-center justify-center group-[.test-finished]:hidden"
            onClick={() => appBodyRef.current?.focus()}
          >
            <div id="focus-message" className="absolute z-10 cursor-pointer text-lg font-mono group-[.test-started]:hidden">
              Click here or press any key to focus
            </div>
            
            <div id="words-wrapper" className="relative max-w-5xl mx-auto font-mono">
              <div id="cursor" ref={cursorRef} className="animate-blink absolute mt-[-2px] h-[2.25rem] w-[2px] bg-dark-highlight transition-all duration-100 hidden group-[.test-started]:block" />
              
              <div id="words" ref={wordsRef} className="max-w-5xl h-[10.5rem] flex flex-wrap content-start overflow-hidden text-2xl leading-[2.5rem] opacity-20 transition-opacity duration-300 group-[.test-started]:opacity-100" />
              
              <div 
                id="sub-block-bar" 
                ref={subBlockBarRef}
                className="absolute bottom-[-4px] left-0 h-[2px] w-0 bg-dark-highlight opacity-50"
              />
            </div>
          </div>

          {/* --- NEW RESULTS SCREEN LAYOUT --- */}
          <div id="results-screen" ref={resultsScreenRef} className="text-center font-mono hidden group-[.test-finished]:block w-full max-w-4xl px-6">
            {/* 1. Big Score */}
            <div className="text-center mb-10">
              <div className="text-lg text-dark-dim">Final Score</div>
              <div id="result-score" className="text-7xl font-bold text-dark-highlight">
                {results.score}
              </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* Column 1: Core Stats */}
              <div className="flex flex-col space-y-6">
                <div>
                  <div className="text-lg text-dark-dim text-left">letter per second</div>
                  <div id="result-lps" className="text-4xl font-bold text-dark-main text-left">
                    {results.lps}
                  </div>
                </div>
                <div>
                  <div className="text-lg text-dark-dim text-left">acc</div>
                  <div id="result-acc" className="text-4xl font-bold text-dark-main text-left">
                    {results.accuracy}
                  </div>
                </div>
              </div>

              {/* Column 2: Comparison Stats */}
              <div className="flex flex-col space-y-6">
                <div>
                  <div className="text-lg text-dark-dim text-left">your speed</div>
                  <div id="result-ms" className="text-3xl font-bold text-dark-main text-left">
                    {results.msPerLetter} <span className="text-xl">ms/letter</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg text-dark-dim text-left">vs. sub-block</div>
                  <div
                    id="result-comparison"
                    className={`text-3xl font-bold text-left ${
                      results.comparison.startsWith("-") ? "text-dark-highlight" : "text-dark-error"
                    }`}
                  >
                    {results.comparison} ms
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
                        <span>{idx + 1}. {entry.player_name}</span>
                        <span>{entry.score.toFixed(2)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="mt-10 pt-6 border-t border-dark-kbd flex justify-center space-x-12">
              <div className="text-center">
                <div className="text-lg text-dark-dim">rank</div>
                <div id="result-rank" className="text-3xl font-bold text-dark-main">
                  {results.rank}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg text-dark-dim">time</div>
                <div id="result-time" className="text-3xl font-bold text-dark-main">
                  {results.time}
                </div>
              </div>
            </div>

            {/* Restart Button and Leaderboard Link */}
            <div className="mt-12 flex items-center justify-center space-x-6">
              <button
                type="button"
                onClick={handleRestart}
                className="text-lg text-dark-dim hover:text-dark-highlight font-mono lowercase tracking-wider transition-colors flex items-center"
              >
                <i className="fa fa-refresh h-4 w-4" />
                <span className="ml-1">restart</span>
              </button>
              <Link
                href="/leaderboard"
                className="text-lg text-dark-dim hover:text-dark-highlight font-mono lowercase tracking-wider transition-colors flex items-center"
              >
                <i className="fa fa-star h-4 w-4" />
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
                  <i className="fa fa-twitter h-4 w-4" />
                  <span>twitter</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("facebook")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share on Facebook"
                >
                  <i className="fa fa-facebook h-4 w-4" />
                  <span>facebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("linkedin")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share on LinkedIn"
                >
                  <i className="fa fa-linkedin h-4 w-4" />
                  <span>linkedin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md bg-dark-kbd hover:bg-dark-kbd/80 text-dark-dim hover:text-dark-highlight transition-colors font-mono text-sm lowercase tracking-wider"
                  title="Share"
                >
                  <i className="fa fa-share-alt h-4 w-4" />
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
              <a
                href="mailto:reachout@etherlink.com"
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa fa-envelope h-4 w-4" />
                <span>contact</span>
              </a>
              <a
                href="https://github.com/etherlinkcom"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa fa-github h-4 w-4" />
                <span>github</span>
              </a>
              <a
                href="https://discord.gg/etherlink"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa fa-slack h-4 w-4" />
                <span>discord</span>
              </a>
              <a
                href="https://twitter.com/etherlink"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors"
              >
                <i className="fa fa-twitter h-4 w-4" />
                <span>twitter</span>
              </a>
              <a href="https://tezos.com/privacy-notice/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors">
                <i className="fa fa-info-circle h-4 w-4" />
                <span>terms</span>
              </a>
              <a href="#" className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors">
                <i className="fa fa-shield h-4 w-4" />
                <span>security</span>
              </a>
              <a href="https://tezos.com/privacy-notice/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors">
                <i className="fa fa-lock h-4 w-4" />
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
