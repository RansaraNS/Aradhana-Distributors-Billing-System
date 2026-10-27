
import { db } from '../db/database'
import { supabase } from './supabase'
import type { Item } from '../types/item'
import type { PendingItemOperation } from '../db/database'

type CloudItem = {
  id: string
  shop_id: string
  item_name: string
  item_code: string
  selling_price: number | string
  buying_price: number | string
  pieces_per_unit: number
  unit_price: number | string
  created_at: string
  updated_at: string
}

function mapCloudItem(row: CloudItem): Item {
  return {
    id: row.id,
    itemName: row.item_name,
    itemCode: row.item_code,
    sellingPrice: Number(row.selling_price),
    buyingPrice: Number(row.buying_price),
    piecesPerUnit: Number(row.pieces_per_unit),
    unitPrice: Number(row.unit_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function queueItemOperation(
  operation: PendingItemOperation
): Promise<void> {
  await db.transaction(
    'rw',
    db.items,
    db.pendingItemOperations,
    async () => {
      // Keep only the latest pending operation for this item.
      const previous = await db.pendingItemOperations
        .where('itemId')
        .equals(operation.itemId)
        .toArray()

      if (previous.length) {
        await db.pendingItemOperations.bulkDelete(
          previous.map((entry) => entry.id)
        )
      }

      await db.pendingItemOperations.put(operation)

      if (operation.operation === 'delete') {
        await db.items.delete(operation.itemId)
      } else if (operation.payload) {
        await db.items.put(operation.payload)
      }
    }
  )
  window.dispatchEvent(new Event('item-sync-queue-changed'))
}

export async function getPendingItemOperationCount(): Promise<number> {
  return db.pendingItemOperations.count()
}

export async function syncPendingItemOperations(): Promise<number> {
  if (!navigator.onLine) return 0

  const pending = await db.pendingItemOperations
    .orderBy('createdAt')
    .toArray()

  let synced = 0

  for (const operation of pending) {
    if (!navigator.onLine) break

    if (operation.operation === 'delete') {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', operation.itemId)
        .eq('shop_id', operation.shopId)

      if (error) throw error

      await db.transaction(
        'rw',
        db.items,
        db.pendingItemOperations,
        async () => {
          await db.items.delete(operation.itemId)
          await db.pendingItemOperations.delete(operation.id)
        }
      )
    } else {
      const item = operation.payload

      if (!item) {
        throw new Error(
          `Pending item operation ${operation.id} has no item data.`
        )
      }

      const { data, error } = await supabase
        .from('items')
        .upsert(
          {
            id: item.id,
            shop_id: operation.shopId,
            item_name: item.itemName,
            item_code: item.itemCode,
            selling_price: item.sellingPrice,
            buying_price: item.buyingPrice,
            pieces_per_unit: item.piecesPerUnit,
            updated_at: item.updatedAt,
          },
          { onConflict: 'id' }
        )
        .select(
          'id, shop_id, item_name, item_code, selling_price, buying_price, pieces_per_unit, unit_price, created_at, updated_at'
        )
        .single()

      if (error) throw error

      const saved = mapCloudItem(data as CloudItem)

      await db.transaction(
        'rw',
        db.items,
        db.pendingItemOperations,
        async () => {
          await db.items.put(saved)
          await db.pendingItemOperations.delete(operation.id)
        }
      )
    }

    synced += 1
  }

  return synced
}
