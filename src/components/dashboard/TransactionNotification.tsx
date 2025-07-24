import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, Clock, User, Package2, Plus, Edit3, Trash2, 
  TrendingUp, Calendar, CreditCard, Camera, Upload, AlertTriangle,
  Printer, DollarSign, FileImage, Loader2, Check, ChevronLeft,
  ChevronRight, Bell, Image
} from 'lucide-react';

// Import your extended StorageService
import { StorageService } from '../../services/storageService';

// Types matching your database structure
interface RealtimeTransaction {
  id: string;
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  is_walkin: boolean;
  walkin_name?: string | null;
  weight_kg?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
}

interface DatabaseSupplier {
  id: string;
  name: string;
}

interface TransactionPhoto {
  id: string;
  url: string;
  filename: string;
  uploadedAt: Date;
  path?: string;
}

interface QueuedNotification {
  id: string;
  transaction: RealtimeTransaction;
  suppliers: DatabaseSupplier[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
}

interface TransactionNotificationProps {
  transaction: RealtimeTransaction | null;
  suppliers: DatabaseSupplier[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | null;
  isVisible: boolean;
  onClose: () => void;
  onAddToQueue?: (notification: QueuedNotification) => void;
  notificationQueue?: QueuedNotification[];
}

const TransactionNotification: React.FC<TransactionNotificationProps> = ({ 
  transaction, 
  suppliers,
  eventType,
  isVisible, 
  onClose,
  onAddToQueue,
  notificationQueue = []
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [photos, setPhotos] = useState<TransactionPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [receiptPrinted, setReceiptPrinted] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Load existing photos for the transaction
  const loadTransactionPhotos = async (transactionId: string) => {
    try {
      setLoadingPhotos(true);
      const photoFiles = await StorageService.listTransactionPhotos(transactionId);
      
      const photoList: TransactionPhoto[] = photoFiles.map((file, index) => ({
        id: `${transactionId}_${index}`,
        url: StorageService.getTransactionPhotoUrl(`transactions/${transactionId}/${file.name}`),
        filename: file.name,
        uploadedAt: new Date(file.created_at || Date.now()),
        path: `transactions/${transactionId}/${file.name}`
      }));
      
      setPhotos(photoList);
    } catch (error) {
      console.error('Error loading transaction photos:', error);
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Load photos when transaction changes
  useEffect(() => {
    if (transaction?.id) {
      loadTransactionPhotos(transaction.id);
    }
  }, [transaction?.id]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setPhotos([]);
      setReceiptPrinted(false);
      setPaymentConfirmed(false);
      setCurrentQueueIndex(0);
      onClose();
    }, 300);
  };

  // Navigate queue
  const navigateQueue = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentQueueIndex > 0) {
      setCurrentQueueIndex(prev => prev - 1);
    } else if (direction === 'next' && currentQueueIndex < notificationQueue.length - 1) {
      setCurrentQueueIndex(prev => prev + 1);
    }
  };

  // Get current notification from queue or props
  const currentNotification = notificationQueue.length > 0 
    ? notificationQueue[currentQueueIndex] 
    : (transaction && eventType ? { transaction, suppliers, eventType, id: transaction.id, timestamp: new Date() } : null);

  if (!isVisible || !currentNotification) return null;

  const { transaction: currentTransaction, eventType: currentEventType, suppliers: currentSuppliers } = currentNotification;

  // Get supplier name
  const getSupplierName = () => {
    if (currentTransaction.is_walkin) {
      return currentTransaction.walkin_name || 'Walk-in Customer';
    }
    const supplier = currentSuppliers.find(s => s.id === currentTransaction.supplier_id);
    return supplier?.name || 'Unknown Supplier';
  };

  // Get notification details based on event type
  const getNotificationDetails = () => {
    switch (currentEventType) {
      case 'INSERT':
        return {
          title: '💰 NEW PAYMENT DUE',
          icon: <DollarSign className="w-5 h-5 text-green-600" />,
          bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
          borderColor: 'border-green-400',
          priority: 'HIGH'
        };
      case 'UPDATE':
        return {
          title: '📝 TRANSACTION UPDATED',
          icon: <Edit3 className="w-5 h-5 text-blue-600" />,
          bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          borderColor: 'border-blue-400',
          priority: 'MEDIUM'
        };
      case 'DELETE':
        return {
          title: '🗑️ TRANSACTION CANCELLED',
          icon: <Trash2 className="w-5 h-5 text-red-600" />,
          bgColor: 'bg-gradient-to-br from-red-50 to-pink-50',
          borderColor: 'border-red-400',
          priority: 'LOW'
        };
      default:
        return {
          title: 'TRANSACTION ALERT',
          icon: <Bell className="w-5 h-5 text-gray-600" />,
          bgColor: 'bg-gradient-to-br from-gray-50 to-slate-50',
          borderColor: 'border-gray-400',
          priority: 'NORMAL'
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatWeight = (weight: number) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(1)}T`;
    }
    return `${weight.toFixed(1)}kg`;
  };

  const details = getNotificationDetails();
  const supplierName = getSupplierName();
  const canProceed = paymentConfirmed; // Removed photo requirement as it's optional

  return (
    <>
      {/* Backdrop - More transparent */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-[9998]"
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Notification Popup - More compact and responsive */}
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[9999] pointer-events-none">
        <div 
          className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto transform transition-all duration-300 pointer-events-auto ${
            isExiting 
              ? 'scale-95 opacity-0 translate-y-4' 
              : 'scale-100 opacity-100 translate-y-0'
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.1)'
          }}
        >
          {/* Queue Navigation Header */}
          {notificationQueue.length > 1 && (
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-2xl sm:rounded-t-3xl">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  Queue: {currentQueueIndex + 1} of {notificationQueue.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateQueue('prev')}
                  disabled={currentQueueIndex === 0}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateQueue('next')}
                  disabled={currentQueueIndex === notificationQueue.length - 1}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Header with Priority Badge - More compact */}
          <div className={`flex items-start justify-between p-4 ${notificationQueue.length > 1 ? '' : 'border-b'} border-gray-100`}>
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className={`p-3 rounded-xl sm:rounded-2xl ${details.bgColor} ${details.borderColor} border-2 shadow-lg flex-shrink-0`}>
                {details.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {details.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                    details.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                    details.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {details.priority}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{new Date(currentTransaction.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors duration-200 flex-shrink-0 ml-2"
              title="Close notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payment Instructions - More compact */}
          {currentEventType === 'INSERT' && (
            <div className="mx-4 mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl sm:rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-green-800 mb-1">💰 PAYMENT INSTRUCTION</h4>
                  <p className="text-green-700 font-semibold text-sm sm:text-base">
                    Pay customer: <span className="text-lg sm:text-2xl font-bold">{formatCurrency(currentTransaction.total_amount)}</span>
                  </p>
                  <p className="text-green-600 text-xs sm:text-sm mt-1">
                    ⏳ Then wait for receipt to print before proceeding
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details - More compact */}
          <div className="px-4 space-y-3">
            {/* Transaction ID */}
            <div className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
              <span className="text-sm font-semibold text-gray-700">Transaction ID</span>
              <span className="text-xs font-mono text-gray-900 bg-white px-2 py-1 rounded-lg border">
                {currentTransaction.id.slice(0, 8)}...
              </span>
            </div>

            {/* Supplier */}
            <div className="flex items-center space-x-3 py-2 px-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700">Customer/Supplier</p>
                <p className="text-base font-bold text-blue-900 truncate">{supplierName}</p>
                {currentTransaction.is_walkin && (
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full mt-1">
                    👤 WALK-IN
                  </span>
                )}
              </div>
            </div>

            {/* Material & Weight - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3 py-2 px-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Package2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-purple-700">Material</p>
                  <p className="text-sm font-bold text-purple-900 truncate">{currentTransaction.material_type}</p>
                </div>
              </div>
              
              {currentTransaction.weight_kg && (
                <div className="flex items-center space-x-3 py-2 px-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-700">Weight</p>
                    <p className="text-sm font-bold text-indigo-900">{formatWeight(currentTransaction.weight_kg)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Amount - Compact */}
            <div className="py-3 px-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-200 rounded-lg flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700">TOTAL AMOUNT</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">{formatCurrency(currentTransaction.total_amount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Photos Display Section - Compact */}
          <div className="px-4 py-3">
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold text-gray-900 flex items-center">
                  <Camera className="w-4 h-4 mr-2" />
                  Transaction Photos {photos.length > 0 && `(${photos.length})`}
                </h4>
                <span className="text-xs text-gray-500 font-medium">Optional</span>
              </div>

              {/* Loading State */}
              {loadingPhotos && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                  <span className="text-sm text-blue-600">Loading photos...</span>
                </div>
              )}

              {/* Photos Display */}
              {!loadingPhotos && photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.url}
                        alt="Transaction photo"
                        className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg text-center truncate">
                        {photo.filename}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Photos Message */}
              {!loadingPhotos && photos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                  <Image className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm text-center">No photos available for this transaction</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Checkboxes - Compact */}
          <div className="px-4 space-y-2">
            <label className="flex items-center space-x-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentConfirmed}
                onChange={(e) => setPaymentConfirmed(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500 flex-shrink-0"
              />
              <div className="flex items-center space-x-2 min-w-0">
                <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="font-semibold text-yellow-800 text-sm">Payment completed to customer</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
              <input
                type="checkbox"
                checked={receiptPrinted}
                onChange={(e) => setReceiptPrinted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
              />
              <div className="flex items-center space-x-2 min-w-0">
                <Printer className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-blue-800 text-sm">Receipt printed successfully</span>
              </div>
            </label>
          </div>

          {/* Footer Actions - Compact */}
          <div className="px-4 py-3 bg-gray-50 rounded-b-2xl sm:rounded-b-3xl border-t">
            <div className="flex items-center justify-between space-x-3">
              <div className="text-sm text-gray-500 flex-1 min-w-0">
                {!canProceed && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs truncate">Complete payment confirmation to proceed</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleClose}
                disabled={!canProceed}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm flex-shrink-0 ${
                  canProceed
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Complete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Queue Management Component
export const NotificationQueueManager: React.FC = () => {
  const [notificationQueue, setNotificationQueue] = useState<QueuedNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<QueuedNotification | null>(null);

  const addToQueue = (notification: QueuedNotification) => {
    setNotificationQueue(prev => [...prev, notification]);
    if (!currentNotification) {
      setCurrentNotification(notification);
    }
  };

  const removeFromQueue = () => {
    setNotificationQueue(prev => {
      const newQueue = prev.slice(1);
      setCurrentNotification(newQueue[0] || null);
      return newQueue;
    });
  };

  return (
    <TransactionNotification
      transaction={currentNotification?.transaction || null}
      suppliers={currentNotification?.suppliers || []}
      eventType={currentNotification?.eventType || null}
      isVisible={!!currentNotification}
      onClose={removeFromQueue}
      notificationQueue={notificationQueue}
      onAddToQueue={addToQueue}
    />
  );
};

export default TransactionNotification;