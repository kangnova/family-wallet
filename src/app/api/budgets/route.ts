import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computePercentage } from '@/lib/budget'

const upsertSchema = z.object({
  categoryId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  limitAmount: z.number().int().positive(),
})

function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  return { gte: start, lt: end }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const familyId = session?.user?.familyId
  if (!familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const [budgets, spending] = await Promise.all([
    prisma.budget.findMany({
      where: { familyId, month },
      include: { category: { select: { name: true, icon: true, group: true } } },
      orderBy: { limitAmount: 'desc' },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { familyId, type: 'EXPENSE', date: monthRange(month) },
      _sum: { amount: true },
    }),
  ])

  const spentByCategory = new Map(spending.map((s) => [s.categoryId, s._sum.amount ?? 0]))

  const data = budgets.map((b) => {
    const spent = spentByCategory.get(b.categoryId) ?? 0
    return {
      id: b.id,
      categoryId: b.categoryId,
      category: b.category,
      month: b.month,
      limitAmount: b.limitAmount,
      spent,
      percentage: computePercentage(spent, b.limitAmount),
    }
  })

  return NextResponse.json({ month, data })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const familyId = session?.user?.familyId
  if (!familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { categoryId, month, limitAmount } = parsed.data

  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ familyId: null }, { familyId }] },
  })
  if (!category || category.type !== 'EXPENSE') {
    return NextResponse.json(
      { error: 'Budget category must be an expense category' },
      { status: 400 },
    )
  }

  // Upsert on the unique (familyId, categoryId, month) key.
  const budget = await prisma.budget.upsert({
    where: { familyId_categoryId_month: { familyId, categoryId, month } },
    update: { limitAmount },
    create: { familyId, categoryId, month, limitAmount },
  })

  return NextResponse.json(budget, { status: 200 })
}
