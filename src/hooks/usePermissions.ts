// src/hooks/usePermissions.ts - Updated with First User Admin logic
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'user';

export type Permission = 
  | 'dashboard'
  | 'transactions' 
  | 'suppliers'
  | 'materials'
  | 'analytics'
  | 'reports'
  | 'settings';

// User and Profile interfaces
interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

interface Profile {
  id: string;
  full_name?: string;
  user_type?: UserRole;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// Permission configurations for each role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['dashboard', 'transactions', 'suppliers', 'materials', 'analytics', 'reports', 'settings'],
  user: ['dashboard', 'suppliers', 'materials']
};

// Navigation items that require specific permissions
export const NAVIGATION_PERMISSIONS: Record<string, Permission> = {
  'dashboard': 'dashboard',
  'transactions': 'transactions',
  'suppliers': 'suppliers',
  'materials': 'materials',
  'analytics': 'analytics',
  'reports-daily': 'reports',
  'reports-weekly': 'reports',
  'reports-monthly': 'reports',
  'reports-custom': 'reports',
  'settings': 'settings'
};

interface UserPermissions {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  permissions: Permission[];
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  canNavigateTo: (route: string) => boolean;
  isAdmin: boolean;
  isFirstUser: boolean;
  userStats: {
    totalUsers: number;
    adminCount: number;
  };
  refreshPermissions: () => Promise<void>;
}

export const usePermissions = (): UserPermissions => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    adminCount: 0
  });

  // Check if user would be first user (for signup scenarios)
  const checkFirstUserStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error('Error checking first user status:', error);
        setIsFirstUser(false);
        return;
      }

      const isFirst = !data || data.length === 0;
      setIsFirstUser(isFirst);
      
      if (isFirst) {
        console.log('🎯 First user detection: No users exist yet - next signup will be admin');
      }
    } catch (error) {
      console.error('Error in checkFirstUserStatus:', error);
      setIsFirstUser(false);
    }
  }, []);

  // Get user statistics
  const fetchUserStats = useCallback(async () => {
    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .single();

      if (error) {
        console.warn('Could not fetch user stats:', error);
        // Fallback - count manually
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_type');

        if (!profileError && profiles) {
          const total = profiles.length;
          const adminCount = profiles.filter(p => p.user_type === 'admin').length;
          setUserStats({ totalUsers: total, adminCount });
        }
        return;
      }

      setUserStats({
        totalUsers: stats?.total_users || 0,
        adminCount: stats?.admin_count || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Refreshing permissions...');
      
      // Get current user from Supabase
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        setUser(null);
        setProfile(null);
        setRole('user');
        setPermissions(ROLE_PERMISSIONS.user);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Check first user status (useful for debugging)
      await checkFirstUserStatus();
      
      // Fetch user statistics
      await fetchUserStats();

      if (!currentUser) {
        console.log('👤 No authenticated user');
        setProfile(null);
        setRole('user');
        setPermissions([]);
        setLoading(false);
        return;
      }

      console.log('👤 Authenticated user:', currentUser.email);

      // Get user profile with role information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Default to user role if error
        setProfile(null);
        setRole('user');
        setPermissions(ROLE_PERMISSIONS.user);
      } else {
        console.log('📋 Profile loaded:', profileData.email, 'Role:', profileData.user_type);
        setProfile(profileData);
        const userRole = (profileData?.user_type as UserRole) || 'user';
        setRole(userRole);
        setPermissions(ROLE_PERMISSIONS[userRole]);

        // Log permission details
        if (userRole === 'admin') {
          console.log('🛡️ Admin permissions granted:', ROLE_PERMISSIONS[userRole].join(', '));
        } else {
          console.log('👤 User permissions granted:', ROLE_PERMISSIONS[userRole].join(', '));
        }
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      setUser(null);
      setProfile(null);
      setRole('user');
      setPermissions(ROLE_PERMISSIONS.user);
    } finally {
      setLoading(false);
    }
  }, [checkFirstUserStatus, fetchUserStats]);

  useEffect(() => {
    refreshPermissions();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshPermissions();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out - resetting permissions');
        setUser(null);
        setProfile(null);
        setRole('user');
        setPermissions([]);
        setLoading(false);
        
        // Check first user status again after logout
        await checkFirstUserStatus();
        await fetchUserStats();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshPermissions, checkFirstUserStatus, fetchUserStats]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    const hasAccess = permissions.includes(permission);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Permission check: ${permission} = ${hasAccess ? '✅' : '❌'} (Role: ${role})`);
    }
    return hasAccess;
  }, [permissions, role]);

  const canNavigateTo = useCallback((route: string): boolean => {
    const requiredPermission = NAVIGATION_PERMISSIONS[route];
    if (!requiredPermission) {
      // If route doesn't require specific permission, allow access
      return true;
    }
    return hasPermission(requiredPermission);
  }, [hasPermission]);

  const isAdmin = role === 'admin';

  return {
    user,
    profile,
    role,
    permissions,
    loading,
    hasPermission,
    canNavigateTo,
    isAdmin,
    isFirstUser,
    userStats,
    refreshPermissions
  };
};

// Enhanced Permission service for complex operations with First User Admin support
export class PermissionService {
  
  // Check if user can perform specific action
  static async canPerformAction(
    userId: string, 
    action: 'create' | 'read' | 'update' | 'delete',
    resource: 'supplier' | 'transaction' | 'material' | 'report'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (error || !data) return false;

      const userRole = data.user_type as UserRole;

      // Admin can do everything
      if (userRole === 'admin') return true;

      // Regular users have limited permissions
      if (userRole === 'user') {
        switch (resource) {
          case 'supplier':
            return action === 'create' || action === 'read';
          case 'material':
            return action === 'create' || action === 'read';
          case 'transaction':
            return false; // No transaction access for regular users
          case 'report':
            return false; // No report access for regular users
          default:
            return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  // Update user role (admin only)
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      // Get current user to verify admin status
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('No authenticated user for role update');
        return false;
      }

      // Check if current user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', currentUser.id)
        .single();

      if (!adminProfile || adminProfile.user_type !== 'admin') {
        console.error('Only admins can update user roles');
        return false;
      }

      // Update the user's role
      const { error } = await supabase
        .from('profiles')
        .update({ 
          user_type: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      console.log('✅ User role updated:', userId, 'to', newRole);
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  // Get all users with their roles (admin only)
  static async getAllUsersWithRoles() {
    try {
      // Get current user to verify admin status
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('No authenticated user');
        return [];
      }

      // Check if current user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', currentUser.id)
        .single();

      if (!adminProfile || adminProfile.user_type !== 'admin') {
        console.error('Only admins can view all users');
        return [];
      }

      // Fetch all users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      console.log('📋 Fetched', data.length, 'users for admin view');
      return data;
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }
  }

  // Check if any admin exists
  static async hasAdminUsers(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'admin')
        .limit(1);

      if (error) {
        console.error('Error checking admin users:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking admin users:', error);
      return false;
    }
  }

  // Get system statistics
  static async getSystemStats(): Promise<{
    totalUsers: number;
    adminCount: number;
    regularUserCount: number;
    hasAdmin: boolean;
    firstAdminEmail?: string;
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .single();

      if (error) {
        console.warn('Could not fetch system stats from view, fetching manually');
        
        // Fallback - count manually
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_type, email');

        if (profiles) {
          const total = profiles.length;
          const adminCount = profiles.filter(p => p.user_type === 'admin').length;
          const regularUserCount = total - adminCount;
          const firstAdmin = profiles.find(p => p.user_type === 'admin');
          
          return {
            totalUsers: total,
            adminCount,
            regularUserCount,
            hasAdmin: adminCount > 0,
            firstAdminEmail: firstAdmin?.email
          };
        }
      }

      return {
        totalUsers: stats?.total_users || 0,
        adminCount: stats?.admin_count || 0,
        regularUserCount: stats?.regular_user_count || 0,
        hasAdmin: (stats?.admin_count || 0) > 0,
        firstAdminEmail: stats?.first_admin_email
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        totalUsers: 0,
        adminCount: 0,
        regularUserCount: 0,
        hasAdmin: false
      };
    }
  }

  // Check if current signup would be first user
  static async wouldBeFirstUser(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_first_user');
      
      if (error) {
        console.error('Error calling is_first_user function:', error);
        // Fallback check
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        return !profiles || profiles.length === 0;
      }

      return data === true;
    } catch (error) {
      console.error('Error checking if would be first user:', error);
      return false;
    }
  }
}

// Fixed HOC for protecting components based on permissions
export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: Permission,
  fallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> => {
  const PermissionProtectedComponent: React.FC<P> = (props: P) => {
    const { hasPermission, loading, isAdmin, role } = usePermissions();

    if (loading) {
      return React.createElement('div', {
        className: 'flex items-center justify-center min-h-screen'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('div', {
          key: 'spinner',
          className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'
        }),
        React.createElement('p', {
          key: 'text',
          className: 'text-gray-600'
        }, 'Loading permissions...')
      ]));
    }

    if (!hasPermission(requiredPermission)) {
      if (fallbackComponent) {
        return React.createElement(fallbackComponent, props);
      }
      
      return React.createElement('div', {
        className: 'flex items-center justify-center min-h-screen'
      }, React.createElement('div', {
        className: 'text-center bg-white rounded-lg shadow-xl p-8 max-w-md mx-4'
      }, [
        React.createElement('div', {
          key: 'icon',
          className: 'w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4'
        }, React.createElement('svg', {
          className: 'w-8 h-8 text-red-600',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        }, React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '2',
          d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
        }))),
        React.createElement('h2', {
          key: 'title',
          className: 'text-2xl font-bold text-gray-900 mb-2'
        }, 'Access Denied'),
        React.createElement('p', {
          key: 'message',
          className: 'text-gray-600 mb-4'
        }, `You don't have permission to access this feature.`),
        React.createElement('div', {
          key: 'role-info',
          className: 'bg-gray-50 rounded-lg p-3 mb-4 text-sm'
        }, [
          React.createElement('p', {
            key: 'current-role',
            className: 'text-gray-700'
          }, `Current Role: ${role === 'admin' ? 'Administrator' : 'User'}`),
          React.createElement('p', {
            key: 'required',
            className: 'text-gray-600'
          }, `Required Permission: ${requiredPermission}`)
        ]),
        React.createElement('p', {
          key: 'contact',
          className: 'text-sm text-gray-500 mb-4'
        }, 'Contact your administrator if you need access.'),
        React.createElement('button', {
          key: 'back',
          className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors',
          onClick: () => window.location.href = '/dashboard'
        }, 'Go to Dashboard')
      ]));
    }

    return React.createElement(WrappedComponent, props);
  };

  PermissionProtectedComponent.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return PermissionProtectedComponent;
};

// Hook to check specific permission
export const useHasPermission = (permission: Permission): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

// Hook to check if user can navigate to route
export const useCanNavigate = (route: string): boolean => {
  const { canNavigateTo } = usePermissions();
  return canNavigateTo(route);
};

// Hook to get first user status (useful for registration forms)
export const useFirstUserStatus = () => {
  const { isFirstUser, userStats } = usePermissions();
  return { isFirstUser, userStats };
};