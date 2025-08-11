// src/components/dashboard/TransactionNotification.tsx
import React, { useEffect, useState } from 'react';
import { X, DollarSign, Package, User, Calendar, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

// Import debug logger - adjust path if needed
let debugLogger: any = {
  log: (...args: any[]) => console.log(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
  state: (...args: any[]) => console.log(...args),
  showLogs: () => console.log('Debug logger not available')
};

// Try to import actual debugLogger
try {
  const logger = require('../../utils/debugLogger');
  if (logger && logger.default) {
    debugLogger = logger.default;
  }
} catch (e) {
  console.log('Using fallback console logger');
}

interface Transaction {
  id: string;
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  transaction_number?: string | null;
  is_walkin: boolean;
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
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  isHandled?: boolean; // Track if notification was explicitly handled
}

interface TransactionNotificationProps {
  transaction: Transaction | null;
  suppliers: Supplier[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | null;
  isVisible: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onMarkAsHandled?: () => void; // New prop for marking as handled
  notificationQueue?: NotificationData[];
  currentQueueIndex?: number;
}

// Export for use in App component
export type { NotificationData };

const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  transaction,
  suppliers,
  eventType,
  isVisible,
  onClose,
  onNext,
  onPrevious,
  onMarkAsHandled,
  notificationQueue = [],
  currentQueueIndex = 0
}) => {
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [lastIndex, setLastIndex] = useState(currentQueueIndex);
  const [isProcessing, setIsProcessing] = useState(false);

  // Log component mount
  useEffect(() => {
    debugLogger.log('Component', 'TransactionNotification mounted', {
      isVisible,
      currentQueueIndex,
      queueLength: notificationQueue.length,
      hasTransaction: !!transaction
    });

    return () => {
      debugLogger.log('Component', 'TransactionNotification unmounting');
    };
  }, []);

  // Track visibility changes specifically
  useEffect(() => {
    debugLogger.log('Component', 'Visibility changed', {
      isVisible,
      wasVisible: !isVisible ? 'true -> false' : 'false -> true'
    });
    
    if (!isVisible) {
      debugLogger.log('Component', 'Modal should be closing/closed');
    }
  }, [isVisible]);
  useEffect(() => {
    debugLogger.state('Component', 'Props changed', {
      isVisible,
      currentQueueIndex,
      eventType,
      transactionId: transaction?.id,
      queueLength: notificationQueue.length
    });
  }, [isVisible, currentQueueIndex, eventType, transaction, notificationQueue.length]);
  useEffect(() => {
    debugLogger.log('Component', 'useEffect triggered', {
      isVisible,
      currentQueueIndex,
      lastIndex,
      isProcessing,
      hasRendered,
      isPaymentComplete
    });

    // Don't reset if we're processing
    if (isProcessing) {
      debugLogger.log('Component', 'Skipping reset - currently processing');
      return;
    }
    
    // Only reset payment status when actually changing to a different notification
    if (currentQueueIndex !== lastIndex) {
      debugLogger.log('Component', 'Queue index changed, resetting payment status', {
        from: lastIndex,
        to: currentQueueIndex
      });
      setIsPaymentComplete(false);
      setLastIndex(currentQueueIndex);
    }
    
    if (isVisible && !hasRendered) {
      debugLogger.log('Component', 'Setting hasRendered to true');
      setHasRendered(true);
    }
    
    // Reset when modal is closed
    if (!isVisible) {
      debugLogger.log('Component', 'Modal closed, resetting all states');
      setHasRendered(false);
      setIsPaymentComplete(false);
      setLastIndex(currentQueueIndex);
      setIsProcessing(false);
    }
    
    return undefined;
  }, [isVisible, currentQueueIndex, lastIndex, isProcessing]);

  // Prevent double rendering
  if (!isVisible || !transaction || !hasRendered) {
    debugLogger.log('Component', 'Not rendering', {
      isVisible,
      hasTransaction: !!transaction,
      hasRendered
    });
    return null;
  }

  const getSupplierName = () => {
    if (transaction.is_walkin) {
      return transaction.walkin_name || 'Walk-in Customer';
    }
    const supplier = suppliers.find(s => s.id === transaction.supplier_id);
    return supplier?.name || 'Unknown Supplier';
  };

  const getPriorityLevel = () => {
    if (eventType === 'INSERT') return 'HIGH';
    if (transaction.total_amount > 100000) return 'HIGH';
    if (transaction.total_amount > 50000) return 'MEDIUM';
    return 'LOW';
  };

  const priorityColors = {
    HIGH: 'bg-red-100 border-red-300 text-red-700',
    MEDIUM: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    LOW: 'bg-blue-100 border-blue-300 text-blue-700'
  };

  const priority = getPriorityLevel();
  const priorityClass = priorityColors[priority];

  // Calculate queue position and navigation availability
  const queuePosition = currentQueueIndex + 1;
  const totalInQueue = notificationQueue.length;
  const canGoNext = currentQueueIndex < totalInQueue - 1;
  const canGoPrevious = currentQueueIndex > 0;

  // Debug panel (only shown in development)
  const showDebugPanel = process.env.NODE_ENV === 'development' || true; // Force show for debugging
  
  // Count unhandled notifications
  const unhandledCount = notificationQueue.filter(n => !n.isHandled).length;
  
  // Check if this is the last unhandled notification
  const currentNotification = notificationQueue[currentQueueIndex];
  const isCurrentUnhandled = currentNotification && !currentNotification.isHandled;
  const isLastUnhandled = isCurrentUnhandled && unhandledCount === 1;
  
  // Debug current state
  debugLogger.state('Component', 'Calculated state', {
    currentQueueIndex,
    unhandledCount,
    isCurrentUnhandled,
    isLastUnhandled,
    notificationId: currentNotification?.id
  });

  // Handle marking as complete
  const handleMarkAsComplete = () => {
    debugLogger.log('Component', 'handleMarkAsComplete called', {
      isPaymentComplete,
      hasHandler: !!onMarkAsHandled,
      isProcessing,
      currentQueueIndex,
      isLastUnhandled,
      unhandledCount
    });

    if (!isPaymentComplete || !onMarkAsHandled || isProcessing) {
      debugLogger.warn('Component', 'Cannot mark as complete - conditions not met', {
        isPaymentComplete,
        hasHandler: !!onMarkAsHandled,
        isProcessing
      });
      return;
    }
    
    debugLogger.state('Component', 'State before marking', {
      currentQueueIndex,
      isLastUnhandled,
      unhandledCount,
      isPaymentComplete,
      isProcessing
    });
    
    setIsProcessing(true);
    debugLogger.log('Component', 'Set isProcessing to true');
    
    // Call the context handler which will handle everything
    try {
      debugLogger.log('Component', 'Calling onMarkAsHandled');
      onMarkAsHandled();
      debugLogger.log('Component', 'onMarkAsHandled completed');
    } catch (error) {
      debugLogger.error('Component', 'Error calling onMarkAsHandled', error);
      setIsProcessing(false);
      return;
    }
    
    // Reset processing flag after a delay
    setTimeout(() => {
      debugLogger.log('Component', 'Resetting isProcessing flag');
      setIsProcessing(false);
    }, 1000);
  };

  // Handle skip/dismiss with warning for incomplete payments
  const handleSkipOrDismiss = () => {
    const shouldWarn = eventType === 'INSERT' && !isPaymentComplete;
    if (shouldWarn) {
      const confirmSkip = window.confirm(
        '⚠️ WARNING: Payment not marked as complete!\n\n' +
        'This transaction will remain in the unhandled queue.\n\n' +
        'Are you sure you want to skip this notification?'
      );
      if (confirmSkip) {
        // Reset state and navigate
        setIsPaymentComplete(false);
        if (canGoNext && onNext) {
          onNext();
        } else if (canGoPrevious && onPrevious) {
          onPrevious();
        } else {
          onClose();
        }
      }
    } else {
      // For non-INSERT or already handled, just close
      onClose();
    }
  };

  return (
    <>
      {/* Transparent backdrop - No blur */}
      <div 
        className="fixed inset-0 bg-black/40 z-[9998] transition-opacity duration-300"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Don't close on backdrop click - require explicit dismiss
        }}
      />
      
      {/* Modal Container - Mobile-first, adjusted heights */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
        <div 
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md pointer-events-auto transform transition-all duration-300 h-[60vh] sm:h-[55vh] md:h-[60vh] lg:h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed at top with navigation */}
          <div className={`px-4 py-3 border-b border-gray-200/70 rounded-t-2xl ${priorityClass} flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-1.5 bg-white/90 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      {eventType === 'INSERT' ? '🔥 NEW PAYMENT DUE' : 
                       eventType === 'UPDATE' ? '✏️ PAYMENT UPDATED' : 
                       '❌ PAYMENT DELETED'}
                    </h3>
                    {/* Queue Navigation with Arrows */}
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
                          title="Previous notification"
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
                          title="Next notification"
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
                title="Close notification panel"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Debug Panel - Only in development */}
          {showDebugPanel && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-white p-2 text-xs rounded-b-2xl">
              <div className="flex justify-between items-center">
                <span>Debug: Queue {currentQueueIndex + 1}/{notificationQueue.length}</span>
                <span>Unhandled: {unhandledCount}</span>
                <span>Payment: {isPaymentComplete ? '✅' : '❌'}</span>
                <span>Processing: {isProcessing ? '⏳' : '✅'}</span>
                <button 
                  onClick={() => {
                    debugLogger.showLogs();
                    console.log('Current State:', {
                      isPaymentComplete,
                      isProcessing,
                      currentQueueIndex,
                      isLastUnhandled,
                      unhandledCount,
                      onMarkAsHandled: !!onMarkAsHandled
                    });
                  }}
                  className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
                >
                  📊 Logs
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Payment Instruction Box */}
            {eventType === 'INSERT' && (
              <div className="mx-4 mt-3 p-3 bg-green-50/90 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <h4 className="font-semibold text-green-800 text-sm">💰 PAYMENT INSTRUCTION</h4>
                </div>
                <p className="text-base font-bold text-green-800">
                  Pay customer: KES {transaction.total_amount.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  ⏱️ Then wait for receipt to print before proceeding
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  ⚠️ DO NOT navigate away until payment is complete
                </p>
              </div>
            )}

            {/* Transaction Details */}
            <div className="p-4 space-y-3">
              {/* Transaction ID */}
              <div className="flex items-center justify-between p-2 bg-gray-50/90 rounded-lg">
                <span className="text-xs text-gray-600">Transaction ID</span>
                <span className="font-mono text-xs font-semibold text-gray-900 truncate max-w-[60%]">
                  {transaction.transaction_number || transaction.id.slice(0, 8) + '...'}
                </span>
              </div>

              {/* Customer/Supplier */}
              <div className="p-2 bg-blue-50/90 rounded-lg">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <User className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-600">Customer/Supplier</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm break-words">{getSupplierName()}</p>
                {transaction.is_walkin && (
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
                </div>
                <div className="p-2 bg-indigo-50/90 rounded-lg">
                  <span className="text-xs text-indigo-600">Weight</span>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">
                    {transaction.weight_kg ? `${transaction.weight_kg}kg` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Total Amount Highlight */}
              <div className="p-3 bg-green-100/90 rounded-lg text-center">
                <span className="text-xs text-green-700">TOTAL AMOUNT</span>
                <p className="text-xl font-bold text-green-800 mt-0.5">
                  KES {transaction.total_amount.toLocaleString()}
                </p>
              </div>

              {/* Transaction Photos Section */}
              <div className="border-t border-gray-200/50 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Transaction Photos</span>
                  </div>
                  <span className="text-xs text-gray-500">Optional</span>
                </div>
                <div className="flex items-center justify-center p-6 bg-gray-50/90 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500">No photos available</p>
                  </div>
                </div>
              </div>

              {/* Payment Method Details if available */}
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

              {/* Additional Details if available */}
              {transaction.notes && (
                <div className="p-2 bg-yellow-50/90 rounded-lg">
                  <span className="text-xs text-yellow-700">Notes</span>
                  <p className="text-sm text-gray-900 mt-0.5">{transaction.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer - Always visible */}
          <div className="flex-shrink-0 border-t border-gray-200/70 bg-white/90 backdrop-blur-sm rounded-b-2xl">
            {/* Payment Status Checkbox - Only for INSERT */}
            {eventType === 'INSERT' && (
              <div className="px-4 pt-3">
                <label className={`flex items-center gap-2 p-2.5 bg-gray-50/90 rounded-lg cursor-pointer hover:bg-gray-100/90 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isPaymentComplete}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      debugLogger.log('Component', 'Checkbox changed', {
                        from: isPaymentComplete,
                        to: newValue,
                        isProcessing
                      });
                      setIsPaymentComplete(newValue);
                    }}
                    disabled={isProcessing}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 disabled:opacity-50"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    Payment completed to customer
                  </span>
                </label>
              </div>
            )}

            {/* Navigation Controls - Only show when multiple notifications */}
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
              {/* Mark as Handled Button - Only for INSERT events */}
              {eventType === 'INSERT' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkAsComplete();
                  }}
                  disabled={!isPaymentComplete || isProcessing}
                  className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all text-sm ${
                    isPaymentComplete && !isProcessing
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing 
                    ? '⏳ Processing...'
                    : isPaymentComplete 
                      ? isLastUnhandled 
                        ? '✓ Mark as Complete & Close' 
                        : '✓ Mark as Complete & Next'
                      : '🔒 Complete Payment First'}
                </button>
              )}
              
              {/* Skip/Dismiss Button - Only show for unhandled INSERT or when it's not INSERT */}
              {(eventType === 'INSERT' && !isPaymentComplete) || eventType !== 'INSERT' ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSkipOrDismiss();
                  }}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all text-xs ${
                    eventType === 'INSERT' && !isPaymentComplete
                      ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {eventType === 'INSERT' && !isPaymentComplete 
                    ? '⚠️ Skip Without Completing (Will Remain Unhandled)' 
                    : 'Close Notification Panel'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionNotification;