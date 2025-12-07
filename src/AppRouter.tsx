// AppRouter.tsx - FIXED VERSION WITH ALL RESUME/RELOAD PATCHES
// This version eliminates stuck loading states and auth loops
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

  // CRITICAL FIX: Track processed events with better dedupe key
  const processedEvents = useRef(new Set<string>());

  // CRITICAL FIX: Track latest currentPage to avoid stale closures
  const currentPageRef = useRef<'welcome' | 'app'>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // --- INITIAL AUTH CHECK + LISTENER ---
  useEffect(() => {
    mountedRef.current = true;
    console.log('AppRouter: Initial mount');

    // CRITICAL FIX: Only run initial check once
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

    // CRITICAL FIX: Ensure listener is setup only once
    if (authListenerActive.current) {
      console.log('AppRouter: Auth listener already active — skipping');
      return;
    }

    authListenerActive.current = true;
    console.log('AppRouter: Setting up ONE-TIME Supabase auth listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // CRITICAL FIX: Get fresh page state on every event (no stale closures)
        const isPageVisible = !document.hidden;
        const isPageFocused = document.hasFocus();
        const current = currentPageRef.current;

        console.log(`🔔 Auth event: ${event}`, {
          visible: isPageVisible,
          focused: isPageFocused,
          hasSession: !!session,
          userId: session?.user?.id?.slice(-8),
          currentPage: current
        });

        // Return early if unmounted
        if (!mountedRef.current) {
          console.log('⚠️ Component unmounted, ignoring auth event');
          return;
        }

        // CRITICAL FIX: Improved dedupe key using session + small token slice
        // This reduces false dedupes while still catching true duplicates
        const dedupeKey = session 
          ? `${event}_${session.user.id}_${session.access_token.slice(-12)}`
          : `${event}_no_session`;

        // Check for duplicates
        if (processedEvents.current.has(dedupeKey)) {
          console.log(`⏭️ Skipping duplicate ${event} event (same session)`);
          return;
        }

        // Mark as processed
        processedEvents.current.add(dedupeKey);

        // Clean old entries to prevent memory leak (keep last 10)
        if (processedEvents.current.size > 10) {
          const entries = Array.from(processedEvents.current);
          processedEvents.current = new Set(entries.slice(-10));
        }

        // --- EVENT HANDLERS ---
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user && current !== 'app') {
              console.log('✅ Processing SIGNED_IN → navigating to app');
              setUser(session.user);
              setCurrentPage('app');
              // CRITICAL FIX: Explicitly clear loading state on SIGNED_IN
              setIsCheckingAuth(false);
            } else if (current === 'app') {
              console.log('ℹ️ SIGNED_IN ignored — already on app');
            } else {
              console.log('⚠️ SIGNED_IN ignored — no user in session');
            }
            break;

          case 'TOKEN_REFRESHED':
            console.log('🔄 TOKEN_REFRESHED — token updated, maintaining current page');
            // Don't navigate on token refresh, just update user if needed
            if (session?.user && current === 'app') {
              setUser(session.user);
            }
            break;

          case 'SIGNED_OUT':
            if (current !== 'welcome') {
              console.log('👋 Processing SIGNED_OUT → navigating to welcome');
              setUser(null);
              setCurrentPage('welcome');
              // Clear processed events on sign out
              processedEvents.current.clear();
            } else {
              console.log('ℹ️ SIGNED_OUT ignored — already on welcome');
            }
            break;

          case 'INITIAL_SESSION':
            if (session?.user && current !== 'app') {
              console.log('✅ Initial session found → navigating to app');
              setUser(session.user);
              setCurrentPage('app');
              setIsCheckingAuth(false);
            } else if (!session?.user) {
              console.log('ℹ️ No initial session found');
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

      try {
        subscription?.unsubscribe?.();
        console.log('✅ Auth listener unsubscribed');
      } catch (err) {
        console.warn('⚠️ Error unsubscribing auth listener:', err);
      }

      // Clear processed events on cleanup
      processedEvents.current.clear();
    };
  }, []); // CRITICAL: Empty deps - run once on mount

  // --- Navigation helpers ---
  const navigateToApp = () => {
    console.log('AppRouter: manual navigateToApp');
    if (currentPageRef.current !== 'app') {
      setCurrentPage('app');
    } else {
      console.log('Already on app page, no navigation needed');
    }
  };

  const navigateToWelcome = async () => {
    console.log('AppRouter: manual logout → welcome');
    try {
      await supabase.auth.signOut();
      // The SIGNED_OUT event will handle navigation
    } catch (err) {
      console.error('AppRouter: logout error:', err);
      // Fallback: force navigation if signOut fails
      setUser(null);
      setCurrentPage('welcome');
    }
  };

  const handleAuthSuccess = () => {
    console.log('AppRouter: handleAuthSuccess (from welcome)');
    // The SIGNED_IN event from the listener will handle navigation
  };

  // --- LOADING SCREEN ---
  if (isCheckingAuth) {
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

  console.log('AppRouter: Rendering page:', currentPage, 'user:', user?.email);

  // --- ROUTING ---
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