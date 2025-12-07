// utils/storageCleanup.ts
import { supabase } from '../lib/supabase'

export interface StorageStatus {
  total_mb: number
  used_mb: number
  size_mb: number
  percent_of_1gb: number
  status: 'HEALTHY' | 'WARNING' | 'CLEANUP_NEEDED'
  photo_count: number
  oldest_photo_date: string | null
  estimated_cleanup_mb: number
  bucket_details: {
    transaction_photos: number
    delivery_photos: number
  }
}

export interface CleanupResult {
  success: boolean
  photos_deleted: number
  storage_freed_mb: number
  cleanup_log_id: string
  timestamp: string
  error?: string
}

// Get current storage status from Supabase Storage buckets
export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    // Fetch all files from transaction-photos bucket
    const { data: transactionPhotos, error: txError } = await supabase
      .storage
      .from('transaction-photos')
      .list()
    
    // Fetch all files from delivery-photos bucket
    const { data: deliveryPhotos, error: deliveryError } = await supabase
      .storage
      .from('delivery-photos')
      .list()
    
    if (txError && txError.message !== 'Not found') {
      console.warn('Error fetching transaction photos:', txError)
    }
    
    if (deliveryError && deliveryError.message !== 'Not found') {
      console.warn('Error fetching delivery photos:', deliveryError)
    }
    
    // Calculate total size from both buckets
    const transactionPhotosSize = (transactionPhotos || []).reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
    const deliveryPhotosSize = (deliveryPhotos || []).reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
    const totalSizeBytes = transactionPhotosSize + deliveryPhotosSize
    
    // Convert bytes to MB
    const sizeMB = totalSizeBytes / (1024 * 1024)
    const percentOf1GB = (sizeMB / 1024) * 100
    
    // Count photos
    const photoCount = (transactionPhotos?.length || 0) + (deliveryPhotos?.length || 0)
    
    // Find oldest photo date from created_at timestamps
    const allPhotos = [...(transactionPhotos || []), ...(deliveryPhotos || [])]
    const oldestPhoto = allPhotos.reduce((oldest, photo) => {
      if (!oldest || (photo.created_at && new Date(photo.created_at) < new Date(oldest))) {
        return photo.created_at
      }
      return oldest
    }, null as string | null)
    
    // Determine storage status based on usage
    let status: 'HEALTHY' | 'WARNING' | 'CLEANUP_NEEDED' = 'HEALTHY'
    if (percentOf1GB >= 90) {
      status = 'CLEANUP_NEEDED'
    } else if (percentOf1GB >= 70) {
      status = 'WARNING'
    }
    
    // Estimate cleanup potential (photos older than 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const oldPhotos = allPhotos.filter(photo => 
      photo.created_at && new Date(photo.created_at) < ninetyDaysAgo
    )
    
    const estimatedCleanupBytes = oldPhotos.reduce((sum, photo) => sum + (photo.metadata?.size || 0), 0)
    const estimatedCleanupMB = estimatedCleanupBytes / (1024 * 1024)
    
    return {
      total_mb: 1024, // 1GB limit (adjust based on your Supabase plan)
      used_mb: sizeMB,
      size_mb: sizeMB,
      percent_of_1gb: Math.min(percentOf1GB, 100),
      status,
      photo_count: photoCount,
      oldest_photo_date: oldestPhoto,
      estimated_cleanup_mb: estimatedCleanupMB,
      bucket_details: {
        transaction_photos: transactionPhotos?.length || 0,
        delivery_photos: deliveryPhotos?.length || 0
      }
    }
  } catch (error) {
    console.error('Error getting storage status:', error)
    throw new Error('Failed to get storage status from Supabase')
  }
}

// Run storage cleanup - deletes photos older than specified days
export async function runStorageCleanup(daysToKeep: number = 90): Promise<CleanupResult> {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`Starting storage cleanup for photos older than ${daysToKeep} days...`)
    
    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    // Fetch old photos from transaction-photos bucket
    const { data: transactionPhotos, error: txError } = await supabase
      .storage
      .from('transaction-photos')
      .list()
    
    // Fetch old photos from delivery-photos bucket
    const { data: deliveryPhotos, error: deliveryError } = await supabase
      .storage
      .from('delivery-photos')
      .list()
    
    if (txError && txError.message !== 'Not found') {
      console.error('Error fetching transaction photos for cleanup:', txError)
    }
    
    if (deliveryError && deliveryError.message !== 'Not found') {
      console.error('Error fetching delivery photos for cleanup:', deliveryError)
    }
    
    // Filter photos older than cutoff date
    const oldTransactionPhotos = (transactionPhotos || []).filter(photo => 
      photo.created_at && new Date(photo.created_at) < cutoffDate
    )
    
    const oldDeliveryPhotos = (deliveryPhotos || []).filter(photo => 
      photo.created_at && new Date(photo.created_at) < cutoffDate
    )
    
    let totalDeleted = 0
    let totalFreedBytes = 0
    
    // Delete old transaction photos
    if (oldTransactionPhotos.length > 0) {
      const photoNames = oldTransactionPhotos.map(p => p.name)
      const sizeToFree = oldTransactionPhotos.reduce((sum, p) => sum + (p.metadata?.size || 0), 0)
      
      const { error: deleteError } = await supabase
        .storage
        .from('transaction-photos')
        .remove(photoNames)
      
      if (deleteError) {
        console.error('Error deleting transaction photos:', deleteError)
      } else {
        totalDeleted += photoNames.length
        totalFreedBytes += sizeToFree
        console.log(`Deleted ${photoNames.length} transaction photos, freed ${(sizeToFree / (1024 * 1024)).toFixed(2)} MB`)
      }
    }
    
    // Delete old delivery photos
    if (oldDeliveryPhotos.length > 0) {
      const photoNames = oldDeliveryPhotos.map(p => p.name)
      const sizeToFree = oldDeliveryPhotos.reduce((sum, p) => sum + (p.metadata?.size || 0), 0)
      
      const { error: deleteError } = await supabase
        .storage
        .from('delivery-photos')
        .remove(photoNames)
      
      if (deleteError) {
        console.error('Error deleting delivery photos:', deleteError)
      } else {
        totalDeleted += photoNames.length
        totalFreedBytes += sizeToFree
        console.log(`Deleted ${photoNames.length} delivery photos, freed ${(sizeToFree / (1024 * 1024)).toFixed(2)} MB`)
      }
    }
    
    const storageFreedMB = totalFreedBytes / (1024 * 1024)
    
    // Log cleanup to database
    const { data: logData, error: logError } = await supabase
      .from('storage_cleanup_logs')
      .insert({
        photos_deleted: totalDeleted,
        storage_freed_mb: storageFreedMB,
        cleanup_date: timestamp,
        days_kept: daysToKeep,
        status: 'completed'
      })
      .select()
      .single()
    
    if (logError) {
      console.warn('Failed to log cleanup to database:', logError)
    }
    
    const result: CleanupResult = {
      success: true,
      photos_deleted: totalDeleted,
      storage_freed_mb: storageFreedMB,
      cleanup_log_id: logData?.id || 'unknown',
      timestamp
    }
    
    console.log('Storage cleanup completed:', result)
    return result
    
  } catch (error) {
    console.error('Error during storage cleanup:', error)
    
    // Log failed cleanup
    await supabase
      .from('storage_cleanup_logs')
      .insert({
        photos_deleted: 0,
        storage_freed_mb: 0,
        cleanup_date: timestamp,
        days_kept: daysToKeep,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    
    return {
      success: false,
      photos_deleted: 0,
      storage_freed_mb: 0,
      cleanup_log_id: 'error',
      timestamp,
      error: error instanceof Error ? error.message : 'Storage cleanup failed'
    }
  }
}

// Check storage and run cleanup if needed
export async function checkAndCleanupStorage(): Promise<{
  status: StorageStatus | null
  cleanupResult?: CleanupResult
}> {
  try {
    const status = await getStorageStatus()
    
    // If cleanup is needed (90% or more), run automatic cleanup
    if (status.status === 'CLEANUP_NEEDED') {
      console.log('Storage cleanup needed, running automatic cleanup...')
      const cleanupResult = await runStorageCleanup()
      
      return {
        status,
        cleanupResult
      }
    }
    
    return { status }
  } catch (error) {
    console.error('Error in checkAndCleanupStorage:', error)
    return { status: null }
  }
}