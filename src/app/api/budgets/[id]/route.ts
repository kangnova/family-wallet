import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({ limitAmount: z.number().int().positive() })

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  const familyId = session?.user?.familyId
  if (!familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // Scope by family so a user can never modify another family's budget.
  const existing = await prisma.budget.findFirst({ where: { id, familyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const budget = await prisma.budget.update({
    where: { id },
    data: { limitAmount: parsed.data.limitAmount },
  })

  return NextResponse.json(budget)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  const familyId = session?.user?.familyId
  if (!familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.budget.findFirst({ where: { id, familyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.budget.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
