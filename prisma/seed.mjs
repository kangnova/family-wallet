// Seed system categories (shared by all families; familyId = null).
// Idempotent: skips categories that already exist.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  // Income
  { name: "Husband's Salary", type: 'INCOME', group: 'INCOME', icon: '💼' },
  { name: "Wife's Salary", type: 'INCOME', group: 'INCOME', icon: '💼' },
  { name: 'Bonus', type: 'INCOME', group: 'INCOME', icon: '🎁' },
  { name: 'Side Business', type: 'INCOME', group: 'INCOME', icon: '📈' },
  { name: 'Other Income', type: 'INCOME', group: 'INCOME', icon: '💰' },

  // Expenses — Needs
  { name: 'Groceries', type: 'EXPENSE', group: 'NEEDS', icon: '🛒' },
  { name: 'Food & Drinks', type: 'EXPENSE', group: 'NEEDS', icon: '🍽️' },
  { name: 'Transportation', type: 'EXPENSE', group: 'NEEDS', icon: '🚗' },
  { name: 'Utilities', type: 'EXPENSE', group: 'NEEDS', icon: '💡' },
  { name: 'Installments', type: 'EXPENSE', group: 'NEEDS', icon: '🏦' },
  { name: 'Health', type: 'EXPENSE', group: 'NEEDS', icon: '🏥' },
  { name: 'Internet & Phone', type: 'EXPENSE', group: 'NEEDS', icon: '📱' },

  // Expenses — Wants
  { name: 'Entertainment', type: 'EXPENSE', group: 'WANTS', icon: '🎬' },
  { name: 'Shopping', type: 'EXPENSE', group: 'WANTS', icon: '🛍️' },
  { name: 'Travel', type: 'EXPENSE', group: 'WANTS', icon: '✈️' },
  { name: 'Subscriptions', type: 'EXPENSE', group: 'WANTS', icon: '📺' },

  // Savings
  { name: 'Emergency Fund', type: 'EXPENSE', group: 'SAVINGS', icon: '🛟' },
  { name: 'Savings', type: 'EXPENSE', group: 'SAVINGS', icon: '🐷' },
  { name: 'Investment', type: 'EXPENSE', group: 'SAVINGS', icon: '📊' },
]

async function main() {
  let created = 0
  for (const c of categories) {
    const exists = await prisma.category.findFirst({
      where: { name: c.name, familyId: null },
    })
    if (!exists) {
      await prisma.category.create({
        data: { ...c, isSystem: true, familyId: null },
      })
      created += 1
    }
  }
  console.log(`Seeded ${created} new system categories (${categories.length} total).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
