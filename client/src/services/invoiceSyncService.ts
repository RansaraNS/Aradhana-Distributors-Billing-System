
import { db } from '../db/database'
import { supabase } from './supabase'
import type { InvoiceRecord } from '../types/invoice'

export async function syncPendingInvoices(): Promise<number> {
  if (!navigator.onLine) return 0

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('Sign in to synchronize invoices.')

  const pending = await db.invoices
    .where('syncStatus')
    .equals('pending')
    .sortBy('createdAt')

  let synced = 0

  for (const invoice of pending) {
    if (!navigator.onLine) break

    const { data, error } = await supabase.rpc('create_invoice_atomic', {
      p_invoice: {
        id: invoice.id,
        shop_id: invoice.shopId,
        invoice_number: invoice.invoiceNumber,
        customer_name: invoice.customerName,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total,
        created_at: invoice.createdAt,
      },
      p_lines: invoice.lines.map((line) => ({
        id: line.id,
        item_id: line.itemId,
        item_name: line.itemName,
        item_code: line.itemCode,
        quantity_type: line.quantityType,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        pieces_per_unit: line.piecesPerUnit,
        line_total: line.lineTotal,
      })),
    })

    if (error) throw error
    if (data !== invoice.id) {
      throw new Error(`Unexpected response while syncing ${invoice.invoiceNumber}.`)
    }

    const updated: InvoiceRecord = {
      ...invoice,
      syncStatus: 'synced',
    }

    await db.invoices.put(updated)
    synced += 1
  }

  return synced
}