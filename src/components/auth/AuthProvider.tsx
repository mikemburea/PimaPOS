// src/contexts/AuthProvider.tsx
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// User type definition
interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

// Profile type definition
interface Profile {
  id: string;
  full_name?: string;
  role?: string;
  [key: string]: any;
}

// Auth State interface
interface AuthState {
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

// User Permissions interface
interface UserPermissions {
  userRole: 'admin' | 'user' | 'viewer';
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  canNavigateTo: (tab: string) => boolean;
  permissions: string[];
}

// Extended Auth Context with permissions
interface ExtendedAuthState extends AuthState {
  userRole: 'admin' | 'user' | 'viewer';
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  canNavigateTo: (tab: string) => boolean;
  permissions: string[];
}

// Create Auth Context
const AuthContext = createContext<ExtendedAuthState | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'viewer'>('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Fetch user and permissions
  const fetchUserAndPermissions = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          const role = profileData.role || 'user';
          setUserRole(role as 'admin' | 'user' | 'viewer');
          setIsAdmin(role === 'admin');
          
          // Set permissions based on role
          if (role === 'admin') {
            setPermissions([
              'dashboard', 'transactions', 'suppliers', 'materials', 
              'analytics', 'reports', 'settings', 'reports-daily',
              'reports-weekly', 'reports-monthly', 'reports-custom'
            ]);
          } else if (role === 'user') {
            setPermissions(['dashboard', 'suppliers', 'materials']);
          } else {
            setPermissions(['dashboard']);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndPermissions();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await fetchUserAndPermissions();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setUserRole('user');
        setIsAdmin(false);
        setPermissions([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await fetchUserAndPermissions();
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setUserRole('user');
    setIsAdmin(false);
    setPermissions([]);
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const canNavigateTo = (tab: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(tab);
  };

  const contextValue: ExtendedAuthState = {
    user,
    loading,
    profile,
    signIn,
    signOut,
    signUp,
    userRole,
    isAdmin,
    hasPermission,
    canNavigateTo,
    permissions
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Hook for permissions (convenience wrapper)
export const usePermissions = () => {
  const context = useAuthContext();
  return {
    user: context.user,
    loading: context.loading,
    profile: context.profile,
    userRole: context.userRole,
    isAdmin: context.isAdmin,
    hasPermission: context.hasPermission,
    canNavigateTo: context.canNavigateTo,
    permissions: context.permissions
  };
};

// Hook for auth (convenience wrapper)
export const useAuth = () => {
  const context = useAuthContext();
  return {
    user: context.user,
    loading: context.loading,
    profile: context.profile,
    signIn: context.signIn,
    signOut: context.signOut,
    signUp: context.signUp
  };
};

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center relative group mb-6 bg-white overflow-hidden mx-auto">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center relative">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-inner">
            <span className="text-blue-600 font-black text-lg">M</span>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

// HOC for protected routes with role checking
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission?: string
) => {
  const AuthenticatedComponent = (props: P) => {
    const { user, loading, hasPermission } = useAuthContext();

    if (loading) {
      return <LoadingScreen />;
    }

    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div className="w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center relative group mb-6 bg-gradient-to-br from-blue-500 to-purple-600 mx-auto">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-inner">
                <span className="text-blue-600 font-black text-lg">M</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">Please sign in to access this page.</p>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    // Check permissions if required
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">You don't have permission to access this feature.</p>
            <button 
              onClick={() => window.location.href = '/dashboard'} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return AuthenticatedComponent;
};