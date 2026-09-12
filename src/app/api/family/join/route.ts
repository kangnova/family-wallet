import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const joinSchema = z.object({ token: z.string().min(1) })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = joinSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  const { token } = parsed.data

  const invitation = await prisma.invitation.findUnique({ where: { token } })
  if (!invitation) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })

  if (invitation.status !== 'PENDING') {
    return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
  }
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  const alreadyMember = await prisma.familyMember.findFirst({
    where: { familyId: invitation.familyId, userId },
  })
  if (alreadyMember) {
    return NextResponse.json(
      { error: 'You are already a member of this family' },
      { status: 409 },
    )
  }

  const [membership] = await prisma.$transaction([
    prisma.familyMember.create({
      data: { familyId: invitation.familyId, userId, role: invitation.role },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    }),
  ])

  return NextResponse.json({ familyId: invitation.familyId, role: membership.role })
}
