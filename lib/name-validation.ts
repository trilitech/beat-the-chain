import { Filter } from 'bad-words'

const filter = new Filter()

export function isNameValid(name: string): { valid: boolean; error?: string } {
  const nameRegex = /^[a-zA-Z0-9._-]{3,50}$/
  if (!nameRegex.test(name)) {
    return { valid: false, error: "Invalid player name format" }
  }
  
  if (filter.isProfane(name)) {
    return { valid: false, error: "Player name contains inappropriate content" }
  }
  
  return { valid: true }
}
