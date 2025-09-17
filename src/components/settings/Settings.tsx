// Enhanced Settings.tsx with complete CRUD operations for admin user management - FIXED RETURN PATHS
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Users, 
  Save, 
  Edit2, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Crown, 
  ShieldCheck,
  RefreshCw,
  Key,
  Smartphone,
  Building,
  Mail,
  Phone,
  UserCheck,
  UserX,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions, PermissionService, UserRole } from '../../hooks/usePermissions';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  user_type: UserRole;
  created_at: string;
  updated_at: string;
}

interface NewUserData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  user_type: UserRole;
}

interface AllUsersData {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  user_type: UserRole;
  created_at: string;
  updated_at: string;
}

const Settings: React.FC = () => {
  const { user, profile, isAdmin, loading: authLoading, refreshPermissions } = usePermissions();
  
  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    email: ''
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // User management state (for admins)
  const [allUsers, setAllUsers] = useState<AllUsersData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<Partial<AllUsersData>>({});
  const [newUserForm, setNewUserForm] = useState<NewUserData>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    user_type: 'user'
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // FIXED: Fetch user profile with proper return handling
  const fetchUserProfile = async (): Promise<void> => {
    if (!user?.id) {
      setProfileLoading(false);
      return; // Explicit return for early exit
    }

    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile information');
        return; // FIXED: Added explicit return
      }

      setUserProfile(data);
      setProfileForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || ''
      });
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      setError('Failed to load profile information');
    } finally {
      setProfileLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // FIXED: Fetch all users with proper return handling
  const fetchAllUsers = async (): Promise<void> => {
    if (!isAdmin) {
      console.log('Not admin, skipping user fetch');
      return; // Explicit return for early exit
    }

    try {
      setUsersLoading(true);
      setError(null);
      
      console.log('Fetching all users...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, user_type, created_at, updated_at')
        .order('created_at', { ascending: false });

      console.log('Users fetch result:', { data, error });

      if (error) {
        console.error('Error fetching users:', error);
        setError(`Failed to load users: ${error.message}`);
        return; // FIXED: Added explicit return
      }

      if (!data) {
        console.log('No data returned from users query');
        setAllUsers([]);
        return; // FIXED: Added explicit return
      }

      console.log(`Successfully fetched ${data.length} users:`, data);
      setAllUsers(data);
      
    } catch (err) {
      console.error('Error in fetchAllUsers:', err);
      setError('Failed to load users due to network error');
    } finally {
      setUsersLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // FIXED: Update user profile with proper return handling
  const handleUpdateProfile = async (): Promise<void> => {
    if (!user?.id) {
      return; // Explicit return for early exit
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        setError('Failed to update profile: ' + error.message);
        return; // FIXED: Added explicit return
      }

      await fetchUserProfile();
      await refreshPermissions();
      setSuccess('Profile updated successfully');
      setProfileEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // FIXED: Update other user's profile with proper return handling
  const handleUpdateUser = async (userId: string): Promise<void> => {
    if (!isAdmin || !editUserForm) {
      return; // Explicit return for early exit
    }

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        full_name: editUserForm.full_name?.trim(),
        phone: editUserForm.phone?.trim(),
        email: editUserForm.email?.trim(),
        user_type: editUserForm.user_type,
        updated_at: new Date().toISOString()
      };

      console.log('Updating user:', userId, updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Update user error:', error);
        setError('Failed to update user: ' + error.message);
        return; // FIXED: Added explicit return
      }

      console.log('User updated successfully');
      await fetchAllUsers(); // Refresh the users list
      setSuccess('User updated successfully');
      setEditingUser(null);
      setEditUserForm({});
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // FIXED: Delete user with proper return handling
  const handleDeleteUser = async (userId: string): Promise<void> => {
    if (!isAdmin || userId === user?.id) {
      return; // Explicit return for early exit
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Deleting user:', userId);

      // Delete from auth (this will cascade to profiles due to foreign key constraint)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Delete user auth error:', authError);
        setError('Failed to delete user: ' + authError.message);
        return; // FIXED: Added explicit return
      }

      console.log('User deleted successfully');
      await fetchAllUsers(); // Refresh the users list
      setSuccess('User deleted successfully');
      setConfirmDelete(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // FIXED: Change password with proper return handling
  const handleChangePassword = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        return; // FIXED: Added explicit return
      }

      if (passwordForm.newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return; // FIXED: Added explicit return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        setError('Failed to change password: ' + error.message);
        return; // FIXED: Added explicit return
      }

      setSuccess('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // FIXED: Add new user with proper return handling
  const handleAddUser = async (): Promise<void> => {
    if (!isAdmin) {
      return; // Explicit return for early exit
    }

    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!newUserForm.email.trim() || !newUserForm.password.trim() || !newUserForm.full_name.trim()) {
        setError('Please fill in all required fields');
        return; // FIXED: Added explicit return
      }

      if (newUserForm.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return; // FIXED: Added explicit return
      }

      console.log('Creating new user:', {
        email: newUserForm.email.trim(),
        full_name: newUserForm.full_name.trim(),
        user_type: newUserForm.user_type
      });

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', newUserForm.email.trim().toLowerCase())
        .single();

      if (existingUser) {
        setError('A user with this email already exists');
        return; // FIXED: Added explicit return
      }

      // Create user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.admin.createUser({
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        email_confirm: true,
        user_metadata: {
          full_name: newUserForm.full_name.trim(),
          phone: newUserForm.phone.trim(),
          user_type: newUserForm.user_type
        }
      });

      if (signUpError) {
        console.error('Auth user creation error:', signUpError);
        setError('Failed to create user: ' + signUpError.message);
        return; // FIXED: Added explicit return
      }

      if (!data.user) {
        setError('Failed to create user - no user data returned');
        return; // FIXED: Added explicit return
      }

      console.log('Auth user created:', data.user.id);

      // Create profile record
      const profileData = {
        id: data.user.id,
        full_name: newUserForm.full_name.trim(),
        phone: newUserForm.phone.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        user_type: newUserForm.user_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating profile:', profileData);

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError('User created but profile setup failed. Please contact support.');
        return; // FIXED: Added explicit return
      }

      console.log('Profile created successfully');

      // Refresh users list
      await fetchAllUsers();
      
      setSuccess(`User ${newUserForm.full_name} created successfully`);
      setNewUserForm({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        user_type: 'user'
      });
      setShowAddUser(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
    
    return; // FIXED: Ensure all paths return
  };

  // Load profile on mount and when admin status changes
  useEffect(() => {
    console.log('Settings useEffect triggered:', { user: !!user, isAdmin, authLoading });
    
    if (user && !authLoading) {
      fetchUserProfile();
    }
  }, [user, authLoading]);

  // Separate effect for admin user loading
  useEffect(() => {
    console.log('Admin users useEffect triggered:', { isAdmin, user: !!user, authLoading });
    
    if (isAdmin && user && !authLoading) {
      console.log('Fetching users as admin...');
      fetchAllUsers();
    }
  }, [isAdmin, user, authLoading]);

 // Clear messages after time
useEffect(() => {
  if (!error) return; // Early return when no error

  const timer = setTimeout(() => setError(null), 5000);
  return () => clearTimeout(timer);
}, [error]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    ...(isAdmin ? [{ id: 'users', label: 'User Management', icon: Users }] : [])
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Building className="w-4 h-4" />
            <span>Meru Scrap Metal Market</span>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Information - Same as original */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {userProfile?.full_name || 'No name set'}
                      </h4>
                      {userProfile?.user_type === 'admin' && (
                        <Crown className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{userProfile?.email}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        userProfile?.user_type === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userProfile?.user_type === 'admin' ? (
                          <ShieldCheck className="w-3 h-3 mr-1" />
                        ) : (
                          <Shield className="w-3 h-3 mr-1" />
                        )}
                        {userProfile?.user_type === 'admin' ? 'Administrator' : 'User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Joined {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setProfileEditing(!profileEditing)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile editing form - Same as original */}
              {profileEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                        loading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setProfileEditing(false);
                        setProfileForm({
                          full_name: userProfile?.full_name || '',
                          phone: userProfile?.phone || '',
                          email: userProfile?.email || ''
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {userProfile?.full_name || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {userProfile?.phone || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {userProfile?.email || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {userProfile?.user_type === 'admin' ? 'Administrator' : 'User'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password - Same as original */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
              <p className="text-sm text-gray-600 mb-6">Update your account password for better security</p>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                    loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Update Password
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication - Same as original */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Smartphone className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Two-Factor Authentication</p>
                    <p className="text-sm text-yellow-600">This feature is coming soon. We're working on implementing SMS and authenticator app support.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            {/* Add User Section */}
            <div className="border-b pb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
                  <p className="text-sm text-gray-600">Create a new user account for your organization</p>
                </div>
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </button>
              </div>

              {showAddUser && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={newUserForm.full_name}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newUserForm.phone}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User Type *</label>
                      <select
                        value={newUserForm.user_type}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, user_type: e.target.value as UserRole }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <input
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter password (min 6 characters)"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleAddUser}
                      disabled={loading || !newUserForm.email || !newUserForm.password || !newUserForm.full_name}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                        loading || !newUserForm.email || !newUserForm.password || !newUserForm.full_name
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create User
                    </button>
                    <button
                      onClick={() => {
                        setShowAddUser(false);
                        setNewUserForm({
                          email: '',
                          password: '',
                          full_name: '',
                          phone: '',
                          user_type: 'user'
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Users List with CRUD Operations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-500">
                    {allUsers.length} user{allUsers.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={() => {
                    console.log('Manual refresh triggered');
                    fetchAllUsers();
                  }}
                  disabled={usersLoading}
                  className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Debug Info (remove in production) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <strong>Debug Info:</strong> isAdmin: {String(isAdmin)}, usersLoading: {String(usersLoading)}, 
                  allUsers.length: {allUsers.length}, user.id: {user?.id}
                </div>
              )}

              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin mr-3" />
                  <span className="text-gray-600">Loading users...</span>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                  <p className="text-gray-500 mb-4">
                    There are no users in the system, or there was an error loading them.
                  </p>
                  <button
                    onClick={fetchAllUsers}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allUsers.map((userData) => (
                        <tr key={userData.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === userData.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editUserForm.full_name || ''}
                                  onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Full name"
                                />
                                <input
                                  type="email"
                                  value={editUserForm.email || ''}
                                  onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Email address"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-medium text-gray-900">
                                      {userData.full_name || 'No name set'}
                                    </div>
                                    {userData.user_type === 'admin' && (
                                      <Crown className="w-3 h-3 text-purple-600" />
                                    )}
                                    {userData.id === user?.id && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{userData.email}</div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === userData.id ? (
                              <input
                                type="tel"
                                value={editUserForm.phone || ''}
                                onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Phone number"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">
                                {userData.phone || 'No phone'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === userData.id ? (
                              <select
                                value={editUserForm.user_type || userData.user_type}
                                onChange={(e) => setEditUserForm(prev => ({ ...prev, user_type: e.target.value as UserRole }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                userData.user_type === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {userData.user_type === 'admin' ? (
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                ) : (
                                  <Shield className="w-3 h-3 mr-1" />
                                )}
                                {userData.user_type === 'admin' ? 'Admin' : 'User'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(userData.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {editingUser === userData.id ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateUser(userData.id)}
                                    disabled={loading}
                                    className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                                    title="Save changes"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUser(null);
                                      setEditUserForm({});
                                    }}
                                    className="text-gray-600 hover:text-gray-900"
                                    title="Cancel editing"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUser(userData.id);
                                      setEditUserForm({
                                        ...userData,
                                        full_name: userData.full_name || '',
                                        phone: userData.phone || '',
                                        email: userData.email || ''
                                      });
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit user"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {userData.id !== user?.id && (
                                    <button
                                      onClick={() => setConfirmDelete(userData.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Delete user"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete User</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleDeleteUser(confirmDelete)}
                    disabled={loading}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                      loading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Delete User'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;