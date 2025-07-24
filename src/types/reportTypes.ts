// src/types/reportTypes.ts - Types for reports with database integration

// Database transaction interface (matches your Supabase schema)
export interface DatabaseTransaction {
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

// Database supplier interface (matches your Supabase schema)
export interface DatabaseSupplier {
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
  contact_person?: string | null;
  website?: string | null;
  notes?: string | null;
  supplier_tier?: string | null;
  credit_limit?: number | null;
  preferred_payment_method?: string | null;
  total_weight?: number | null;
  first_transaction_date?: string | null;
  last_transaction_date?: string | null;
  average_transaction_value?: number | null;
  registration_reason?: string | null;
  registered_date?: string | null;
  registered_by?: string | null;
}

// Report-specific interfaces
export interface MaterialBreakdown {
  count: number;
  weight: number;
  revenue: number;
  avgPrice: number;
}

export interface SupplierStats {
  transactions: number;
  revenue: number;
  weight: number;
  lastTransactionDate?: string;
}

export interface PaymentMethodStats {
  count: number;
  amount: number;
  percentage: number;
}

export interface QualityGradeStats {
  count: number;
  weight: number;
  percentage: number;
}

export interface HourlyStats {
  transactions: number;
  revenue: number;
  weight: number;
}

export interface DailyReportData {
  transactions: DatabaseTransaction[];
  suppliers: DatabaseSupplier[];
  totalRevenue: number;
  totalWeight: number;
  avgPricePerKg: number;
  materialBreakdown: Record<string, MaterialBreakdown>;
  supplierStats: Record<string, SupplierStats>;
  paymentMethodStats: Record<string, PaymentMethodStats>;
  qualityGradeStats: Record<string, QualityGradeStats>;
  hourlyStats: Record<string, HourlyStats>;
  uniqueSuppliers: number;
  peakHour: string;
  averageTransactionValue: number;
}

// Utility functions for data transformation
export const transformDatabaseTransaction = (dbTx: DatabaseTransaction): DatabaseTransaction => {
  return {
    ...dbTx,
    total_amount: dbTx.total_amount || 0,
    weight_kg: dbTx.weight_kg || 0,
    payment_status: dbTx.payment_status || 'pending',
    payment_method: dbTx.payment_method || 'cash',
    quality_grade: dbTx.quality_grade || 'Ungraded'
  };
};

export const getSupplierName = (
  transaction: DatabaseTransaction, 
  suppliers: DatabaseSupplier[]
): string => {
  if (transaction.is_walkin) {
    return transaction.walkin_name || 'Walk-in Customer';
  }
  
  const supplier = suppliers.find(s => s.id === transaction.supplier_id);
  return supplier?.name || 'Unknown Supplier';
};

export const calculateMaterialBreakdown = (
  transactions: DatabaseTransaction[]
): Record<string, MaterialBreakdown> => {
  return transactions.reduce((acc, t) => {
    const material = t.material_type;
    if (!acc[material]) {
      acc[material] = { count: 0, weight: 0, revenue: 0, avgPrice: 0 };
    }
    acc[material].count++;
    acc[material].weight += t.weight_kg || 0;
    acc[material].revenue += t.total_amount || 0;
    acc[material].avgPrice = acc[material].weight > 0 ? acc[material].revenue / acc[material].weight : 0;
    return acc;
  }, {} as Record<string, MaterialBreakdown>);
};

export const calculateSupplierStats = (
  transactions: DatabaseTransaction[],
  suppliers: DatabaseSupplier[]
): Record<string, SupplierStats> => {
  return transactions.reduce((acc, t) => {
    const supplierName = getSupplierName(t, suppliers);
    
    if (!acc[supplierName]) {
      acc[supplierName] = { 
        transactions: 0, 
        revenue: 0, 
        weight: 0,
        lastTransactionDate: t.transaction_date
      };
    }
    acc[supplierName].transactions++;
    acc[supplierName].revenue += t.total_amount || 0;
    acc[supplierName].weight += t.weight_kg || 0;
    
    // Update last transaction date if this one is more recent
    if (t.transaction_date > (acc[supplierName].lastTransactionDate || '')) {
      acc[supplierName].lastTransactionDate = t.transaction_date;
    }
    
    return acc;
  }, {} as Record<string, SupplierStats>);
};

export const calculatePaymentMethodStats = (
  transactions: DatabaseTransaction[]
): Record<string, PaymentMethodStats> => {
  const total = transactions.length;
  
  const stats = transactions.reduce((acc, t) => {
    const method = t.payment_method || 'cash';
    if (!acc[method]) {
      acc[method] = { count: 0, amount: 0, percentage: 0 };
    }
    acc[method].count++;
    acc[method].amount += t.total_amount || 0;
    return acc;
  }, {} as Record<string, PaymentMethodStats>);

  // Calculate percentages
  Object.keys(stats).forEach(method => {
    stats[method].percentage = total > 0 ? (stats[method].count / total) * 100 : 0;
  });

  return stats;
};

export const calculateQualityGradeStats = (
  transactions: DatabaseTransaction[]
): Record<string, QualityGradeStats> => {
  const total = transactions.length;
  
  const stats = transactions.reduce((acc, t) => {
    const grade = t.quality_grade || 'Ungraded';
    if (!acc[grade]) {
      acc[grade] = { count: 0, weight: 0, percentage: 0 };
    }
    acc[grade].count++;
    acc[grade].weight += t.weight_kg || 0;
    return acc;
  }, {} as Record<string, QualityGradeStats>);

  // Calculate percentages
  Object.keys(stats).forEach(grade => {
    stats[grade].percentage = total > 0 ? (stats[grade].count / total) * 100 : 0;
  });

  return stats;
};

export const calculateHourlyStats = (
  transactions: DatabaseTransaction[]
): Record<string, HourlyStats> => {
  return transactions.reduce((acc, t) => {
    const hour = new Date(t.created_at).getHours();
    const hourKey = `${hour.toString().padStart(2, '0')}:00`;
    
    if (!acc[hourKey]) {
      acc[hourKey] = { transactions: 0, revenue: 0, weight: 0 };
    }
    acc[hourKey].transactions++;
    acc[hourKey].revenue += t.total_amount || 0;
    acc[hourKey].weight += t.weight_kg || 0;
    return acc;
  }, {} as Record<string, HourlyStats>);
};

export const getPeakHour = (hourlyStats: Record<string, HourlyStats>): string => {
  const peak = Object.entries(hourlyStats)
    .sort(([, a], [, b]) => b.transactions - a.transactions)[0];
  return peak ? peak[0] : 'N/A';
};

export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

export const formatWeight = (weight: number): string => {
  return `${weight.toFixed(1)} kg`;
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

// Date utility functions
export const isToday = (date: string | Date): boolean => {
  const today = new Date();
  const targetDate = new Date(date);
  return targetDate.toDateString() === today.toDateString();
};

export const isThisWeek = (date: string | Date): boolean => {
  const today = new Date();
  const targetDate = new Date(date);
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
  return targetDate >= startOfWeek && targetDate <= endOfWeek;
};

export const isThisMonth = (date: string | Date): boolean => {
  const today = new Date();
  const targetDate = new Date(date);
  return targetDate.getMonth() === today.getMonth() && 
         targetDate.getFullYear() === today.getFullYear();
};

export const getDateRange = (period: 'today' | 'week' | 'month' | 'custom', customStart?: Date, customEnd?: Date): { start: Date; end: Date } => {
  const today = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      };
    
    case 'week':
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return { start: startOfWeek, end: endOfWeek };
    
    case 'month':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
      };
    
    case 'custom':
      return {
        start: customStart || today,
        end: customEnd || today
      };
    
    default:
      return { start: today, end: today };
  }
};