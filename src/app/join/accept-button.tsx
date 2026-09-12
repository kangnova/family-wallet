'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export function AcceptButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/family/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setLoading(false)
    if (res.ok) {
      // The session JWT caches the family id, so sign the user out and have
      // them sign in again to pick up the newly joined family.
      await signOut({ callbackUrl: '/login?joined=1' })
    } else {
      const d = await res.json().catch(() => ({}))
      setError(typeof d.error === 'string' ? d.error : 'Failed to join')
    }
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Joining…' : 'Accept invitation'}
      </button>
      <p className="mt-3 text-xs text-gray-400">
        After accepting, you&apos;ll be signed out and asked to sign in again to open the shared
        family.
      </p>
    </div>
  )
}
