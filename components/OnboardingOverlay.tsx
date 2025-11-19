"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type OnboardingOverlayProps = {
  onComplete: (name: string) => void;
};

export default function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState<"info" | "name">("info");
  const [name, setName] = useState("");

  const handleNext = () => {
    setStep("name");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName && trimmedName.length >= 3) {
      onComplete(trimmedName);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg bg-dark-kbd p-8 shadow-2xl border border-dark-dim/20 mx-4"
      >
        <AnimatePresence mode="wait">
          {step === "info" && (
            <motion.div
              key="info"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-4xl font-bold text-dark-highlight font-nfs text-center">
                Proof of Speed
              </h1>
              
              <h2 className="text-xl font-bold font-sedgwick text-center mt-4">
                Beat the speed of Etherlink's Sub-blocks
              </h2>

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
                    <i className="fa fa-bullseye h-5 w-5 text-dark-highlight mr-3 flex-shrink-0" />
                    <span><span className="font-bold text-dark-main">Accuracy is Key:</span> Your Final Score is (LPS x Accuracy). Sloppy typing won't win.</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fa fa-trophy h-5 w-5 text-dark-highlight mr-3 flex-shrink-0" />
                    <span><span className="font-bold text-dark-main">Get a Rank:</span> Your rank is based on your typing speed and accuracy. Faster and more accurate typing = better blockchain rank!</span>
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

              <button
                onClick={handleNext}
                className="mt-8 mx-auto block rounded-full bg-dark-highlight py-3 px-6 text-lg font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === "name" && (
            <motion.form
              key="name"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="max-w-md mx-auto"
            >
              <h1 className="text-3xl font-bold text-dark-highlight font-nfs text-center">
                What's your name?
              </h1>
              <p className="text-center text-dark-dim mt-2 font-mono">
                Enter your name to appear on the leaderboard.
              </p>

              <div className="relative mt-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="adebola.xtz"
                  autoFocus
                  className="w-full rounded-md border-2 border-dark-dim/50 bg-dark-bg p-4 pr-12 text-2xl font-bold text-dark-main font-mono placeholder:font-normal focus:border-dark-highlight focus:outline-none focus:ring-0"
                />
                <i className="fa fa-user absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-dark-dim" />
              </div>
              
              {name.trim() && name.trim().length < 3 && (
                <p className="text-center text-dark-dim mt-2 text-sm font-mono">
                  Name must be at least 3 characters
                </p>
              )}

              <button
                type="submit"
                disabled={!name.trim() || name.trim().length < 3}
                className="mt-6 mx-auto block rounded-full bg-dark-highlight py-3 px-6 text-lg font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Play
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}


