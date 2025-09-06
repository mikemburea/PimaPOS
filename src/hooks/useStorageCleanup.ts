// hooks/useStorageCleanup.ts
import { useState, useEffect, useCallback } from 'react'
import { 
  StorageStatus, 
  CleanupResult, 
  getStorageStatus, 
  runStorageCleanup,
  checkAndCleanupStorage 
} from '../utils/storageCleanup'

export function useStorageCleanup() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null)

  // Check storage status
  const checkStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const storageStatus = await getStorageStatus()
      setStatus(storageStatus)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Run cleanup manually
  const runCleanup = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await runStorageCleanup()
      setLastCleanup(result)
      
      if (result.success) {
        // Refresh status after cleanup
        await checkStatus()
      } else {
        setError(result.error || 'Cleanup failed')
      }
      
      return result
    } catch (err: any) {
      const errorResult: CleanupResult = {
        success: false,
        photos_deleted: 0,
        storage_freed_mb: 0,
        cleanup_log_id: '',
        timestamp: new Date().toISOString(),
        error: err.message
      }
      setLastCleanup(errorResult)
      setError(err.message)
      return errorResult
    } finally {
      setIsLoading(false)
    }
  }, [checkStatus])

  // Auto-check and cleanup if needed
  const autoCleanup = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await checkAndCleanupStorage()
      setStatus(result.status)
      
      if (result.cleanupResult) {
        setLastCleanup(result.cleanupResult)
        if (!result.cleanupResult.success) {
          setError(result.cleanupResult.error || 'Auto cleanup failed')
        }
      }
      
      return result
    } catch (err: any) {
      setError(err.message)
      return { status: null }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check status on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  return {
    status,
    isLoading,
    error,
    lastCleanup,
    checkStatus,
    runCleanup,
    autoCleanup,
    // Helper computed values
    needsCleanup: status?.status === 'CLEANUP_NEEDED',
    isWarning: status?.status === 'WARNING',
    storageUsagePercent: status?.percent_of_1gb || 0,
    storageUsageMB: status?.size_mb || 0,
  }
}