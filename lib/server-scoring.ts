export function calculateScore(
  lps: number,
  accuracy: number,
  gameMode: number,
  totalErrors: number,
  correctedErrors: number,
  totalLetters: number
): number {
  const correctionRate = totalErrors > 0 ? correctedErrors / totalErrors : 0
  const errorRate = totalLetters > 0 ? totalErrors / totalLetters : 0
  const correctionBonus = correctionRate * (1 - Math.min(errorRate * 10, 0.5)) * 0.15

  const accuracyDecimal = accuracy / 100
  const baseScore = lps * (accuracyDecimal * accuracyDecimal)

  const scoreWithCorrection = baseScore * (1 + correctionBonus)

  const gameModeMultiplier = gameMode === 30 ? 1.22 : 1.0
  const finalScore = scoreWithCorrection * gameModeMultiplier

  return finalScore
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
