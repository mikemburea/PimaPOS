// src/hooks/useAuth.ts - Fixed version with proper profile creation
import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'user';

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
  userRole: UserRole
  isAdmin: boolean
}

export interface SignUpData {
  email: string
  password: string
  fullName: string
  phone: string
  userType?: UserRole
}

export interface SignInData {
  email: string
  password: string
}

export interface UserProfile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  user_type: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Enhanced Auth Service Class with First User Admin logic
export class AuthService {
  
  // Check if this would be the first user (before signup)
  static async isFirstUser(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error('Error checking user count:', error);
        return false;
      }

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error in isFirstUser:', error);
      return false;
    }
  }

  // Get current user stats
  static async getUserStats(): Promise<{
    totalUsers: number;
    adminCount: number;
    isFirstUser: boolean;
  }> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_type');

      if (error) {
        console.warn('Could not fetch user stats:', error);
        return { totalUsers: 0, adminCount: 0, isFirstUser: true };
      }

      const totalUsers = profiles?.length || 0;
      const adminCount = profiles?.filter(p => p.user_type === 'admin').length || 0;

      return {
        totalUsers,
        adminCount,
        isFirstUser: totalUsers === 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { totalUsers: 0, adminCount: 0, isFirstUser: true };
    }
  }

  // Enhanced sign up with first user admin logic
  static async signUp({ email, password, fullName, phone, userType }: SignUpData) {
    try {
      console.log('Starting signup process for:', email);
      
      // Check if this is the first user BEFORE creating the account
      const isFirst = await AuthService.isFirstUser();
      console.log('Is first user:', isFirst);

      // Determine role: first user becomes admin
      const assignedRole: UserRole = isFirst ? 'admin' : (userType || 'user');
      
      console.log('Assigned role:', assignedRole, isFirst ? '(First User - Auto Admin)' : '(Regular User)');

      // Create the Supabase auth user with metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            user_type: assignedRole,
            is_first_user: isFirst
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from signup');
      }

      console.log('Auth user created successfully:', data.user.id);

      // Wait a moment for any database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if profile was created by trigger
      let profile = await AuthService.getProfile(data.user.id);
      
      if (!profile) {
        console.log('Profile not created by trigger, creating manually...');
        
        // If no profile exists, create it manually
        // Use service role or authenticated user context
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              phone: phone,
              email: email,
              user_type: assignedRole,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw here - the auth user was created successfully
            // The user can still sign in and the profile might be created later
          } else {
            console.log('Profile created successfully');
            profile = await AuthService.getProfile(data.user.id);
          }
        } catch (profileErr) {
          console.error('Error creating profile:', profileErr);
        }
      } else {
        console.log('Profile already exists (created by trigger)');
        
        // Update the profile with the correct role if needed
        if (profile.user_type !== assignedRole) {
          await supabase
            .from('profiles')
            .update({ user_type: assignedRole })
            .eq('id', data.user.id);
        }
      }

      // Log admin creation
      if (assignedRole === 'admin') {
        console.log('🎉 Admin user created:', email, isFirst ? '(FIRST USER)' : '(EXPLICIT ADMIN)');
      } else {
        console.log('👤 Regular user created:', email);
      }

      return { 
        user: data.user, 
        session: data.session, 
        role: assignedRole,
        isFirstUser: isFirst
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Create or update user profile
  static async createUserProfile(userId: string, profileData: {
    full_name: string
    phone: string
    email: string
    user_type: UserRole
  }) {
    try {
      // Use upsert to handle both create and update cases
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      
      console.log('Profile created/updated successfully for:', profileData.email, 'Role:', profileData.user_type);
    } catch (error: any) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }

  // Enhanced sign in with email confirmation check
  static async signIn({ email, password }: SignInData) {
    try {
      console.log('Attempting sign in for:', email);
      
      // First attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // If email not confirmed, provide helpful message and try to resend
        if (error.message.includes('Email not confirmed')) {
          // Try to resend confirmation email
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email
          });
          
          if (!resendError) {
            throw new Error('Email not confirmed. A new confirmation email has been sent. Please check your inbox and click the confirmation link.');
          } else {
            throw new Error('Email not confirmed. Please check your inbox for the confirmation email or contact support.');
          }
        }
        throw error;
      }
      
      console.log('Sign in successful for:', email);
      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific error types
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error(error.message || 'Please confirm your email before signing in. Check your inbox for the confirmation link.');
      }
      
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Sign out user
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('User signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get user profile with role information
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Don't throw error if profile doesn't exist yet
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Profile not found for user:', userId);
          return null;
        }
        throw error;
      }
      
      return data as UserProfile;
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw new Error(error.message || 'Failed to get profile');
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: {
    full_name?: string
    phone?: string
    avatar_url?: string
    user_type?: UserRole
  }): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('Profile updated for user:', userId);
      return data as UserProfile;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  // Update user role (admin only)
  static async updateUserRole(userId: string, newRole: UserRole, adminUserId: string): Promise<boolean> {
    try {
      // First verify the admin has permission
      const adminProfile = await AuthService.getProfile(adminUserId);
      if (!adminProfile || adminProfile.user_type !== 'admin') {
        throw new Error('Insufficient permissions to update user roles');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          user_type: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      console.log('User role updated:', userId, 'to', newRole, 'by admin:', adminUserId);
      return true;
    } catch (error: any) {
      console.error('Error updating user role:', error);
      throw new Error(error.message || 'Failed to update user role');
    }
  }

  // Get all users with roles (admin only)
  static async getAllUsersWithRoles(adminUserId: string): Promise<UserProfile[]> {
    try {
      // First verify the admin has permission
      const adminProfile = await AuthService.getProfile(adminUserId);
      if (!adminProfile || adminProfile.user_type !== 'admin') {
        throw new Error('Insufficient permissions to view user list');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    } catch (error: any) {
      console.error('Error fetching users with roles:', error);
      throw new Error(error.message || 'Failed to fetch users');
    }
  }

  // Check user permissions
  static async getUserPermissions(userId: string): Promise<{
    role: UserRole;
    permissions: string[];
    isAdmin: boolean;
  }> {
    try {
      const profile = await AuthService.getProfile(userId);
      
      if (!profile) {
        return {
          role: 'user',
          permissions: ['dashboard', 'suppliers', 'materials'],
          isAdmin: false
        };
      }

      const role = profile.user_type || 'user';
      const isAdmin = role === 'admin';
      
      const permissions = isAdmin 
        ? ['dashboard', 'transactions', 'suppliers', 'materials', 'analytics', 'reports', 'settings']
        : ['dashboard', 'suppliers', 'materials'];

      return {
        role,
        permissions,
        isAdmin
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        role: 'user',
        permissions: ['dashboard', 'suppliers', 'materials'],
        isAdmin: false
      };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      return { message: 'Password reset email sent' };
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  // Resend confirmation email
  static async resendConfirmationEmail(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      return { message: 'Confirmation email resent successfully' };
    } catch (error: any) {
      console.error('Resend confirmation email error:', error);
      throw new Error(error.message || 'Failed to resend confirmation email');
    }
  }

  // Check if any admin exists (useful for debugging)
  static async hasAdminUsers(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'admin')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking admin users:', error);
      return false;
    }
  }

  // Get first admin user (for debugging)
  static async getFirstAdmin(): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) return null;
      return data as UserProfile;
    } catch (error) {
      console.error('Error getting first admin:', error);
      return null;
    }
  }
}

// Custom Hook for Authentication with Role Support and First User Admin
export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    profile: null,
    userRole: 'user',
    isAdmin: false
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Checking initial authentication state...');
        const user = await AuthService.getCurrentUser();
        
        let profile: UserProfile | null = null;
        let userRole: UserRole = 'user';
        let isAdmin = false;

        if (user) {
          try {
            profile = await AuthService.getProfile(user.id);
            if (profile) {
              userRole = profile.user_type || 'user';
              isAdmin = userRole === 'admin';
              console.log('User authenticated:', user.email, 'Role:', userRole, 'Admin:', isAdmin);
            } else {
              console.log('User authenticated but no profile found:', user.email);
            }
          } catch (error) {
            console.error('Error fetching profile during auth check:', error);
          }
        }
        
        setAuthState({
          user,
          session: null,
          loading: false,
          profile,
          userRole,
          isAdmin
        });
      } catch (error) {
        console.error('Error getting initial session:', error);
        setAuthState({
          user: null,
          session: null,
          loading: false,
          profile: null,
          userRole: 'user',
          isAdmin: false
        });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        let profile: UserProfile | null = null;
        let userRole: UserRole = 'user';
        let isAdmin = false;

        if (session?.user) {
          try {
            profile = await AuthService.getProfile(session.user.id);
            if (profile) {
              userRole = profile.user_type || 'user';
              isAdmin = userRole === 'admin';
              console.log('Profile loaded after auth change:', profile.email, 'Role:', userRole);
            }
          } catch (error) {
            console.error('Error fetching profile after auth change:', error);
          }
        }
        
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          profile,
          userRole,
          isAdmin
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return authState;
};

// Hook for checking specific permissions
export const usePermissions = () => {
  const authState = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false;

    const adminPermissions = ['dashboard', 'transactions', 'suppliers', 'materials', 'analytics', 'reports', 'settings'];
    const userPermissions = ['dashboard', 'suppliers', 'materials'];

    const allowedPermissions = authState.isAdmin ? adminPermissions : userPermissions;
    return allowedPermissions.includes(permission);
  };

  const canNavigateTo = (route: string): boolean => {
    const routePermissions: Record<string, string> = {
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

    const requiredPermission = routePermissions[route];
    if (!requiredPermission) return true; // Allow if no specific permission required

    return hasPermission(requiredPermission);
  };

  return {
    ...authState,
    hasPermission,
    canNavigateTo,
    permissions: authState.isAdmin 
      ? ['dashboard', 'transactions', 'suppliers', 'materials', 'analytics', 'reports', 'settings']
      : ['dashboard', 'suppliers', 'materials']
  };
};