// src/components/dashboard/Dashboard.tsx - Comprehensive Extended Version with Production Queue - Mobile-First Responsive
import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, FileText, Package, Users, Plus, Download, TrendingUp, Activity, Award, 
  Sparkles, AlertCircle, Loader2, Bell, X, Menu
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area} from 'recharts';
import { supabase } from '../../lib/supabase';
import TransactionNotification from './TransactionNotification';

// Types and Interfaces (Extended)
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
    value: number;
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
}

interface DashboardData {
  stats: DashboardStats;
  recentTransactions: DatabaseTransaction[];
  topSuppliers: DatabaseSupplier[];
  materialDistribution: { name: string; value: number; color: string; count: number }[];
  revenueData: { date: string; revenue: number; target: number }[];
  performanceMetrics: {
    transactions: { value: number; target: number; progress: number };
    revenue: { value: number; target: number; progress: number };
    weight: { value: number; target: number; progress: number };
    suppliers: { value: number; target: number; progress: number };
  };
}

interface DashboardProps {
  onRefresh?: () => void;
}

// Enhanced Queue Management Types
interface QueuedNotification {
  id: string;
  transaction: DatabaseTransaction;
  suppliers: DatabaseSupplier[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isProcessed: boolean;
}

// Realtime types (keeping your existing structure)
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

interface RealtimeNotificationData {
  transaction: RealtimeTransaction;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  suppliers: DatabaseSupplier[];
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

// Helper functions (keeping your existing functions)
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

// Enhanced Production Notification Queue Hook
const useProductionNotificationQueue = () => {
  const [notificationQueue, setNotificationQueue] = useState<QueuedNotification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [queueStats, setQueueStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    processed: 0
  });

  // Add notification to queue with intelligent priority
  const addToQueue = useCallback((
    transaction: DatabaseTransaction,
    suppliers: DatabaseSupplier[],
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  ) => {
    console.log('Adding notification to production queue:', { transaction, eventType });
    
    // Determine priority based on transaction properties
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    
    if (eventType === 'INSERT') {
      // New transactions are always high priority
      priority = 'HIGH';
    } else if (eventType === 'DELETE') {
      // Deletions are lower priority
      priority = 'LOW';
    } else if (eventType === 'UPDATE') {
      // Updates are medium priority, but high value updates are elevated
      if (transaction.total_amount > 100000) {
        priority = 'HIGH';
      } else if (transaction.total_amount > 50000) {
        priority = 'MEDIUM';
      } else {
        priority = 'LOW';
      }
    }

    const queuedNotification: QueuedNotification = {
      id: `${transaction.id}_${Date.now()}_${eventType}`,
      transaction,
      suppliers,
      eventType,
      timestamp: new Date(),
      priority,
      isProcessed: false
    };

    setNotificationQueue(prev => {
      // Check if notification already exists to prevent duplicates
      const exists = prev.some(n => 
        n.transaction.id === transaction.id && 
        n.eventType === eventType &&
        Math.abs(n.timestamp.getTime() - queuedNotification.timestamp.getTime()) < 1000
      );
      
      if (exists) {
        console.log('Duplicate notification detected, skipping');
        return prev;
      }

      // Add to queue and sort by priority and timestamp
      const newQueue = [...prev, queuedNotification].sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        
        // First sort by priority
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        
        // Then by timestamp (older first)
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      return newQueue;
    });
    
    setShowNotification(true);
  }, []);

  // Remove notification from queue
  const removeFromQueue = useCallback(() => {
    setNotificationQueue(prev => {
      const newQueue = prev.slice(1);
      if (newQueue.length === 0) {
        setShowNotification(false);
      }
      return newQueue;
    });
  }, []);

  // Mark notification as processed (for analytics)
  const markAsProcessed = useCallback((notificationId: string) => {
    setNotificationQueue(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isProcessed: true } : n
      )
    );
  }, []);

  // Clear all notifications
  const clearQueue = useCallback(() => {
    setNotificationQueue([]);
    setShowNotification(false);
  }, []);

  // Clear only low priority notifications
  const clearLowPriority = useCallback(() => {
    setNotificationQueue(prev => {
      const filtered = prev.filter(n => n.priority !== 'LOW');
      if (filtered.length === 0) {
        setShowNotification(false);
      }
      return filtered;
    });
  }, []);

  // Update queue statistics
  useEffect(() => {
    const stats = notificationQueue.reduce((acc, notification) => {
      acc.total++;
      acc[notification.priority.toLowerCase() as keyof typeof acc]++;
      if (notification.isProcessed) acc.processed++;
      return acc;
    }, { total: 0, high: 0, medium: 0, low: 0, processed: 0 });
    
    setQueueStats(stats);
  }, [notificationQueue]);

  return {
    notificationQueue,
    showNotification,
    queueStats,
    addToQueue,
    removeFromQueue,
    markAsProcessed,
    clearQueue,
    clearLowPriority,
    currentNotification: notificationQueue[0] || null
  };
};

// Mobile-responsive Queue Status Component
const QueueStatusPanel: React.FC<{
  queueStats: any;
  onClearAll: () => void;
  onClearLowPriority: () => void;
  isVisible: boolean;
}> = ({ queueStats, onClearAll, onClearLowPriority, isVisible }) => {
  if (!isVisible || queueStats.total === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '4rem',
      right: '0.5rem',
      left: '0.5rem',
      zIndex: 999,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '1rem',
      animation: 'slideInFromTop 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideInFromTop {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 768px) {
          .queue-panel {
            right: 1rem !important;
            left: auto !important;
            min-width: 280px;
          }
        }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
          Notification Queue
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onClearLowPriority}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              background: 'rgba(156, 163, 175, 0.1)',
              color: '#6b7280',
              border: '1px solid rgba(156, 163, 175, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear Low
          </button>
          <button
            onClick={onClearAll}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Queue Statistics - Mobile responsive grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '0.5rem', 
        marginBottom: '1rem'
      }}>
        <div style={{
          padding: '0.5rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#dc2626' }}>{queueStats.high}</div>
          <div style={{ fontSize: '0.65rem', color: '#7f1d1d' }}>High Priority</div>
        </div>
        <div style={{
          padding: '0.5rem',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#d97706' }}>{queueStats.medium}</div>
          <div style={{ fontSize: '0.65rem', color: '#92400e' }}>Medium Priority</div>
        </div>
        <div style={{
          padding: '0.5rem',
          background: 'rgba(156, 163, 175, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6b7280' }}>{queueStats.low}</div>
          <div style={{ fontSize: '0.65rem', color: '#4b5563' }}>Low Priority</div>
        </div>
        <div style={{
          padding: '0.5rem',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#059669' }}>{queueStats.processed}</div>
          <div style={{ fontSize: '0.65rem', color: '#047857' }}>Processed</div>
        </div>
      </div>

      {/* Processing Rate */}
      <div style={{
        padding: '0.75rem',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#1e40af' }}>Processing Rate</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e40af' }}>
            {queueStats.total > 0 ? Math.round((queueStats.processed / queueStats.total) * 100) : 0}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '2px',
          marginTop: '0.5rem',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${queueStats.total > 0 ? (queueStats.processed / queueStats.total) * 100 : 0}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '2px',
            transition: 'width 0.5s ease-out'
          }}></div>
        </div>
      </div>
    </div>
  );
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

// Mobile-responsive Supplier Ranking Component
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
          {supplier.transactions} transactions • {supplier.tier}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ 
          fontWeight: 'bold', 
          color: '#0f172a',
          fontSize: '0.85rem'
        }}>
          {formatCurrency(supplier.value)}
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

// Main Dashboard Component (Enhanced with Mobile-First Responsive Design)
const Dashboard: React.FC<DashboardProps> = ({ onRefresh }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Enhanced Queue Management
  const {
    notificationQueue,
    showNotification,
    queueStats,
    addToQueue,
    removeFromQueue,
    markAsProcessed,
    clearQueue,
    clearLowPriority,
    currentNotification
  } = useProductionNotificationQueue();

  // Queue status panel visibility
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data from Supabase
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [transactionsResult, suppliersResult, materialsResult] = await Promise.allSettled([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('total_value', { ascending: false }),
        supabase.from('materials').select('*').eq('is_active', true)
      ]);

      // Handle results
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error 
        ? transactionsResult.value.data || [] 
        : [];
      
      const suppliersData = suppliersResult.status === 'fulfilled' && !suppliersResult.value.error 
        ? suppliersResult.value.data || [] 
        : [];
      
      const materials = materialsResult.status === 'fulfilled' && !materialsResult.value.error 
        ? materialsResult.value.data || [] 
        : [];

      // Store suppliers for realtime notifications
      setSuppliers(suppliersData);

      // Calculate dashboard data
      const dashboardData = calculateDashboardData(transactions, suppliersData, materials);
      setDashboardData(dashboardData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate dashboard data from raw database data
  const calculateDashboardData = (
    transactions: DatabaseTransaction[], 
    suppliers: DatabaseSupplier[], 
    materials: DatabaseMaterial[]
  ): DashboardData => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter completed transactions
    const completedTransactions = transactions.filter(t => t.payment_status === 'completed');
    const todayTransactions = transactions.filter(t => new Date(t.transaction_date) >= today);
    const weekTransactions = transactions.filter(t => new Date(t.transaction_date) >= thisWeek);
    const monthTransactions = transactions.filter(t => new Date(t.transaction_date) >= thisMonth);

    // Calculate basic stats
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalWeight = completedTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;

    // Calculate growth percentages
    const weekGrowth = transactions.length > 0 ? (weekTransactions.length / transactions.length) * 100 : 0;
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
      pendingTransactions: transactions.filter(t => t.payment_status === 'pending').length
    };

    // Get recent transactions
    const recentTransactions = transactions.slice(0, 5);

    // Get top suppliers
    const topSuppliers = suppliers
      .filter(s => s.status === 'active')
      .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
      .slice(0, 5);

    // Calculate material distribution
    const materialCounts = transactions.reduce((acc, t) => {
      const material = t.material_type;
      acc[material] = (acc[material] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const materialColors = ['#00bcd4', '#9c27b0', '#e91e63', '#ff9800', '#4caf50', '#3f51b5'];
    const materialDistribution = Object.entries(materialCounts)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / transactions.length) * 100),
        color: materialColors[index % materialColors.length],
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate revenue data for the last 7 days
    const revenueData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.transaction_date);
        return tDate.toDateString() === date.toDateString();
      });
      const dayRevenue = dayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const target = dayRevenue * 1.1; // 10% above current as target
      
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
        target
      };
    });

    // Calculate performance metrics
    const dailyTarget = 50000; // Example daily target
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
        value: new Set(todayTransactions.map(t => t.supplier_id || t.walkin_name)).size,
        target: 20,
        progress: Math.min((new Set(todayTransactions.map(t => t.supplier_id || t.walkin_name)).size / 20) * 100, 100)
      }
    };

    return {
      stats,
      recentTransactions,
      topSuppliers,
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

  // Transform supplier for ranking display
  const transformSupplierForRanking = (supplier: DatabaseSupplier, transactions: DatabaseTransaction[]) => {
    const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
    const recentTransactions = supplierTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return transactionDate >= lastMonth;
    });
    
    const currentMonthValue = recentTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const trend = currentMonthValue > 0 ? `+${Math.round((currentMonthValue / (supplier.total_value || 1)) * 100)}%` : '+0%';

    return {
      id: supplier.id,
      name: supplier.name,
      transactions: supplier.total_transactions || 0,
      value: supplier.total_value || 0,
      trend,
      tier: supplier.supplier_tier || 'occasional'
    };
  };

  // Enhanced notification handlers
  const handleCloseNotification = useCallback(() => {
    if (currentNotification) {
      markAsProcessed(currentNotification.id);
    }
    removeFromQueue();
  }, [currentNotification, markAsProcessed, removeFromQueue]);

  // Enhanced realtime subscription with queue integration
  useEffect(() => {
    console.log('Setting up enhanced production realtime subscription...');

    const channel = supabase
      .channel('dashboard-transactions-production')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Production realtime transaction update received:', payload);
          
          try {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            const transaction = payload.new as DatabaseTransaction || payload.old as DatabaseTransaction;
            
            if (transaction) {
              // Add to production queue
              addToQueue(transaction, suppliers, eventType);
              
              // Refresh dashboard data after a delay
              setTimeout(() => {
                fetchDashboardData();
              }, 1000);
            }
          } catch (error) {
            console.error('Error processing production realtime update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Production realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          console.log('Successfully subscribed to production transactions realtime updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeConnected(false);
          console.error('Production realtime connection error');
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up production realtime subscription...');
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [suppliers, fetchDashboardData, addToQueue]);

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

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
          <p style={{ fontSize: isMobile ? '1rem' : '1.125rem', color: '#64748b' }}>Loading production dashboard...</p>
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

  const { stats, recentTransactions, topSuppliers, materialDistribution, revenueData, performanceMetrics } = dashboardData;

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

      {/* Enhanced Status Bar with Queue Management - Responsive */}
      <div style={{
        position: 'fixed',
        top: '0.5rem',
        right: '0.5rem',
        left: isMobile ? '0.5rem' : 'auto',
        zIndex: 1000,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: '0.5rem'
      }}>
        {/* Queue Status Alert */}
        {queueStats.total > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: queueStats.high > 0 
              ? 'rgba(239, 68, 68, 0.95)' 
              : queueStats.medium > 0 
                ? 'rgba(245, 158, 11, 0.95)'
                : 'rgba(59, 130, 246, 0.95)',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            fontWeight: '600',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            animation: queueStats.high > 0 ? 'pulse 2s infinite' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setShowQueuePanel(!showQueuePanel)}>
            <Bell size={isMobile ? 14 : 16} />
            <span>{queueStats.total} Pending</span>
            {queueStats.high > 0 && <span>🚨</span>}
          </div>
        )}

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

      {/* Queue Status Panel */}
      <QueueStatusPanel
        queueStats={queueStats}
        onClearAll={clearQueue}
        onClearLowPriority={clearLowPriority}
        isVisible={showQueuePanel && queueStats.total > 0}
      />

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
              Production Dashboard
            </h1>
            <p style={{ 
              color: '#64748b', 
              fontSize: isMobile ? '0.9rem' : '1.125rem',
              lineHeight: '1.4'
            }}>
              Real-time overview of your scrap metal business with enhanced notification queue
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

        {/* Stats Cards - Mobile Responsive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: isMobile ? '0.75rem' : '1.5rem',
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          <StatCard
            title="Total Revenue"
            value={stats.totalRevenue >= 1000000 ? 
              `${(stats.totalRevenue / 1000000).toFixed(1)}M` : 
              `${(stats.totalRevenue / 1000).toFixed(0)}K`
            }
            change={stats.monthGrowth.toFixed(1)}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #00bcd4 0%, #00acc1 100%)"
          />
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
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

        {/* Charts and Transactions Row - Mobile Responsive */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: isMobile ? '1rem' : '2rem',
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          {/* Revenue Chart */}
          <div style={{
            ...styles.glassmorphism,
            ...styles.cardShadow,
            borderRadius: '16px',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                Revenue Trend (Last 7 Days)
              </h3>
              {!isMobile && (
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00bcd4' }}></div>
                    <span style={{ color: '#64748b' }}>Actual</span>
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
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Transactions */}
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
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <TransactionItem 
                    key={transaction.id} 
                    transaction={transformTransactionForDisplay(transaction, topSuppliers)} 
                  />
                ))
              ) : (
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
            <button style={{
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
            }}>
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

          {/* Quick Actions */}
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
              <QuickActionButton variant="filled" icon={Plus}>
                New Transaction
              </QuickActionButton>
              <QuickActionButton variant="outline" icon={Users}>
                Add Supplier
              </QuickActionButton>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <QuickActionButton variant="ghost" icon={Download}>
                  Export
                </QuickActionButton>
                <QuickActionButton variant="ghost" icon={DollarSign}>
                  Pricing
                </QuickActionButton>
              </div>
            </div>
          </div>

          {/* Top Suppliers */}
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
                    supplier={transformSupplierForRanking(supplier, recentTransactions)} 
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

        {/* Performance Metrics - Mobile Responsive */}
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
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
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
              label="Revenue"
              value={formatCurrency(performanceMetrics.revenue.value)}
              progress={performanceMetrics.revenue.progress}
              target={`${performanceMetrics.revenue.progress.toFixed(0)}% of daily target`}
              icon={TrendingUp}
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

      {/* Enhanced Production Transaction Notification with Queue Management */}
      <TransactionNotification
        transaction={currentNotification?.transaction || null}
        suppliers={currentNotification?.suppliers || []}
        eventType={currentNotification?.eventType || null}
        isVisible={showNotification}
        onClose={handleCloseNotification}
        notificationQueue={notificationQueue}
      />
    </div>
  );
};

export default Dashboard;