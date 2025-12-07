// src/hooks/usePermissions.ts - FINAL FIX: Eliminates all auth loops
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['dashboard', 'transactions', 'suppliers', 'materials', 'analytics', 'reports', 'settings'],
  user: ['dashboard', 'suppliers', 'materials']
};

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

  // CRITICAL FIX: Use refs to avoid stale closures
  const currentUserRef = useRef<User | null>(null);
  const initialLoadComplete = useRef(false);
  const refreshInProgress = useRef(false);
  const lastRefreshTime = useRef<number>(0);
  const authListenerActive = useRef(false);
  const mountedRef = useRef(true);
  
  // CRITICAL FIX: Track processed auth events to prevent duplicates
  const processedAuthEvents = useRef(new Set<string>());

  // Update ref whenever user state changes
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

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
        console.log('🎯 First user detection: No users exist yet');
      }
    } catch (error) {
      console.error('Error in checkFirstUserStatus:', error);
      setIsFirstUser(false);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .single();

      if (error) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_type');

        if (!profileError && profiles) {
          const total = profiles.length;
          const adminCount = profiles.filter(p => p.user_type === 'admin').length;
          if (mountedRef.current) {
            setUserStats({ totalUsers: total, adminCount });
          }
        }
        return;
      }

      if (mountedRef.current) {
        setUserStats({
          totalUsers: stats?.total_users || 0,
          adminCount: stats?.admin_count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, []);

  const checkUserPermissions = useCallback(async () => {
    if (!mountedRef.current) {
      console.log('🚫 Component unmounted, skipping permission check');
      return;
    }
    
    if (refreshInProgress.current) {
      console.log('🔒 Permission check already in progress');
      return;
    }

    refreshInProgress.current = true;
    const now = Date.now();
    lastRefreshTime.current = now;

    try {
      // Use getSession to avoid triggering auth events
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
          setRole('user');
          setPermissions(ROLE_PERMISSIONS.user);
        }
        return;
      }

      const currentUser = session?.user || null;
      
      // Update user state and ref
      if (mountedRef.current) {
        setUser(currentUser);
        currentUserRef.current = currentUser;
      }

      if (!currentUser) {
        console.log('👤 No authenticated user');
        if (mountedRef.current) {
          setProfile(null);
          setRole('user');
          setPermissions([]);
        }
        return;
      }

      console.log('👤 Authenticated user:', currentUser.email);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        if (mountedRef.current) {
          setProfile(null);
          setRole('user');
          setPermissions(ROLE_PERMISSIONS.user);
        }
      } else {
        console.log('📋 Profile loaded:', profileData.email, 'Role:', profileData.user_type);
        
        if (mountedRef.current) {
          setProfile(profileData);
          const userRole = (profileData?.user_type as UserRole) || 'user';
          setRole(userRole);
          setPermissions(ROLE_PERMISSIONS[userRole]);

          if (userRole === 'admin') {
            console.log('🛡️ Admin permissions granted');
          } else {
            console.log('👤 User permissions granted');
          }
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      if (mountedRef.current) {
        setUser(null);
        setProfile(null);
        setRole('user');
        setPermissions(ROLE_PERMISSIONS.user);
      }
    } finally {
      refreshInProgress.current = false;
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    const now = Date.now();
    
    if (!mountedRef.current) {
      console.log('🚫 Component unmounted, skipping refresh');
      return;
    }
    
    if (refreshInProgress.current) {
      console.log('🔒 Permission refresh already in progress');
      return;
    }

    // CRITICAL: Longer debounce for subsequent refreshes (30s)
    if (initialLoadComplete.current && now - lastRefreshTime.current < 30000) {
      console.log(`🔒 Refresh debounced (${Math.round((now - lastRefreshTime.current) / 1000)}s since last)`);
      return;
    }

    // Only show loading spinner on initial load
    if (!initialLoadComplete.current) {
      setLoading(true);
      console.log('🔄 Initial permission load...');
    } else {
      console.log('🔄 Background refresh (manual only)');
    }

    await checkUserPermissions();
    
    // Check first user status only on initial load
    if (!initialLoadComplete.current) {
      await checkFirstUserStatus();
      await fetchUserStats();
    }

    if (mountedRef.current) {
      setLoading(false);
    }
    initialLoadComplete.current = true;
  }, [checkUserPermissions, checkFirstUserStatus, fetchUserStats]);

  // CRITICAL FIX: Ultra-minimal auth listener with proper deduplication
  useEffect(() => {
    mountedRef.current = true;
    
    if (authListenerActive.current) {
      console.log('🔒 Auth listener already active');
      return;
    }
    
    authListenerActive.current = true;

    // Initial load
    refreshPermissions();

    // CRITICAL FIX: Minimal auth listener that uses refs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      
      console.log('🔐 Auth event:', event);
      
      // CRITICAL FIX: Create deduplication key using session details
      const dedupeKey = session 
        ? `${event}_${session.user.id}_${session.access_token.slice(-8)}`
        : `${event}_no_session`;
      
      // Check if we've already processed this exact event
      if (processedAuthEvents.current.has(dedupeKey)) {
        console.log(`⏭️ Skipping duplicate ${event} event`);
        return;
      }
      
      // Mark as processed
      processedAuthEvents.current.add(dedupeKey);
      
      // Clean old entries (keep last 10)
      if (processedAuthEvents.current.size > 10) {
        const entries = Array.from(processedAuthEvents.current);
        processedAuthEvents.current = new Set(entries.slice(-10));
      }
      
      // CRITICAL FIX: Use ref to get current user (avoids stale closure)
      const currentUserId = currentUserRef.current?.id;
      
      switch (event) {
        case 'SIGNED_IN':
          // Only refresh if this is a NEW user (not same user refreshing token)
          if (session?.user?.id !== currentUserId) {
            console.log('✅ New user sign-in detected, refreshing permissions');
            await checkUserPermissions();
            await checkFirstUserStatus();
            await fetchUserStats();
          } else {
            console.log('⏭️ Token refresh for same user, skipping permission reload');
          }
          break;
          
        case 'SIGNED_OUT':
          console.log('👋 User signed out, clearing permissions');
          if (mountedRef.current) {
            setUser(null);
            currentUserRef.current = null;
            setProfile(null);
            setRole('user');
            setPermissions([]);
            setLoading(false);
          }
          initialLoadComplete.current = false;
          processedAuthEvents.current.clear();
          await checkFirstUserStatus();
          await fetchUserStats();
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed, no action needed');
          // Do nothing - token refresh should not trigger permission reload
          break;
          
        case 'USER_UPDATED':
          console.log('📝 User updated, no permission reload needed');
          // Do nothing - user updates don't affect permissions in our system
          break;
          
        case 'INITIAL_SESSION':
          console.log('🎬 Initial session event');
          // Already handled by initial refreshPermissions() call
          break;
          
        default:
          console.log(`ℹ️ Ignoring auth event: ${event}`);
      }
    });

    return () => {
      console.log('🛑 Cleaning up permission hook');
      mountedRef.current = false;
      authListenerActive.current = false;
      subscription.unsubscribe();
      processedAuthEvents.current.clear();
    };
  }, [checkUserPermissions, checkFirstUserStatus, fetchUserStats, refreshPermissions]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const canNavigateTo = useCallback((route: string): boolean => {
    const requiredPermission = NAVIGATION_PERMISSIONS[route];
    if (!requiredPermission) {
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

// Permission service (unchanged - already using getSession)
export class PermissionService {
  
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

      if (userRole === 'admin') return true;

      if (userRole === 'user') {
        switch (resource) {
          case 'supplier':
            return action === 'create' || action === 'read';
          case 'material':
            return action === 'create' || action === 'read';
          case 'transaction':
            return false;
          case 'report':
            return false;
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

  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      
      if (!currentUser) {
        console.error('No authenticated user for role update');
        return false;
      }

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', currentUser.id)
        .single();

      if (!adminProfile || adminProfile.user_type !== 'admin') {
        console.error('Only admins can update user roles');
        return false;
      }

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

  static async getAllUsersWithRoles() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      
      if (!currentUser) {
        console.error('No authenticated user');
        return [];
      }

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', currentUser.id)
        .single();

      if (!adminProfile || adminProfile.user_type !== 'admin') {
        console.error('Only admins can view all users');
        return [];
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }
  }

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

  static async wouldBeFirstUser(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_first_user');
      
      if (error) {
        console.error('Error calling is_first_user function:', error);
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

export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: Permission,
  fallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> => {
  const PermissionProtectedComponent: React.FC<P> = (props: P) => {
    const { hasPermission, loading, role } = usePermissions();

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

export const useHasPermission = (permission: Permission): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

export const useCanNavigate = (route: string): boolean => {
  const { canNavigateTo } = usePermissions();
  return canNavigateTo(route);
};

export const useFirstUserStatus = () => {
  const { isFirstUser, userStats } = usePermissions();
  return { isFirstUser, userStats };
};