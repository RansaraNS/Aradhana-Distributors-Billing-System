
import { db } from '../db/database'
import type { InvoiceLine, InvoiceRecord } from '../types/invoice'
import {
  calculateInvoiceTotal,
  calculateSubtotal,
  roundMoney,
} from '../types/invoice'

function generateInvoiceNumber(): string {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')

  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase()

  return `INV-${date}-${suffix}`
}

export async function createInvoice(input: {
  customerName: string
  discount: number
  lines: InvoiceLine[]
}): Promise<InvoiceRecord> {
  if (input.lines.length === 0) {
    throw new Error('Add at least one item to the invoice.')
  }

  if (!Number.isFinite(input.discount) || input.discount < 0) {
    throw new Error('Enter a valid non-negative discount.')
  }

  const lines = input.lines.map((line) => ({
    ...line,
    lineTotal: roundMoney(line.lineTotal),
  }))

  const subtotal = calculateSubtotal(lines)

  if (input.discount > subtotal) {
    throw new Error('The discount cannot exceed the invoice subtotal.')
  }

  const invoice: InvoiceRecord = {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    customerName: input.customerName.trim(),
    subtotal,
    discount: roundMoney(input.discount),
    total: calculateInvoiceTotal(lines, input.discount),
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    lines,
  }

  await db.invoices.add(invoice)

  return invoice
}

export async function getInvoices(): Promise<InvoiceRecord[]> {
  return db.invoices.orderBy('createdAt').reverse().toArray()
}

export async function getInvoiceById(
  id: string
): Promise<InvoiceRecord | undefined> {
  return db.invoices.get(id)
}
