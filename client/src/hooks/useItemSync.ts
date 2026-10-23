
import { useCallback, useEffect, useState } from 'react'
import {
  getPendingItemOperationCount,
  syncPendingItemOperations,
} from '../services/itemSyncService'

export function useItemSync() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount(await getPendingItemOperationCount())
    } catch (error) {
      console.error('Unable to count pending item operations:', error)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      await refreshCount()
      return
    }

    setSyncing(true)
    setSyncError('')

    try {
      await syncPendingItemOperations()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Synchronization failed.'

      setSyncError(message)
      console.error('Item synchronization failed:', error)
    } finally {
      setSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  useEffect(() => {
    void refreshCount()

    const handleOnline = () => {
      void syncNow()
    }

    const handleQueueChanged = () => {
      void refreshCount()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('item-sync-queue-changed', handleQueueChanged)

    if (navigator.onLine) {
      void syncNow()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(
        'item-sync-queue-changed',
        handleQueueChanged
      )
    }
  }, [refreshCount, syncNow])

  return { pendingCount, syncing, syncError, syncNow }
}
