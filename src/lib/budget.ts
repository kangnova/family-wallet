export type BudgetStatus = 'safe' | 'warning' | 'over'

export function computePercentage(spent: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((spent / limit) * 100)
}

export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) return 'over'
  if (percentage >= 80) return 'warning'
  return 'safe'
}
