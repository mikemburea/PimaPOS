import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import App from './App';
import PimaPOSWelcome from './PimaPOSWelcome';

// Define the props interface for PimaPOSWelcome
interface PimaPOSWelcomeProps {
  onNavigateToApp: () => void;
}

const AppRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'welcome' | 'app'>('welcome');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  
  // Check authentication status on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('User already authenticated:', user.email);
          setUser(user);
          setCurrentPage('app');
        } else {
          console.log('No authenticated user found');
          setCurrentPage('welcome');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setCurrentPage('welcome');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user.email);
        setUser(session.user);
        setCurrentPage('app');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setCurrentPage('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const navigateToApp = async () => {
    try {
      // Double-check authentication before navigating
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Navigating to app for user:', user.email);
        setUser(user);
        setCurrentPage('app');
      } else {
        console.error('Navigation to app failed: no authenticated user');
      }
    } catch (error) {
      console.error('Error during navigation to app:', error);
    }
  };
  
  const navigateToWelcome = async () => {
    try {
      console.log('Logging out and navigating to welcome...');
      await supabase.auth.signOut();
      setUser(null);
      setCurrentPage('welcome');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation even if logout fails
      setUser(null);
      setCurrentPage('welcome');
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
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
          <p className="text-gray-600 font-medium">Loading MeruScrap...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }
  
  if (currentPage === 'app' && user) {
    // Pass the proper navigation function to App component
    return <App onNavigateBack={navigateToWelcome} />;
  }
  
  // Cast PimaPOSWelcome to accept the prop
  const PimaPOSWelcomeComponent = PimaPOSWelcome as React.ComponentType<PimaPOSWelcomeProps>;
  
  return <PimaPOSWelcomeComponent onNavigateToApp={navigateToApp} />;
};

export default AppRouter;