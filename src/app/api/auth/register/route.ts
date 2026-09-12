import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email is already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  // Create the user, their first family, and their OWNER membership atomically.
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name, email, passwordHash } })
    const family = await tx.family.create({
      data: { name: `${name}'s Family`, ownerId: u.id },
    })
    await tx.familyMember.create({
      data: { familyId: family.id, userId: u.id, role: 'OWNER' },
    })
    return u
  })

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 },
  )
}
