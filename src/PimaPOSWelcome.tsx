import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Sparkles, Shield, Zap, ArrowRight, Bluetooth, BarChart3, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabase';

interface FormData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  confirmPassword: string;
}

interface AuthError {
  message: string;
  field?: string;
}

interface StandalonePimaPOSWelcomeProps {
  onAuthSuccess?: () => void;
  onNavigateToApp?: () => void;
}

const StandalonePimaPOSWelcome: React.FC<StandalonePimaPOSWelcomeProps> = ({ 
  onAuthSuccess, 
  onNavigateToApp 
}) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    confirmPassword: ''
  });

  // Handle successful authentication
  const handleAuthenticationSuccess = () => {
    setIsAuthenticated(true);
    
    // Call the provided callback
    if (onAuthSuccess) {
      onAuthSuccess();
    }
    
    // If no callback provided, navigate to app
    if (onNavigateToApp) {
      onNavigateToApp();
    }
  };

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setFormData(prev => ({ ...prev, email: user.email || '' }));
          handleAuthenticationSuccess();
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleAuthenticationSuccess();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateForm = (): AuthError | null => {
    if (!formData.email || !formData.password) {
      return { message: 'Please fill in all required fields' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { message: 'Please enter a valid email address', field: 'email' };
    }

    if (formData.password.length < 6) {
      return { message: 'Password must be at least 6 characters long', field: 'password' };
    }
    
    if (!isLogin) {
      if (!formData.fullName.trim()) {
        return { message: 'Full name is required', field: 'fullName' };
      }
      
      if (!formData.phone.trim()) {
        return { message: 'Phone number is required', field: 'phone' };
      }

      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        return { message: 'Please enter a valid phone number', field: 'phone' };
      }
      
      if (formData.password !== formData.confirmPassword) {
        return { message: 'Passwords do not match', field: 'confirmPassword' };
      }
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific errors when user starts typing
    if (authError?.field === name) {
      setAuthError(null);
    }
  };

  const handleSubmit = async () => {
    setAuthError(null);
    const validationError = validateForm();
    
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Real Supabase login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        
        if (error) throw error;
        
        if (data.user) {
          handleAuthenticationSuccess();
        }
        
      } else {
        // Real Supabase signup
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone
            }
          }
        });
        
        if (error) throw error;
        
        // Also insert into profiles table if user is created
        if (data.user) {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                full_name: formData.fullName,
                phone: formData.phone,
                email: formData.email
              });
            
            if (profileError) {
              console.warn('Profile creation error:', profileError);
              // Don't throw here, as the user account was still created
            }
          } catch (profileError) {
            console.warn('Profile creation failed:', profileError);
          }
        }
        
        setAuthError({ 
          message: 'Account created successfully! Please check your email to verify your account, then sign in.' 
        });
        setIsLogin(true);
        setFormData({
          email: formData.email, // Keep email for convenience
          password: '',
          fullName: '',
          phone: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setAuthError({
        message: error.message || 'Authentication failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setAuthError(null);
    setFormData({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      confirmPassword: ''
    });
  };

  // Loading screen while checking authentication
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
          <p className="text-gray-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Authentication successful!</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: <Bluetooth className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Bluetooth Integration",
      description: "Connect devices instantly",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Secure Management",
      description: "Role-based access control",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Smart Analytics",
      description: "Real-time data insights",
      color: "from-purple-500 to-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col lg:flex-row overflow-hidden">
      
      {/* Mobile & Tablet View (up to lg breakpoint) */}
      <div className="lg:hidden min-h-screen flex flex-col relative overflow-hidden">
        {/* Enhanced gradient background with subtle patterns */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-16 h-16 bg-pink-200 rounded-full opacity-15 animate-pulse delay-500"></div>
        
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Mobile/Tablet Header */}
          <div className="px-4 sm:px-6 md:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
            <div className="flex flex-col items-center">
              {/* Logo Design */}
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl shadow-2xl flex items-center justify-center mr-4 bg-white/95 backdrop-blur-sm overflow-hidden border border-white/20">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-xl blur opacity-30"></div>
                    <div className="relative">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white rounded-lg flex items-center justify-center shadow-inner">
                        <span className="text-blue-600 font-black text-base sm:text-lg md:text-xl">M</span>
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse shadow-lg"></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                      Meru
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                      Scrap
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-1">
                    Smart Scrap Management
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-t-[2rem] sm:rounded-t-[2.5rem] shadow-2xl mx-2 sm:mx-4 md:mx-6 border-t border-white/30">
            {/* Accent line */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-[2rem] sm:rounded-t-[2.5rem]"></div>
            
            <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 md:py-10">
              {/* Form Header */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    {isLogin ? (
                      <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                    ) : (
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                    )}
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {isLogin ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium">
                  {isLogin ? 'Sign in to access your dashboard' : 'Create your account and join us'}
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm font-medium">{authError.message}</p>
                </div>
              )}

              {/* Form */}
              <div className="space-y-4 sm:space-y-5 max-w-sm sm:max-w-md md:max-w-lg mx-auto">
                {!isLogin && (
                  <>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className={`h-5 w-5 transition-colors ${authError?.field === 'fullName' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                      </div>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className={`w-full pl-12 pr-4 py-4 md:py-5 bg-gray-50/80 backdrop-blur-sm border rounded-xl focus:ring-2 focus:border-blue-500 focus:bg-white/90 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500 text-base md:text-lg font-medium shadow-sm hover:shadow-md ${authError?.field === 'fullName' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200/50 focus:ring-blue-500'}`}
                        required={!isLogin}
                      />
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className={`h-5 w-5 transition-colors ${authError?.field === 'phone' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Phone Number"
                        className={`w-full pl-12 pr-4 py-4 md:py-5 bg-gray-50/80 backdrop-blur-sm border rounded-xl focus:ring-2 focus:border-blue-500 focus:bg-white/90 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500 text-base md:text-lg font-medium shadow-sm hover:shadow-md ${authError?.field === 'phone' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200/50 focus:ring-blue-500'}`}
                        required={!isLogin}
                      />
                    </div>
                  </>
                )}

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className={`h-5 w-5 transition-colors ${authError?.field === 'email' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email Address"
                    className={`w-full pl-12 pr-4 py-4 md:py-5 bg-gray-50/80 backdrop-blur-sm border rounded-xl focus:ring-2 focus:border-blue-500 focus:bg-white/90 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500 text-base md:text-lg font-medium shadow-sm hover:shadow-md ${authError?.field === 'email' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200/50 focus:ring-blue-500'}`}
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors ${authError?.field === 'password' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    className={`w-full pl-12 pr-12 py-4 md:py-5 bg-gray-50/80 backdrop-blur-sm border rounded-xl focus:ring-2 focus:border-blue-500 focus:bg-white/90 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500 text-base md:text-lg font-medium shadow-sm hover:shadow-md ${authError?.field === 'password' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200/50 focus:ring-blue-500'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center group"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>

                {!isLogin && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className={`h-5 w-5 transition-colors ${authError?.field === 'confirmPassword' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm Password"
                      className={`w-full pl-12 pr-4 py-4 md:py-5 bg-gray-50/80 backdrop-blur-sm border rounded-xl focus:ring-2 focus:border-blue-500 focus:bg-white/90 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500 text-base md:text-lg font-medium shadow-sm hover:shadow-md ${authError?.field === 'confirmPassword' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200/50 focus:ring-blue-500'}`}
                      required={!isLogin}
                    />
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all"
                      />
                      <span className="ml-3 text-sm md:text-base text-gray-600 group-hover:text-gray-800 transition-colors font-medium">Remember me</span>
                    </label>
                    <a href="#" className="text-sm md:text-base text-blue-600 hover:text-blue-700 font-semibold transition-colors hover:underline">
                      Forgot password?
                    </a>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white py-4 md:py-5 px-6 rounded-xl font-semibold text-base md:text-lg hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center space-x-3">
                    <span>{isLogin ? 'Sign In to Dashboard' : 'Create Your Account'}</span>
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </button>
              </div>

              {/* Form Toggle */}
              <div className="mt-8 sm:mt-10 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300/50"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white/95 text-gray-600 text-base md:text-lg font-medium">
                      {isLogin ? "New to MeruScrap?" : "Already have an account?"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={toggleForm}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-bold text-base md:text-lg transition-colors hover:underline underline-offset-4 relative group"
                >
                  <span className="relative z-10">
                    {isLogin ? 'Create your account →' : '← Back to sign in'}
                  </span>
                </button>
              </div>

              {/* Footer */}
              <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200/50 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-gray-500 font-medium">
                  © 2025 MeruScrap • Powered by <span className="font-bold text-blue-600">Nesis</span>
                </p>
                <p className="text-xs md:text-sm text-gray-400 mt-1">Secure • Reliable • Professional</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View - Large screens (lg+) */}
      <div className="hidden lg:flex w-full">
        {/* Left Side - Branding Section */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 xl:px-16 py-12 relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          {/* Animated background elements */}
          <div className="absolute top-20 left-20 w-20 h-20 bg-blue-300 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-16 h-16 bg-purple-300 rounded-full opacity-20 animate-pulse delay-700"></div>
          <div className="absolute top-1/2 left-10 w-12 h-12 bg-green-300 rounded-full opacity-20 animate-pulse delay-1000"></div>

          <div className="text-center max-w-4xl w-full">
            {/* Logo Section */}
            <div className="mb-10">
              <div className="flex items-center justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl shadow-xl flex items-center justify-center relative group mr-6 bg-white overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center relative">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-inner">
                      <span className="text-blue-600 font-black text-xl">M</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-5xl xl:text-6xl font-black mb-2">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                      Meru
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                      Scrap
                    </span>
                  </h1>
                  <p className="text-2xl text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold">
                    Smart Scrap Management System
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div className="mb-12">
              <h2 className="text-4xl xl:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Streamline Your
                <br />
                <span className="text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text">
                  Scrap Yard Operations
                </span>
              </h2>
              <p className="text-xl xl:text-2xl text-gray-700 mb-8 font-medium">
                Turn Scrap into Profit – Seamlessly
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="text-lg font-semibold text-gray-800">Secure</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Zap className="w-5 h-5 text-green-500" />
                  <span className="text-lg font-semibold text-gray-800">Fast</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <span className="text-lg font-semibold text-gray-800">Reliable</span>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="group p-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 shadow-lg mx-auto transform group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg max-w-xl mx-auto">
              <div className="text-center text-sm text-gray-600 space-y-1">
                <p>© 2025 MeruScrap. All rights reserved.</p>
                <p>Powered by <span className="font-bold text-blue-600">Nesis</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Desktop Form (smaller width for better proportions) */}
        <div className="w-[380px] xl:w-[420px] bg-white shadow-xl flex flex-col justify-center px-8 xl:px-10 py-12 relative">
          <div className="max-w-md mx-auto w-full">
            {/* Form Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-3">
                {isLogin ? (
                  <Shield className="w-6 h-6 text-blue-500" />
                ) : (
                  <Sparkles className="w-6 h-6 text-green-500" />
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-gray-600 text-base">
                {isLogin ? 'Sign in to access your dashboard' : 'Create your account'}
              </p>
            </div>

            {/* Error Alert */}
            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm font-medium">{authError.message}</p>
              </div>
            )}

            {/* Desktop Form */}
            <div className="space-y-4">
              {!isLogin && (
                <>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className={`h-4 w-4 transition-colors ${authError?.field === 'fullName' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    </div>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Full Name"
                      className={`w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${authError?.field === 'fullName' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
                      required={!isLogin}
                    />
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className={`h-4 w-4 transition-colors ${authError?.field === 'phone' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                      className={`w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${authError?.field === 'phone' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 transition-colors ${authError?.field === 'email' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email Address"
                  className={`w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base ${authError?.field === 'email' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 transition-colors ${authError?.field === 'password' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base ${authError?.field === 'password' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>

              {!isLogin && (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-4 w-4 transition-colors ${authError?.field === 'confirmPassword' ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm Password"
                    className={`w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base ${authError?.field === 'confirmPassword' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    required={!isLogin}
                  />
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                    />
                    <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-semibold">
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-base mt-2"
              >
                <div className="relative flex items-center justify-center space-x-2">
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </button>
            </div>

            {/* Form Toggle */}
            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-gray-600 text-base">
                    {isLogin ? "New to MeruScrap?" : "Already have an account?"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleForm}
                className="mt-3 text-blue-600 hover:text-blue-700 font-bold transition-colors text-base hover:underline underline-offset-4"
              >
                {isLogin ? 'Create your account →' : '← Back to sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandalonePimaPOSWelcome;