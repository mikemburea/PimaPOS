// src/utils/debugTransactionPhotos.ts
import { supabase } from '../lib/supabase';

interface TransactionPhoto {
  id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  upload_order?: number | null;
  storage_bucket?: string | null;
  is_primary?: boolean | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export class TransactionPhotosDebugger {
  // Test if photos exist for a specific transaction
  static async checkPhotosForTransaction(transactionId: string): Promise<void> {
    console.group(`🔍 Checking photos for transaction: ${transactionId}`);
    
    try {
      // Check database records
      const { data: photos, error } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('transaction_id', transactionId);

      if (error) {
        console.error('❌ Database error:', error);
        return;
      }

      console.log(`📊 Found ${photos?.length || 0} photos in database:`, photos);

      // Check each photo's storage accessibility
      if (photos && photos.length > 0) {
        for (const photo of photos) {
          await this.testPhotoUrl(photo);
        }
      }

    } catch (error) {
      console.error('❌ Error checking photos:', error);
    }
    
    console.groupEnd();
  }

  // Test if a photo URL is accessible
  static async testPhotoUrl(photo: TransactionPhoto): Promise<void> {
    console.group(`🖼️ Testing photo: ${photo.file_name}`);
    
    try {
      const bucketName = photo.storage_bucket || 'transaction-photos';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        console.error('❌ VITE_SUPABASE_URL not found in environment variables');
        return;
      }

      const photoUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${photo.file_path}`;
      console.log(`🔗 Photo URL: ${photoUrl}`);

      // Test if URL is accessible
      const response = await fetch(photoUrl, { method: 'HEAD' });
      
      if (response.ok) {
        console.log('✅ Photo accessible');
      } else {
        console.error(`❌ Photo not accessible. Status: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Error testing photo URL:', error);
    }
    
    console.groupEnd();
  }

  // List all transactions with their photo counts
  static async listTransactionsWithPhotos(): Promise<void> {
    console.group('📋 All transactions with photo counts');
    
    try {
      // Get all transactions
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('id, transaction_number, walkin_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) {
        console.error('❌ Error fetching transactions:', transError);
        return;
      }

      if (!transactions?.length) {
        console.log('📝 No transactions found');
        return;
      }

      // Get photo counts for each transaction
      for (const transaction of transactions) {
        const { data: photos, error: photoError } = await supabase
          .from('transaction_photos')
          .select('id')
          .eq('transaction_id', transaction.id);

        if (photoError) {
          console.error(`❌ Error fetching photos for ${transaction.id}:`, photoError);
          continue;
        }

        console.log(`📋 ${transaction.transaction_number || transaction.id} (${transaction.walkin_name || 'Unknown'}) - ${photos?.length || 0} photos`);
      }

    } catch (error) {
      console.error('❌ Error listing transactions:', error);
    }
    
    console.groupEnd();
  }

  // Check storage bucket configuration
  static async checkStorageBucket(): Promise<void> {
    console.group('🗂️ Checking storage bucket configuration');
    
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Error listing buckets:', error);
        return;
      }

      const transactionPhotosBucket = buckets?.find(b => b.name === 'transaction-photos');
      
      if (transactionPhotosBucket) {
        console.log('✅ transaction-photos bucket exists:', transactionPhotosBucket);
        
        // Check if bucket is public
        if (transactionPhotosBucket.public) {
          console.log('✅ Bucket is public');
        } else {
          console.warn('⚠️ Bucket is not public - photos may not be accessible');
        }
      } else {
        console.error('❌ transaction-photos bucket not found');
        console.log('Available buckets:', buckets?.map(b => b.name));
      }

    } catch (error) {
      console.error('❌ Error checking storage bucket:', error);
    }
    
    console.groupEnd();
  }

  // Run all debug checks
  static async runAllChecks(transactionId?: string): Promise<void> {
    console.group('🔧 Transaction Photos Debug Report');
    console.log('🕐 Started at:', new Date().toISOString());
    
    await this.checkStorageBucket();
    await this.listTransactionsWithPhotos();
    
    if (transactionId) {
      await this.checkPhotosForTransaction(transactionId);
    }
    
    console.log('🕐 Completed at:', new Date().toISOString());
    console.groupEnd();
  }
}

// Usage examples:
// TransactionPhotosDebugger.runAllChecks();
// TransactionPhotosDebugger.checkPhotosForTransaction('your-transaction-id');
// TransactionPhotosDebugger.listTransactionsWithPhotos();