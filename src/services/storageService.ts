// src/services/storageService.ts - Fixed version with proper bucket creation
import { supabase } from '../lib/supabase';

export interface UploadResult {
  path: string;
  url: string;
  filename: string;
  size: number;
}

export class StorageService {
  // Keep your original bucket name for backward compatibility
  private static BUCKET_NAME = 'supplier-documents';
  
  // Add new bucket for transaction photos
  private static TRANSACTION_PHOTOS_BUCKET = 'transaction-photos';
  private static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];

  // ===== ORIGINAL METHODS (UNCHANGED) =====

  // Upload file (your original method)
  static async uploadFile(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    return data.path;
  }

  // Get file URL (your original method)
  static getFileUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Delete file (your original method)
  static async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // List files in folder (your original method)
  static async listFiles(folder: string = '') {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list(folder);

    if (error) {
      console.error('Error listing files:', error);
      throw error;
    }

    return data;
  }

  // ===== NEW METHODS FOR TRANSACTION PHOTOS =====

  /**
   * Initialize transaction photos bucket - SIMPLIFIED VERSION
   * This will attempt to create the bucket, but won't fail if it already exists
   */
  static async initializeTransactionPhotosBucket(): Promise<void> {
    try {
      // Try to create the bucket
      const { data, error } = await supabase.storage.createBucket(this.TRANSACTION_PHOTOS_BUCKET, {
        public: true,
        allowedMimeTypes: this.ALLOWED_IMAGE_TYPES,
        fileSizeLimit: this.MAX_FILE_SIZE
      });
      
      if (error) {
        // If bucket already exists, that's fine
        if (error.message.includes('already exists')) {
          console.log(`Bucket ${this.TRANSACTION_PHOTOS_BUCKET} already exists`);
        } else {
          console.warn(`Could not create bucket: ${error.message}`);
        }
      } else {
        console.log(`Successfully created bucket: ${this.TRANSACTION_PHOTOS_BUCKET}`);
      }
    } catch (error) {
      console.warn('Error initializing transaction photos bucket:', error);
      // Don't throw - the app should still work even if bucket creation fails
    }
  }

  /**
   * Upload transaction photo with validation
   */
  static async uploadTransactionPhoto(
    file: File, 
    transactionId: string
  ): Promise<UploadResult> {
    // Validate image file
    this.validateImageFile(file);

    // Generate unique filename
    const timestamp = Date.now();
    const extension = this.getFileExtension(file.name);
    const filename = `transaction_${transactionId}_${timestamp}.${extension}`;
    const path = `transactions/${transactionId}/${filename}`;

    try {
      // Upload to transaction photos bucket
      const { data, error } = await supabase.storage
        .from(this.TRANSACTION_PHOTOS_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // If bucket doesn't exist, try to use the main bucket as fallback
        if (error.message.includes('not found')) {
          console.warn('Transaction photos bucket not found, using main bucket as fallback');
          const fallbackPath = `transaction-photos/${path}`;
          return await this.uploadToMainBucket(file, fallbackPath, transactionId);
        }
        throw new Error(`Photo upload failed: ${error.message}`);
      }

      // Get public URL
      const url = this.getTransactionPhotoUrl(data.path);

      return {
        path: data.path,
        url,
        filename: file.name,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading transaction photo:', error);
      throw error;
    }
  }

  /**
   * Fallback method to upload to main bucket if transaction photos bucket is not available
   */
  private static async uploadToMainBucket(
    file: File, 
    path: string, 
    transactionId: string
  ): Promise<UploadResult> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Fallback upload failed: ${error.message}`);
    }

    const url = this.getFileUrl(data.path);

    return {
      path: data.path,
      url,
      filename: file.name,
      size: file.size
    };
  }

  /**
   * Get public URL for transaction photo
   */
  static getTransactionPhotoUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.TRANSACTION_PHOTOS_BUCKET)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete transaction photo
   */
  static async deleteTransactionPhoto(path: string): Promise<void> {
    // Try transaction photos bucket first
    let { error } = await supabase.storage
      .from(this.TRANSACTION_PHOTOS_BUCKET)
      .remove([path]);

    if (error && error.message.includes('not found')) {
      // Fallback to main bucket
      const fallbackPath = `transaction-photos/${path}`;
      const { error: fallbackError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fallbackPath]);
      
      if (fallbackError) {
        console.error('Error deleting transaction photo from main bucket:', fallbackError);
        throw fallbackError;
      }
    } else if (error) {
      console.error('Error deleting transaction photo:', error);
      throw error;
    }
  }

  /**
   * List all photos for a specific transaction
   */
  static async listTransactionPhotos(transactionId: string) {
    // Try transaction photos bucket first
    const { data, error } = await supabase.storage
      .from(this.TRANSACTION_PHOTOS_BUCKET)
      .list(`transactions/${transactionId}`);

    if (error && error.message.includes('not found')) {
      // Fallback to main bucket
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`transaction-photos/transactions/${transactionId}`);

      if (fallbackError) {
        console.error('Error listing transaction photos from main bucket:', fallbackError);
        return [];
      }
      return fallbackData || [];
    }

    if (error) {
      console.error('Error listing transaction photos:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Delete all photos for a transaction
   */
  static async deleteAllTransactionPhotos(transactionId: string): Promise<void> {
    try {
      // Get all photos for the transaction
      const photos = await this.listTransactionPhotos(transactionId);
      
      if (photos.length === 0) return;

      // Try to delete from transaction photos bucket first
      const paths = photos.map(photo => `transactions/${transactionId}/${photo.name}`);

      const { error } = await supabase.storage
        .from(this.TRANSACTION_PHOTOS_BUCKET)
        .remove(paths);

      if (error && error.message.includes('not found')) {
        // Fallback to main bucket
        const fallbackPaths = photos.map(photo => `transaction-photos/transactions/${transactionId}/${photo.name}`);
        const { error: fallbackError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(fallbackPaths);

        if (fallbackError) {
          throw fallbackError;
        }
      } else if (error) {
        throw error;
      }

      console.log(`Deleted ${paths.length} photos for transaction ${transactionId}`);
    } catch (error) {
      console.error('Error deleting all transaction photos:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Validate image file
   */
  private static validateImageFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`);
    }

    // Check if file is actually an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'jpg';
  }

  /**
   * Compress image for better performance (optional)
   */
  static async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080 to keep reasonable size)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => resolve(file); // Fallback to original on error
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    supplierDocuments: { count: number };
    transactionPhotos: { count: number };
  }> {
    try {
      const supplierFiles = await this.listFiles();
      
      // Try to get transaction photos count
      let transactionCount = 0;
      try {
        const { data: transactionFiles } = await supabase.storage
          .from(this.TRANSACTION_PHOTOS_BUCKET)
          .list();
        transactionCount = transactionFiles?.length || 0;
      } catch {
        // If transaction photos bucket doesn't exist, count from main bucket
        const { data: fallbackFiles } = await supabase.storage
          .from(this.BUCKET_NAME)
          .list('transaction-photos');
        transactionCount = fallbackFiles?.length || 0;
      }

      return {
        supplierDocuments: { count: supplierFiles?.length || 0 },
        transactionPhotos: { count: transactionCount }
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        supplierDocuments: { count: 0 },
        transactionPhotos: { count: 0 }
      };
    }
  }
}

// Initialize the transaction photos bucket when the service loads
// This will run but won't break if it fails
StorageService.initializeTransactionPhotosBucket();