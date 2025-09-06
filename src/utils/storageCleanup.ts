// utils/storageCleanup.ts
import { supabase } from '../lib/supabase';

export interface StorageStatus {
  bucket_name: string
  total_size_bytes: number
  size_mb: number
  percent_of_1gb: number
  file_count: number
  status: 'OK' | 'WARNING' | 'CLEANUP_NEEDED'
}

export interface CleanupResult {
  success: boolean
  photos_deleted: number
  storage_freed_mb: number
  cleanup_log_id: string
  timestamp: string
  error?: string
}

// Check current storage status
export async function getStorageStatus(): Promise<StorageStatus | null> {
  const { data, error } = await supabase
    .from('storage_status')
    .select('*')
    .eq('bucket_name', 'TOTAL')
    .single()

  if (error) {
    console.error('Error fetching storage status:', error)
    return null
  }

  return data
}

// Run cleanup if needed
export async function runStorageCleanup(): Promise<CleanupResult> {
  try {
    const { data, error } = await supabase
      .rpc('scheduled_storage_cleanup')

    if (error) throw error

    return {
      success: true,
      photos_deleted: data.photos_deleted,
      storage_freed_mb: data.storage_freed_mb,
      cleanup_log_id: data.cleanup_log_id,
      timestamp: data.timestamp,
    }
  } catch (error: any) {
    return {
      success: false,
      photos_deleted: 0,
      storage_freed_mb: 0,
      cleanup_log_id: '',
      timestamp: new Date().toISOString(),
      error: error.message,
    }
  }
}

// Check and cleanup if needed (call this in your app)
export async function checkAndCleanupStorage(): Promise<{
  status: StorageStatus | null
  cleanupResult?: CleanupResult
}> {
  const status = await getStorageStatus()
  
  if (!status) {
    return { status: null }
  }

  // Only run cleanup if needed
  if (status.status === 'CLEANUP_NEEDED') {
    const cleanupResult = await runStorageCleanup()
    return { status, cleanupResult }
  }

  return { status }
}

// Get cleanup history
export async function getCleanupHistory(limit: number = 10) {
  const { data, error } = await supabase
    .from('storage_cleanup_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching cleanup history:', error)
    return []
  }

  return data
}