// src/components/dashboard/Dashboard.tsx - Updated with Sales Transactions and Enhanced Navigation
import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, FileText, Package, Users, Plus, Download, TrendingUp, Activity, Award, 
  Sparkles, AlertCircle, Loader2, ShoppingCart, UserPlus
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area} from 'recharts';
import { supabase } from '../../lib/supabase';

// Types and Interfaces
interface StatCardProps {
  title: string;
  value: string;
  change: string | number;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  gradient: string;
  isLoading?: boolean;
}

interface QuickActionButtonProps {
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'ghost';
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
}

interface PerformanceMetricProps {
  label: string;
  value: string;
  progress: number;
  target: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

interface TransactionItemProps {
  transaction: {
    id: string;
    supplierName: string;
    materials: string;
    value: number;
    status: 'Completed' | 'Pending';
    initials: string;
    time: string;
    paymentMethod?: string;
  };
}

interface SupplierRankingProps {
  supplier: {
    id: string;
    name: string;
    transactions: number;
    salesTransactions: number;
    value: number;
    salesValue: number;
    trend: string;
    tier: string;
  };
}

// Database interfaces matching Supabase structure
interface DatabaseTransaction {
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

interface DatabaseSalesTransaction {
  id: string;
  transaction_id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  material_id?: number | null;
  material_name: string;
  weight_kg: number;
  price_per_kg: number;
  total_amount: number;
  transaction_date: string;
  notes?: string | null;
  is_special_price?: boolean | null;
  original_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  transaction_type?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface DatabaseSupplier {
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

interface DatabaseMaterial {
  id: string;
  name: string;
  category: string;
  current_price_per_kg: number;
  minimum_weight: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  price_updated_at?: string | null;
  price_updated_by?: string | null;
}

interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  totalWeight: number;
  activeSuppliers: number;
  todayTransactions: number;
  todayRevenue: number;
  weekGrowth: number;
  monthGrowth: number;
  weightGrowth: number;
  supplierGrowth: number;
  avgTransactionValue: number;
  completedTransactions: number;
  pendingTransactions: number;
  // Sales-specific stats
  totalSalesTransactions: number;
  totalSalesRevenue: number;
  todaySalesTransactions: number;
  todaySalesRevenue: number;
  salesGrowth: number;
  avgSalesValue: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentTransactions: DatabaseTransaction[];
  recentSalesTransactions: DatabaseSalesTransaction[];
  topSuppliers: DatabaseSupplier[];
  materialDistribution: { name: string; value: number; color: string; count: number }[];
  revenueData: { date: string; revenue: number; sales: number; target: number }[];
  performanceMetrics: {
    transactions: { value: number; target: number; progress: number };
    revenue: { value: number; target: number; progress: number };
    weight: { value: number; target: number; progress: number };
    suppliers: { value: number; target: number; progress: number };
    sales: { value: number; target: number; progress: number };
  };
}

interface DashboardProps {
  onRefresh?: () => void;
  onNavigateToTransactions?: () => void;
  onNavigateToSuppliers?: () => void;
  onNavigateToAddSupplier?: () => void;
}

// CSS styles object - Updated for mobile-first
const styles = {
  gradient: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  cardShadow: {
    boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.05)'
  },
  cardShadowLarge: {
    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 5px 15px -3px rgba(0, 0, 0, 0.05)'
  },
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)'
  }
};

// Helper functions
const safeString = (value: string | null | undefined): string => {
  return value || '';
};

const safeNumber = (value: number | null | undefined): number => {
  return value || 0;
};

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

const formatWeight = (weight: number): string => {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)}T`;
  }
  return `${weight.toFixed(1)}kg`;
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getSupplierName = (transaction: DatabaseTransaction, suppliers: DatabaseSupplier[]): string => {
  if (transaction.is_walkin) {
    return transaction.walkin_name || 'Walk-in Customer';
  }
  const supplier = suppliers.find(s => s.id === transaction.supplier_id);
  return supplier?.name || 'Unknown Supplier';
};

// Mobile-responsive Stat Card Component
const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, gradient, isLoading = false }) => (
  <div style={{
    ...styles.glassmorphism,
    ...styles.cardShadow,
    borderRadius: '16px',
    padding: '1rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => {
    if (window.innerWidth >= 768) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = styles.cardShadowLarge.boxShadow;
    }
  }}
  onMouseLeave={(e) => {
    if (window.innerWidth >= 768) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = styles.cardShadow.boxShadow;
    }
  }}>
    <div style={{
      position: 'absolute',
      top: '-50%',
      right: '-50%',
      width: '200%',
      height: '200%',
      background: gradient,
      opacity: 0.05,
      transform: 'rotate(45deg)'
    }}></div>
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: gradient,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {isLoading ? (
            <Loader2 size={24} color="white" className="animate-spin" />
          ) : (
            <Icon size={24} color="white" strokeWidth={2.5} />
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(16, 185, 129, 0.1)',
          padding: '0.25rem 0.5rem',
          borderRadius: '6px'
        }}>
          <TrendingUp size={12} color="#10b981" />
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#10b981' }}>
            {isLoading ? '...' : `+${change}%`}
          </span>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>{title}</h3>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', letterSpacing: '-0.02em' }}>
          {isLoading ? '...' : value}
        </p>
      </div>
    </div>
  </div>
);

// Mobile-responsive Quick Action Button Component
const QuickActionButton: React.FC<QuickActionButtonProps> = ({ children, variant = 'outline', icon: Icon, onClick }) => {
  const variants = {
    filled: {
      background: 'linear-gradient(135deg, #00bcd4 0%, #3f51b5 100%)',
      color: 'white',
      border: 'none',
      boxShadow: '0 2px 8px rgba(0, 188, 212, 0.3)'
    },
    outline: {
      background: 'transparent',
      color: '#00bcd4',
      border: '2px solid #00bcd4',
      boxShadow: 'none'
    },
    ghost: {
      background: 'transparent',
      color: '#64748b',
      border: '2px solid #e2e8f0',
      boxShadow: 'none'
    }
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...variants[variant],
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '0.8rem',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        if (window.innerWidth >= 768) {
          e.currentTarget.style.transform = 'scale(1.02)';
          if (variant === 'filled') {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 188, 212, 0.4)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (window.innerWidth >= 768) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = variants[variant].boxShadow || 'none';
        }
      }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

// Mobile-responsive Performance Metric Component
const PerformanceMetric: React.FC<PerformanceMetricProps> = ({ label, value, progress, target, icon: Icon }) => (
  <div style={{
    padding: '1rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%)',
    border: '1px solid rgba(226, 232, 240, 0.5)',
    transition: 'all 0.3s ease'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>{label}</span>
      <div style={{
        width: '28px',
        height: '28px',
        background: 'rgba(0, 188, 212, 0.1)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={14} color="#00bcd4" />
      </div>
    </div>
    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem' }}>{value}</div>
    <div>
      <div style={{
        width: '100%',
        height: '6px',
        background: 'rgba(226, 232, 240, 0.5)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '0.5rem'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00bcd4 0%, #3f51b5 100%)',
          borderRadius: '3px',
          transition: 'width 1s ease-out'
        }}></div>
      </div>
      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{target}</span>
    </div>
  </div>
);

// Mobile-responsive Transaction Item Component
const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const statusColors: Record<'Completed' | 'Pending', string> = {
    Completed: '#10b981',
    Pending: '#f59e0b'
  };
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.5) 100%)',
      borderRadius: '12px',
      padding: '0.75rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.2s ease',
      border: '1px solid rgba(226, 232, 240, 0.3)',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      if (window.innerWidth >= 768) {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.transform = 'translateX(2px)';
      }
    }}
    onMouseLeave={(e) => {
      if (window.innerWidth >= 768) {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateX(0)';
      }
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '0' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: `linear-gradient(135deg, ${transaction.status === 'Completed' ? '#00bcd4' : '#ff9800'} 0%, ${transaction.status === 'Completed' ? '#3f51b5' : '#f44336'} 100%)`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          fontSize: '0.75rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          flexShrink: 0
        }}>
          {transaction.initials}
        </div>
        <div style={{ minWidth: '0', flex: '1' }}>
          <div style={{ 
            fontWeight: '600', 
            color: '#0f172a', 
            marginBottom: '0.125rem',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {transaction.supplierName}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#64748b', 
            marginBottom: '0.125rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {transaction.materials}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {transaction.time}
            {transaction.paymentMethod && (
              <span style={{ marginLeft: '0.5rem' }}>• {transaction.paymentMethod}</span>
            )}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ 
          fontWeight: 'bold', 
          color: '#0f172a', 
          marginBottom: '0.25rem',
          fontSize: '0.85rem'
        }}>
          {formatCurrency(transaction.value)}
        </div>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '500',
          color: statusColors[transaction.status],
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: statusColors[transaction.status],
            animation: transaction.status === 'Pending' ? 'pulse 2s infinite' : 'none'
          }}></div>
          {transaction.status}
        </div>
      </div>
    </div>
  );
};

// Enhanced Supplier Ranking Component with sales data
const SupplierRanking: React.FC<SupplierRankingProps> = ({ supplier }) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'strategic':
        return 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)';
      case 'regular':
        return 'linear-gradient(135deg, #c0c0c0 0%, #757575 100%)';
      case 'occasional':
        return 'linear-gradient(135deg, #cd7f32 0%, #8d6e63 100%)';
      default:
        return 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
    }
  };

  const totalTransactions = supplier.transactions + supplier.salesTransactions;
  const totalValue = supplier.value + supplier.salesValue;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      borderRadius: '10px',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      if (window.innerWidth >= 768) {
        e.currentTarget.style.background = 'rgba(241, 245, 249, 0.5)';
      }
    }}
    onMouseLeave={(e) => {
      if (window.innerWidth >= 768) {
        e.currentTarget.style.background = 'transparent';
      }
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: getTierColor(supplier.tier),
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '0.75rem',
        color: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        flexShrink: 0
      }}>
        {supplier.tier === 'strategic' ? <Award size={20} /> : getInitials(supplier.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          color: '#0f172a',
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {supplier.name}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#64748b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {totalTransactions} txns ({supplier.transactions}P + {supplier.salesTransactions}S) • {supplier.tier}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ 
          fontWeight: 'bold', 
          color: '#0f172a',
          fontSize: '0.85rem'
        }}>
          {formatCurrency(totalValue)}
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: '500', color: '#10b981' }}>{supplier.trend}</div>
      </div>
    </div>
  );
};

// Custom tooltip for charts
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        ...styles.glassmorphism,
        padding: '0.75rem',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontSize: '0.8rem'
      }}>
        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: '500', color: entry.color }}>
              {entry.name}: </span>
            <span style={{ fontWeight: 'bold', marginLeft: '0.25rem' }}>
              {formatCurrency(entry.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Main Dashboard Component with Sales Transactions and Enhanced Navigation
const Dashboard: React.FC<DashboardProps> = ({ 
  onRefresh, 
  onNavigateToTransactions,
  onNavigateToSuppliers,
  onNavigateToAddSupplier 
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enhanced fetch data from Supabase including sales transactions
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel including sales transactions
      const [transactionsResult, salesTransactionsResult, suppliersResult, materialsResult] = await Promise.allSettled([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('total_value', { ascending: false }),
        supabase.from('materials').select('*').eq('is_active', true)
      ]);

      // Handle results
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error 
        ? transactionsResult.value.data || [] 
        : [];
      
      const salesTransactions = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error 
        ? salesTransactionsResult.value.data || [] 
        : [];
      
      const suppliersData = suppliersResult.status === 'fulfilled' && !suppliersResult.value.error 
        ? suppliersResult.value.data || [] 
        : [];
      
      const materials = materialsResult.status === 'fulfilled' && !materialsResult.value.error 
        ? materialsResult.value.data || [] 
        : [];

      // Store suppliers for reference
      setSuppliers(suppliersData);

      // Calculate dashboard data including sales
      const dashboardData = calculateDashboardData(transactions, salesTransactions, suppliersData, materials);
      setDashboardData(dashboardData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced calculate dashboard data including sales transactions
  const calculateDashboardData = (
    transactions: DatabaseTransaction[], 
    salesTransactions: DatabaseSalesTransaction[],
    suppliers: DatabaseSupplier[], 
    materials: DatabaseMaterial[]
  ): DashboardData => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter completed transactions
    const completedTransactions = transactions.filter(t => t.payment_status === 'completed');
    const completedSalesTransactions = salesTransactions.filter(t => t.payment_status === 'completed');
    
    const todayTransactions = transactions.filter(t => new Date(t.transaction_date) >= today);
    const todaySalesTransactions = salesTransactions.filter(t => new Date(t.transaction_date) >= today);
    
    const weekTransactions = transactions.filter(t => new Date(t.transaction_date) >= thisWeek);
    const weekSalesTransactions = salesTransactions.filter(t => new Date(t.transaction_date) >= thisWeek);
    
    const monthTransactions = transactions.filter(t => new Date(t.transaction_date) >= thisMonth);
    const monthSalesTransactions = salesTransactions.filter(t => new Date(t.transaction_date) >= thisMonth);

    // Calculate basic stats
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalSalesRevenue = completedSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalWeight = completedTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const todaySalesRevenue = todaySalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;

    // Calculate growth percentages
    const weekGrowth = transactions.length > 0 ? (weekTransactions.length / transactions.length) * 100 : 0;
    const salesGrowth = salesTransactions.length > 0 ? (weekSalesTransactions.length / salesTransactions.length) * 100 : 0;
    const monthGrowth = transactions.length > 0 ? (monthTransactions.length / transactions.length) * 100 : 0;
    const weightGrowth = totalWeight > 0 ? (weekTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0) / totalWeight) * 100 : 0;
    const supplierGrowth = activeSuppliers > 0 ? (suppliers.filter(s => new Date(s.created_at) >= thisWeek).length / activeSuppliers) * 100 : 0;

    const stats: DashboardStats = {
      totalTransactions: transactions.length,
      totalRevenue,
      totalWeight,
      activeSuppliers,
      todayTransactions: todayTransactions.length,
      todayRevenue,
      weekGrowth,
      monthGrowth,
      weightGrowth,
      supplierGrowth,
      avgTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0,
      completedTransactions: completedTransactions.length,
      pendingTransactions: transactions.filter(t => t.payment_status === 'pending').length,
      // Sales stats
      totalSalesTransactions: salesTransactions.length,
      totalSalesRevenue,
      todaySalesTransactions: todaySalesTransactions.length,
      todaySalesRevenue,
      salesGrowth,
      avgSalesValue: salesTransactions.length > 0 ? totalSalesRevenue / salesTransactions.length : 0
    };

    // Get recent transactions (both purchase and sales)
    const recentTransactions = transactions.slice(0, 3);
    const recentSalesTransactions = salesTransactions.slice(0, 2);

    // Enhanced top suppliers calculation using actual database data
    const enhancedSuppliers = suppliers
      .filter(s => s.status === 'active')
      .map(supplier => {
        // Get supplier's purchase transactions
        const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
        // Get supplier's sales transactions
        const supplierSalesTransactions = salesTransactions.filter(t => t.supplier_id === supplier.id);
        
        // Calculate recent performance (last 30 days)
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentTransactions = supplierTransactions.filter(t => new Date(t.transaction_date) >= last30Days);
        const recentSalesTransactions = supplierSalesTransactions.filter(t => new Date(t.transaction_date) >= last30Days);
        
        const recentValue = recentTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const recentSalesValue = recentSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const totalRecentValue = recentValue + recentSalesValue;
        
        // Calculate trend percentage
        const totalHistoricalValue = (supplier.total_value || 0);
        const trendPercentage = totalHistoricalValue > 0 ? ((totalRecentValue / totalHistoricalValue) * 100) : 0;
        
        return {
          ...supplier,
          calculatedTransactions: supplierTransactions.length,
          calculatedSalesTransactions: supplierSalesTransactions.length,
          calculatedValue: supplierTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0),
          calculatedSalesValue: supplierSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0),
          calculatedTrend: `+${Math.round(trendPercentage)}%`,
          totalCombinedValue: totalRecentValue
        };
      })
      .sort((a, b) => b.totalCombinedValue - a.totalCombinedValue)
      .slice(0, 5);

    // Calculate material distribution from both transaction types
    const allMaterialCounts = [...transactions, ...salesTransactions.map(st => ({
      material_type: st.material_name
    } as { material_type: string }))].reduce((acc, t) => {
      const material = t.material_type;
      acc[material] = (acc[material] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalTransactionCount = transactions.length + salesTransactions.length;
    const materialColors = ['#00bcd4', '#9c27b0', '#e91e63', '#ff9800', '#4caf50', '#3f51b5'];
    const materialDistribution = Object.entries(allMaterialCounts)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / totalTransactionCount) * 100),
        color: materialColors[index % materialColors.length],
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate enhanced revenue data for the last 7 days including sales
    const revenueData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.transaction_date);
        return tDate.toDateString() === date.toDateString();
      });
      const daySalesTransactions = salesTransactions.filter(t => {
        const tDate = new Date(t.transaction_date);
        return tDate.toDateString() === date.toDateString();
      });
      
      const dayRevenue = dayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const daySalesRevenue = daySalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const target = (dayRevenue + daySalesRevenue) * 1.1; // 10% above current as target
      
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
        sales: daySalesRevenue,
        target
      };
    });

    // Enhanced performance metrics including sales
    const dailyTarget = 50000; // Example daily target
    const dailySalesTarget = 30000; // Example daily sales target
    const performanceMetrics = {
      transactions: {
        value: todayTransactions.length,
        target: 50,
        progress: Math.min((todayTransactions.length / 50) * 100, 100)
      },
      revenue: {
        value: todayRevenue,
        target: dailyTarget,
        progress: Math.min((todayRevenue / dailyTarget) * 100, 100)
      },
      weight: {
        value: todayTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0),
        target: 5000,
        progress: Math.min((todayTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0) / 5000) * 100, 100)
      },
      suppliers: {
        value: new Set([...todayTransactions.map(t => t.supplier_id || t.walkin_name), ...todaySalesTransactions.map(t => t.supplier_id || t.supplier_name)]).size,
        target: 20,
        progress: Math.min((new Set([...todayTransactions.map(t => t.supplier_id || t.walkin_name), ...todaySalesTransactions.map(t => t.supplier_id || t.supplier_name)]).size / 20) * 100, 100)
      },
      sales: {
        value: todaySalesRevenue,
        target: dailySalesTarget,
        progress: Math.min((todaySalesRevenue / dailySalesTarget) * 100, 100)
      }
    };

    return {
      stats,
      recentTransactions,
      recentSalesTransactions,
      topSuppliers: enhancedSuppliers,
      materialDistribution,
      revenueData,
      performanceMetrics
    };
  };

  // Transform transactions for display
  const transformTransactionForDisplay = (transaction: DatabaseTransaction, suppliers: DatabaseSupplier[]) => {
    const supplierName = getSupplierName(transaction, suppliers);
    const initials = getInitials(supplierName);
    const status = transaction.payment_status === 'completed' ? 'Completed' : 'Pending';
    const time = new Date(transaction.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return {
      id: transaction.id,
      supplierName,
      materials: transaction.material_type,
      value: transaction.total_amount || 0,
      status: status as 'Completed' | 'Pending',
      initials,
      time,
      paymentMethod: transaction.payment_method || 'Cash'
    };
  };

  // Transform sales transactions for display
  const transformSalesTransactionForDisplay = (salesTransaction: DatabaseSalesTransaction) => {
    const supplierName = salesTransaction.supplier_name || 'Direct Sale';
    const initials = getInitials(supplierName);
    const status = salesTransaction.payment_status === 'completed' ? 'Completed' : 'Pending';
    const time = new Date(salesTransaction.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return {
      id: salesTransaction.id,
      supplierName: `${supplierName} (Sale)`,
      materials: salesTransaction.material_name,
      value: salesTransaction.total_amount || 0,
      status: status as 'Completed' | 'Pending',
      initials,
      time,
      paymentMethod: salesTransaction.payment_method || 'Cash'
    };
  };

  // Transform supplier for ranking display with enhanced data
  const transformSupplierForRanking = (supplier: any) => {
    return {
      id: supplier.id,
      name: supplier.name,
      transactions: supplier.calculatedTransactions || 0,
      salesTransactions: supplier.calculatedSalesTransactions || 0,
      value: supplier.calculatedValue || 0,
      salesValue: supplier.calculatedSalesValue || 0,
      trend: supplier.calculatedTrend || '+0%',
      tier: supplier.supplier_tier || 'occasional'
    };
  };

  // Enhanced realtime subscription for both tables
  useEffect(() => {
    console.log('Setting up dashboard realtime subscription...');

    const transactionChannel = supabase
      .channel('dashboard-transaction-refresh')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction update received:', payload);
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_transactions'
        },
        (payload) => {
          console.log('Sales transaction update received:', payload);
          fetchDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('Dashboard realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          console.log('Successfully subscribed to dashboard data updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeConnected(false);
          console.error('Dashboard realtime connection error');
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up dashboard realtime subscription...');
      supabase.removeChannel(transactionChannel);
      setIsRealtimeConnected(false);
    };
  }, [fetchDashboardData]);

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Enhanced quick action handlers
  const handleNewTransaction = () => {
    console.log('Navigate to new transaction');
    // Add navigation logic here if provided
  };

  const handleAddSupplier = () => {
    console.log('Navigate to add supplier');
    if (onNavigateToAddSupplier) {
      onNavigateToAddSupplier();
    }
  };

  const handleViewAllTransactions = () => {
    console.log('Navigate to all transactions');
    if (onNavigateToTransactions) {
      onNavigateToTransactions();
    }
  };

  const handleExport = () => {
    console.log('Export data');
    // Add export logic here
  };

  const handlePricing = () => {
    console.log('Navigate to pricing');
    // Add navigation logic here
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={isMobile ? 40 : 48} className="animate-spin" style={{ color: '#00bcd4', marginBottom: '1rem' }} />
          <p style={{ fontSize: isMobile ? '1rem' : '1.125rem', color: '#64748b' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={isMobile ? 40 : 48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Error Loading Dashboard
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: isMobile ? '0.9rem' : '1rem' }}>{error}</p>
          <button
            onClick={fetchDashboardData}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#00bcd4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0891b2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00bcd4';
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Package size={isMobile ? 40 : 48} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            No Data Available
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: isMobile ? '0.9rem' : '1rem' }}>
            Start by adding some transactions and suppliers to see your dashboard come to life.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#00bcd4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const { stats, recentTransactions, recentSalesTransactions, topSuppliers, materialDistribution, revenueData, performanceMetrics } = dashboardData;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      position: 'relative'
    }}>
      {/* Animated background elements - Hidden on mobile for performance */}
      {!isMobile && (
        <>
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(0, 188, 212, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'float 20s infinite ease-in-out'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(156, 39, 176, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'float 25s infinite ease-in-out reverse'
          }}></div>
        </>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Simple Status Bar - Only Connection Status */}
      <div style={{
        position: 'fixed',
        top: '0.5rem',
        right: '0.5rem',
        zIndex: 1000
      }}>
        {/* Connection Status - Hidden on mobile */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isRealtimeConnected ? '#10b981' : '#ef4444',
              animation: isRealtimeConnected ? 'pulse 2s infinite' : 'none',
              boxShadow: isRealtimeConnected ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : '0 0 0 2px rgba(239, 68, 68, 0.2)'
            }}></div>
            <span style={{ color: isRealtimeConnected ? '#10b981' : '#ef4444' }}>
              {isRealtimeConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        padding: isMobile ? '1rem 0.75rem 4rem' : '2rem',
        paddingTop: isMobile ? '3rem' : '2rem'
      }}>
        {/* Header with Refresh Button - Mobile Responsive */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          marginBottom: isMobile ? '1.5rem' : '2rem',
          gap: isMobile ? '1rem' : '0'
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? '1.75rem' : '2.5rem', 
              fontWeight: 'bold', 
              color: '#0f172a',
              marginBottom: '0.5rem',
              lineHeight: '1.2'
            }}>
              Dashboard
            </h1>
            <p style={{ 
              color: '#64748b', 
              fontSize: isMobile ? '0.9rem' : '1.125rem',
              lineHeight: '1.4'
            }}>
              Real-time overview of your scrap metal business
            </p>
          </div>
          <button
            onClick={() => {
              fetchDashboardData();
              if (onRefresh) onRefresh();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.75rem 1.25rem' : '0.75rem 1.5rem',
              backgroundColor: '#00bcd4',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3)',
              alignSelf: isMobile ? 'flex-start' : 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0891b2';
              if (!isMobile) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00bcd4';
              if (!isMobile) e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Activity size={16} />
            Refresh Data
          </button>
        </div>

        {/* Enhanced Stats Cards with Sales - Mobile Responsive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? '0.75rem' : '1.5rem',
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          <StatCard
            title="Purchase Revenue"
            value={stats.totalRevenue >= 1000000 ? 
              `${(stats.totalRevenue / 1000000).toFixed(1)}M` : 
              `${(stats.totalRevenue / 1000).toFixed(0)}K`
            }
            change={stats.monthGrowth.toFixed(1)}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #00bcd4 0%, #00acc1 100%)"
          />
          <StatCard
            title="Sales Revenue"
            value={stats.totalSalesRevenue >= 1000000 ? 
              `${(stats.totalSalesRevenue / 1000000).toFixed(1)}M` : 
              `${(stats.totalSalesRevenue / 1000).toFixed(0)}K`
            }
            change={stats.salesGrowth.toFixed(1)}
            icon={ShoppingCart}
            gradient="linear-gradient(135deg, #4caf50 0%, #45a049 100%)"
          />
          <StatCard
            title="Total Transactions"
            value={(stats.totalTransactions + stats.totalSalesTransactions).toLocaleString()}
            change={stats.weekGrowth.toFixed(1)}
            icon={FileText}
            gradient="linear-gradient(135deg, #9c27b0 0%, #8e24aa 100%)"
          />
          <StatCard
            title="Total Weight"
            value={formatWeight(stats.totalWeight)}
            change={stats.weightGrowth.toFixed(1)}
            icon={Package}
            gradient="linear-gradient(135deg, #e91e63 0%, #d81b60 100%)"
          />
          <StatCard
            title="Active Suppliers"
            value={stats.activeSuppliers.toString()}
            change={stats.supplierGrowth.toFixed(1)}
            icon={Users}
            gradient="linear-gradient(135deg, #ff9800 0%, #fb8c00 100%)"
          />
        </div>

        {/* Enhanced Charts and Transactions Row - Mobile Responsive */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: isMobile ? '1rem' : '2rem',
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          {/* Enhanced Revenue Chart with Sales */}
          <div style={{
            ...styles.glassmorphism,
            ...styles.cardShadow,
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                Revenue & Sales Trend (Last 7 Days)
              </h3>
              {!isMobile && (
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00bcd4' }}></div>
                    <span style={{ color: '#64748b' }}>Purchases</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4caf50' }}></div>
                    <span style={{ color: '#64748b' }}>Sales</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#9c27b0' }}></div>
                    <span style={{ color: '#64748b' }}>Target</span>
                  </div>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00bcd4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#9c27b0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#9c27b0"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTarget)"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#00bcd4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#4caf50"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Enhanced Recent Transactions with Sales */}
          <div style={{
            ...styles.glassmorphism,
            ...styles.cardShadow,
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Recent Activity</h3>
              <Activity size={isMobile ? 18 : 20} color="#00bcd4" style={{ animation: 'pulse 2s infinite' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Mix recent transactions and sales transactions */}
              {[
                ...recentTransactions.map((transaction) => transformTransactionForDisplay(transaction, suppliers)),
                ...recentSalesTransactions.map((salesTransaction) => transformSalesTransactionForDisplay(salesTransaction))
              ]
                .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .slice(0, 5)
                .map((transaction) => (
                  <TransactionItem 
                    key={transaction.id} 
                    transaction={transaction} 
                  />
                ))}
              {recentTransactions.length === 0 && recentSalesTransactions.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#64748b', 
                  padding: '2rem',
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}>
                  No recent transactions
                </div>
              )}
            </div>
            <button 
              onClick={handleViewAllTransactions}
              style={{
                width: '100%',
                marginTop: '1rem',
                color: '#00bcd4',
                fontWeight: '600',
                fontSize: isMobile ? '0.8rem' : '0.875rem',
                background: 'transparent',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 188, 212, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              View All Transactions →
            </button>
          </div>
        </div>

        {/* Material Distribution and Actions Row - Mobile Stack */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: isMobile ? '1rem' : '2rem',
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          {/* Material Distribution */}
          <div style={{
            ...styles.glassmorphism,
            ...styles.cardShadow,
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>
              Material Distribution
            </h3>
            {materialDistribution.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <ResponsiveContainer width={isMobile ? 150 : 200} height={isMobile ? 150 : 200}>
                    <RechartsPieChart>
                      <Pie
                        data={materialDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 45 : 60}
                        outerRadius={isMobile ? 70 : 90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {materialDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {materialDistribution.map((item) => (
                    <div key={item.name} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile) e.currentTarget.style.background = 'rgba(241, 245, 249, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isMobile) e.currentTarget.style.background = 'transparent';
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          background: item.color,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}></div>
                        <span style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', fontWeight: '500', color: '#475569' }}>
                          {item.name}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', fontWeight: 'bold', color: '#0f172a' }}>
                          {item.value}%
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({item.count} txns)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                No material data available
              </div>
            )}
          </div>

          {/* Enhanced Quick Actions with Navigation */}
          <div style={{
            ...styles.glassmorphism,
            ...styles.cardShadow,
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <QuickActionButton variant="filled" icon={Plus} onClick={handleNewTransaction}>
                New Transaction
              </QuickActionButton>
              <QuickActionButton variant="outline" icon={UserPlus} onClick={handleAddSupplier}>
                Add Supplier
              </QuickActionButton>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <QuickActionButton variant="ghost" icon={Download} onClick={handleExport}>
                  Export
                </QuickActionButton>
                <QuickActionButton variant="ghost" icon={DollarSign} onClick={handlePricing}>
                  Pricing
                </QuickActionButton>
              </div>
            </div>
          </div>

          {/* Enhanced Top Suppliers with Real Database Data */}
          <div style={{
            ...styles.glassmorphism,
            ...styles.cardShadow,
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                Top Suppliers
              </h3>
              <Award size={isMobile ? 18 : 20} color="#ffd700" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topSuppliers.length > 0 ? (
                topSuppliers.map((supplier) => (
                  <SupplierRanking 
                    key={supplier.id} 
                    supplier={transformSupplierForRanking(supplier)} 
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                  No supplier data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Performance Metrics with Sales - Mobile Responsive */}
        <div style={{
          ...styles.glassmorphism,
          ...styles.cardShadow,
          borderRadius: '16px',
          padding: isMobile ? '1rem' : '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
              Today's Performance
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(0, 188, 212, 0.1)',
              padding: '0.375rem 0.75rem',
              borderRadius: '8px'
            }}>
              <Sparkles size={isMobile ? 14 : 16} color="#00bcd4" />
              <span style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: '500', color: '#00bcd4' }}>
                Live Metrics
              </span>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: isMobile ? '0.75rem' : '1.5rem'
          }}>
            <PerformanceMetric
              label="Transactions"
              value={performanceMetrics.transactions.value.toString()}
              progress={performanceMetrics.transactions.progress}
              target={`${performanceMetrics.transactions.progress.toFixed(0)}% of daily target`}
              icon={Activity}
            />
            <PerformanceMetric
              label="Purchase Revenue"
              value={formatCurrency(performanceMetrics.revenue.value)}
              progress={performanceMetrics.revenue.progress}
              target={`${performanceMetrics.revenue.progress.toFixed(0)}% of daily target`}
              icon={TrendingUp}
            />
            <PerformanceMetric
              label="Sales Revenue"
              value={formatCurrency(performanceMetrics.sales.value)}
              progress={performanceMetrics.sales.progress}
              target={`${performanceMetrics.sales.progress.toFixed(0)}% of daily target`}
              icon={ShoppingCart}
            />
            <PerformanceMetric
              label="Weight Collected"
              value={formatWeight(performanceMetrics.weight.value)}
              progress={performanceMetrics.weight.progress}
              target={`${performanceMetrics.weight.progress.toFixed(0)}% of daily target`}
              icon={Package}
            />
            <PerformanceMetric
              label="Unique Suppliers"
              value={performanceMetrics.suppliers.value.toString()}
              progress={performanceMetrics.suppliers.progress}
              target={`${performanceMetrics.suppliers.progress.toFixed(0)}% of daily target`}
              icon={Users}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;