// src/components/dashboard/TransactionNotification.tsx - Enhanced for both purchase and sales
import React, { useEffect, useState } from 'react';
import { X, DollarSign, Package, User, Calendar, Camera, ChevronLeft, ChevronRight, Download, Eye, Loader2, TrendingUp, ShoppingCart } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Unified Transaction interface for both purchase and sales transactions
interface Transaction {
  id: string;
  transaction_type: 'purchase' | 'sale';
  supplier_id?: string | null;
  material_type: string; // Unified field
  transaction_date: string;
  total_amount: number;
  created_at: string;
  
  // Purchase-specific fields
  transaction_number?: string | null;
  is_walkin?: boolean;
  walkin_name?: string | null;
  walkin_phone?: string | null;
  material_category?: string | null;
  weight_kg?: number | null;
  unit_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  quality_grade?: string | null;
  deductions?: number | null;
  final_amount?: number | null;
  receipt_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  
  // Sales-specific fields
  transaction_id?: string; // For sales transactions
  material_id?: number | null;
  material_name?: string; // For sales transactions
  price_per_kg?: number | null;
  is_special_price?: boolean;
  original_price?: number | null;
  supplier_name?: string | null;
}

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

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  material_types: string[];
  total_transactions: number;
  total_value: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface NotificationData {
  transaction: Transaction;
  suppliers: Supplier[];
  photos?: TransactionPhoto[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  isHandled?: boolean;
}

interface TransactionNotificationProps {
  transaction: Transaction | null;
  suppliers: Supplier[];
  photos?: TransactionPhoto[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | null;
  isVisible: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onMarkAsHandled?: () => void;
  notificationQueue?: NotificationData[];
  currentQueueIndex?: number;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// Export for use in App component
export type { NotificationData, TransactionPhoto };

const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  transaction,
  suppliers,
  photos = [],
  eventType,
  isVisible,
  onClose,
  onNext,
  onPrevious,
  onMarkAsHandled,
  notificationQueue = [],
  currentQueueIndex = 0,
  supabaseUrl = '',
  supabaseKey = ''
}) => {
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  // Reset states when switching between notifications or visibility changes
  useEffect(() => {
    setIsTransactionComplete(false);
    setSelectedPhotoIndex(null);
    setLoadingPhotos(new Set());
    setLoadedPhotos(new Set());
    setFailedPhotos(new Set());
    
    if (isVisible && !hasRendered) {
      setHasRendered(true);
    }
    
    if (!isVisible) {
      setHasRendered(false);
      setIsTransactionComplete(false);
      setSelectedPhotoIndex(null);
    }
    
    return undefined;
  }, [isVisible, currentQueueIndex]);

  // Debug logging for photos
  useEffect(() => {
    if (transaction && photos) {
      console.log('TransactionNotification - Current state:', {
        transactionId: transaction.id,
        transactionType: transaction.transaction_type,
        photosCount: photos.length,
        photos: photos,
        supabaseUrl: supabaseUrl || import.meta.env.VITE_SUPABASE_URL,
        isVisible: isVisible
      });
    }
  }, [transaction, photos, isVisible]);

  // Prevent double rendering
  if (!isVisible || !transaction || !hasRendered) return null;

  // Get customer/supplier name based on transaction type
  const getCustomerSupplierName = () => {
    if (transaction.transaction_type === 'purchase') {
      if (transaction.is_walkin) {
        return transaction.walkin_name || 'Walk-in Customer';
      }
      const supplier = suppliers.find(s => s.id === transaction.supplier_id);
      return supplier?.name || 'Unknown Supplier';
    } else {
      // For sales transactions
      return transaction.supplier_name || 'Unknown Customer';
    }
  };

  const getPriorityLevel = () => {
    if (eventType === 'INSERT') return 'HIGH';
    if (transaction.total_amount > 100000) return 'HIGH';
    if (transaction.total_amount > 50000) return 'MEDIUM';
    return 'LOW';
  };

  // Get transaction type display info
  const getTransactionTypeInfo = () => {
    if (transaction.transaction_type === 'purchase') {
      return {
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'PURCHASE',
        actionText: eventType === 'INSERT' ? '💰 PAYMENT DUE' : 
                   eventType === 'UPDATE' ? '✏️ PURCHASE UPDATED' : 
                   '❌ PURCHASE DELETED'
      };
    } else {
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'SALE',
        actionText: eventType === 'INSERT' ? '💰 PAYMENT RECEIVED' : 
                   eventType === 'UPDATE' ? '✏️ SALE UPDATED' : 
                   '❌ SALE DELETED'
      };
    }
  };

  // FIXED: Construct Supabase storage URL for photos
  const getPhotoUrl = (photo: TransactionPhoto, thumbnail = false) => {
    if (!photo.file_path) {
      console.warn('No file_path for photo:', photo.id);
      return '';
    }
    
    // Method 1: Use Supabase client to get public URL (recommended)
    try {
      const { data } = supabase.storage
        .from(photo.storage_bucket || 'transaction-photos')
        .getPublicUrl(photo.file_path);
      
      if (data?.publicUrl) {
        console.log('Generated photo URL using Supabase client:', data.publicUrl);
        return data.publicUrl;
      }
    } catch (error) {
      console.error('Error getting public URL from Supabase:', error);
    }
    
    // Method 2: Fallback to manual URL construction
    const baseUrl = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) {
      console.error('No Supabase URL available for photo URL construction');
      return '';
    }
    
    const bucketName = photo.storage_bucket || 'transaction-photos';
    // Clean the file path - remove leading slash if present
    const cleanPath = photo.file_path.startsWith('/') ? photo.file_path.slice(1) : photo.file_path;
    
    // Construct the URL
    const url = `${baseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`;
    
    console.log('Fallback photo URL constructed:', url);
    return url;
  };

  // Handle photo loading states
  const handlePhotoLoad = (photoId: string) => {
    console.log('Photo loaded successfully:', photoId);
    setLoadingPhotos(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
    setLoadedPhotos(prev => new Set([...prev, photoId]));
  };

  const handlePhotoError = (photoId: string) => {
    console.error('Photo failed to load:', photoId);
    setLoadingPhotos(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
    setFailedPhotos(prev => new Set([...prev, photoId]));
  };

  const handlePhotoLoadStart = (photoId: string) => {
    setLoadingPhotos(prev => new Set([...prev, photoId]));
  };

  // Format file size
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Download photo
  const downloadPhoto = async (photo: TransactionPhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = getPhotoUrl(photo);
      if (!url) {
        console.error('No URL available for download');
        return;
      }
      
      console.log('Downloading photo from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = photo.file_name || `photo-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('Photo downloaded successfully');
    } catch (error) {
      console.error('Failed to download photo:', error);
      alert('Failed to download photo. Check console for details.');
    }
  };

  const priorityColors = {
    HIGH: 'bg-red-100 border-red-300 text-red-700',
    MEDIUM: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    LOW: 'bg-blue-100 border-blue-300 text-blue-700'
  };

  const priority = getPriorityLevel();
  const priorityClass = priorityColors[priority];
  const typeInfo = getTransactionTypeInfo();

  // Calculate queue position and navigation availability
  const queuePosition = currentQueueIndex + 1;
  const totalInQueue = notificationQueue.length;
  const canGoNext = currentQueueIndex < totalInQueue - 1;
  const canGoPrevious = currentQueueIndex > 0;

  // Count unhandled notifications
  const unhandledCount = notificationQueue.filter(n => !n.isHandled).length;
  
  // Check if there are more unhandled notifications after current
  const hasMoreUnhandled = notificationQueue.some((n, i) => i !== currentQueueIndex && !n.isHandled);

  // Handle marking as complete
  const handleMarkAsComplete = () => {
    if (isTransactionComplete && onMarkAsHandled) {
      onMarkAsHandled();
      if (!hasMoreUnhandled) {
        setTimeout(() => {
          onClose();
        }, 100);
      }
    }
  };

  // Handle skip/dismiss with warning for incomplete transactions
  const handleSkipOrDismiss = () => {
    const shouldWarn = eventType === 'INSERT' && !isTransactionComplete && transaction.transaction_type === 'purchase';
    if (shouldWarn) {
      const confirmSkip = window.confirm(
        '⚠️ WARNING: Payment not marked as complete!\n\n' +
        'This transaction will remain in the unhandled queue.\n\n' +
        'Are you sure you want to skip this notification?'
      );
      if (confirmSkip) {
        setIsTransactionComplete(false);
        if (canGoNext && onNext) {
          onNext();
        } else if (canGoPrevious && onPrevious) {
          onPrevious();
        } else {
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  // Sort photos by upload_order or created_at
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.upload_order && b.upload_order) {
      return a.upload_order - b.upload_order;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  console.log('Rendering notification with sorted photos:', sortedPhotos.length);

  return (
    <>
      {/* Transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[9998] transition-opacity duration-300"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
        <div 
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md pointer-events-auto transform transition-all duration-300 h-[60vh] sm:h-[55vh] md:h-[60vh] lg:h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b border-gray-200/70 rounded-t-2xl ${priorityClass} flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`p-1.5 bg-white/90 rounded-lg flex-shrink-0`}>
                  <typeInfo.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${typeInfo.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      {typeInfo.actionText}
                    </h3>
                    {/* Transaction Type Badge */}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.color} flex-shrink-0`}>
                      {typeInfo.label}
                    </span>
                    {/* Queue Navigation */}
                    {totalInQueue > 1 && (
                      <div className="flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (canGoPrevious && onPrevious) {
                              onPrevious();
                            }
                          }}
                          disabled={!canGoPrevious}
                          className={`p-0.5 rounded transition-colors ${
                            canGoPrevious 
                              ? 'hover:bg-gray-200 text-gray-700' 
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-medium text-gray-700 px-1">
                          {queuePosition} of {totalInQueue}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (canGoNext && onNext) {
                              onNext();
                            }
                          }}
                          disabled={!canGoNext}
                          className={`p-0.5 rounded transition-colors ${
                            canGoNext 
                              ? 'hover:bg-gray-200 text-gray-700' 
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {new Date().toLocaleString('en-US', { 
                        dateStyle: 'short', 
                        timeStyle: 'short' 
                      })}
                    </span>
                    <span className={`ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full ${priorityClass} flex-shrink-0`}>
                      {priority}
                    </span>
                    {unhandledCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 flex-shrink-0">
                        {unhandledCount} unhandled
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 hover:bg-gray-100/80 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Transaction Instruction Box */}
            {eventType === 'INSERT' && (
              <div className={`mx-4 mt-3 p-3 border rounded-lg ${
                transaction.transaction_type === 'purchase' 
                  ? 'bg-green-50/90 border-green-200' 
                  : 'bg-blue-50/90 border-blue-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className={`w-4 h-4 ${
                    transaction.transaction_type === 'purchase' ? 'text-green-600' : 'text-blue-600'
                  }`} />
                  <h4 className={`font-semibold text-sm ${
                    transaction.transaction_type === 'purchase' ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {transaction.transaction_type === 'purchase' ? '💰 PAYMENT INSTRUCTION' : '💰 SALE CONFIRMATION'}
                  </h4>
                </div>
                <p className={`text-base font-bold ${
                  transaction.transaction_type === 'purchase' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {transaction.transaction_type === 'purchase' 
                    ? `Pay customer: KES ${transaction.total_amount.toLocaleString()}`
                    : `Payment received: KES ${transaction.total_amount.toLocaleString()}`
                  }
                </p>
                <p className={`text-xs mt-0.5 ${
                  transaction.transaction_type === 'purchase' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {transaction.transaction_type === 'purchase'
                    ? '⏱️ Then wait for receipt to print before proceeding'
                    : '⏱️ Transaction recorded successfully'
                  }
                </p>
                {transaction.transaction_type === 'purchase' && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    ⚠️ DO NOT navigate away until payment is complete
                  </p>
                )}
              </div>
            )}

            {/* Transaction Details */}
            <div className="p-4 space-y-3">
              {/* Transaction ID */}
              <div className="flex items-center justify-between p-2 bg-gray-50/90 rounded-lg">
                <span className="text-xs text-gray-600">Transaction ID</span>
                <span className="font-mono text-xs font-semibold text-gray-900 truncate max-w-[60%]">
                  {transaction.transaction_number || transaction.transaction_id || transaction.id.slice(0, 8) + '...'}
                </span>
              </div>

              {/* Customer/Supplier */}
              <div className={`p-2 rounded-lg ${
                transaction.transaction_type === 'purchase' ? 'bg-blue-50/90' : 'bg-green-50/90'
              }`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <User className={`w-3 h-3 ${
                    transaction.transaction_type === 'purchase' ? 'text-blue-600' : 'text-green-600'
                  }`} />
                  <span className={`text-xs ${
                    transaction.transaction_type === 'purchase' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {transaction.transaction_type === 'purchase' ? 'Customer/Supplier' : 'Sold To'}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm break-words">{getCustomerSupplierName()}</p>
                {transaction.transaction_type === 'purchase' && transaction.is_walkin && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-orange-100/90 text-orange-700 text-xs font-medium rounded-full">
                    <User className="w-3 h-3" />
                    WALK-IN
                  </span>
                )}
              </div>

              {/* Material and Weight Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-purple-50/90 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Package className="w-3 h-3 text-purple-600" />
                    <span className="text-xs text-purple-600">Material</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm break-words">{transaction.material_type}</p>
                  {transaction.is_special_price && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                      Special Price
                    </span>
                  )}
                </div>
                <div className="p-2 bg-indigo-50/90 rounded-lg">
                  <span className="text-xs text-indigo-600">Weight</span>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">
                    {transaction.weight_kg ? `${transaction.weight_kg}kg` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    @ KES {(transaction.unit_price || transaction.price_per_kg || 0).toFixed(0)}/kg
                  </p>
                </div>
              </div>

              {/* Total Amount Highlight */}
              <div className={`p-3 rounded-lg text-center ${
                transaction.transaction_type === 'purchase' ? 'bg-green-100/90' : 'bg-blue-100/90'
              }`}>
                <span className={`text-xs ${
                  transaction.transaction_type === 'purchase' ? 'text-green-700' : 'text-blue-700'
                }`}>
                  TOTAL AMOUNT
                </span>
                <p className={`text-xl font-bold mt-0.5 ${
                  transaction.transaction_type === 'purchase' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  KES {transaction.total_amount.toLocaleString()}
                </p>
              </div>

              {/* Transaction Photos Section */}
              <div className="border-t border-gray-200/50 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Transaction Photos</span>
                    {sortedPhotos.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {sortedPhotos.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {sortedPhotos.length > 0 ? 'Click to view' : 'Optional'}
                  </span>
                </div>

                {sortedPhotos.length > 0 ? (
                  <div className="space-y-2">
                    {/* Photo Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {sortedPhotos.slice(0, 4).map((photo, index) => {
                        const photoUrl = getPhotoUrl(photo);
                        
                        return (
                          <div
                            key={photo.id}
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => {
                              console.log('Opening photo viewer for index:', index);
                              setSelectedPhotoIndex(index);
                            }}
                          >
                            {/* Loading State */}
                            {loadingPhotos.has(photo.id) && !loadedPhotos.has(photo.id) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                              </div>
                            )}

                            {/* Failed State */}
                            {failedPhotos.has(photo.id) && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
                                <Camera className="w-4 h-4 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Failed to load</span>
                              </div>
                            )}

                            {/* Photo Image */}
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={photo.file_name || `Photo ${index + 1}`}
                                className={`w-full h-full object-cover ${
                                  loadingPhotos.has(photo.id) && !loadedPhotos.has(photo.id) ? 'opacity-0' : 'opacity-100'
                                } transition-opacity duration-200`}
                                onLoadStart={() => handlePhotoLoadStart(photo.id)}
                                onLoad={() => handlePhotoLoad(photo.id)}
                                onError={(e) => {
                                  console.error(`Failed to load photo ${index + 1}:`, photoUrl);
                                  handlePhotoError(photo.id);
                                }}
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                                <Camera className="w-4 h-4 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">No URL</span>
                              </div>
                            )}

                            {/* Primary Photo Badge */}
                            {photo.is_primary && (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded z-20">
                                Primary
                              </div>
                            )}

                            {/* Photo Actions */}
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPhotoIndex(index);
                                }}
                                className="p-1 bg-black/50 hover:bg-black/70 rounded text-white transition-colors"
                                title="View photo"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => downloadPhoto(photo, e)}
                                className="p-1 bg-black/50 hover:bg-black/70 rounded text-white transition-colors"
                                title="Download photo"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Upload Order */}
                            {photo.upload_order && (
                              <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/50 text-white text-xs rounded z-20">
                                #{photo.upload_order}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Show More Photos Indicator */}
                    {sortedPhotos.length > 4 && (
                      <div className="text-center">
                        <button
                          onClick={() => setSelectedPhotoIndex(0)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          +{sortedPhotos.length - 4} more photos
                        </button>
                      </div>
                    )}

                    {/* Photo Stats */}
                    <div className="text-xs text-gray-500 text-center">
                      Total size: {formatFileSize(
                        sortedPhotos.reduce((total, photo) => 
                          total + (photo.file_size_bytes || 0), 0
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-gray-50/90 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-500">No photos available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Details */}
              {transaction.payment_method && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50/90 rounded-lg">
                    <span className="text-xs text-gray-600">Payment Method</span>
                    <p className="font-semibold text-gray-900 text-sm mt-0.5">
                      {transaction.payment_method.replace('_', ' ')}
                    </p>
                  </div>
                  {transaction.payment_status && (
                    <div className="p-2 bg-gray-50/90 rounded-lg">
                      <span className="text-xs text-gray-600">Status</span>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">
                        {transaction.payment_status}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Details */}
              {transaction.notes && (
                <div className="p-2 bg-yellow-50/90 rounded-lg">
                  <span className="text-xs text-yellow-700">Notes</span>
                  <p className="text-sm text-gray-900 mt-0.5">{transaction.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-gray-200/70 bg-white/90 backdrop-blur-sm rounded-b-2xl">
            {/* Transaction Status Checkbox */}
            {eventType === 'INSERT' && (
              <div className="px-4 pt-3">
                <label className="flex items-center gap-2 p-2.5 bg-gray-50/90 rounded-lg cursor-pointer hover:bg-gray-100/90 transition-colors">
                  <input
                    type="checkbox"
                    checked={isTransactionComplete}
                    onChange={(e) => setIsTransactionComplete(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    {transaction.transaction_type === 'purchase' 
                      ? 'Payment completed to customer'
                      : 'Sale transaction acknowledged'
                    }
                  </span>
                </label>
              </div>
            )}

            {/* Navigation Controls */}
            {totalInQueue > 1 && (
              <div className="mx-4 mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canGoPrevious && onPrevious) {
                      onPrevious();
                    }
                  }}
                  disabled={!canGoPrevious}
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    canGoPrevious
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Previous
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canGoNext && onNext) {
                      onNext();
                    }
                  }}
                  disabled={!canGoNext}
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    canGoNext
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Queue Status Info */}
            {totalInQueue > 1 && unhandledCount > 0 && (
              <div className="mx-4 mt-2 p-2 bg-orange-50/90 rounded-lg">
                <p className="text-xs text-orange-700 text-center font-medium">
                  ⚠️ {unhandledCount} notification{unhandledCount > 1 ? 's' : ''} require action
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
              {eventType === 'INSERT' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkAsComplete();
                  }}
                  disabled={!isTransactionComplete}
                  className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all text-sm ${
                    isTransactionComplete 
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isTransactionComplete 
                    ? hasMoreUnhandled 
                      ? '✓ Mark as Complete & Next' 
                      : '✓ Mark as Complete & Close'
                    : transaction.transaction_type === 'purchase'
                      ? '🔒 Complete Payment First'
                      : '🔒 Acknowledge Transaction First'
                  }
                </button>
              )}
              
              {(eventType === 'INSERT' && !isTransactionComplete) || eventType !== 'INSERT' ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSkipOrDismiss();
                  }}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all text-xs ${
                    eventType === 'INSERT' && !isTransactionComplete && transaction.transaction_type === 'purchase'
                      ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {eventType === 'INSERT' && !isTransactionComplete && transaction.transaction_type === 'purchase'
                    ? '⚠️ Skip Without Completing (Will Remain Unhandled)' 
                    : 'Close Notification Panel'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal/Lightbox */}
      {selectedPhotoIndex !== null && sortedPhotos[selectedPhotoIndex] && (
        <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full w-full h-full flex flex-col">
            {/* Photo Modal Header */}
            <div className="flex items-center justify-between p-4 text-white">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">
                  {sortedPhotos[selectedPhotoIndex].file_name || `Photo ${selectedPhotoIndex + 1}`}
                </h3>
                <span className="text-sm text-gray-300">
                  {selectedPhotoIndex + 1} of {sortedPhotos.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => downloadPhoto(sortedPhotos[selectedPhotoIndex], e)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Download photo"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Modal Content */}
            <div className="flex-1 flex items-center justify-center relative">
              <img
                src={getPhotoUrl(sortedPhotos[selectedPhotoIndex])}
                alt={sortedPhotos[selectedPhotoIndex].file_name || `Photo ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error('Lightbox photo failed to load');
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EPhoto failed to load%3C/text%3E%3C/svg%3E';
                }}
              />

              {/* Navigation Arrows */}
              {sortedPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedPhotoIndex(
                      selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : sortedPhotos.length - 1
                    )}
                    className="absolute left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setSelectedPhotoIndex(
                      selectedPhotoIndex < sortedPhotos.length - 1 ? selectedPhotoIndex + 1 : 0
                    )}
                    className="absolute right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Photo Modal Footer */}
            <div className="p-4 text-white text-sm text-center space-y-1">
              <div>Size: {formatFileSize(sortedPhotos[selectedPhotoIndex].file_size_bytes)}</div>
              {sortedPhotos[selectedPhotoIndex].notes && (
                <div className="text-gray-300">Notes: {sortedPhotos[selectedPhotoIndex].notes}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionNotification;