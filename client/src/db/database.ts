
import Dexie, { type Table } from 'dexie'
import type { Item } from '../types/item'
import type { InvoiceRecord } from '../types/invoice'

export interface PendingItemOperation {
  id: string
  itemId: string
  shopId: string
  operation: 'upsert' | 'delete'
  payload?: Item
  createdAt: string
}

export interface AppSetting {
  key: string
  value: string
}

class AradhanaDatabase extends Dexie {
  items!: Table<Item, string>
  pendingItemOperations!: Table<PendingItemOperation, string>
  appSettings!: Table<AppSetting, string>
  invoices!: Table<InvoiceRecord, string>

  constructor() {
    super('AradhanaDistributorsDB')

    this.version(1).stores({
      items: 'id, itemName, &itemCode, createdAt',
    })

    this.version(2).stores({
      items: 'id, itemName, &itemCode, createdAt',
      pendingItemOperations: 'id, itemId, shopId, createdAt',
      appSettings: 'key',
    })

    this.version(3).stores({
        items: 'id, itemName, &itemCode, createdAt',
        pendingItemOperations: 'id, itemId, shopId, createdAt',
        appSettings: 'key',
        invoices: 'id, &invoiceNumber, createdAt, syncStatus',
    })
  }
}

export const db = new AradhanaDatabase()
