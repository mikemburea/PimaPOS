// src/components/admin/UserManagement.tsx - Updated with First User Admin support
import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldCheck, Edit2, Save, X, AlertTriangle, UserPlus, Crown, Info, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PermissionService, UserRole } from '../../hooks/usePermissions';
import { withPermission } from '../../hooks/usePermissions';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type: UserRole;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  adminCount: number;
  regularUserCount: number;
  hasAdmin: boolean;
  firstAdminEmail?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    adminCount: 0,
    regularUserCount: 0,
    hasAdmin: false
  });

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching users for admin panel...');
      
      const usersData = await PermissionService.getAllUsersWithRoles();
      console.log('📋 Loaded', usersData.length, 'users');
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch system statistics
  const fetchSystemStats = async () => {
    try {
      console.log('📊 Fetching system statistics...');
      const stats = await PermissionService.getSystemStats();
      setSystemStats(stats);
      
      console.log('System Stats:', {
        totalUsers: stats.totalUsers,
        adminCount: stats.adminCount,
        hasAdmin: stats.hasAdmin,
        firstAdmin: stats.firstAdminEmail
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  useEffect(() => {
    const initializeUserManagement = async () => {
      await fetchUsers();
      await fetchSystemStats();
    };

    initializeUserManagement();
  }, []);

  // Update user role
  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      console.log('🔄 Updating user role:', userId, 'to', newRole);
      
      // Find the user being updated
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) {
        setError('User not found');
        return;
      }

      // Prevent removing the last admin
      if (targetUser.user_type === 'admin' && newRole === 'user') {
        const adminCount = users.filter(u => u.user_type === 'admin').length;
        if (adminCount <= 1) {
          setError('Cannot remove the last administrator. At least one admin must remain.');
          setEditingUser(null);
          return;
        }
      }

      // Special handling if this is the first admin being demoted
      if (targetUser.user_type === 'admin' && newRole === 'user' && systemStats.firstAdminEmail === targetUser.email) {
        const confirmMessage = `You are about to remove admin privileges from the first administrator (${targetUser.email}). This action cannot be undone automatically. Are you sure?`;
        if (!window.confirm(confirmMessage)) {
          setEditingUser(null);
          return;
        }
      }

      const success = await PermissionService.updateUserRole(userId, newRole);
      
      if (success) {
        setUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, user_type: newRole }
              : user
          )
        );
        
        // Update system stats
        await fetchSystemStats();
        
        const roleText = newRole === 'admin' ? 'Administrator' : 'User';
        setSuccessMessage(`${targetUser.full_name || targetUser.email} role updated to ${roleText}`);
        setEditingUser(null);
        
        console.log('✅ Role update successful:', userId, 'is now', newRole);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role: ' + (error as Error).message);
    }
  };

  // Clear error message
  const clearError = () => setError(null);

  // Refresh data
  const handleRefresh = async () => {
    await fetchUsers();
    await fetchSystemStats();
    setSuccessMessage('User data refreshed');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-600">Manage user roles and permissions</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <div className="text-sm text-gray-500">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* System Statistics */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center">
              <Crown className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{systemStats.adminCount}</p>
                <p className="text-sm text-gray-600">Administrators</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{systemStats.regularUserCount}</p>
                <p className="text-sm text-gray-600">Regular Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center">
              <Info className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {systemStats.hasAdmin ? 'System Ready' : 'No Admin'}
                </p>
                <p className="text-sm text-gray-600">
                  {systemStats.hasAdmin ? 'Admins present' : 'Create admin'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* First Admin Info */}
        {systemStats.firstAdminEmail && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center">
              <Crown className="w-4 h-4 text-purple-600 mr-2" />
              <div className="text-sm">
                <span className="font-medium text-purple-900">First Administrator:</span>
                <span className="text-purple-800 ml-2">{systemStats.firstAdminEmail}</span>
                <span className="text-purple-600 ml-2">(Created via First User Admin system)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Permission Info */}
      <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 mr-2" />
              <span className="font-medium text-purple-800">Administrator</span>
            </div>
            <ul className="text-blue-700 ml-6 space-y-1">
              <li>• Full system access and control</li>
              <li>• Manage all transactions and data</li>
              <li>• View all analytics and reports</li>
              <li>• Manage user accounts and roles</li>
              <li>• Configure system settings</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <Shield className="w-4 h-4 text-blue-600 mr-2" />
              <span className="font-medium text-blue-800">Regular User</span>
            </div>
            <ul className="text-blue-700 ml-6 space-y-1">
              <li>• View dashboard and basic info</li>
              <li>• Add and view suppliers</li>
              <li>• Add and view materials</li>
              <li>• Limited access to features</li>
              <li>• Cannot modify system settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Important Notes
        </h3>
        <div className="text-sm text-yellow-800 space-y-1">
          <p>• At least one administrator must exist at all times</p>
          <p>• Role changes take effect immediately</p>
          <p>• The first user automatically becomes an administrator</p>
          <p>• Removing admin privileges cannot be undone automatically</p>
        </div>
      </div>

      {/* Users List */}
      <div className="px-6 py-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">Email</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">Role</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">Joined</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const isFirstUser = index === users.length - 1 && users.length === 1; // First user is the only user
                const isFirstAdmin = user.email === systemStats.firstAdminEmail;
                
                return (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          user.user_type === 'admin' ? 'bg-purple-200' : 'bg-gray-200'
                        }`}>
                          <span className={`text-sm font-medium ${
                            user.user_type === 'admin' ? 'text-purple-700' : 'text-gray-700'
                          }`}>
                            {user.full_name 
                              ? user.full_name.charAt(0).toUpperCase()
                              : user.email?.charAt(0).toUpperCase() || 'U'
                            }
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">
                              {user.full_name || 'No name set'}
                            </p>
                            {isFirstAdmin && (
                              <div className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                First Admin
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">ID: {user.id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-gray-900">{user.email || 'No email'}</span>
                    </td>
                    <td className="py-3 px-2">
                      {editingUser === user.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            defaultValue={user.user_type}
                            onChange={(e) => handleRoleUpdate(user.id, e.target.value as UserRole)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="user">Regular User</option>
                            <option value="admin">Administrator</option>
                          </select>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.user_type === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.user_type === 'admin' ? (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            ) : (
                              <Shield className="w-3 h-3 mr-1" />
                            )}
                            {user.user_type === 'admin' ? 'Administrator' : 'User'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {editingUser === user.id ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Select role above</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isFirstAdmin && (
                            <div className="text-xs text-purple-600 font-medium">
                              First User
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Users will appear here when they sign up.</p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
              <div className="flex items-center">
                <Crown className="w-5 h-5 text-blue-600 mr-2" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900">First User Admin</p>
                  <p className="text-sm text-blue-700">The first person to register will automatically become an administrator.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Role changes take effect immediately
            </div>
            {systemStats.hasAdmin && (
              <div className="flex items-center text-sm text-green-600">
                <ShieldCheck className="w-4 h-4 mr-1" />
                System secured with admin oversight
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export component wrapped with admin permission check
export default withPermission(UserManagement, 'settings');