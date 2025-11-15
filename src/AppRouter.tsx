import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import App from './App';
import StandalonePimaPOSWelcome from './PimaPOSWelcome';

const AppRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'welcome' | 'app'>('welcome');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  
  // CRITICAL FIX: Prevent any duplicate operations
  const authCheckComplete = useRef(false);
  const authListenerActive = useRef(false);
  const mountedRef = useRef(true);

  // Check authentication status on app start
  useEffect(() => {
    mountedRef.current = true;
    
    // Prevent multiple auth checks
    if (authCheckComplete.current) {
      console.log('AppRouter: Auth check already completed');
      return;
    }

    const checkAuthStatus = async () => {
      try {
        console.log('AppRouter: Checking auth status...');
        
        // CRITICAL: Use getSession instead of getUser to avoid triggering events
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;
        
        if (currentUser) {
          console.log('AppRouter: User already authenticated:', currentUser.email);
          if (mountedRef.current) {
            setUser(currentUser);
            setCurrentPage('app');
          }
        } else {
          console.log('AppRouter: No authenticated user found');
          if (mountedRef.current) {
            setCurrentPage('welcome');
          }
        }
      } catch (error) {
        console.error('AppRouter: Error checking auth status:', error);
        if (mountedRef.current) {
          setCurrentPage('welcome');
        }
      } finally {
        if (mountedRef.current) {
          setIsCheckingAuth(false);
          authCheckComplete.current = true;
        }
      }
    };

    checkAuthStatus();
    

    // CRITICAL FIX: Only set up ONE auth listener EVER
    if (authListenerActive.current) {
      console.log('AppRouter: Auth listener already active, skipping setup');
      return;
    }

    authListenerActive.current = true;
    console.log('AppRouter: Setting up auth listener (ONE TIME ONLY)');

    // Listen for auth changes - EXTREMELY RESTRICTIVE
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) {
        console.log('AppRouter: Component unmounted, ignoring auth event');
        return;
      }
      
      console.log('AppRouter: Auth state change:', event);
      
      // CRITICAL: ONLY respond to actual sign in/out, nothing else
     if (
  event === 'SIGNED_IN' && 
  session?.user && 
  session?.user?.id !== user?.id
) {

        // Only if we don't already have a user
        console.log('AppRouter: User signed in, navigating to app');
        if (mountedRef.current) {
          setUser(session.user);
          setCurrentPage('app');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('AppRouter: User signed out, navigating to welcome');
        if (mountedRef.current) {
          setUser(null);
          setCurrentPage('welcome');
        }
      } else {
        // Log but ignore all other events
        console.log(`AppRouter: Ignoring ${event} event (not a real sign in/out)`);
      }
    });

    return () => {
      console.log('AppRouter: Cleaning up');
      mountedRef.current = false;
      authListenerActive.current = false;
      subscription.unsubscribe();
    };
  }, []); // CRITICAL: Empty deps - run once only

  // Enhanced navigation functions
  const navigateToApp = () => {
    console.log('AppRouter: navigateToApp called');
    setCurrentPage('app');
  };

  const navigateToWelcome = async () => {
    try {
      console.log('AppRouter: Logging out and navigating to welcome...');
      await supabase.auth.signOut();
      setUser(null);
      setCurrentPage('welcome');
    } catch (error) {
      console.error('AppRouter: Error during logout:', error);
      // Force navigation even if logout fails
      setUser(null);
      setCurrentPage('welcome');
    }
  };

  // Handle auth success from welcome component
  const handleAuthSuccess = () => {
    console.log('AppRouter: handleAuthSuccess called');
    navigateToApp();
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

  console.log('AppRouter: Current page:', currentPage, 'User:', user?.email);

  // Render the appropriate component
  if (currentPage === 'app') {
    return <App onNavigateBack={navigateToWelcome} />;
  }

  return (
    <StandalonePimaPOSWelcome 
      onAuthSuccess={handleAuthSuccess}
      onNavigateToApp={navigateToApp}
    />
  ); 
};

export default AppRouter;