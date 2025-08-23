// src/components/debug/QuickPhotoDiagnostic.tsx
// Add this component temporarily to your app to run diagnostics
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, PlayCircle, CheckCircle, XCircle } from 'lucide-react';

const QuickPhotoDiagnostic: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    
    addResult('🔍 Starting diagnostic for transactions with photo issues...');
    
    // Your specific transaction IDs from the logs
    const transactionIds = [
      'ab86d163-59fe-4c6f-8d1f-562e4bd991d5',
      'add81917-b619-4ff8-945b-d727588b1e48'
    ];
    
    for (const txId of transactionIds) {
      addResult(`\n📋 Checking transaction: ${txId.substring(0, 8)}...`);
      
      try {
        // 1. Check if transaction exists
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', txId)
          .single();
        
        if (txError) {
          addResult(`❌ Transaction not found: ${txError.message}`);
          continue;
        }
        
        addResult(`✅ Transaction found: ${transaction.transaction_number || 'No number'}`);
        addResult(`   Created: ${new Date(transaction.created_at).toLocaleString()}`);
        addResult(`   Customer: ${transaction.walkin_name || transaction.supplier_name || 'Unknown'}`);
        addResult(`   Amount: KES ${transaction.total_amount?.toLocaleString()}`);
        
        // 2. Check for photos in database
        const { data: photos, error: photosError } = await supabase
          .from('transaction_photos')
          .select('*')
          .eq('transaction_id', txId);
        
        if (photosError) {
          addResult(`❌ Error querying photos: ${photosError.message}`);
        } else {
          addResult(`📸 Photos in database: ${photos?.length || 0}`);
          if (photos && photos.length > 0) {
            photos.forEach((photo, index) => {
              addResult(`   Photo ${index + 1}: ${photo.file_name} (Order: ${photo.upload_order})`);
              addResult(`   Path: ${photo.file_path}`);
            });
          }
        }
        
        // 3. Check storage for this transaction
        addResult(`🗄️ Checking storage for transaction ${txId.substring(0, 8)}...`);
        
        try {
          // Check specific transaction folder
          const { data: storageFiles, error: storageError } = await supabase.storage
            .from('transaction-photos')
            .list(`transactions/${txId}`);
          
          if (storageError) {
            addResult(`❌ Storage folder error: ${storageError.message}`);
            
            // Check if transaction folder exists in parent
            const { data: parentFiles, error: parentError } = await supabase.storage
              .from('transaction-photos')
              .list('transactions');
            
            if (!parentError && parentFiles) {
              const folderExists = parentFiles.some(f => f.name === txId);
              addResult(`📂 Transaction folder exists: ${folderExists ? 'YES' : 'NO'}`);
              
              if (folderExists) {
                addResult(`   Folder found but listing failed - possible permission issue`);
              }
            }
          } else {
            addResult(`📁 Files in storage folder: ${storageFiles?.length || 0}`);
            if (storageFiles && storageFiles.length > 0) {
              storageFiles.forEach((file, index) => {
                addResult(`   File ${index + 1}: ${file.name} (${(file.metadata?.size || 0) / 1024} KB)`);
              });
            }
          }
        } catch (storageErr) {
          addResult(`❌ Storage check failed: ${storageErr}`);
        }
        
        // 4. Database vs Storage mismatch analysis
        const dbPhotoCount = photos?.length || 0;
        const storagePhotoCount = await getStorageFileCount(txId);
        
        if (dbPhotoCount === 0 && storagePhotoCount > 0) {
          addResult(`🚨 MISMATCH: ${storagePhotoCount} files in storage but 0 records in database!`);
          addResult(`   This suggests photo upload succeeded but database insert failed`);
        } else if (dbPhotoCount > 0 && storagePhotoCount === 0) {
          addResult(`🚨 MISMATCH: ${dbPhotoCount} records in database but 0 files in storage!`);
          addResult(`   This suggests database insert succeeded but file upload failed`);
        } else if (dbPhotoCount === storagePhotoCount && dbPhotoCount > 0) {
          addResult(`✅ MATCH: ${dbPhotoCount} records match ${storagePhotoCount} files`);
        }
        
      } catch (err) {
        addResult(`❌ Error checking transaction ${txId.substring(0, 8)}: ${err}`);
      }
    }
    
    // 5. Overall system check
    addResult(`\n📊 Overall system check:`);
    
    try {
      // Check total photos in database
      const { data: allPhotos, error: allPhotosError } = await supabase
        .from('transaction_photos')
        .select('transaction_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allPhotosError) {
        addResult(`❌ Error fetching all photos: ${allPhotosError.message}`);
      } else {
        addResult(`📸 Total recent photos in database: ${allPhotos?.length || 0}`);
        
        // Group by transaction
        const photosByTx = new Map<string, number>();
        allPhotos?.forEach(photo => {
          const txId = photo.transaction_id;
          photosByTx.set(txId, (photosByTx.get(txId) || 0) + 1);
        });
        
        addResult(`📋 Transactions with photos: ${photosByTx.size}`);
        Array.from(photosByTx.entries()).slice(0, 3).forEach(([txId, count]) => {
          addResult(`   ${txId.substring(0, 8)}...: ${count} photos`);
        });
      }
      
      // Check storage bucket health
      const { data: bucketFiles, error: bucketError } = await supabase.storage
        .from('transaction-photos')
        .list('', { limit: 5 });
      
      if (bucketError) {
        addResult(`❌ Bucket access error: ${bucketError.message}`);
      } else {
        addResult(`🗄️ Bucket accessible: ${bucketFiles?.length || 0} items in root`);
      }
      
    } catch (err) {
      addResult(`❌ System check failed: ${err}`);
    }
    
    // 6. Test database permissions
    addResult(`\n🧪 Testing database permissions...`);
    
    try {
      // Try to insert a test record
      const testPhoto = {
        transaction_id: transactionIds[0],
        file_name: 'test-diagnostic.jpg',
        file_path: `test/diagnostic-${Date.now()}.jpg`,
        file_size_bytes: 1024,
        mime_type: 'image/jpeg',
        upload_order: 999,
        storage_bucket: 'transaction-photos',
        is_primary: false,
        notes: 'Diagnostic test record'
      };
      
      const { data: insertedPhoto, error: insertError } = await supabase
        .from('transaction_photos')
        .insert(testPhoto)
        .select()
        .single();
      
      if (insertError) {
        addResult(`❌ Database insert failed: ${insertError.message}`);
        addResult(`   Error details: ${JSON.stringify(insertError.details || insertError.hint, null, 2)}`);
      } else {
        addResult(`✅ Database insert successful! Test record ID: ${insertedPhoto.id}`);
        
        // Clean up immediately
        const { error: deleteError } = await supabase
          .from('transaction_photos')
          .delete()
          .eq('id', insertedPhoto.id);
        
        if (deleteError) {
          addResult(`⚠️ Failed to clean up test record: ${deleteError.message}`);
        } else {
          addResult(`🧹 Test record cleaned up successfully`);
        }
      }
    } catch (err) {
      addResult(`❌ Database permission test failed: ${err}`);
    }
    
    addResult(`\n✅ Diagnostic complete! Summary:`);
    addResult(`📋 Check results above for database vs storage mismatches`);
    addResult(`🔧 If files exist in storage but not database, the upload process has an issue`);
    addResult(`💾 If database insert test failed, check RLS policies and permissions`);
    
    setIsRunning(false);
  };

  // Helper function to count files in storage
  const getStorageFileCount = async (transactionId: string): Promise<number> => {
    try {
      const { data: files, error } = await supabase.storage
        .from('transaction-photos')
        .list(`transactions/${transactionId}`);
      
      if (error) return 0;
      return files?.length || 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[10001] max-w-md">
      <div className="bg-white rounded-lg shadow-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-sm">Photo Diagnostic</h3>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className="flex items-center gap-2 w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Run Diagnostic
              </>
            )}
          </button>
          
          {results.length > 0 && (
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">{result}</div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          This will check your specific transactions and compare database vs storage.
        </div>
      </div>
    </div>
  );
};

export default QuickPhotoDiagnostic;