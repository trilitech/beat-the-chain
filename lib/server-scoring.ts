export function calculateScore(
  lps: number,
  accuracy: number,
  gameMode: number,
  _totalErrors: number,
  _correctedErrors: number,
  _totalLetters: number
): number {
  const accuracyDecimal = accuracy / 100
  const baseScore = lps * (accuracyDecimal * accuracyDecimal)

  const gameModeMultiplier = gameMode === 30 ? 1.22 : 1.0
  return baseScore * gameModeMultiplier
}

export function calculateRank(score: number, accuracy: number): string {
  const MIN_ACCURACY_GRANDMASTER = 98
  const MIN_ACCURACY_TURBO = 95
  const MIN_ACCURACY_CHAIN = 90
  const MIN_ACCURACY_SPEED = 85
  const MIN_ACCURACY_LATENCY = 80

  if (score >= 14 && accuracy >= MIN_ACCURACY_GRANDMASTER) {
    return "Grandmaster of Speed 👑"
  } else if (score >= 11 && accuracy >= MIN_ACCURACY_TURBO) {
    return "Turbo Typelord 💎"
  } else if (score >= 7 && accuracy >= MIN_ACCURACY_CHAIN) {
    return "Chain Slayer ⚔️"
  } else if (score >= 4 && accuracy >= MIN_ACCURACY_SPEED) {
    return "Speed Operator 🥇"
  } else if (score >= 1 && accuracy >= MIN_ACCURACY_LATENCY) {
    return "Latency Warrior 🥈"
  } else {
    return "Typing Rookie 🥉"
  }
}
