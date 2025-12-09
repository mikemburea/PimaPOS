// AppRouter.tsx - FIXED: Prevents infinite auth check on logout
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import App from './App';
import StandalonePimaPOSWelcome from './PimaPOSWelcome';

const AppRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'welcome' | 'app'>('welcome');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  // Control flags
  const authCheckComplete = useRef(false);
  const authListenerActive = useRef(false);
  const mountedRef = useRef(true);
  const isLoggingOut = useRef(false); // CRITICAL FIX: Track logout state

  // CRITICAL FIX: Track processed events
  const processedEvents = useRef(new Set<string>());

  // CRITICAL FIX: Track latest currentPage
  const currentPageRef = useRef<'welcome' | 'app'>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    mountedRef.current = true;
    console.log('AppRouter: Initial mount');

    if (authCheckComplete.current) {
      console.log('AppRouter: Skipping initial auth check (already completed)');
      setIsCheckingAuth(false);
      return;
    }

    const checkAuthStatus = async () => {
      try {
        console.log('AppRouter: Performing initial auth check...');
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;

        if (currentUser) {
          console.log('AppRouter: Initial auth - user found:', currentUser.email);
          if (mountedRef.current) {
            setUser(currentUser);
            setCurrentPage('app');
          }
        } else {
          console.log('AppRouter: Initial auth - no user found');
          if (mountedRef.current) {
            setCurrentPage('welcome');
          }
        }
      } catch (err) {
        console.error('AppRouter: Error during initial auth check:', err);
        if (mountedRef.current) {
          setCurrentPage('welcome');
        }
      } finally {
        if (mountedRef.current) {
          authCheckComplete.current = true;
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuthStatus();

    if (authListenerActive.current) {
      console.log('AppRouter: Auth listener already active — skipping');
      return;
    }

    authListenerActive.current = true;
    console.log('AppRouter: Setting up ONE-TIME Supabase auth listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const isPageVisible = !document.hidden;
        const isPageFocused = document.hasFocus();
        const current = currentPageRef.current;

        console.log(`🔔 Auth event: ${event}`, {
          visible: isPageVisible,
          focused: isPageFocused,
          hasSession: !!session,
          userId: session?.user?.id?.slice(-8),
          currentPage: current,
          isLoggingOut: isLoggingOut.current // CRITICAL FIX: Log logout state
        });

        if (!mountedRef.current) {
          console.log('⚠️ Component unmounted, ignoring auth event');
          return;
        }

        // CRITICAL FIX: Improved dedupe key
        const dedupeKey = session 
          ? `${event}_${session.user.id}_${session.access_token.slice(-12)}`
          : `${event}_no_session_${Date.now()}`;

        if (processedEvents.current.has(dedupeKey)) {
          console.log(`⏭️ Skipping duplicate ${event} event`);
          return;
        }

        processedEvents.current.add(dedupeKey);

        if (processedEvents.current.size > 10) {
          const entries = Array.from(processedEvents.current);
          processedEvents.current = new Set(entries.slice(-10));
        }

        switch (event) {
          case 'SIGNED_IN':
            // CRITICAL FIX: Ignore SIGNED_IN during logout
            if (isLoggingOut.current) {
              console.log('⏭️ SIGNED_IN ignored — logout in progress');
              break;
            }
            
            if (session?.user && current !== 'app') {
              console.log('✅ Processing SIGNED_IN → navigating to app');
              setUser(session.user);
              setCurrentPage('app');
              setIsCheckingAuth(false);
            } else if (current === 'app') {
              console.log('ℹ️ SIGNED_IN ignored — already on app');
            }
            break;

          case 'TOKEN_REFRESHED':
            console.log('🔄 TOKEN_REFRESHED — token updated, maintaining current page');
            if (session?.user && current === 'app') {
              setUser(session.user);
            }
            break;

          case 'SIGNED_OUT':
            // CRITICAL FIX: Set logout flag and clear state atomically
            console.log('👋 Processing SIGNED_OUT');
            isLoggingOut.current = true;
            
            if (mountedRef.current) {
              setUser(null);
              setCurrentPage('welcome');
              setIsCheckingAuth(false); // CRITICAL: Stop any loading state
              
              // Clear processed events
              processedEvents.current.clear();
              
              console.log('✅ Logout complete - navigated to welcome');
            }
            
            // CRITICAL FIX: Reset logout flag after a delay to prevent re-auth
            setTimeout(() => {
              isLoggingOut.current = false;
              console.log('🔓 Logout flag cleared');
            }, 2000);
            break;

          case 'INITIAL_SESSION':
            // CRITICAL FIX: Ignore INITIAL_SESSION during logout
            if (isLoggingOut.current) {
              console.log('⏭️ INITIAL_SESSION ignored — logout in progress');
              break;
            }
            
            if (session?.user && current !== 'app') {
              console.log('✅ Initial session found → navigating to app');
              setUser(session.user);
              setCurrentPage('app');
              setIsCheckingAuth(false);
            }
            break;

          case 'USER_UPDATED':
            if (session?.user) {
              console.log('🔄 USER_UPDATED → updating user state only');
              setUser(session.user);
            }
            break;

          default:
            console.log(`ℹ️ Ignoring unhandled auth event: ${event}`);
        }
      }
    );

    return () => {
      console.log('🛑 AppRouter: Cleanup — component unmounted');
      mountedRef.current = false;
      authListenerActive.current = false;
      isLoggingOut.current = false; // CRITICAL FIX: Clear logout flag

      try {
        subscription?.unsubscribe?.();
        console.log('✅ Auth listener unsubscribed');
      } catch (err) {
        console.warn('⚠️ Error unsubscribing auth listener:', err);
      }

      processedEvents.current.clear();
    };
  }, []);

  const navigateToApp = () => {
    console.log('AppRouter: manual navigateToApp');
    if (currentPageRef.current !== 'app' && !isLoggingOut.current) {
      setCurrentPage('app');
    }
  };

  const navigateToWelcome = async () => {
    console.log('AppRouter: manual logout → welcome');
    
    // CRITICAL FIX: Set logout flag immediately
    isLoggingOut.current = true;
    
    try {
      // Clear state first to prevent visual glitches
      setUser(null);
      setCurrentPage('welcome');
      setIsCheckingAuth(false);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      
      // Clear any cached auth data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      console.log('✅ Logout successful');
    } catch (err) {
      console.error('AppRouter: logout error:', err);
      // Even on error, ensure we're on welcome page
      setUser(null);
      setCurrentPage('welcome');
      setIsCheckingAuth(false);
    } finally {
      // Reset logout flag after delay
      setTimeout(() => {
        isLoggingOut.current = false;
        console.log('🔓 Logout flag cleared after manual logout');
      }, 2000);
    }
  };

  const handleAuthSuccess = () => {
    console.log('AppRouter: handleAuthSuccess (from welcome)');
    // The SIGNED_IN event will handle navigation
  };

  // Loading screen
  if (isCheckingAuth && !isLoggingOut.current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center relative mb-6 bg-white mx-auto">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-inner">
                <span className="text-blue-600 font-black text-lg">M</span>
              </div>
            </div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading MeruScrap...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  console.log('AppRouter: Rendering page:', currentPage, 'user:', user?.email, 'loggingOut:', isLoggingOut.current);

  // CRITICAL FIX: Show welcome page during logout
  if (currentPage === 'app' && !isLoggingOut.current) {
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