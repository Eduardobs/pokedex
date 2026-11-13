import { STORAGE_KEYS } from '../config/app'

const budgets: Record<string, number> = {
  [STORAGE_KEYS.teams]: 2 * 1024 * 1024,
  [STORAGE_KEYS.favorites]: 32 * 1024,
  [STORAGE_KEYS.language]: 32,
  [STORAGE_KEYS.theme]: 32,
}
function withinBudget(key: string, raw: string) {
  return Object.hasOwn(budgets, key) && raw.length * 2 <= budgets[key]
}

/** Access to Web Storage is isolated because it may throw in privacy mode or at quota. */
export function readStorage<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || !withinBudget(key, raw)) return fallback
    const value: unknown = JSON.parse(raw)
    return validate(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value)
    if (!withinBudget(key, raw)) return false
    localStorage.setItem(key, raw)
    return true
  } catch {
    return false
  }
}

export function readStorageString<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value !== null && withinBudget(key, value) && allowed.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStorageString(key: string, value: string): boolean {
  try {
    if (!withinBudget(key, value)) return false
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
