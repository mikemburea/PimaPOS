// src/components/debug/PhotoDebugUtility.tsx
// This component helps debug photo issues - add it temporarily to your app
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

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

interface Transaction {
  id: string;
  transaction_number?: string | null;
  walkin_name?: string | null;
  material_type: string;
  total_amount: number;
  created_at: string;
}

const PhotoDebugUtility: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [photos, setPhotos] = useState<TransactionPhoto[]>([]);
  const [bucketStatus, setBucketStatus] = useState<'checking' | 'exists' | 'not-exists' | 'error'>('checking');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (isExpanded) {
      runDiagnostics();
    }
  }, [isExpanded]);

  const runDiagnostics = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results: string[] = [];
    
    // Test 1: Check Supabase configuration
    results.push('🔍 Checking Supabase configuration...');
    if (supabaseUrl && supabaseKey) {
      results.push('✅ Supabase URL and Key are configured');
      results.push(`   URL: ${supabaseUrl}`);
    } else {
      results.push('❌ Missing Supabase configuration');
      if (!supabaseUrl) results.push('   - VITE_SUPABASE_URL is not set');
      if (!supabaseKey) results.push('   - VITE_SUPABASE_ANON_KEY is not set');
    }

    // Test 2: Check bucket existence
    results.push('\n🗄️ Checking storage bucket...');
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        results.push(`❌ Error checking buckets: ${error.message}`);
        setBucketStatus('error');
      } else {
        const transactionPhotosBucket = buckets?.find(b => b.name === 'transaction-photos');
        if (transactionPhotosBucket) {
          results.push('✅ transaction-photos bucket exists');
          results.push(`   Created: ${new Date(transactionPhotosBucket.created_at).toLocaleDateString()}`);
          results.push(`   Public: ${transactionPhotosBucket.public}`);
          setBucketStatus('exists');
        } else {
          results.push('⚠️ transaction-photos bucket not found');
          results.push('   Available buckets: ' + (buckets?.map(b => b.name).join(', ') || 'none'));
          setBucketStatus('not-exists');
          
          // Try to create the bucket
          results.push('   Attempting to create bucket...');
          const { error: createError } = await supabase.storage.createBucket('transaction-photos', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            fileSizeLimit: 5242880 // 5MB
          });
          
          if (createError) {
            results.push(`   ❌ Failed to create bucket: ${createError.message}`);
          } else {
            results.push('   ✅ Bucket created successfully!');
            setBucketStatus('exists');
          }
        }
      }
    } catch (err) {
      results.push(`❌ Unexpected error: ${err}`);
      setBucketStatus('error');
    }

    // Test 3: Fetch recent transactions
    results.push('\n📊 Fetching recent transactions...');
    try {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, transaction_number, walkin_name, material_type, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (txError) {
        results.push(`❌ Error fetching transactions: ${txError.message}`);
      } else {
        results.push(`✅ Found ${txData?.length || 0} recent transactions`);
        setTransactions(txData || []);
      }
    } catch (err) {
      results.push(`❌ Unexpected error: ${err}`);
    }

    // Test 4: Fetch all transaction photos
    results.push('\n📸 Fetching transaction photos from database...');
    try {
      const { data: photoData, error: photoError } = await supabase
        .from('transaction_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (photoError) {
        results.push(`❌ Error fetching photos: ${photoError.message}`);
      } else {
        results.push(`✅ Found ${photoData?.length || 0} photos in database`);
        setPhotos(photoData || []);
        
        // Group photos by transaction
        const photosByTransaction = new Map<string, number>();
        photoData?.forEach(photo => {
          const count = photosByTransaction.get(photo.transaction_id) || 0;
          photosByTransaction.set(photo.transaction_id, count + 1);
        });
        
        if (photosByTransaction.size > 0) {
          results.push('   Photo distribution:');
          photosByTransaction.forEach((count, txId) => {
            results.push(`   - Transaction ${txId.substring(0, 8)}...: ${count} photos`);
          });
        }
      }
    } catch (err) {
      results.push(`❌ Unexpected error: ${err}`);
    }

    // Test 5: Test photo URL generation
    if (photos.length > 0 && supabaseUrl) {
      results.push('\n🔗 Testing photo URL generation...');
      const testPhoto = photos[0];
      const testUrl = `${supabaseUrl}/storage/v1/object/public/${testPhoto.storage_bucket || 'transaction-photos'}/${testPhoto.file_path}`;
      results.push(`   Sample URL: ${testUrl}`);
      
      // Try to fetch the image
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          results.push('   ✅ Photo URL is accessible');
        } else {
          results.push(`   ❌ Photo URL returned status: ${response.status}`);
        }
      } catch (err) {
        results.push(`   ❌ Failed to access photo URL: ${err}`);
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  const testPhotoFetch = async (transactionId: string) => {
    const results: string[] = [...testResults];
    results.push(`\n🔍 Testing photo fetch for transaction ${transactionId.substring(0, 8)}...`);
    
    try {
      const { data, error } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('upload_order', { ascending: true });

      if (error) {
        results.push(`❌ Error: ${error.message}`);
      } else {
        results.push(`✅ Found ${data?.length || 0} photos`);
        if (data && data.length > 0) {
          data.forEach((photo, index) => {
            results.push(`   Photo ${index + 1}:`);
            results.push(`   - ID: ${photo.id}`);
            results.push(`   - File: ${photo.file_name}`);
            results.push(`   - Path: ${photo.file_path}`);
            results.push(`   - Bucket: ${photo.storage_bucket || 'transaction-photos'}`);
            
            // Generate and test URL
            const url = `${supabaseUrl}/storage/v1/object/public/${photo.storage_bucket || 'transaction-photos'}/${photo.file_path}`;
            results.push(`   - URL: ${url}`);
            setPhotoUrls(prev => new Map(prev).set(photo.id, url));
          });
        }
      }
    } catch (err) {
      results.push(`❌ Unexpected error: ${err}`);
    }
    
    setTestResults(results);
  };

  // Sample data insertion for testing
  const insertSamplePhoto = async () => {
    if (!selectedTransactionId) {
      alert('Please select a transaction first');
      return;
    }

    const samplePhoto = {
      transaction_id: selectedTransactionId,
      file_name: 'test-photo.jpg',
      file_path: `transactions/${selectedTransactionId}/test-${Date.now()}.jpg`,
      file_size_bytes: 1024,
      mime_type: 'image/jpeg',
      upload_order: 1,
      storage_bucket: 'transaction-photos',
      is_primary: true,
      notes: 'Test photo for debugging'
    };

    try {
      const { data, error } = await supabase
        .from('transaction_photos')
        .insert(samplePhoto)
        .select()
        .single();

      if (error) {
        alert(`Failed to insert sample photo: ${error.message}`);
      } else {
        alert('Sample photo record inserted successfully!');
        runDiagnostics();
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-[10001]">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
          title="Open Photo Debug Utility"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-medium">Debug Photos</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            <h2 className="text-lg font-bold">Transaction Photo Debug Utility</h2>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-purple-700 rounded"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {bucketStatus === 'exists' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : bucketStatus === 'not-exists' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-medium">Storage Bucket</span>
              </div>
              <p className="text-sm text-gray-600">
                {bucketStatus === 'checking' ? 'Checking...' : 
                 bucketStatus === 'exists' ? 'Ready' : 
                 bucketStatus === 'not-exists' ? 'Not Found' : 'Error'}
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Transactions</span>
              </div>
              <p className="text-sm text-gray-600">{transactions.length} found</p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Photos</span>
              </div>
              <p className="text-sm text-gray-600">{photos.length} in database</p>
            </div>
          </div>

          {/* Test Controls */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium text-blue-900">Test Controls</h3>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedTransactionId}
                onChange={(e) => setSelectedTransactionId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a transaction...</option>
                {transactions.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    {tx.transaction_number || tx.id.substring(0, 8)} - {tx.walkin_name || 'Unknown'} - {tx.material_type}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => selectedTransactionId && testPhotoFetch(selectedTransactionId)}
                disabled={!selectedTransactionId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Test Fetch Photos
              </button>
              
              <button
                onClick={insertSamplePhoto}
                disabled={!selectedTransactionId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Insert Sample Photo
              </button>
            </div>
          </div>

          {/* Diagnostic Results */}
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-green-400">Diagnostic Results</h3>
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="whitespace-pre-wrap max-h-96 overflow-y-auto">
              {loading ? 'Running diagnostics...' : testResults.join('\n') || 'Click Refresh to run diagnostics'}
            </div>
          </div>

          {/* Photo Preview */}
          {photoUrls.size > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Photo Previews</h3>
              <div className="grid grid-cols-4 gap-3">
                {Array.from(photoUrls.entries()).map(([id, url]) => (
                  <div key={id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Photo ${id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 text-center text-sm text-gray-600">
          This utility helps diagnose issues with transaction photo storage and display.
        </div>
      </div>
    </div>
  );
};

export default PhotoDebugUtility;