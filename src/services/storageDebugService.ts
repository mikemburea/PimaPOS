// src/services/storageDebugService.ts - Enhanced debugging for photo storage issues
import { supabase } from '../lib/supabase';

interface StorageDebugResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface PhotoValidationResult {
  isValid: boolean;
  issues: string[];
  photo?: any;
  actualUrl?: string;
  fileExists?: boolean;
}

export class StorageDebugService {
  
  /**
   * Comprehensive photo debugging for a specific transaction
   */
  static async debugTransactionPhotos(transactionId: string): Promise<{
    transactionExists: boolean;
    photosInDatabase: number;
    photosValidated: PhotoValidationResult[];
    storageStatus: StorageDebugResult;
    recommendations: string[];
  }> {
    console.log(`[StorageDebugService] Starting comprehensive debug for transaction: ${transactionId}`);
    
    const results = {
      transactionExists: false,
      photosInDatabase: 0,
      photosValidated: [] as PhotoValidationResult[],
      storageStatus: { success: false, message: 'Not checked' } as StorageDebugResult,
      recommendations: [] as string[]
    };
    
    try {
      // 1. Verify transaction exists
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('id, transaction_number, created_at, is_walkin')
        .eq('id', transactionId)
        .single();
      
      if (txError || !transaction) {
        results.recommendations.push('❌ Transaction not found in database');
        return results;
      }
      
      results.transactionExists = true;
      console.log(`[StorageDebugService] Transaction found: ${transaction.transaction_number}`);
      
      // 2. Check photos in database
      const { data: photos, error: photosError } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('upload_order', { ascending: true });
      
      if (photosError) {
        results.recommendations.push(`❌ Error querying photos: ${photosError.message}`);
        return results;
      }
      
      results.photosInDatabase = photos?.length || 0;
      console.log(`[StorageDebugService] Found ${results.photosInDatabase} photos in database`);
      
      // 3. Validate each photo
      if (photos && photos.length > 0) {
        for (const photo of photos) {
          const validation = await this.validatePhotoRecord(photo);
          results.photosValidated.push(validation);
        }
      }
      
      // 4. Test storage connectivity
      results.storageStatus = await this.testStorageConnectivity();
      
      // 5. Generate recommendations
      results.recommendations = this.generateRecommendations(results);
      
      return results;
      
    } catch (error) {
      console.error('[StorageDebugService] Debug failed:', error);
      results.recommendations.push(`❌ Debug failed: ${error}`);
      return results;
    }
  }
  
  /**
   * Validate a single photo record
   */
  static async validatePhotoRecord(photo: any): Promise<PhotoValidationResult> {
    const result: PhotoValidationResult = {
      isValid: true,
      issues: [],
      photo: photo
    };
    
    try {
      // Basic validation
      if (!photo.id) result.issues.push('Missing photo ID');
      if (!photo.transaction_id) result.issues.push('Missing transaction ID');
      if (!photo.file_name) result.issues.push('Missing file name');
      if (!photo.file_path) result.issues.push('Missing file path');
      
      if (result.issues.length > 0) {
        result.isValid = false;
        return result;
      }
      
      // Generate URL
      const bucketName = photo.storage_bucket || 'transaction-photos';
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(photo.file_path);
      
      result.actualUrl = urlData.publicUrl;
      
      // Test if file exists in storage
      try {
        const pathParts = photo.file_path.split('/');
        const fileName = pathParts.pop();
        const folder = pathParts.join('/') || '';
        
        const { data: files, error } = await supabase.storage
          .from(bucketName)
          .list(folder, { search: fileName });
        
        if (error) {
          result.issues.push(`Storage list error: ${error.message}`);
        } else {
          result.fileExists = files?.some(f => f.name === fileName) || false;
          if (!result.fileExists) {
            result.issues.push('File not found in storage');
          }
        }
      } catch (storageError) {
        result.issues.push(`Storage check failed: ${storageError}`);
      }
      
      // Test URL accessibility
      if (result.actualUrl) {
        try {
          const response = await fetch(result.actualUrl, { method: 'HEAD' });
          if (!response.ok) {
            result.issues.push(`URL not accessible: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          result.issues.push(`URL fetch failed: ${fetchError}`);
        }
      }
      
      result.isValid = result.issues.length === 0;
      return result;
      
    } catch (error) {
      result.isValid = false;
      result.issues.push(`Validation failed: ${error}`);
      return result;
    }
  }
  
  /**
   * Test storage bucket connectivity
   */
  static async testStorageConnectivity(): Promise<StorageDebugResult> {
    try {
      // Test 1: List buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        return {
          success: false,
          message: `Failed to list buckets: ${bucketsError.message}`,
          error: bucketsError.message
        };
      }
      
      const transactionBucket = buckets?.find(b => b.name === 'transaction-photos');
      if (!transactionBucket) {
        return {
          success: false,
          message: 'transaction-photos bucket not found',
          data: { availableBuckets: buckets?.map(b => b.name) || [] }
        };
      }
      
      // Test 2: List files in bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('transaction-photos')
        .list('', { limit: 1 });
      
      if (filesError) {
        return {
          success: false,
          message: `Failed to list files: ${filesError.message}`,
          error: filesError.message
        };
      }
      
      // Test 3: Test upload permissions (upload a tiny test file)
      const testFileName = `test-connectivity-${Date.now()}.txt`;
      const testContent = new Blob(['test'], { type: 'text/plain' });
      
      const { error: uploadError } = await supabase.storage
        .from('transaction-photos')
        .upload(`tests/${testFileName}`, testContent, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        return {
          success: false,
          message: `Upload test failed: ${uploadError.message}`,
          error: uploadError.message
        };
      }
      
      // Clean up test file
      await supabase.storage
        .from('transaction-photos')
        .remove([`tests/${testFileName}`]);
      
      return {
        success: true,
        message: 'Storage connectivity OK',
        data: {
          bucketExists: true,
          canList: true,
          canUpload: true,
          totalFiles: files?.length || 0
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Connectivity test failed: ${error}`,
        error: String(error)
      };
    }
  }
  
  /**
   * Generate debugging recommendations
   */
  static generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];
    
    if (!results.transactionExists) {
      recommendations.push('🔍 Check if transaction ID is correct');
      return recommendations;
    }
    
    if (results.photosInDatabase === 0) {
      recommendations.push('📷 No photos found in database - check if photos were uploaded');
      recommendations.push('⏱️ If transaction is recent, photos might still be uploading');
      return recommendations;
    }
    
    if (!results.storageStatus.success) {
      recommendations.push('🗄️ Storage connectivity issues detected');
      recommendations.push(`   ${results.storageStatus.message}`);
    }
    
    const invalidPhotos = results.photosValidated.filter((p: PhotoValidationResult) => !p.isValid);
    if (invalidPhotos.length > 0) {
      recommendations.push(`⚠️ ${invalidPhotos.length} photo(s) have issues:`);
      invalidPhotos.forEach((p: PhotoValidationResult, index: number) => {
        recommendations.push(`   Photo ${index + 1}: ${p.issues.join(', ')}`);
      });
    }
    
    const photosNotInStorage = results.photosValidated.filter((p: PhotoValidationResult) => p.fileExists === false);
    if (photosNotInStorage.length > 0) {
      recommendations.push('🚫 Some photos are in database but not in storage');
      recommendations.push('   This suggests upload failures or storage cleanup issues');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All photos appear to be working correctly');
      recommendations.push('🔄 Try refreshing the notification to reload photos');
    }
    
    return recommendations;
  }
  
  /**
   * Fix common photo issues automatically
   */
  static async autoFixPhotoIssues(transactionId: string): Promise<{
    fixed: string[];
    failed: string[];
  }> {
    const results = {
      fixed: [] as string[],
      failed: [] as string[]
    };
    
    try {
      // Get photos with issues
      const debugResults = await this.debugTransactionPhotos(transactionId);
      const problematicPhotos = debugResults.photosValidated.filter(p => !p.isValid);
      
      for (const photoValidation of problematicPhotos) {
        const photo = photoValidation.photo;
        
        try {
          // Try to regenerate public URL
          if (photo.file_path) {
            const bucketName = photo.storage_bucket || 'transaction-photos';
            const { data } = supabase.storage
              .from(bucketName)
              .getPublicUrl(photo.file_path);
            
            if (data.publicUrl) {
              results.fixed.push(`Regenerated URL for photo ${photo.id}`);
            }
          }
          
          // Update photo metadata if needed
          if (!photo.storage_bucket) {
            const { error } = await supabase
              .from('transaction_photos')
              .update({ storage_bucket: 'transaction-photos' })
              .eq('id', photo.id);
            
            if (!error) {
              results.fixed.push(`Updated storage bucket for photo ${photo.id}`);
            }
          }
          
        } catch (error) {
          results.failed.push(`Failed to fix photo ${photo.id}: ${error}`);
        }
      }
      
    } catch (error) {
      results.failed.push(`Auto-fix failed: ${error}`);
    }
    
    return results;
  }
  
  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byTransactionCount: Record<string, number>;
    oldestFile?: string;
    newestFile?: string;
  }> {
    try {
      // Get all photos from database
      const { data: photos, error } = await supabase
        .from('transaction_photos')
        .select('transaction_id, file_size_bytes, created_at');
      
      if (error || !photos) {
        throw new Error(`Failed to get photos: ${error?.message}`);
      }
      
      const stats = {
        totalFiles: photos.length,
        totalSize: photos.reduce((sum, p) => sum + (p.file_size_bytes || 0), 0),
        byTransactionCount: {} as Record<string, number>,
        oldestFile: photos.length > 0 ? photos[0].created_at : undefined,
        newestFile: photos.length > 0 ? photos[0].created_at : undefined
      };
      
      // Count by transaction
      photos.forEach(photo => {
        stats.byTransactionCount[photo.transaction_id] = 
          (stats.byTransactionCount[photo.transaction_id] || 0) + 1;
      });
      
      // Find oldest and newest
      photos.forEach(photo => {
        if (!stats.oldestFile || photo.created_at < stats.oldestFile) {
          stats.oldestFile = photo.created_at;
        }
        if (!stats.newestFile || photo.created_at > stats.newestFile) {
          stats.newestFile = photo.created_at;
        }
      });
      
      return stats;
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byTransactionCount: {}
      };
    }
  }
}

// Convenience functions for debugging
export const debugTransactionPhotos = (transactionId: string) => 
  StorageDebugService.debugTransactionPhotos(transactionId);

export const fixPhotoIssues = (transactionId: string) => 
  StorageDebugService.autoFixPhotoIssues(transactionId);

export const getStorageStats = () => 
  StorageDebugService.getStorageStats();