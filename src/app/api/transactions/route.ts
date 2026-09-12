import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
})

function monthRange(month: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null
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
  const where: Record<string, unknown> = { familyId }
  const range = monthRange(searchParams.get('month'))
  if (range) where.date = range

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true, icon: true, group: true } } },
    orderBy: { date: 'desc' },
    take: 200,
  })

  return NextResponse.json({ data: transactions })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const familyId = session?.user?.familyId
  const userId = session?.user?.id
  if (!familyId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { categoryId, type, amount, date, note } = parsed.data

  // Category must be a system category or belong to this family.
  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ familyId: null }, { familyId }] },
  })
  if (!category) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (category.type !== type) {
    return NextResponse.json(
      { error: `Category "${category.name}" is ${category.type}, not ${type}` },
      { status: 400 },
    )
  }

  const transaction = await prisma.transaction.create({
    data: {
      familyId,
      userId,
      categoryId,
      type,
      amount,
      date: new Date(`${date}T00:00:00.000Z`),
      note: note || null,
    },
    include: { category: { select: { name: true, icon: true } } },
  })

  return NextResponse.json(transaction, { status: 201 })
}
