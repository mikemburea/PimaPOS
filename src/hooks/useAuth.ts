// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  profile: any | null
}

export interface SignUpData {
  email: string
  password: string
  fullName: string
  phone: string
}

export interface SignInData {
  email: string
  password: string
}

// Auth Service Class
export class AuthService {
  // Sign up new user
  static async signUp({ email, password, fullName, phone }: SignUpData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      })

      if (error) throw error
      return { user: data.user, session: data.session }
    } catch (error: any) {
      console.error('Sign up error:', error)
      throw new Error(error.message || 'Failed to create account')
    }
  }

  // Sign in existing user
  static async signIn({ email, password }: SignInData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return { user: data.user, session: data.session }
    } catch (error: any) {
      console.error('Sign in error:', error)
      
      // Handle specific error types
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password')
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link before signing in')
      }
      
      throw new Error(error.message || 'Failed to sign in')
    }
  }

  // Sign out user
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      console.error('Sign out error:', error)
      throw new Error(error.message || 'Failed to sign out')
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // Get user profile
  static async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Don't throw error if profile doesn't exist yet
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw error
      }
      return data
    } catch (error: any) {
      console.error('Get profile error:', error)
      throw new Error(error.message || 'Failed to get profile')
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: {
    full_name?: string
    phone?: string
    avatar_url?: string
  }) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Update profile error:', error)
      throw new Error(error.message || 'Failed to update profile')
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      return { message: 'Password reset email sent' }
    } catch (error: any) {
      console.error('Reset password error:', error)
      throw new Error(error.message || 'Failed to send reset email')
    }
  }
}

// Custom Hook for Authentication
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    profile: null
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const user = await AuthService.getCurrentUser()
        
        let profile = null
        if (user) {
          try {
            profile = await AuthService.getProfile(user.id)
          } catch (error) {
            console.error('Error fetching profile:', error)
          }
        }
        
        setAuthState({
          user,
          session: null,
          loading: false,
          profile
        })
      } catch (error) {
        console.error('Error getting initial session:', error)
        setAuthState({
          user: null,
          session: null,
          loading: false,
          profile: null
        })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        let profile = null
        if (session?.user) {
          try {
            profile = await AuthService.getProfile(session.user.id)
          } catch (error) {
            console.error('Error fetching profile after auth change:', error)
          }
        }
        
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          profile
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return authState
}