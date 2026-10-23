
export type QuantityType = 'unit' | 'piece'

export interface InvoiceLine {
  id: string
  itemId: string
  itemName: string
  itemCode: string
  quantityType: QuantityType
  quantity: number
  unitPrice: number
  piecesPerUnit: number
  lineTotal: number
}

export interface InvoiceDraft {
  customerName: string
  discount: number
  lines: InvoiceLine[]
}

export interface InvoiceRecord {
  id: string
  shopId: string
  invoiceNumber: string
  customerName: string
  subtotal: number
  discount: number
  total: number
  createdAt: string
  syncStatus: 'synced' | 'pending'
  lines: InvoiceLine[]
}

export function calculateLineTotal(line: InvoiceLine): number {
  const quantityInPieces =
    line.quantityType === 'unit'
      ? line.quantity * line.piecesPerUnit
      : line.quantity

  return roundMoney(quantityInPieces * line.unitPrice)
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateSubtotal(lines: InvoiceLine[]): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + line.lineTotal, 0)
  )
}

export function calculateInvoiceTotal(
  lines: InvoiceLine[],
  discount: number
): number {
  return roundMoney(Math.max(0, calculateSubtotal(lines) - discount))
}
