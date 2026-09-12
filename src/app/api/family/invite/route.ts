import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const inviteSchema = z.object({ email: z.string().email('Invalid email') })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const familyId = session?.user?.familyId
  if (!userId || !familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only OWNER or MEMBER may invite new members.
  const membership = await prisma.familyMember.findFirst({ where: { familyId, userId } })
  if (!membership || membership.role === 'VIEWER') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { email } = parsed.data

  // Reject if this person is already a member of the family.
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    const alreadyMember = await prisma.familyMember.findFirst({
      where: { familyId, userId: existingUser.id },
    })
    if (alreadyMember) {
      return NextResponse.json(
        { error: 'This person is already a member of your family' },
        { status: 409 },
      )
    }
  }

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invitation = await prisma.invitation.create({
    data: { familyId, email, token, role: 'MEMBER', status: 'PENDING', expiresAt },
  })

  return NextResponse.json(
    {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      inviteUrl: `/join?token=${invitation.token}`,
      expiresAt: invitation.expiresAt,
    },
    { status: 201 },
  )
}
