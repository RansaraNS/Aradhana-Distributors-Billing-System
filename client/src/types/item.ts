
export interface Item {
  id: string
  itemName: string
  itemCode: string
  sellingPrice: number
  buyingPrice: number
  piecesPerUnit: number
  unitPrice: number
  createdAt: string
  updatedAt: string
}

export interface ItemFormData {
  itemName: string
  itemCode: string
  sellingPrice: number
  buyingPrice: number
  piecesPerUnit: number
}

export function calculateUnitPrice(
  buyingPrice: number,
  piecesPerUnit: number,
): number {
  return Math.round(buyingPrice * piecesPerUnit * 100) / 100
}
