import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Sparkles, Shield, Zap, ArrowRight, Bluetooth, BarChart3 } from 'lucide-react';
// Import your App component
import App from './App';

interface FormData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  confirmPassword: string;
}

const PimaPOSWelcome: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    if (!formData.email || !formData.password) {
      alert('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    if (!isLogin) {
      if (!formData.fullName || !formData.phone) {
        alert('Please fill in all required fields');
        setIsLoading(false);
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        setIsLoading(false);
        return;
      }
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Form submitted:', formData);
      
      // Simulate successful authentication and redirect to App
      if (isLogin) {
        setIsAuthenticated(true); // This triggers navigation to App
      } else {
        // For signup, show success message and switch to login
        alert('Account created successfully! Please sign in.');
        setIsLogin(true);
        setFormData({
          email: '',
          password: '',
          fullName: '',
          phone: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      confirmPassword: ''
    });
  };

  // ⭐ THIS IS WHERE NAVIGATION HAPPENS ⭐
  // If authenticated, render the App component instead of the login form
  if (isAuthenticated) {
    return <App />;
  }

  const features = [
    {
      icon: <Bluetooth className="w-6 h-6 lg:w-7 lg:h-7" />,
      title: "Bluetooth Integration",
      description: "Connect scales & printers instantly",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-6 h-6 lg:w-7 lg:h-7" />,
      title: "Secure Management",
      description: "Role-based access control",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart3 className="w-6 h-6 lg:w-7 lg:h-7" />,
      title: "Smart Analytics",
      description: "Real-time data insights",
      color: "from-purple-500 to-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col lg:flex-row overflow-hidden">
      
      {/* Mobile & Tablet View - Professional and Clean */}
      <div className="lg:hidden min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Mobile Header with Enhanced Branding */}
        <div className="px-6 sm:px-8 pt-10 pb-8">
          <div className="flex flex-col items-center">
            {/* Logo and Brand Name */}
            <div className="flex items-center mb-3">
              <div className="w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center mr-4 bg-white overflow-hidden">
                <div className="w-13 h-13 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <div className="relative">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-inner">
                      <span className="text-blue-600 font-black text-lg">P</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    Meru
                  </span>
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    Scrap
                  </span>
                </h1>
              </div>
            </div>
            {/* Professional Tagline */}
            <p className="text-base sm:text-lg text-center font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Smart Scrap Management System
            </p>
          </div>
        </div>

        {/* Mobile Form Container - Professional Card Design */}
        <div className="flex-1 bg-white rounded-t-[2.5rem] shadow-2xl px-6 sm:px-8 py-8 sm:py-10">
          {/* Form Header - Enhanced Typography */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              {isLogin ? 'Access your dashboard' : 'Create your account in seconds'}
            </p>
          </div>

          {/* Mobile Form with Better Spacing */}
          <div className="space-y-5 max-w-md mx-auto">
            {!isLogin && (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Full Name"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-base"
                    required={!isLogin}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-base"
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-base"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-base"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-base"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2.5 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </div>
            </button>
          </div>

          {/* Mobile Form Toggle - Clean Design */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-base">
              {isLogin ? "New to MeruScrap?" : "Already have an account?"}
            </p>
            <button
              onClick={toggleForm}
              className="mt-2 text-blue-600 hover:text-blue-700 font-bold text-base hover:underline"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          {/* Mobile Footer - Professional */}
          <div className="mt-10 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              © 2025 MeruScrap • Powered by <span className="font-semibold text-blue-600">Nesis</span>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View - Enhanced Professional Layout */}
      <div className="hidden lg:flex w-full">
        {/* Left Side - Enhanced Branding Section */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 xl:px-16 py-12 relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          {/* Animated background elements */}
          <div className="absolute top-20 left-20 w-24 h-24 bg-blue-300 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-20 h-20 bg-purple-300 rounded-full opacity-20 animate-pulse delay-700"></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-green-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 right-1/4 w-14 h-14 bg-pink-300 rounded-full opacity-15 animate-pulse delay-500"></div>

          <div className="text-center max-w-5xl w-full">
            {/* Enhanced Logo Section */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-10">
                <div className="w-24 h-24 rounded-3xl shadow-2xl flex items-center justify-center relative group mr-8 bg-white overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-2xl blur opacity-30"></div>
                    <div className="relative">
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-inner">
                        <span className="text-blue-600 font-black text-3xl">P</span>
                      </div>
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-7xl xl:text-8xl font-black mb-3">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                      Meru
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                      Scrap
                    </span>
                  </h1>
                  <p className="text-3xl text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold">
                    Smart Scrap Management System
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Hero Section */}
            <div className="mb-14">
              <h2 className="text-5xl xl:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Streamline Your
                <br />
                <span className="text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text">
                  Scrap Yard Operations
                </span>
              </h2>
              <p className="text-2xl xl:text-3xl text-gray-700 mb-10 font-medium">
                Turn Scrap into Profit – Seamlessly
              </p>
              
              <div className="flex flex-wrap justify-center gap-6 mb-10">
                <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-8 py-4 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Shield className="w-7 h-7 text-blue-500" />
                  <span className="text-xl font-semibold text-gray-800">Secure</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-8 py-4 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Zap className="w-7 h-7 text-green-500" />
                  <span className="text-xl font-semibold text-gray-800">Fast</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-8 py-4 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Sparkles className="w-7 h-7 text-purple-500" />
                  <span className="text-xl font-semibold text-gray-800">Reliable</span>
                </div>
              </div>
            </div>

            {/* Enhanced Features Grid */}
            <div className="grid grid-cols-3 gap-8 mb-10">
              {features.map((feature, index) => (
                <div key={index} className="group p-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-5 shadow-lg mx-auto transform group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-base text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Enhanced Testimonial */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl max-w-2xl mx-auto">
              <div className="flex justify-center space-x-1.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                ))}
              </div>
              <p className="text-lg text-gray-800 italic mb-5 leading-relaxed text-center font-medium">
                "MeruScrap transformed our operations completely. The efficiency gains are remarkable."
              </p>
              <div className="text-center text-base text-gray-600 space-y-1">
                <p>© 2025 MeruScrap. All rights reserved.</p>
                <p>Powered by <span className="font-bold text-blue-600">Nesis</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Professional Form */}
        <div className="w-[460px] xl:w-[500px] bg-white shadow-2xl flex flex-col justify-center px-10 xl:px-12 py-12 relative">
          {/* Subtle decorative elements */}
          <div className="absolute top-6 right-6 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-40"></div>
          <div className="absolute bottom-6 left-6 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-40"></div>

          <div className="max-w-md mx-auto w-full">
            {/* Enhanced Form Header */}
            <div className="text-center mb-10">
              <div className="flex items-center justify-center space-x-3 mb-4">
                {isLogin ? (
                  <Shield className="w-8 h-8 text-blue-500" />
                ) : (
                  <Sparkles className="w-8 h-8 text-green-500" />
                )}
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-gray-600 text-lg">
                {isLogin ? 'Sign in to access your dashboard' : 'Create your account in seconds'}
              </p>
            </div>

            {/* Enhanced Desktop Form */}
            <div className="space-y-5">
              {!isLogin && (
                <>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base"
                      required={!isLogin}
                    />
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email Address"
                  className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className="w-full pl-12 pr-14 py-4.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>

              {!isLogin && (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm Password"
                    className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
                    required={!isLogin}
                  />
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                    />
                    <span className="ml-3 text-base text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-base text-blue-600 hover:text-blue-700 transition-colors font-semibold">
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4.5 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 shadow-xl hover:shadow-2xl relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-lg mt-2"
              >
                <div className="relative flex items-center justify-center space-x-3">
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </button>
            </div>

            {/* Enhanced Form Toggle */}
            <div className="mt-10 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-gray-600 text-lg">
                    {isLogin ? "New to MeruScrap?" : "Already have an account?"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleForm}
                className="mt-4 text-blue-600 hover:text-blue-700 font-bold transition-colors text-lg hover:underline underline-offset-4"
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

export default PimaPOSWelcome;