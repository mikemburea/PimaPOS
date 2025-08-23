// src/services/storageService.ts - FIXED version that creates database records
import { supabase } from '../lib/supabase';

interface UploadResult {
  path: string;
  fullPath: string;
  publicUrl: string;
  photoRecord?: any;
}

interface PhotoUploadOptions {
  cacheControl?: string;
  upsert?: boolean;
  metadata?: Record<string, any>;
  uploadOrder?: number;
  isPrimary?: boolean;
  notes?: string;
}

export class StorageService {
  private static readonly BUCKET_NAME = 'transaction-photos';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Upload a transaction photo and create database record
   * FIXED: Now properly creates database records after successful upload
   */
  static async uploadTransactionPhoto(
    file: File,
    transactionId: string,
    options: PhotoUploadOptions = {}
  ): Promise<UploadResult> {
    try {
      console.log(`[StorageService] Starting upload for transaction: ${transactionId}`);
      console.log(`[StorageService] File: ${file.name} (${file.size} bytes, ${file.type})`);

      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = this.getFileExtension(file.name);
      const fileName = `transaction_${transactionId}_${timestamp}_${randomId}.${fileExtension}`;
      
      // Create storage path
      const storagePath = `transactions/${transactionId}/${fileName}`;
      
      console.log(`[StorageService] Upload path: ${storagePath}`);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: options.cacheControl || '3600',
          upsert: options.upsert || false,
          contentType: file.type
        });

      if (uploadError) {
        console.error(`[StorageService] Upload failed:`, uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log(`[StorageService] Upload successful:`, uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(storagePath);

      console.log(`[StorageService] Public URL generated:`, urlData.publicUrl);

      // FIXED: Create database record after successful upload
      const photoRecord = await this.createPhotoRecord({
        transactionId,
        fileName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type,
        uploadOrder: options.uploadOrder,
        isPrimary: options.isPrimary,
        notes: options.notes
      });

      console.log(`[StorageService] Database record created:`, photoRecord.id);

      return {
        path: uploadData.path,
        fullPath: storagePath,
        publicUrl: urlData.publicUrl,
        photoRecord
      };

    } catch (error) {
      console.error(`[StorageService] Upload process failed:`, error);
      throw error;
    }
  }

  /**
   * FIXED: Create database record for uploaded photo
   */
  private static async createPhotoRecord(params: {
    transactionId: string;
    fileName: string;
    storagePath: string;
    fileSize: number;
    mimeType: string;
    uploadOrder?: number;
    isPrimary?: boolean;
    notes?: string;
  }) {
    try {
      console.log(`[StorageService] Creating database record for transaction: ${params.transactionId}`);

      // Check if this is the first photo for this transaction (make it primary)
      const { data: existingPhotos, error: checkError } = await supabase
        .from('transaction_photos')
        .select('id')
        .eq('transaction_id', params.transactionId);

      if (checkError) {
        console.warn(`[StorageService] Could not check existing photos: ${checkError.message}`);
      }

      const isFirstPhoto = !existingPhotos || existingPhotos.length === 0;
      const isPrimary = params.isPrimary !== undefined ? params.isPrimary : isFirstPhoto;
      const uploadOrder = params.uploadOrder || (existingPhotos?.length || 0) + 1;

      // Create the database record
      const photoData = {
        transaction_id: params.transactionId,
        file_name: params.fileName,
        file_path: params.storagePath,
        file_size_bytes: params.fileSize,
        mime_type: params.mimeType,
        upload_order: uploadOrder,
        storage_bucket: this.BUCKET_NAME,
        is_primary: isPrimary,
        notes: params.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log(`[StorageService] Inserting photo record:`, photoData);

      const { data: insertedPhoto, error: insertError } = await supabase
        .from('transaction_photos')
        .insert(photoData)
        .select()
        .single();

      if (insertError) {
        console.error(`[StorageService] Database insert failed:`, insertError);
        
        // Try to clean up uploaded file if database insert fails
        try {
          await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([params.storagePath]);
          console.log(`[StorageService] Cleaned up uploaded file after database error`);
        } catch (cleanupError) {
          console.error(`[StorageService] Failed to cleanup file:`, cleanupError);
        }
        
        throw new Error(`Failed to create photo record: ${insertError.message}`);
      }

      console.log(`[StorageService] Photo record created successfully:`, insertedPhoto.id);
      return insertedPhoto;

    } catch (error) {
      console.error(`[StorageService] Failed to create photo record:`, error);
      throw error;
    }
  }

  /**
   * Upload multiple photos for a transaction
   */
  static async uploadMultiplePhotos(
    files: File[],
    transactionId: string,
    options: PhotoUploadOptions = {}
  ): Promise<UploadResult[]> {
    console.log(`[StorageService] Uploading ${files.length} photos for transaction: ${transactionId}`);
    
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileOptions = {
        ...options,
        uploadOrder: (options.uploadOrder || 0) + i + 1,
        isPrimary: i === 0 && options.isPrimary !== false // First photo is primary unless explicitly set
      };
      
      try {
        const result = await this.uploadTransactionPhoto(file, transactionId, fileOptions);
        results.push(result);
        console.log(`[StorageService] Uploaded photo ${i + 1}/${files.length}: ${file.name}`);
      } catch (error) {
        console.error(`[StorageService] Failed to upload photo ${i + 1}/${files.length}:`, error);
        throw error;
      }
    }
    
    console.log(`[StorageService] Successfully uploaded ${results.length} photos`);
    return results;
  }

  /**
   * Delete a transaction photo (both storage and database)
   */
  static async deleteTransactionPhoto(photoId: string): Promise<void> {
    try {
      console.log(`[StorageService] Deleting photo: ${photoId}`);

      // Get photo record first
      const { data: photo, error: fetchError } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch photo record: ${fetchError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([photo.file_path]);

      if (storageError) {
        console.warn(`[StorageService] Storage deletion failed: ${storageError.message}`);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('transaction_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        throw new Error(`Failed to delete photo record: ${dbError.message}`);
      }

      console.log(`[StorageService] Photo deleted successfully: ${photoId}`);

    } catch (error) {
      console.error(`[StorageService] Failed to delete photo:`, error);
      throw error;
    }
  }

  /**
   * Get all photos for a transaction
   */
  static async getTransactionPhotos(transactionId: string): Promise<any[]> {
    try {
      console.log(`[StorageService] Fetching photos for transaction: ${transactionId}`);

      const { data: photos, error } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('upload_order', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch photos: ${error.message}`);
      }

      console.log(`[StorageService] Found ${photos?.length || 0} photos for transaction: ${transactionId}`);
      return photos || [];

    } catch (error) {
      console.error(`[StorageService] Failed to fetch photos:`, error);
      throw error;
    }
  }

  /**
   * Repair missing database records for existing storage files
   * UTILITY FUNCTION to fix your current issue
   */
  static async repairMissingPhotoRecords(transactionId: string): Promise<{
    found: number;
    created: number;
    errors: string[];
  }> {
    console.log(`[StorageService] Repairing missing photo records for transaction: ${transactionId}`);
    
    const result = {
      found: 0,
      created: 0,
      errors: [] as string[]
    };

    try {
      // Get files from storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`transactions/${transactionId}`);

      if (storageError) {
        result.errors.push(`Storage error: ${storageError.message}`);
        return result;
      }

      if (!storageFiles || storageFiles.length === 0) {
        console.log(`[StorageService] No files found in storage for transaction: ${transactionId}`);
        return result;
      }

      result.found = storageFiles.length;
      console.log(`[StorageService] Found ${result.found} files in storage`);

      // Get existing database records
      const { data: existingRecords, error: dbError } = await supabase
        .from('transaction_photos')
        .select('file_path')
        .eq('transaction_id', transactionId);

      if (dbError) {
        result.errors.push(`Database error: ${dbError.message}`);
        return result;
      }

      const existingPaths = new Set(existingRecords?.map(r => r.file_path) || []);

      // Create missing records
      for (let i = 0; i < storageFiles.length; i++) {
        const file = storageFiles[i];
        const filePath = `transactions/${transactionId}/${file.name}`;

        if (existingPaths.has(filePath)) {
          console.log(`[StorageService] Record already exists for: ${file.name}`);
          continue;
        }

        try {
          const photoData = {
            transaction_id: transactionId,
            file_name: file.name,
            file_path: filePath,
            file_size_bytes: file.metadata?.size || null,
            mime_type: file.metadata?.mimetype || 'image/jpeg',
            upload_order: i + 1,
            storage_bucket: this.BUCKET_NAME,
            is_primary: i === 0,
            notes: 'Repaired missing record',
            created_at: file.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('transaction_photos')
            .insert(photoData);

          if (insertError) {
            result.errors.push(`Failed to create record for ${file.name}: ${insertError.message}`);
          } else {
            result.created++;
            console.log(`[StorageService] Created missing record for: ${file.name}`);
          }

        } catch (error) {
          result.errors.push(`Error processing ${file.name}: ${error}`);
        }
      }

      console.log(`[StorageService] Repair complete: ${result.created} records created`);
      return result;

    } catch (error) {
      result.errors.push(`Repair failed: ${error}`);
      return result;
    }
  }

  /**
   * Validate uploaded file
   */
  private static validateFile(file: File): void {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (5MB)`);
    }

    if (!this.ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      throw new Error(`File type ${file.type} is not allowed. Supported types: ${this.ALLOWED_TYPES.join(', ')}`);
    }
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension || 'jpg';
  }

  /**
   * Test storage and database connectivity
   */
  static async testConnectivity(): Promise<{
    storage: boolean;
    database: boolean;
    errors: string[];
  }> {
    const result = {
      storage: false,
      database: false,
      errors: [] as string[]
    };

    try {
      // Test storage
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      if (storageError) {
        result.errors.push(`Storage error: ${storageError.message}`);
      } else {
        const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME);
        result.storage = !!bucketExists;
        if (!bucketExists) {
          result.errors.push(`Bucket ${this.BUCKET_NAME} not found`);
        }
      }

      // Test database
      const { data: photos, error: dbError } = await supabase
        .from('transaction_photos')
        .select('id')
        .limit(1);

      if (dbError) {
        result.errors.push(`Database error: ${dbError.message}`);
      } else {
        result.database = true;
      }

    } catch (error) {
      result.errors.push(`Connectivity test failed: ${error}`);
    }

    return result;
  }
}