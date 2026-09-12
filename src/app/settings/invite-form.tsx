'use client'

import { useState } from 'react'

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInviteUrl('')
    const res = await fetch('/api/family/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) {
      const d = await res.json()
      setInviteUrl(window.location.origin + d.inviteUrl)
      setEmail('')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(typeof d.error === 'string' ? d.error : 'Failed to create invite')
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Partner&apos;s email
          </label>
          <input
            type="email"
            required
            placeholder="partner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create invite link'}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {inviteUrl && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-700">Invite link (share with your partner)</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-600"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
