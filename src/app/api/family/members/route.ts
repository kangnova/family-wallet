import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  const familyId = session?.user?.familyId
  if (!familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.familyMember.findMany({
    where: { familyId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ data: members })
}
