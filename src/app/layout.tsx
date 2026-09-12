import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Wallet',
  description: 'Manage household income, expenses, and budgets together.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
