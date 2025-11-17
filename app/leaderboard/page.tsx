"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard } from "../../lib/scores";
import type { LeaderboardEntry } from "../../lib/types";

const GAME_MODES = [15, 30, 60] as const;
type GameMode = typeof GAME_MODES[number];

const ITEMS_PER_PAGE = 20;

export default function LeaderboardPage() {
  const [gameMode, setGameMode] = useState<GameMode>(15);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      // Fetch a large number of entries for pagination (500 should be enough)
      const { data, error: fetchError } = await getLeaderboard(gameMode, 500);
      if (fetchError) {
        setError(fetchError);
        setLeaders([]);
      } else {
        setLeaders(data || []);
      }
      setLoading(false);
      // Reset to page 1 when game mode changes
      setCurrentPage(1);
    };

    fetchLeaderboard();
  }, [gameMode]);

  // Calculate pagination
  const totalPages = Math.ceil(leaders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLeaders = leaders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of leaderboard when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-dark-bg text-dark-main font-sans">
      <header className="p-6">
        <nav className="flex items-center justify-between text-xl">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-dark-highlight">
              <i className="fa fa-keyboard-o h-6 w-6" />
              <span className="text-lg font-semibold">Beat the Chain</span>
            </Link>
            <span className="text-dark-dim text-sm">/ leaderboard</span>
          </div>
          <Link
            href="/"
            className="text-sm text-dark-dim hover:text-dark-main font-mono lowercase tracking-wider"
          >
            back to game
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-10">
        <div className="w-full max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <i className="fa fa-star h-6 w-6 text-dark-highlight" />
              <h1 className="text-2xl font-semibold">leaderboard</h1>
            </div>
            {/* Game Mode Selector */}
            <div className="flex items-center space-x-2 rounded-lg bg-dark-kbd px-2 py-1 text-sm font-mono">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={`px-3 py-1 rounded transition-colors ${
                    gameMode === mode
                      ? "bg-dark-highlight text-black"
                      : "text-dark-dim hover:text-dark-main"
                  }`}
                >
                  {mode} words
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-dark-kbd bg-dark-kbd/40 p-8 text-center text-dark-dim font-mono">
              <i className="fa fa-spinner fa-spin h-6 w-6 mx-auto mb-2" />
              <div>Loading leaderboard...</div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-dark-kbd bg-dark-kbd/40 p-8 text-center text-dark-error font-mono">
              <div className="mb-2">Error loading leaderboard</div>
              <div className="text-sm text-dark-dim">{error}</div>
            </div>
          ) : leaders.length === 0 ? (
            <div className="rounded-lg border border-dark-kbd bg-dark-kbd/40 p-8 text-center text-dark-dim font-mono">
              <div>No scores yet for {gameMode} words mode.</div>
              <div className="text-sm mt-2">Be the first to set a record!</div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-dark-kbd bg-dark-kbd/40">
                <div className="grid grid-cols-5 gap-3 border-b border-dark-kbd px-4 py-3 text-xs font-mono uppercase tracking-widest text-dark-dim">
                  <div className="text-left">rank</div>
                  <div className="text-left col-span-2">user</div>
                  <div className="text-right">lps</div>
                  <div className="text-right">acc</div>
                </div>
                <div className="divide-y divide-dark-kbd">
                  {currentLeaders.map((leader, idx) => (
                    <div
                      key={leader.id}
                      className="grid grid-cols-5 gap-3 px-4 py-3 text-sm font-mono"
                    >
                      <div className="text-left">
                        <div className="text-dark-dim">#{startIndex + idx + 1}</div>
                        <div className="text-xs text-dark-highlight">{leader.rank}</div>
                      </div>
                      <div className="col-span-2 text-left">
                        <div>{leader.player_name}</div>
                        <div className="text-xs text-dark-dim">{leader.game_mode} words</div>
                      </div>
                      <div className="text-right text-dark-highlight">{leader.lps.toFixed(2)}</div>
                      <div className="text-right text-dark-main">{leader.accuracy.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-md bg-dark-kbd text-dark-main font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-highlight hover:text-black transition-colors"
                  >
                    <i className="fa fa-chevron-left mr-1" />
                    Prev
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                              currentPage === page
                                ? "bg-dark-highlight text-black"
                                : "bg-dark-kbd text-dark-main hover:bg-dark-highlight hover:text-black"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-dark-dim">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-md bg-dark-kbd text-dark-main font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-highlight hover:text-black transition-colors"
                  >
                    Next
                    <i className="fa fa-chevron-right ml-1" />
                  </button>
                </div>
              )}

              {/* Page info */}
              {leaders.length > 0 && (
                <div className="mt-4 text-center text-sm text-dark-dim font-mono">
                  Showing {startIndex + 1}-{Math.min(endIndex, leaders.length)} of {leaders.length} entries
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="p-6">
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
  );
}


