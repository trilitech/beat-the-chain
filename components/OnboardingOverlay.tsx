"use client";

import { useState, ComponentProps } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Root as ResizableRoot, Content as ResizableContent } from "./ResizablePanel";
import useMeasure from "react-use-measure";

type OnboardingOverlayProps = {
  onComplete: (name: string) => void;
};

function Step({ step, currentStep }: { step: number; currentStep: number }) {
  let status =
    currentStep === step
      ? "active"
      : currentStep < step
      ? "inactive"
      : "complete";

  return (
    <motion.div animate={status} className="relative">
      <motion.div
        variants={{
          active: {
            scale: 1,
            transition: {
              delay: 0,
              duration: 0.2,
            },
          },
          complete: {
            scale: 1.25,
          },
        }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          type: "tween",
          ease: "circOut",
        }}
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: "#39ff9c20" }}
      />
      <motion.div
        initial={false}
        variants={{
          inactive: {
            backgroundColor: "transparent",
            borderColor: "#4a5568", // dark-dim
            color: "#4a5568",
          },
          active: {
            backgroundColor: "transparent",
            borderColor: "#39ff9c", // dark-highlight (Etherlink green)
            color: "#39ff9c",
          },
          complete: {
            backgroundColor: "#39ff9c",
            borderColor: "#39ff9c",
            color: "#000000",
          },
        }}
        transition={{ duration: 0.2 }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold"
      >
        <div className="flex items-center justify-center">
          {status === "complete" && (
            <CheckIcon className="h-6 w-6 text-black" />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CheckIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: 0.2,
          type: "tween",
          ease: "easeOut",
          duration: 0.3,
        }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export default function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [errorRef, errorBounds] = useMeasure();

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    // Remove @ if user included it
    const cleanHandle = trimmedName.startsWith('@') ? trimmedName.slice(1) : trimmedName;
    // Validate X handle: alphanumeric, underscores, 1-15 characters (Twitter/X limit)
    const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
    if (cleanHandle && handleRegex.test(cleanHandle)) {
      onComplete(cleanHandle);
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
        className="w-full max-w-5xl rounded-lg bg-dark-kbd p-8 shadow-2xl border border-dark-dim/20 mx-4"
      >
        {/* Fixed height container for seamless transitions */}
        <div className="relative h-[600px] overflow-hidden">
          <ResizableRoot value={step.toString()}>
            <ResizableContent value="1">
              <div className="pb-5">
              <h1 className="text-4xl font-bold text-dark-highlight font-nfs text-center">
                Proof of Speed
              </h1>
              
              <h2 className="hidden text-xl font-bold font-sedgwick text-center mt-4">
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
                  <li className="flex items-center hidden">
                    <i className="fa fa-bullseye h-5 w-5 text-dark-highlight mr-3 flex-shrink-0" />
                    <span><span className="font-bold text-dark-main">Accuracy is Key:</span> Your Final Score is (LPS x Accuracy). Sloppy typing won't win.</span>
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
                    Your typing speed determines which blockchain you match. Can you beat Etherlink Sub-block's 200ms?
                  </div>
                </div>
                <ul className="list-disc list-inside pl-4 mt-3 space-y-1 text-sm text-dark-dim">
                  <li><span className="font-bold text-dark-main">Etherlink/Base/Unichain:</span> 150-200ms / letter (Lightning fast!)</li>
                  <li><span className="font-bold text-dark-main">Solana:</span> 201-400ms / letter (Super fast!)</li>
                  <li><span className="font-bold text-dark-main">ETH Layer2s:</span> 401-1000ms / letter (Fast!)</li>
                  <li><span className="font-bold text-dark-main">Polygon:</span> 1001-2000ms / letter (Quick!)</li>
                  <li><span className="font-bold text-dark-main">Ethereum Mainnet:</span> 2001-12000ms / letter (Standard speed)</li>
                  <li><span className="font-bold text-dark-main">Bitcoin:</span> &gt; 12000ms / letter (Slow and steady)</li>
                </ul>
              </div>

              <div className="mt-4 mb-4 flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={step === 1}
                  className={`${
                    step === 1 ? "pointer-events-none opacity-50" : ""
                  } rounded-md px-4 py-2 text-sm font-bold text-dark-dim hover:text-dark-highlight font-mono transition-colors flex items-center gap-2`}
                >
                  <i className="fa-solid fa-arrow-left h-4 w-4" />
                  <span className="font-mono">Back</span>
                </button>
                <button
                  onClick={handleNext}
                  className="rounded-full border border-dark-dim/30 py-2 px-4 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: "#39ff9c" }}
                >
                  <span className="font-mono mr-6">Continue</span>
                  <i className="fa-solid fa-arrow-right h-4 w-4" />
                </button>
              </div>
              </div>
            </ResizableContent>

            <ResizableContent value="2">
              <div className="absolute inset-0 flex items-center justify-center">
                <form
                  onSubmit={handleSubmit}
                  className="max-w-md w-full"
                >
              <h1 className="text-3xl font-bold text-dark-highlight font-nfs text-center">
                What's your X handle?
              </h1>
              <p className="text-center text-dark-dim mt-2 font-mono">
                Enter your X (Twitter) handle to appear on the leaderboard.
              </p>

              <div className="relative mt-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="@adebola.xtz"
                  autoFocus
                  className="w-full rounded-md border-2 border-dark-dim/50 bg-dark-bg p-4 pr-12 text-2xl font-bold text-dark-main font-mono placeholder:font-normal focus:outline-none focus:ring-0 transition-colors"
                  style={{ 
                    borderColor: (() => {
                      const trimmed = name.trim();
                      const cleanHandle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
                      const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
                      return cleanHandle && handleRegex.test(cleanHandle) ? "#39ff9c" : undefined;
                    })()
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#39ff9c"}
                  onBlur={(e) => e.target.style.borderColor = ""}
                />
                <i className="fa-brands fa-twitter absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-dark-dim" />
              </div>
              
              <motion.div
                animate={{ height: errorBounds.height > 0 ? errorBounds.height : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div ref={errorRef} style={{ paddingBottom: "0.25rem" }}>
                  <AnimatePresence>
                    {(() => {
                      const trimmed = name.trim();
                      const cleanHandle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
                      const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
                      const isValid = cleanHandle && handleRegex.test(cleanHandle);
                      const hasError = trimmed && !isValid;
                      
                      return hasError ? (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="text-center text-dark-dim mt-2 text-sm font-mono"
                          style={{ lineHeight: "1.6", paddingBottom: "0.125rem" }}
                        >
                          Please enter a valid X handle (1-15 characters, letters, numbers, and underscores only)
                        </motion.p>
                      ) : null;
                    })()}
                  </AnimatePresence>
                </div>
              </motion.div>

              <div className="mt-4">
                <p className="text-center text-dark-dim text-sm font-mono">
                  You must share your score to be eligible for a prize.
                </p>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-md px-4 py-2 text-sm font-bold text-dark-dim hover:text-dark-highlight font-mono transition-colors flex items-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left h-4 w-4" />
                  <span className="font-mono">Back</span>
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    const trimmed = name.trim();
                    const cleanHandle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
                    const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
                    return !trimmed || !handleRegex.test(cleanHandle);
                  })()}
                  className="rounded-full border border-dark-dim/30 py-2 px-4 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: "#39ff9c" }}
                >
                  <span className="font-mono mr-6">Play</span>
                  <i className="fa-solid fa-play h-4 w-4" />
                </button>
              </div>
                </form>
              </div>
            </ResizableContent>
          </ResizableRoot>
        </div>
      </motion.div>
    </motion.div>
  );
}


