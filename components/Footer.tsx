"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Footer() {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <>
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
                      Your typing speed determines which blockchain you match. Can you beat <a href="https://etherlink.com" target="_blank" rel="noopener noreferrer" className="text-dark-highlight hover:underline">Etherlink</a> Sub-block's 200ms speed?
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
    </>
  );
}

