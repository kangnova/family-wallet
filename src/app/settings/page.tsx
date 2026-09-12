import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SignOutButton } from '@/components/sign-out-button'
import { InviteForm } from './invite-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user?.familyId) redirect('/login')

  const [family, members] = await Promise.all([
    prisma.family.findUnique({ where: { id: user.familyId }, select: { name: true } }),
    prisma.familyMember.findMany({
      where: { familyId: user.familyId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </Link>
        </div>
        <SignOutButton />
      </div>

      <h1 className="mt-6 text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Family: <span className="font-medium text-gray-700">{family?.name}</span>
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Members</h2>
        <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.user.name}</p>
                <p className="text-xs text-gray-500">{m.user.email}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Invite your partner</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share the invite link with your partner — they&apos;ll join this family and see the
          same income, expenses, and budgets.
        </p>
        <div className="mt-3">
          <InviteForm />
        </div>
      </section>
    </main>
  )
}
