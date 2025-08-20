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
      
      if (isLogin) {
        setIsAuthenticated(true);
      } else {
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
      icon: <Bluetooth className="w-4 h-4" />,
      title: "Bluetooth Integration",
      description: "Connect devices instantly",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: "Secure Management",
      description: "Role-based access control",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      title: "Smart Analytics",
      description: "Real-time data insights",
      color: "from-purple-500 to-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col 2xl:flex-row overflow-hidden">
      
      {/* Mobile & Tablet View (Default) - Smaller Elements */}
      <div className="2xl:hidden min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Mobile Header with Compact Branding */}
        <div className="px-4 sm:px-6 pt-6 pb-4">
          <div className="flex flex-col items-center">
            {/* Compact Logo and Brand */}
            <div className="flex items-center mb-2">
              <div className="w-12 h-12 rounded-xl shadow-lg flex items-center justify-center mr-3 bg-white overflow-hidden">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <div className="relative">
                    <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center shadow-inner">
                      <span className="text-blue-600 font-black text-sm">P</span>
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    Meru
                  </span>
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    Scrap
                  </span>
                </h1>
              </div>
            </div>
            {/* Compact Tagline */}
            <p className="text-sm sm:text-base text-center font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Smart Scrap Management System
            </p>
          </div>
        </div>

        {/* Mobile Form Container - Compact Card Design */}
        <div className="flex-1 bg-white rounded-t-3xl shadow-xl px-4 sm:px-6 py-6 sm:py-8">
          {/* Form Header - Compact Typography */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              {isLogin ? 'Access your dashboard' : 'Create your account'}
            </p>
          </div>

          {/* Mobile Form with Compact Spacing */}
          <div className="space-y-4 max-w-sm mx-auto">
            {!isLogin && (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-sm"
                    required={!isLogin}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-sm"
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-sm"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm Password"
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500 text-sm"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-xs text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </div>
            </button>
          </div>

          {/* Mobile Form Toggle - Compact Design */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isLogin ? "New to MeruScrap?" : "Already have an account?"}
            </p>
            <button
              onClick={toggleForm}
              className="mt-1 text-blue-600 hover:text-blue-700 font-bold text-sm hover:underline"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          {/* Compact Features Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6 mb-4">
            {features.map((feature, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-2 mx-auto`}>
                  {feature.icon}
                </div>
                <h3 className="text-xs font-bold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-xs text-gray-600 leading-tight">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Mobile Footer - Compact */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              © 2025 MeruScrap • Powered by <span className="font-semibold text-blue-600">Nesis</span>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View - Only for Very Large Screens (2xl+) */}
      <div className="hidden 2xl:flex w-full">
        {/* Left Side - Enhanced Branding Section */}
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
                      <span className="text-blue-600 font-black text-xl">P</span>
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
                    <Bluetooth className="w-6 h-6" />
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

        {/* Right Side - Desktop Form */}
        <div className="w-[400px] xl:w-[440px] bg-white shadow-xl flex flex-col justify-center px-8 xl:px-10 py-12 relative">
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

            {/* Desktop Form */}
            <div className="space-y-4">
              {!isLogin && (
                <>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Full Name"
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                      required={!isLogin}
                    />
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base"
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
                    <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm Password"
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base"
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

export default PimaPOSWelcome;