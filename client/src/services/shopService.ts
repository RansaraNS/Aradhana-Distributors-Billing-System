
import { db } from '../db/database'
import { supabase } from './supabase'

export async function getCurrentShopContext(): Promise<{
  shopId: string
  role: 'owner' | 'staff'
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('Please sign in before accessing shop data.')

  const { data, error } = await supabase
    .from('shop_members')
    .select('shop_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('No shop membership was found for this account.')
  }

  const role = data.role as 'owner' | 'staff'

  await db.appSettings.bulkPut([
    { key: 'shopId', value: data.shop_id },
    { key: 'shopRole', value: role },
  ])

  return { shopId: data.shop_id, role }
}

export async function getCurrentShopId(): Promise<string> {
  const context = await getCurrentShopContext()
  return context.shopId
}

export async function getCachedShopContext(): Promise<{
  shopId: string
  role: 'owner' | 'staff'
} | undefined> {
  const shopIdSetting = await db.appSettings.get('shopId')
  const roleSetting = await db.appSettings.get('shopRole')

  if (
    !shopIdSetting?.value ||
    (roleSetting?.value !== 'owner' && roleSetting?.value !== 'staff')
  ) {
    return undefined
  }

  return {
    shopId: shopIdSetting.value,
    role: roleSetting.value,
  }
}