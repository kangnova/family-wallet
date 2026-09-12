'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  icon: string | null
}

export function AddTransactionForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [categoryId, setCategoryId] = useState(
    () => categories.find((c) => c.type === 'EXPENSE')?.id ?? '',
  )
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = categories.filter((c) => c.type === type)

  function switchType(next: 'INCOME' | 'EXPENSE') {
    setType(next)
    setCategoryId(categories.find((c) => c.type === next)?.id ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, type, amount: Number(amount), date, note }),
    })
    setLoading(false)
    if (res.ok) {
      setAmount('')
      setNote('')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'Failed to save')
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex gap-2">
        <button
          type="button"
          className={tabClass(type === 'EXPENSE')}
          onClick={() => switchType('EXPENSE')}
        >
          Expense
        </button>
        <button
          type="button"
          className={tabClass(type === 'INCOME')}
          onClick={() => switchType('INCOME')}
        >
          Income
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ''}
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          required
          placeholder="Amount (Rp)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Add transaction'}
      </button>
    </form>
  )
}
