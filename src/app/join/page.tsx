import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AcceptButton } from './accept-button'

export const dynamic = 'force-dynamic'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const user = await getCurrentUser()

  if (!token) return <ErrorCard message="No invitation token provided." />

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/join?token=${token}`)}`)
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { family: { select: { name: true } } },
  })

  if (!invitation) return <ErrorCard message="This invitation is invalid." />
  if (invitation.status !== 'PENDING') {
    return <ErrorCard message="This invitation has already been used." />
  }
  if (invitation.expiresAt < new Date()) {
    return <ErrorCard message="This invitation has expired." />
  }

  const alreadyMember = await prisma.familyMember.findFirst({
    where: { familyId: invitation.familyId, userId: user.id },
  })
  if (alreadyMember) redirect('/dashboard')

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">You&apos;re invited</h1>
        <p className="mt-2 text-sm text-gray-600">
          Join <span className="font-medium text-gray-900">{invitation.family.name}</span> and
          manage your household finances together.
        </p>
        <p className="mt-1 text-sm text-gray-500">Invited for: {invitation.email}</p>
        <AcceptButton token={invitation.token} />
      </div>
    </main>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Unable to join</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </main>
  )
}
