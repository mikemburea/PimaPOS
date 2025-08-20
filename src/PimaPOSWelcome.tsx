import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Sparkles, Shield, Zap, ArrowRight, Bluetooth, BarChart3 } from 'lucide-react';

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

  // Simulate navigation to main app
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to MeruScrap!</h2>
          <p className="text-gray-600 mb-6">You have successfully logged in. The main app would load here.</p>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: <Bluetooth className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />,
      title: "Bluetooth Integration",
      description: "Connect scales & printers instantly",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />,
      title: "Secure Management",
      description: "Role-based access control",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />,
      title: "Smart Analytics",
      description: "Real-time data insights",
      color: "from-purple-500 to-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      
      {/* Mobile-First Layout */}
      <div className="lg:flex lg:min-h-screen">
        
        {/* Brand Section - Mobile: Full width, Desktop: Left side */}
        <div className="relative px-4 py-8 sm:px-6 sm:py-12 md:px-8 lg:flex-1 lg:flex lg:flex-col lg:justify-center lg:items-center lg:px-12 xl:px-16">
          
          {/* Animated Background Elements */}
          <div className="absolute top-4 left-4 w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-blue-300 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-4 right-4 w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 bg-purple-300 rounded-full opacity-20 animate-pulse delay-700"></div>
          <div className="absolute top-1/2 left-2 w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 right-1/4 w-6 h-6 sm:w-10 sm:h-10 lg:w-14 lg:h-14 bg-pink-300 rounded-full opacity-15 animate-pulse delay-500"></div>

          <div className="relative z-10 text-center max-w-5xl w-full">
            
            {/* Logo and Brand */}
            <div className="flex flex-col items-center mb-6 sm:mb-8 lg:mb-10">
              <div className="flex items-center justify-center mb-4 lg:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl lg:rounded-2xl shadow-xl flex items-center justify-center mr-3 sm:mr-4 lg:mr-6 bg-white overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-15 md:h-15 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl lg:rounded-xl flex items-center justify-center relative">
                    <div className="relative">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-white rounded-md sm:rounded-lg lg:rounded-lg flex items-center justify-center shadow-inner">
                        <span className="text-blue-600 font-black text-sm sm:text-lg md:text-xl lg:text-2xl">P</span>
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 lg:-top-1 lg:-right-1 w-2 h-2 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-black">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                      Meru
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                      Scrap
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-xl text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold mt-1">
                    Smart Scrap Management System
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Content - Hidden on mobile, shown on larger screens */}
            <div className="hidden md:block lg:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-4xl font-bold text-gray-900 mb-4 lg:mb-6 leading-tight">
                Streamline Your
                <br />
                <span className="text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text">
                  Scrap Yard Operations
                </span>
              </h2>
              <p className="text-lg md:text-xl lg:text-xl xl:text-xl text-gray-700 mb-6 lg:mb-8 font-medium">
                Turn Scrap into Profit – Seamlessly
              </p>
              
              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 lg:gap-5 mb-6 lg:mb-8">
                <div className="flex items-center space-x-2 lg:space-x-2.5 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 lg:px-6 lg:py-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 text-blue-500" />
                  <span className="text-sm md:text-base lg:text-base font-semibold text-gray-800">Secure</span>
                </div>
                <div className="flex items-center space-x-2 lg:space-x-2.5 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 lg:px-6 lg:py-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 text-green-500" />
                  <span className="text-sm md:text-base lg:text-base font-semibold text-gray-800">Fast</span>
                </div>
                <div className="flex items-center space-x-2 lg:space-x-2.5 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 lg:px-6 lg:py-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 text-purple-500" />
                  <span className="text-sm md:text-base lg:text-base font-semibold text-gray-800">Reliable</span>
                </div>
              </div>
            </div>

            {/* Features Grid - Hidden on mobile, responsive on larger screens */}
            <div className="hidden md:grid md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
              {features.map((feature, index) => (
                <div key={index} className="group p-4 lg:p-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-10 h-10 md:w-12 md:h-12 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-3 lg:mb-4 shadow-lg mx-auto transform group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-900 mb-2 lg:mb-3">{feature.title}</h3>
                  <p className="text-xs md:text-sm lg:text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Testimonial - Hidden on small screens */}
            <div className="hidden lg:block bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl max-w-2xl mx-auto">
              <div className="flex justify-center space-x-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                ))}
              </div>
              <p className="text-base text-gray-800 italic mb-4 leading-relaxed text-center font-medium">
                "MeruScrap transformed our operations completely. The efficiency gains are remarkable."
              </p>
              <div className="text-center text-sm text-gray-600 space-y-1">
                <p>© 2025 MeruScrap. All rights reserved.</p>
                <p>Powered by <span className="font-bold text-blue-600">Nesis</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section - Mobile: Full width below brand, Desktop: Right side */}
        <div className="bg-white lg:w-80 xl:w-96 lg:shadow-2xl">
          <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10 xl:px-12 lg:py-12 lg:flex lg:flex-col lg:justify-center lg:min-h-screen">
            
            {/* Decorative elements for desktop */}
            <div className="hidden lg:block absolute top-6 right-6 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-40"></div>
            <div className="hidden lg:block absolute bottom-6 left-6 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-40"></div>

            <div className="max-w-md mx-auto w-full">
              
              {/* Form Header */}
              <div className="text-center mb-6 lg:mb-8">
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 lg:mb-4">
                  {isLogin ? (
                    <Shield className="w-6 h-6 sm:w-7 sm:h-7 lg:w-7 lg:h-7 text-blue-500" />
                  ) : (
                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 lg:w-7 lg:h-7 text-green-500" />
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">
                  {isLogin ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base lg:text-base">
                  {isLogin ? 'Sign in to access your dashboard' : 'Create your account in seconds'}
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 lg:space-y-5">
                {!isLogin && (
                  <>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 lg:border-0 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent lg:focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                        required={!isLogin}
                      />
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Phone Number"
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 lg:border-0 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent lg:focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                        required={!isLogin}
                      />
                    </div>
                  </>
                )}

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email Address"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 lg:py-4 bg-gray-50 border border-gray-200 lg:border-0 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent lg:focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm sm:text-base lg:text-base"
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-14 py-3 sm:py-4 lg:py-4 bg-gray-50 border border-gray-200 lg:border-0 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent lg:focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm sm:text-base lg:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>

                {!isLogin && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm Password"
                      className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 lg:py-4 bg-gray-50 border border-gray-200 lg:border-0 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent lg:focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm sm:text-base lg:text-base"
                      required={!isLogin}
                    />
                  </div>
                )}

                {/* Remember me / Forgot password */}
                {isLogin && (
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center group cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                      />
                      <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
                    </label>
                    <a href="#" className="text-sm sm:text-base text-blue-600 hover:text-blue-700 transition-colors font-semibold">
                      Forgot password?
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 sm:py-4 lg:py-4 px-6 rounded-lg sm:rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base lg:text-base mt-2"
                >
                  <div className="relative flex items-center justify-center space-x-2 sm:space-x-3">
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    {isLoading ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </button>
              </div>

              {/* Form Toggle */}
              <div className="mt-6 lg:mt-8 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 sm:px-4 bg-white text-gray-600 text-sm sm:text-base lg:text-base">
                      {isLogin ? "New to MeruScrap?" : "Already have an account?"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleForm}
                  className="mt-3 sm:mt-4 text-blue-600 hover:text-blue-700 font-bold transition-colors text-sm sm:text-base lg:text-base hover:underline underline-offset-4"
                >
                  {isLogin ? 'Create your account →' : '← Back to sign in'}
                </button>
              </div>

              {/* Mobile Footer */}
              <div className="mt-8 lg:hidden pt-6 border-t border-gray-200 text-center">
                <p className="text-xs sm:text-sm text-gray-500">
                  © 2025 MeruScrap • Powered by <span className="font-semibold text-blue-600">Nesis</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PimaPOSWelcome;