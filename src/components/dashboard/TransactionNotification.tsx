// src/components/dashboard/TransactionNotification.tsx
import React, { useEffect, useState } from 'react';
import { X, DollarSign, Package, User, Calendar, Camera } from 'lucide-react';

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
}

interface TransactionNotificationProps {
  transaction: Transaction | null;
  suppliers: Supplier[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | null;
  isVisible: boolean;
  onClose: () => void;
  notificationQueue?: any[];
}

// Export for use in App component
export type { NotificationData };

const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  transaction,
  suppliers,
  eventType,
  isVisible,
  onClose,
  notificationQueue = []
}) => {
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

useEffect(() => {
  if (isVisible && transaction) {
    // Auto-close after 10 seconds if not interacted
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }
  
  // Add this explicit return to satisfy TypeScript
  return undefined;
}, [isVisible, transaction, onClose]);

  if (!isVisible || !transaction) return null;

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

  return (
    <>
      {/* Semi-transparent backdrop - Mobile optimized */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-[9998] transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container - Mobile-first responsive */}
      <div className="fixed inset-0 flex items-start sm:items-center justify-center z-[9999] pointer-events-none p-2 sm:p-4">
        <div 
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md pointer-events-auto transform transition-all duration-300 scale-100 opacity-100 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-4 sm:mt-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Mobile optimized */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 rounded-t-xl sm:rounded-t-2xl ${priorityClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                    {eventType === 'INSERT' ? '🔥 NEW PAYMENT DUE' : 
                     eventType === 'UPDATE' ? '✏️ PAYMENT UPDATED' : 
                     '❌ PAYMENT DELETED'}
                  </h3>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {new Date().toLocaleString('en-US', { 
                        dateStyle: 'short', 
                        timeStyle: 'short' 
                      })}
                    </span>
                    <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded-full ${priorityClass} flex-shrink-0`}>
                      {priority}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Payment Instruction Box - Mobile optimized */}
          {eventType === 'INSERT' && (
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <h4 className="font-semibold text-green-800 text-sm sm:text-base">💰 PAYMENT INSTRUCTION</h4>
              </div>
              <p className="text-base sm:text-lg font-bold text-green-800">
                Pay customer: KES {transaction.total_amount.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-green-600 mt-1">
                ⏱️ Then wait for receipt to print before proceeding
              </p>
            </div>
          )}

          {/* Transaction Details - Mobile optimized */}
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {/* Transaction ID */}
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600">Transaction ID</span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                {transaction.transaction_number || transaction.id.slice(0, 8) + '...'}
              </span>
            </div>

            {/* Customer/Supplier - Mobile optimized */}
            <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                <span className="text-xs sm:text-sm text-blue-600">Customer/Supplier</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{getSupplierName()}</p>
              {transaction.is_walkin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                  <User className="w-3 h-3" />
                  WALK-IN
                </span>
              )}
            </div>

            {/* Material and Weight - Mobile optimized grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  <span className="text-xs sm:text-sm text-purple-600">Material</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{transaction.material_type}</p>
              </div>
              <div className="p-2 sm:p-3 bg-indigo-50 rounded-lg">
                <span className="text-xs sm:text-sm text-indigo-600">Weight</span>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  {transaction.weight_kg ? `${transaction.weight_kg}kg` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Total Amount - Mobile optimized highlight */}
            <div className="p-3 sm:p-4 bg-green-100 rounded-lg text-center">
              <span className="text-xs sm:text-sm text-green-700">TOTAL AMOUNT</span>
              <p className="text-xl sm:text-2xl font-bold text-green-800 mt-1">
                KES {transaction.total_amount.toLocaleString()}
              </p>
            </div>

            {/* Transaction Photos Section - Mobile optimized */}
            <div className="border-t pt-3 sm:pt-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Transaction Photos</span>
                </div>
                <span className="text-xs text-gray-500">Optional</span>
              </div>
              <div className="flex items-center justify-center p-4 sm:p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">No photos available for this transaction</p>
                </div>
              </div>
            </div>

            {/* Payment Status Checkbox - Mobile optimized */}
            {eventType === 'INSERT' && (
              <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isPaymentComplete}
                  onChange={(e) => setIsPaymentComplete(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  Payment completed to customer
                </span>
              </label>
            )}

            {/* Queue Status - Mobile optimized */}
            {notificationQueue && notificationQueue.length > 1 && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-700">
                  {notificationQueue.length - 1} more notification{notificationQueue.length - 1 > 1 ? 's' : ''} in queue
                </span>
                <button 
                  onClick={onClose}
                  className="text-xs text-blue-700 font-medium hover:underline"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions - Mobile optimized */}
          <div className="px-3 sm:px-6 pb-3 sm:pb-6">
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all text-sm sm:text-base ${
                isPaymentComplete 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {isPaymentComplete ? '✓ Close & Continue' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionNotification;