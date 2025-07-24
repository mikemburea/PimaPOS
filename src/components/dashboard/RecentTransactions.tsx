// src/components/dashboard/RecentTransactions.tsx - Fixed version
import React from 'react';
import { ArrowUp, Eye, Edit2 } from 'lucide-react';

// Define StatusBadge component inline to avoid import issues
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles(status)}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
};

// Updated Transaction interface to handle nullable fields
interface Transaction {
  id: string;
  supplierName?: string | null;
  materialType?: string | null;
  quantity?: number | null;
  totalValue?: number | null;
  status?: string | null;
  // Add other fields as needed
  walkinName?: string | null;
  totalAmount?: number | null;
  weight?: number | null;
  weightKg?: number | null;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  // Helper function to safely get values
  const safeValue = (value: any, fallback: any = 'N/A') => {
    return value !== null && value !== undefined ? value : fallback;
  };

  const safeNumber = (value: number | null | undefined, fallback: number = 0) => {
    return typeof value === 'number' ? value : fallback;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Recent Transactions</h3>
        <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium">
          <span>View All</span>
          <ArrowUp size={16} className="rotate-45" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
              <th className="pb-4 font-semibold">Transaction ID</th>
              <th className="pb-4 font-semibold">Supplier</th>
              <th className="pb-4 font-semibold">Material</th>
              <th className="pb-4 font-semibold">Weight</th>
              <th className="pb-4 font-semibold">Value</th>
              <th className="pb-4 font-semibold">Status</th>
              <th className="pb-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 5).map((tx) => {
              // Get supplier name from various possible fields
              const supplierName = safeValue(tx.supplierName || tx.walkinName, 'Unknown Supplier');
              
              // Get quantity/weight from various possible fields
              const quantity = safeNumber(tx.quantity || tx.weight || tx.weightKg);
              
              // Get total value from various possible fields
              const totalValue = safeNumber(tx.totalValue || tx.totalAmount);
              
              return (
                <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 text-sm font-medium text-slate-800">{tx.id}</td>
                  <td className="py-4 text-sm text-slate-700">{supplierName}</td>
                  <td className="py-4 text-sm text-slate-600">{safeValue(tx.materialType)}</td>
                  <td className="py-4 text-sm text-slate-700">{quantity} kg</td>
                  <td className="py-4 text-sm font-semibold text-slate-800">
                    KES {totalValue.toLocaleString()}
                  </td>
                  <td className="py-4">
                    <StatusBadge status={safeValue(tx.status, 'pending')} />
                  </td>
                  <td className="py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {transactions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">No recent transactions found</p>
        </div>
      )}
    </div>
  );
}