"use client";

import { useState, useEffect, ComponentProps } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Root as ResizableRoot, Content as ResizableContent } from "./ResizablePanel";
import useMeasure from "react-use-measure";
import WelcomeToProofOfSpeed from "./WelcomeToProofOfSpeed";

type OnboardingOverlayProps = {
  onComplete: (name: string) => void;
  onSignInWithTwitter?: () => void;
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

export default function OnboardingOverlay({ onComplete, onSignInWithTwitter }: OnboardingOverlayProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [errorRef, errorBounds] = useMeasure();

  const handleNext = () => {
    if (step >= 2) return
    setStep(step + 1)
  }

  const handleBack = () => {
    if (step <= 1) return
    setStep(step - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    // Validate player name format (server will also validate profanity)
    const nameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
    if (nameRegex.test(trimmedName)) {
      onComplete(trimmedName);
    }
  };

  const handleSignInWithTwitter = () => {
    if (!onSignInWithTwitter) return
    onSignInWithTwitter()
  }

  // Prevent body scroll when overlay is mounted
  useEffect(() => {
    // Save the original overflow style
    const originalOverflow = document.body.style.overflow;
    const originalOverflowY = document.documentElement.style.overflowY;
    
    // Disable scrolling on body and html
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflowY = "hidden";
    
    // Cleanup: restore original overflow when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflowY = originalOverflowY;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-5xl rounded-lg bg-dark-kbd p-8 shadow-2xl border border-dark-dim/20 mx-4 overflow-hidden max-h-[90vh]"
      >
        {/* Fixed height container for seamless transitions */}
        <div className="relative h-[600px] overflow-y-auto max-h-full">
          <ResizableRoot value={step.toString()}>
            <ResizableContent value="1">
              <div className="pb-20">
              <WelcomeToProofOfSpeed />

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
                  className="rounded-md px-4 py-2 text-sm font-bold text-dark-highlight hover:text-dark-highlight/80 font-mono transition-colors flex items-center gap-2"
                >
                  <span className="font-mono">Continue</span>
                  <i className="fa-solid fa-arrow-right h-4 w-4" />
                </button>
              </div>
              </div>
            </ResizableContent>

            <ResizableContent value="2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="max-w-md w-full">
              <h1 className="text-3xl font-bold text-dark-highlight font-nfs text-center">
                Enter your name
              </h1>
              <p className="text-center text-dark-dim mt-2 font-mono">
                Enter your name or sign in with Twitter to appear on the leaderboard.
              </p>

              <div className="mt-8 space-y-4">
                {/* Name Input */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      autoFocus
                      className="w-full rounded-md border-2 border-dark-dim/50 bg-dark-bg p-4 text-2xl font-bold text-dark-main font-mono placeholder:font-normal focus:outline-none focus:ring-0 transition-colors"
                      style={{ 
                        borderColor: /^[a-zA-Z0-9._-]{3,50}$/.test(name.trim()) ? "#39ff9c" : undefined
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#39ff9c"}
                      onBlur={(e) => e.target.style.borderColor = /^[a-zA-Z0-9._-]{3,50}$/.test(name.trim()) ? "#39ff9c" : ""}
                    />
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
                          if (!trimmed) return null;
                          
                          // Validate synchronously for format, async for profanity
                          const nameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
                          const formatError = !nameRegex.test(trimmed);
                          
                          // For profanity check, we'll validate on submit (async)
                          // Format error shows immediately for better UX
                          return formatError ? (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="text-center text-dark-dim mt-2 text-sm font-mono"
                              style={{ lineHeight: "1.6", paddingBottom: "0.125rem" }}
                            >
                              Name must be 3-50 characters and only contain letters, numbers, dots, hyphens, or underscores
                            </motion.p>
                          ) : null;
                        })()}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  <button
                    type="submit"
                    disabled={!/^[a-zA-Z0-9._-]{3,50}$/.test(name.trim())}
                    className="w-full rounded-full border border-dark-dim/30 py-3 px-4 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{ backgroundColor: "#39ff9c" }}
                  >
                    <span className="font-mono">Play with Name</span>
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dark-dim/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-dark-kbd text-dark-dim font-mono">or</span>
                  </div>
                </div>

                {/* Twitter Sign In */}
                <button
                  type="button"
                  onClick={handleSignInWithTwitter}
                  className="w-full rounded-full border border-dark-dim/30 py-3 px-4 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-3"
                  style={{ backgroundColor: "#39ff9c" }}
                >
                  <i className="fa-brands fa-x-twitter h-5 w-5" />
                  <span>Sign in with Twitter</span>
                </button>
              </div>

              <div className="mt-6 flex justify-start">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-md px-4 py-2 text-sm font-bold text-dark-dim hover:text-dark-highlight font-mono transition-colors flex items-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left h-4 w-4" />
                  <span className="font-mono">Back</span>
                </button>
              </div>
                </div>
              </div>
            </ResizableContent>
          </ResizableRoot>
        </div>
      </motion.div>
    </motion.div>
  );
}


