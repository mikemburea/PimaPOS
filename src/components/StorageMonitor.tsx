// components/StorageMonitor.tsx
import React, { useEffect } from 'react'
import { useStorageCleanup } from '../hooks/useStorageCleanup'

interface StorageMonitorProps {
  autoCleanup?: boolean // Enable automatic cleanup
  showUI?: boolean // Show the monitoring UI
  onCleanupComplete?: (result: any) => void
}

export function StorageMonitor({ 
  autoCleanup = true, 
  showUI = false,
  onCleanupComplete 
}: StorageMonitorProps) {
  const {
    status,
    isLoading,
    error,
    lastCleanup,
    autoCleanup: performAutoCleanup,
    runCleanup,
    checkStatus,
    needsCleanup,
    isWarning,
    storageUsagePercent,
    storageUsageMB
  } = useStorageCleanup()

  // Auto cleanup on mount and when needed
  useEffect(() => {
    if (autoCleanup && needsCleanup && !isLoading) {
      performAutoCleanup().then((result) => {
        if (result.cleanupResult && onCleanupComplete) {
          onCleanupComplete(result.cleanupResult)
        }
      })
    }
  }, [autoCleanup, needsCleanup, isLoading, performAutoCleanup, onCleanupComplete])

  // Don't render UI if showUI is false
  if (!showUI) {
    return null
  }

  const getStatusColor = () => {
    if (needsCleanup) return 'text-red-600 bg-red-50'
    if (isWarning) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getProgressBarColor = () => {
    if (storageUsagePercent > 85) return 'bg-red-500'
    if (storageUsagePercent > 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Storage Usage</h3>
        <button
          onClick={checkStatus}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      {status && (
        <div className="space-y-3">
          {/* Storage Usage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Storage Used</span>
              <span>{storageUsageMB.toFixed(1)}MB / 1024MB ({storageUsagePercent.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
            {status.status === 'CLEANUP_NEEDED' && '⚠️ Cleanup Needed'}
            {status.status === 'WARNING' && '⚠️ Warning'}
            {status.status === 'HEALTHY' && '✅ Healthy'}
          </div>

          {/* File Count */}
          <div className="text-sm text-gray-600">
          Total Files: {status.photo_count}
          </div>

          {/* Manual Cleanup Button */}
          {(needsCleanup || isWarning) && (
            <button
              onClick={runCleanup}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isLoading ? 'Cleaning...' : 'Run Cleanup Now'}
            </button>
          )}

          {/* Last Cleanup Result */}
          {lastCleanup && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              <div className="font-medium">Last Cleanup:</div>
              {lastCleanup.success ? (
                <div className="text-green-600">
                  ✅ Deleted {lastCleanup.photos_deleted} photos, 
                  freed {lastCleanup.storage_freed_mb}MB
                </div>
              ) : (
                <div className="text-red-600">
                  ❌ Failed: {lastCleanup.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Simple version for silent monitoring
export function useStorageMonitor(autoCleanup: boolean = true) {
  const { autoCleanup: performAutoCleanup, status, needsCleanup } = useStorageCleanup()

  useEffect(() => {
    if (autoCleanup && needsCleanup) {
      performAutoCleanup()
    }
  }, [autoCleanup, needsCleanup, performAutoCleanup])

  return {
    storageUsagePercent: status?.percent_of_1gb || 0,
    needsCleanup,
   status: status?.status || 'HEALTHY'
  }
}