
import { db } from '../db/database'
import { supabase } from './supabase'
import {
  getCurrentShopContext,
  getCachedShopContext,
} from './shopService'
import { queueItemOperation, syncPendingItemOperations } from './itemSyncService'
import type { Item, ItemFormData } from '../types/item'
import { calculateUnitPrice } from '../types/item'

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

async function updateLocalCache(items: Item[]): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    await db.items.clear()
    if (items.length) await db.items.bulkPut(items)
  })
}

function validateItem(data: ItemFormData): {
  itemName: string
  itemCode: string
} {
  const itemName = data.itemName.trim()
  const itemCode = data.itemCode.trim()

  if (!itemName) throw new Error('Item name is required.')
  if (!itemCode) throw new Error('Item barcode is required.')

  if (
    !Number.isFinite(data.sellingPrice) ||
    data.sellingPrice < 0 ||
    !Number.isFinite(data.buyingPrice) ||
    data.buyingPrice < 0
  ) {
    throw new Error('Prices must be valid non-negative numbers.')
  }

  if (!Number.isInteger(data.piecesPerUnit) || data.piecesPerUnit < 1) {
    throw new Error('Pieces per unit must be a positive whole number.')
  }

  return { itemName, itemCode }
}

export async function getItems(): Promise<Item[]> {
  if (!navigator.onLine) {
    return db.items.orderBy('itemName').toArray()
  }

  const context = await getCurrentShopContext()

  // Try to upload offline changes before refreshing the cloud list.
  await syncPendingItemOperations()

  const { data, error } = await supabase
    .from('items')
    .select(
      'id, shop_id, item_name, item_code, selling_price, buying_price, pieces_per_unit, unit_price, created_at, updated_at'
    )
    .eq('shop_id', context.shopId)
    .order('item_name')

  if (error) throw error

  const cloudItems = (data ?? []).map((row) =>
    mapCloudItem(row as CloudItem)
  )

  await updateLocalCache(cloudItems)
  return cloudItems
}

export async function getItemByBarcode(
  barcode: string
): Promise<Item | undefined> {
  const itemCode = barcode.trim()
  if (!itemCode) return undefined

  if (!navigator.onLine) {
    return db.items.where('itemCode').equals(itemCode).first()
  }

  const { shopId } = await getCurrentShopContext()

  const { data, error } = await supabase
    .from('items')
    .select(
      'id, shop_id, item_name, item_code, selling_price, buying_price, pieces_per_unit, unit_price, created_at, updated_at'
    )
    .eq('shop_id', shopId)
    .eq('item_code', itemCode)
    .maybeSingle()

  if (error) throw error
  if (!data) return undefined

  const item = mapCloudItem(data as CloudItem)
  await db.items.put(item)
  return item
}

export async function saveItem(
  data: ItemFormData,
  existingId?: string
): Promise<Item> {
  const { itemName, itemCode } = validateItem(data)
  const now = new Date().toISOString()

  if (!navigator.onLine) {
    const context = await getCachedShopContext()

    if (!context) {
      throw new Error(
        'Connect to the internet and open Item Management once before making offline changes.'
      )
    }

    if (context.role !== 'owner') {
      throw new Error('Only the shop owner can add or edit items.')
    }

    const existing = existingId ? await db.items.get(existingId) : undefined

    if (existingId && !existing) {
      throw new Error('This item is not available in the local cache.')
    }

    const duplicate = await db.items.where('itemCode').equals(itemCode).first()

    if (duplicate && duplicate.id !== existingId) {
      throw new Error('This barcode already belongs to another item.')
    }

    const item: Item = {
      id: existing?.id ?? crypto.randomUUID(),
      itemName,
      itemCode,
      sellingPrice: data.sellingPrice,
      buyingPrice: data.buyingPrice,
      piecesPerUnit: data.piecesPerUnit,
      unitPrice: calculateUnitPrice(data.buyingPrice, data.piecesPerUnit),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await queueItemOperation({
      id: crypto.randomUUID(),
      itemId: item.id,
      shopId: context.shopId,
      operation: 'upsert',
      payload: item,
      createdAt: now,
    })

    return item
  }

  const context = await getCurrentShopContext()

  // Keep queued changes in order before performing a new online operation.
  await syncPendingItemOperations()

  const { data: duplicate, error: duplicateError } = await supabase
    .from('items')
    .select('id')
    .eq('shop_id', context.shopId)
    .eq('item_code', itemCode)
    .maybeSingle()

  if (duplicateError) throw duplicateError

  if (duplicate && duplicate.id !== existingId) {
    throw new Error('This barcode already belongs to another item.')
  }

  if (existingId) {
    const { data: updated, error } = await supabase
      .from('items')
      .update({
        item_name: itemName,
        item_code: itemCode,
        selling_price: data.sellingPrice,
        buying_price: data.buyingPrice,
        pieces_per_unit: data.piecesPerUnit,
        updated_at: now,
      })
      .eq('id', existingId)
      .eq('shop_id', context.shopId)
      .select(
        'id, shop_id, item_name, item_code, selling_price, buying_price, pieces_per_unit, unit_price, created_at, updated_at'
      )
      .single()

    if (error) throw error

    const item = mapCloudItem(updated as CloudItem)
    await db.items.put(item)
    return item
  }

  const { data: inserted, error } = await supabase
    .from('items')
    .insert({
      shop_id: context.shopId,
      item_name: itemName,
      item_code: itemCode,
      selling_price: data.sellingPrice,
      buying_price: data.buyingPrice,
      pieces_per_unit: data.piecesPerUnit,
    })
    .select(
      'id, shop_id, item_name, item_code, selling_price, buying_price, pieces_per_unit, unit_price, created_at, updated_at'
    )
    .single()

  if (error) throw error

  const item = mapCloudItem(inserted as CloudItem)
  await db.items.put(item)
  return item
}

export async function deleteItem(id: string): Promise<void> {
  if (!navigator.onLine) {
    const context = await getCachedShopContext()

    if (!context) {
      throw new Error('Connect to the internet before managing items offline.')
    }

    if (context.role !== 'owner') {
      throw new Error('Only the shop owner can delete items.')
    }

    const existing = await db.items.get(id)
    if (!existing) throw new Error('This item is not available in the local cache.')

    const now = new Date().toISOString()

    await queueItemOperation({
      id: crypto.randomUUID(),
      itemId: id,
      shopId: context.shopId,
      operation: 'delete',
      createdAt: now,
    })

    return
  }

  const context = await getCurrentShopContext()
  await syncPendingItemOperations()

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('shop_id', context.shopId)

  if (error) throw error

  await db.items.delete(id)
}
