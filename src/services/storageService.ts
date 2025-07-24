// src/services/storageService.ts - Extended version maintaining backward compatibility
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
   * Initialize transaction photos bucket if it doesn't exist
   */
  static async initializeTransactionPhotosBucket(): Promise<void> {
    try {
      const { data: existingBucket, error: listError } = await supabase.storage.getBucket(this.TRANSACTION_PHOTOS_BUCKET);
      
      if (listError && listError.message.includes('not found')) {
        // Create bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket(this.TRANSACTION_PHOTOS_BUCKET, {
          public: true, // Make public for easy access
          allowedMimeTypes: this.ALLOWED_IMAGE_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });
        
        if (createError) {
          console.error(`Error creating transaction photos bucket:`, createError);
        } else {
          console.log(`Successfully created transaction photos bucket`);
        }
      }
    } catch (error) {
      console.error('Error initializing transaction photos bucket:', error);
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
    const { error } = await supabase.storage
      .from(this.TRANSACTION_PHOTOS_BUCKET)
      .remove([path]);

    if (error) {
      console.error('Error deleting transaction photo:', error);
      throw error;
    }
  }

  /**
   * List all photos for a specific transaction
   */
  static async listTransactionPhotos(transactionId: string) {
    const { data, error } = await supabase.storage
      .from(this.TRANSACTION_PHOTOS_BUCKET)
      .list(`transactions/${transactionId}`);

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

      // Create paths array
      const paths = photos.map(photo => `transactions/${transactionId}/${photo.name}`);

      // Delete all files
      const { error } = await supabase.storage
        .from(this.TRANSACTION_PHOTOS_BUCKET)
        .remove(paths);

      if (error) {
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
      const [supplierFiles, transactionFiles] = await Promise.all([
        this.listFiles(), // Your original method
        supabase.storage.from(this.TRANSACTION_PHOTOS_BUCKET).list()
      ]);

      return {
        supplierDocuments: { count: supplierFiles?.length || 0 },
        transactionPhotos: { count: transactionFiles.data?.length || 0 }
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
StorageService.initializeTransactionPhotosBucket();