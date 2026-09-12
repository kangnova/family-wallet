import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRupiah } from '@/lib/format'
import { computePercentage, getBudgetStatus, type BudgetStatus } from '@/lib/budget'
import { BudgetForm } from './budget-form'

export const dynamic = 'force-dynamic'

const barColor: Record<BudgetStatus, string> = {
  safe: 'bg-green-500',
  warning: 'bg-amber-500',
  over: 'bg-red-500',
}

const statusLabel: Record<BudgetStatus, string> = {
  safe: 'On track',
  warning: 'Almost used up',
  over: 'Over budget',
}

export default async function BudgetPage() {
  const user = await getCurrentUser()
  if (!user?.familyId) redirect('/login')

  const now = new Date()
  const month = now.toISOString().slice(0, 7)
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  const [budgets, spending, categories] = await Promise.all([
    prisma.budget.findMany({
      where: { familyId: user.familyId, month },
      include: { category: { select: { name: true, icon: true, group: true } } },
      orderBy: { limitAmount: 'desc' },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { familyId: user.familyId, type: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { type: 'EXPENSE', OR: [{ familyId: null }, { familyId: user.familyId }] },
      orderBy: { name: 'asc' },
    }),
  ])

  const spentByCategory = new Map(spending.map((s) => [s.categoryId, s._sum.amount ?? 0]))

  const items = budgets.map((b) => {
    const spent = spentByCategory.get(b.categoryId) ?? 0
    const percentage = computePercentage(spent, b.limitAmount)
    return { ...b, spent, percentage, status: getBudgetStatus(percentage) }
  })

  const categoriesWithoutBudget = categories.filter(
    (c) => !budgets.some((b) => b.categoryId === c.id),
  )

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <p className="mt-1 text-sm text-gray-500">{monthLabel}</p>

      <div className="mt-6">
        <BudgetForm
          month={month}
          categories={categoriesWithoutBudget.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
          }))}
        />
      </div>

      <ul className="mt-6 space-y-4">
        {items.length === 0 && (
          <li className="rounded-xl border border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
            No budgets yet. Set a limit above to start controlling spending.
          </li>
        )}
        {items.map((b) => (
          <li key={b.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {b.category.icon ? `${b.category.icon} ` : ''}
                {b.category.name}
              </span>
              <span className="text-sm text-gray-600">
                {formatRupiah(b.spent)} / {formatRupiah(b.limitAmount)}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barColor[b.status]}`}
                style={{ width: `${Math.min(b.percentage, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>
                {b.percentage}% used · {statusLabel[b.status]}
              </span>
              <span>
                {b.spent <= b.limitAmount
                  ? `${formatRupiah(b.limitAmount - b.spent)} left`
                  : `${formatRupiah(b.spent - b.limitAmount)} over`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
