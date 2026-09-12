import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRupiah } from '@/lib/format'
import { AddTransactionForm } from './add-form'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const user = await getCurrentUser()
  if (!user?.familyId) redirect('/login')

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { familyId: user.familyId },
      include: { category: { select: { name: true, icon: true, group: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.category.findMany({
      where: { OR: [{ familyId: null }, { familyId: user.familyId }] },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
  ])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <div className="mt-6">
        <AddTransactionForm
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            icon: c.icon,
          }))}
        />
      </div>

      <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {transactions.length === 0 && (
          <li className="py-8 text-center text-sm text-gray-500">No transactions yet.</li>
        )}
        {transactions.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{t.category.icon ?? '•'}</span>
              <div>
                <p className="text-sm font-medium">{t.category.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(t.date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {t.note ? ` · ${t.note}` : ''}
                </p>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${
                t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {t.type === 'INCOME' ? '+' : '−'}
              {formatRupiah(t.amount)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
