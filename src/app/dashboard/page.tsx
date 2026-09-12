import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRupiah } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user?.familyId) redirect('/login')

  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { familyId: user.familyId, type: 'INCOME', date: { gte: start, lt: end } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { familyId: user.familyId, type: 'EXPENSE', date: { gte: start, lt: end } },
    }),
  ])

  const totalIncome = income._sum.amount ?? 0
  const totalExpense = expense._sum.amount ?? 0
  const balance = totalIncome - totalExpense

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <span className="text-sm text-gray-500">Hi, {user.name}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{monthLabel}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Income" value={formatRupiah(totalIncome)} valueClass="text-green-600" />
        <Card label="Expenses" value={formatRupiah(totalExpense)} valueClass="text-red-600" />
        <Card
          label="Balance"
          value={formatRupiah(balance)}
          valueClass={balance >= 0 ? 'text-gray-900' : 'text-red-600'}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/transactions"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View transactions
        </Link>
      </div>
    </main>
  )
}

function Card({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
