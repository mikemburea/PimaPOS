// src/components/common/Sidebar.tsx - FIXED: Improved logout coordination
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Package, 
  BarChart3, 
  FileText, 
  Settings, 
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  reportsOpen: boolean;
  setReportsOpen: (open: boolean) => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'dashboard',
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  reportsOpen,
  setReportsOpen,
  onLogout
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const reportItems = [
    { id: 'reports-daily', label: 'Daily Reports' },
    { id: 'reports-weekly', label: 'Weekly Reports' },
    { id: 'reports-monthly', label: 'Monthly Reports' },
    { id: 'reports-custom', label: 'Custom Reports' },
  ];

  const handleMenuClick = (itemId: string) => {
    setActiveTab(itemId);
    if (!itemId.startsWith('reports-')) {
      setReportsOpen(false);
    }
  };

  const handleReportsClick = () => {
    if (sidebarOpen) {
      if (reportsOpen) {
        if (!(activeTab || '').startsWith('reports-')) {
          setActiveTab('reports-daily');
        }
      } else {
        setActiveTab('reports-daily');
        setReportsOpen(true);
      }
    } else {
      setActiveTab('reports-daily');
      setSidebarOpen(true);
      setTimeout(() => {
        setReportsOpen(true);
      }, 150);
    }
  };

  // CRITICAL FIX: Enhanced logout handler with proper state management
  const handleLogout = async () => {
    if (isLoggingOut) {
      console.log('🔒 Logout already in progress, ignoring duplicate call');
      return;
    }
    
    console.log('🔄 Logout initiated from sidebar');
    setIsLoggingOut(true);
    
    // CRITICAL FIX: Clear UI state immediately to prevent user interaction
    setActiveTab('dashboard');
    setReportsOpen(false);
    
    try {
      // If parent component provided logout handler, use it (preferred)
      if (onLogout) {
        console.log('📤 Calling provided onLogout handler...');
        await onLogout();
        console.log('✅ Logout handler completed');
      } else {
        // Fallback: direct Supabase logout (less preferred)
        console.log('📤 Calling fallback Supabase signOut...');
        
        // CRITICAL FIX: Use signOut with scope to ensure complete logout
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        
        if (error) {
          console.error('Supabase signOut error:', error);
          // Continue with cleanup even if error
        }
        
        // Clear browser storage
        try {
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
        } catch (storageError) {
          console.warn('Error clearing storage:', storageError);
        }
        
        console.log('✅ Fallback logout completed');
        
        // CRITICAL FIX: Don't force reload, let auth system handle navigation
        // The auth listener in AppRouter will handle the SIGNED_OUT event
      }
    } catch (error) {
      console.error('Logout error:', error);
      // On error, still try to clear local state
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Error clearing storage on logout error:', e);
      }
    } finally {
      // CRITICAL FIX: Reset logout state after delay to prevent rapid re-clicks
      setTimeout(() => {
        setIsLoggingOut(false);
        console.log('🔓 Logout state reset');
      }, 2000);
    }
  };

  return (
    <>
      {/* Mobile Top Menu */}
      <div className="md:hidden">
        <div className={`
          fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-2xl border-b border-slate-700
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-y-0' : '-translate-y-full'}
        `}>
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Meru Scrap
                </h2>
                <p className="text-xs text-slate-400 -mt-1">Smart Scrap Management</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
              disabled={isLoggingOut}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    disabled={isLoggingOut}
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                        : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                    } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'} mr-3`} />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </button>
                );
              })}

              <div className="pt-2">
                <button
                  onClick={handleReportsClick}
                  disabled={isLoggingOut}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    (activeTab || '').startsWith('reports-') 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                  } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FileText className={`w-5 h-5 ${
                    (activeTab || '').startsWith('reports-') ? 'text-white' : 'text-slate-400'
                  } mr-3`} />
                  <span className="font-medium">Reports</span>
                  <div className="ml-auto">
                    {reportsOpen ? (
                      <ChevronDown className={`w-4 h-4 ${
                        (activeTab || '').startsWith('reports-') ? 'text-white' : 'text-slate-400'
                      }`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${
                        (activeTab || '').startsWith('reports-') ? 'text-white' : 'text-slate-400'
                      }`} />
                    )}
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  reportsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="ml-6 mt-1 space-y-1">
                    {reportItems.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          disabled={isLoggingOut}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                            isActive 
                              ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 border-l-2 border-blue-400' 
                              : 'hover:bg-slate-700/30 text-slate-400 hover:text-slate-200'
                          } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleMenuClick('settings')}
                disabled={isLoggingOut}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'settings' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Settings className={`w-5 h-5 ${
                  activeTab === 'settings' ? 'text-white' : 'text-slate-400'
                } mr-3`} />
                <span className="font-medium">Settings</span>
                {activeTab === 'settings' && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  isLoggingOut 
                    ? 'bg-red-600/30 text-red-300 cursor-not-allowed' 
                    : 'hover:bg-red-600/20 text-slate-300 hover:text-red-400'
                }`}
              >
                {isLoggingOut ? (
                  <div className="w-5 h-5 border-2 border-red-300 border-t-transparent rounded-full animate-spin mr-3"></div>
                ) : (
                  <LogOut className="w-5 h-5 text-slate-400 hover:text-red-400 mr-3" />
                )}
                <span className="font-medium">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">MS</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">Meru Scrap</p>
                    <p className="text-xs text-slate-400 truncate">v2.1.0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Similar structure with same fixes */}
      <div className={`hidden md:flex bg-gradient-to-b from-slate-900 to-slate-800 text-white ${
        sidebarOpen ? 'w-72' : 'w-16'
      } transition-all duration-300 ease-in-out shadow-2xl border-r border-slate-700 relative flex-col h-full`}>
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.5);
            border-radius: 10px;
            margin: 8px 0;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(71, 85, 105, 0.8), rgba(51, 65, 85, 0.9));
            border-radius: 10px;
            border: 1px solid rgba(71, 85, 105, 0.3);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(71, 85, 105, 0.9), rgba(51, 65, 85, 1));
          }
        `}</style>

        <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            {sidebarOpen ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                     Meru Scrap
                    </h2>
                    <p className="text-xs text-slate-400 -mt-1">Smart Scrap Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  disabled={isLoggingOut}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="w-full flex justify-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  disabled={isLoggingOut}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  <Menu className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 custom-scrollbar">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  disabled={isLoggingOut}
                  className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                  } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors duration-200 ${
                    !sidebarOpen ? 'mx-auto' : ''
                  }`} />
                  {sidebarOpen && (
                    <>
                      <span className="ml-3 font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </>
                  )}
                  {!sidebarOpen && !isLoggingOut && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}

            <div className="pt-2">
              <button
                onClick={handleReportsClick}
                disabled={isLoggingOut}
                className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  (activeTab || '').startsWith('reports-') 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileText className={`w-5 h-5 ${
                  (activeTab || '').startsWith('reports-') ? 'text-white' : 'text-slate-400 group-hover:text-white'
                } transition-colors duration-200 ${
                  !sidebarOpen ? 'mx-auto' : ''
                }`} />
                {sidebarOpen && (
                  <>
                    <span className="ml-3 font-medium">Reports</span>
                    <div className="ml-auto">
                      {reportsOpen ? (
                        <ChevronDown className={`w-4 h-4 ${
                          (activeTab || '').startsWith('reports-') ? 'text-white' : 'text-slate-400 group-hover:text-white'
                        } transition-all duration-200`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${
                          (activeTab || '').startsWith('reports-') ? 'text-white' : 'text-slate-400 group-hover:text-white'
                        } transition-all duration-200`} />
                      )}
                    </div>
                  </>
                )}
                {!sidebarOpen && !isLoggingOut && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Reports
                  </div>
                )}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                reportsOpen && sidebarOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-6 mt-1 space-y-1">
                  {reportItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        disabled={isLoggingOut}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                          isActive 
                            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 border-l-2 border-blue-400' 
                            : 'hover:bg-slate-700/30 text-slate-400 hover:text-slate-200'
                        } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleMenuClick('settings')}
                disabled={isLoggingOut}
                className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  activeTab === 'settings' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Settings className={`w-5 h-5 ${
                  activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-white'
                } transition-colors duration-200 ${
                  !sidebarOpen ? 'mx-auto' : ''
                }`} />
                {sidebarOpen && (
                  <>
                    <span className="ml-3 font-medium">Settings</span>
                    {activeTab === 'settings' && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </>
                )}
                {!sidebarOpen && !isLoggingOut && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Settings
                  </div>
                )}
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isLoggingOut 
                    ? 'bg-red-600/30 text-red-300 cursor-not-allowed' 
                    : 'hover:bg-red-600/20 text-slate-300 hover:text-red-400'
                }`}
              >
                {isLoggingOut ? (
                  <div className={`w-5 h-5 border-2 border-red-300 border-t-transparent rounded-full animate-spin ${
                    !sidebarOpen ? 'mx-auto' : ''
                  }`}></div>
                ) : (
                  <LogOut className={`w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors duration-200 ${
                    !sidebarOpen ? 'mx-auto' : ''
                  }`} />
                )}
                {sidebarOpen && (
                  <span className="ml-3 font-medium">
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </span>
                )}
                {!sidebarOpen && !isLoggingOut && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Logout
                  </div>
                )}
              </button>
            </div>
          </div>
        </nav>

        {sidebarOpen && (
          <div className="flex-shrink-0 p-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">MS</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">Meruscrap</p>
                  <p className="text-xs text-slate-400 truncate">v2.1.0</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;