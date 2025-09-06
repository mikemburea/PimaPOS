// src/auth/AuthProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthState } from '../../hooks/useAuth';

// Create Auth Context
const AuthContext = createContext<AuthState | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useAuth();

  return (
    <AuthContext.Provider value={authState}>
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

// HOC for protected routes
export const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const AuthenticatedComponent = (props: P) => {
    const { user, loading } = useAuthContext();

    if (loading) {
      return <LoadingScreen />;
    }

    if (!user) {
      // You can redirect to login page here or show the welcome component
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

    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return AuthenticatedComponent;
};

// Hook for checking if user is authenticated
export const useIsAuthenticated = () => {
  const { user, loading } = useAuthContext();
  return { isAuthenticated: !!user, loading };
};

// Hook for user profile
export const useProfile = () => {
  const { profile, user, loading } = useAuthContext();
  return { profile, user, loading };
};