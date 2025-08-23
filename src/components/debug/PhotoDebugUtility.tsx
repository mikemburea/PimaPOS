// src/components/debug/PhotoDebugUtility.tsx
// Enhanced debugging component with comprehensive photo analysis
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StorageDebugService } from '../../services/storageDebugService';
import { Camera, CheckCircle, XCircle, AlertCircle, RefreshCw, Wrench, Activity, Database } from 'lucide-react';

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
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [autoFixResults, setAutoFixResults] = useState<any>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (isExpanded) {
      loadInitialData();
    }
  }, [isExpanded]);

  const loadInitialData = async () => {
    setLoading(true);
    
    try {
      // Load recent transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, transaction_number, walkin_name, material_type, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) {
        console.error('Error fetching transactions:', txError);
      } else {
        setTransactions(txData || []);
      }

      // Load storage statistics
      const stats = await StorageDebugService.getStorageStats();
      setStorageStats(stats);

    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runComprehensiveDebug = async () => {
    if (!selectedTransactionId) {
      alert('Please select a transaction first');
      return;
    }

    setLoading(true);
    setDebugResults(null);
    
    try {
      console.log(`Running comprehensive debug for transaction: ${selectedTransactionId}`);
      const results = await StorageDebugService.debugTransactionPhotos(selectedTransactionId);
      setDebugResults(results);
      console.log('Debug results:', results);
    } catch (error) {
      console.error('Debug failed:', error);
      setDebugResults({
        transactionExists: false,
        photosInDatabase: 0,
        photosValidated: [],
        storageStatus: { success: false, message: `Debug failed: ${error}` },
        recommendations: [`❌ Debug process failed: ${error}`]
      });
    } finally {
      setLoading(false);
    }
  };

  const runAutoFix = async () => {
    if (!selectedTransactionId) {
      alert('Please select a transaction first');
      return;
    }

    setLoading(true);
    
    try {
      console.log(`Running auto-fix for transaction: ${selectedTransactionId}`);
      const results = await StorageDebugService.autoFixPhotoIssues(selectedTransactionId);
      setAutoFixResults(results);
      
      // Re-run debug to see if issues were fixed
      setTimeout(() => {
        runComprehensiveDebug();
      }, 1000);
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
      setAutoFixResults({
        fixed: [],
        failed: [`Auto-fix failed: ${error}`]
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-[10001]">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
          title="Open Enhanced Photo Debug Utility"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-medium">Debug Photos</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            <h2 className="text-lg font-bold">Enhanced Photo Debug Utility</h2>
            <span className="text-sm bg-purple-700 px-2 py-1 rounded">v2.0</span>
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
          {/* Configuration Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Configuration</span>
              </div>
              <p className="text-sm text-gray-600">
                {supabaseUrl && supabaseKey ? '✅ Configured' : '❌ Missing Config'}
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5 text-green-600" />
                <span className="font-medium">Transactions</span>
              </div>
              <p className="text-sm text-gray-600">{transactions.length} loaded</p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Total Photos</span>
              </div>
              <p className="text-sm text-gray-600">
                {storageStats ? `${storageStats.totalFiles} (${formatFileSize(storageStats.totalSize)})` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Transaction Selection & Controls */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium text-blue-900 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Debug Controls
            </h3>
            
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedTransactionId}
                onChange={(e) => setSelectedTransactionId(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg"
                disabled={loading}
              >
                <option value="">Select a transaction...</option>
                {transactions.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    {tx.transaction_number || tx.id.substring(0, 8)} - {tx.walkin_name || 'Unknown'} - {tx.material_type} - {new Date(tx.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              
              <button
                onClick={runComprehensiveDebug}
                disabled={!selectedTransactionId || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Run Debug
              </button>
              
              <button
                onClick={runAutoFix}
                disabled={!selectedTransactionId || loading || !debugResults?.photosValidated?.some((p: any) => !p.isValid)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                Auto Fix
              </button>
              
              <button
                onClick={loadInitialData}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 text-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Debug Results */}
          {debugResults && (
            <div className="bg-white border rounded-lg p-4 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                Debug Results for Transaction: {selectedTransactionId.substring(0, 8)}...
              </h3>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded text-center">
                  <div className="text-lg font-bold">{debugResults.transactionExists ? '✅' : '❌'}</div>
                  <div className="text-sm">Transaction Found</div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-center">
                  <div className="text-lg font-bold">{debugResults.photosInDatabase}</div>
                  <div className="text-sm">Photos in DB</div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-center">
                  <div className="text-lg font-bold">
                    {debugResults.photosValidated.filter((p: any) => p.isValid).length}
                  </div>
                  <div className="text-sm">Valid Photos</div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-center">
                  <div className="text-lg font-bold">{debugResults.storageStatus.success ? '✅' : '❌'}</div>
                  <div className="text-sm">Storage OK</div>
                </div>
              </div>

              {/* Photo Validation Details */}
              {debugResults.photosValidated.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Photo Validation Results:</h4>
                  <div className="space-y-2">
                    {debugResults.photosValidated.map((photo: any, index: number) => (
                      <div key={index} className={`p-3 rounded border ${photo.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {photo.isValid ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                            <span className="font-medium">{photo.photo.file_name}</span>
                            {photo.photo.is_primary && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Primary</span>}
                          </div>
                          <div className="text-sm text-gray-600">
                            Order: {photo.photo.upload_order || 'N/A'} | Size: {formatFileSize(photo.photo.file_size_bytes || 0)}
                          </div>
                        </div>
                        
                        {photo.issues.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-red-700">Issues:</div>
                            <ul className="text-sm text-red-600 list-disc list-inside">
                              {photo.issues.map((issue: string, i: number) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {photo.actualUrl && (
                          <div className="mt-2">
                            <div className="text-sm font-medium">URL:</div>
                            <div className="text-xs font-mono bg-gray-100 p-1 rounded break-all">{photo.actualUrl}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Storage: {photo.fileExists ? '✅ File exists' : '❌ File missing'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage Status */}
              <div>
                <h4 className="font-medium mb-2">Storage Status:</h4>
                <div className={`p-3 rounded ${debugResults.storageStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-sm">{debugResults.storageStatus.message}</div>
                  {debugResults.storageStatus.data && (
                    <div className="text-xs text-gray-600 mt-1">
                      {JSON.stringify(debugResults.storageStatus.data, null, 2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  Recommendations:
                </h4>
                <div className="bg-orange-50 p-3 rounded">
                  {debugResults.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="text-sm">{rec}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto-Fix Results */}
          {autoFixResults && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-green-600" />
                Auto-Fix Results
              </h3>
              
              {autoFixResults.fixed.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-green-700 mb-1">✅ Fixed Issues:</h4>
                  <ul className="text-sm text-green-600 list-disc list-inside">
                    {autoFixResults.fixed.map((fix: string, index: number) => (
                      <li key={index}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {autoFixResults.failed.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-1">❌ Failed to Fix:</h4>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {autoFixResults.failed.map((fail: string, index: number) => (
                      <li key={index}>{fail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Storage Statistics */}
          {storageStats && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Storage Statistics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Total Files: {storageStats.totalFiles}</div>
                  <div className="text-sm font-medium">Total Size: {formatFileSize(storageStats.totalSize)}</div>
                  <div className="text-sm font-medium">Transactions with Photos: {Object.keys(storageStats.byTransactionCount).length}</div>
                </div>
                <div>
                  {storageStats.oldestFile && (
                    <div className="text-sm">Oldest: {new Date(storageStats.oldestFile).toLocaleDateString()}</div>
                  )}
                  {storageStats.newestFile && (
                    <div className="text-sm">Newest: {new Date(storageStats.newestFile).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 text-center text-sm text-gray-600">
          Enhanced Photo Debug Utility v2.0 - Comprehensive storage analysis and auto-repair functionality.
        </div>
      </div>
    </div>
  );
};

export default PhotoDebugUtility;