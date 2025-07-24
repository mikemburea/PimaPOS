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
      icon: <Bluetooth className="w-6 h-6" />,
      title: "Bluetooth Integration",
      description: "Connect scales & printers instantly",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Management",
      description: "Role-based access control",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Smart Analytics",
      description: "Real-time data insights",
      color: "from-purple-500 to-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Branding */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 lg:px-12 py-8 lg:py-16 relative">
        {/* Floating background elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-16 h-16 bg-purple-200 rounded-full opacity-10 animate-pulse delay-500"></div>
        <div className="absolute top-1/2 left-5 w-12 h-12 bg-green-200 rounded-full opacity-10 animate-pulse delay-1000"></div>

        <div className="text-center max-w-4xl w-full">
          {/* Logo Section */}
          <div className="mb-8 lg:mb-12">
            <div className="flex items-center justify-center mb-6 lg:mb-8">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl shadow-2xl flex items-center justify-center relative group mr-4 lg:mr-6 bg-white overflow-hidden">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl lg:rounded-2xl flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-xl lg:rounded-2xl blur opacity-20"></div>
                  <div className="relative">
                    {/* Custom PimaPOS Logo Design */}
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-lg flex items-center justify-center shadow-inner">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 font-bold flex items-center justify-center">
                        <span className="text-lg lg:text-xl font-black">P</span>
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-4xl lg:text-6xl font-black mb-1 lg:mb-2">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    Pima
                  </span>
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    POS
                  </span>
                </h1>
                <p className="text-lg lg:text-2xl text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold">
                  Smart Scrap Management
                </p>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="mb-8 lg:mb-12">
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 lg:mb-6 leading-tight">
              Streamline Your
              <br />
              <span className="text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text">
                Scrap Yard Operations
              </span>
            </h2>
            <p className="text-lg lg:text-xl xl:text-2xl text-gray-600 mb-6 lg:mb-8 font-medium">
              Turn Scrap into Profit – Seamlessly
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 lg:gap-4 xl:gap-6 mb-6 lg:mb-8">
              <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-3 lg:px-4 xl:px-6 py-1.5 lg:py-2 xl:py-3 shadow-lg">
                <Shield className="w-3 h-3 lg:w-4 lg:h-4 xl:w-6 xl:h-6 text-blue-500" />
                <span className="text-xs lg:text-sm xl:text-lg font-semibold text-gray-700">Secure</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-3 lg:px-4 xl:px-6 py-1.5 lg:py-2 xl:py-3 shadow-lg">
                <Zap className="w-3 h-3 lg:w-4 lg:h-4 xl:w-6 xl:h-6 text-green-500" />
                <span className="text-xs lg:text-sm xl:text-lg font-semibold text-gray-700">Fast</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-3 lg:px-4 xl:px-6 py-1.5 lg:py-2 xl:py-3 shadow-lg">
                <Sparkles className="w-3 h-3 lg:w-4 lg:h-4 xl:w-6 xl:h-6 text-purple-500" />
                <span className="text-xs lg:text-sm xl:text-lg font-semibold text-gray-700">Reliable</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-6 mb-6 lg:mb-8">
            {features.map((feature, index) => (
              <div key={index} className="group p-3 lg:p-6 bg-white/90 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-2 lg:mb-4 shadow-md mx-auto`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm lg:text-lg font-bold text-gray-900 mb-1 lg:mb-2">{feature.title}</h3>
                <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-lg max-w-xl mx-auto">
            <div className="flex justify-center space-x-1 mb-2 lg:mb-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 lg:w-4 lg:h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
              ))}
            </div>
            <p className="text-xs lg:text-base text-gray-800 italic mb-3 lg:mb-4 leading-relaxed text-center">
              "PimaPOS transformed our operations completely."
            </p>
            <div className="text-center text-xs lg:text-sm text-gray-500 space-y-1">
              <p>© 2025 PimaPOS. All rights reserved.</p>
              <p>Powered by <span className="font-semibold text-blue-600">Nesis</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="w-full lg:w-[380px] xl:w-[420px] bg-white shadow-2xl flex flex-col justify-center px-4 lg:px-8 py-6 lg:py-12 relative">
        {/* Subtle decorative elements */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-100 rounded-full opacity-60"></div>
        <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-purple-100 rounded-full opacity-60"></div>

        <div className="max-w-sm mx-auto w-full">
          {/* Form Header */}
          <div className="text-center mb-4 lg:mb-8">
            <div className="flex items-center justify-center space-x-2 mb-2 lg:mb-3">
              {isLogin ? (
                <>
                  <Shield className="w-4 h-4 lg:w-6 lg:h-6 text-blue-500" />
                  <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">Welcome Back</h2>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 lg:w-6 lg:h-6 text-green-500" />
                  <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">Get Started</h2>
                </>
              )}
            </div>
            <p className="text-gray-600 text-sm lg:text-base">
              {isLogin ? 'Sign in to your dashboard' : 'Create your account today'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3 lg:space-y-4">
            {!isLogin && (
              <div className="space-y-3 lg:space-y-4">
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
                    className="w-full pl-10 pr-4 py-2.5 lg:py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm lg:text-base"
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
                    className="w-full pl-10 pr-4 py-2.5 lg:py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm lg:text-base"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base lg:text-lg"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full pl-10 lg:pl-12 pr-12 lg:pr-14 py-3 lg:py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base lg:text-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 lg:pr-4 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                )}
              </button>
            </div>

            {!isLogin && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm Password"
                  className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 text-base lg:text-lg"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                  />
                  <span className="ml-2 lg:ml-3 text-sm lg:text-base text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-sm lg:text-base text-blue-600 hover:text-blue-700 transition-colors font-medium">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 lg:py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-base lg:text-lg"
            >
              <div className="relative flex items-center justify-center space-x-2 lg:space-x-3">
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                {isLoading ? (
                  <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </div>
            </button>
          </div>

          {/* Form Toggle */}
          <div className="mt-6 lg:mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 lg:px-4 bg-white text-gray-500 text-base lg:text-lg">
                  {isLogin ? "New to PimaPOS?" : "Already have an account?"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleForm}
              className="mt-3 lg:mt-4 text-blue-600 hover:text-blue-700 font-semibold transition-colors hover:underline text-base lg:text-lg"
            >
              {isLogin ? 'Create your account →' : '← Back to sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PimaPOSWelcome;