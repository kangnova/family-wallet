'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  icon: string | null
}

export function BudgetForm({
  categories,
  month,
}: {
  categories: Category[]
  month: string
}) {
  const router = useRouter()
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [limitAmount, setLimitAmount] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, month, limitAmount: Number(limitAmount) }),
    })
    setLoading(false)
    if (res.ok) {
      setLimitAmount('')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'Failed to save')
    }
  }

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Every expense category already has a budget this month.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ''}
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">
          Monthly limit (Rp)
        </label>
        <input
          type="number"
          min={1}
          required
          placeholder="e.g. 1000000"
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Set budget'}
      </button>
    </form>
  )
}
