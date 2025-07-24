import React, { useState } from 'react';
import { Shield, RefreshCw, User, Bell, Lock, Settings } from 'lucide-react';

interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  lowStock: boolean;
  newSupplier: boolean;
  priceChange: boolean;
}

interface UserPreferences {
  notifications: boolean;
  darkMode: boolean;
  autoSave: boolean;
  compactView: boolean;
}

interface UserProfile {
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

const SettingsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    push: true,
    lowStock: true,
    newSupplier: true,
    priceChange: false
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    darkMode: false,
    autoSave: true,
    compactView: false
  });

  const [profile, setProfile] = useState<UserProfile>({
    companyName: 'ScrapFlow Inc.',
    fullName: 'Admin User',
    email: 'admin@scrapflow.com',
    phone: '+254 700 000 000',
    role: 'System Administrator'
  });

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    console.log('Saving profile:', profile);
    alert('Profile saved successfully!');
  };

  const handleCancelProfile = () => {
    console.log('Canceling profile changes');
    // Reset to original values or handle cancel logic
  };

  const handleChangePassword = () => {
    console.log('Change password clicked');
    alert('Password change dialog would open here');
  };

  const handleTwoFactorAuth = () => {
    console.log('Two-factor authentication clicked');
    alert('Two-factor authentication setup would open here');
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings? This action cannot be undone.')) {
      console.log('Resetting all settings');
      // Reset all settings to defaults
      setNotifications({
        email: true,
        sms: false,
        push: true,
        lowStock: true,
        newSupplier: true,
        priceChange: false
      });
      setPreferences({
        notifications: true,
        darkMode: false,
        autoSave: true,
        compactView: false
      });
      alert('All settings have been reset to defaults');
    }
  };

  const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-teal-600" size={28} />
            <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          </div>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-teal-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Profile Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => handleProfileChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleProfileChange('fullName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button 
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Save Changes
              </button>
              <button 
                onClick={handleCancelProfile}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="text-teal-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Notification Preferences</h3>
            </div>
            
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <h4 className="font-medium text-gray-700 mb-3">Communication Channels</h4>
                <div className="space-y-3">
                  <ToggleSwitch
                    checked={notifications.email}
                    onChange={(value) => handleNotificationChange('email', value)}
                    label="Email Notifications"
                    description="Receive updates via email"
                  />
                  <ToggleSwitch
                    checked={notifications.sms}
                    onChange={(value) => handleNotificationChange('sms', value)}
                    label="SMS Notifications"
                    description="Receive updates via SMS"
                  />
                  <ToggleSwitch
                    checked={notifications.push}
                    onChange={(value) => handleNotificationChange('push', value)}
                    label="Push Notifications"
                    description="Receive in-app notifications"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Alert Types</h4>
                <div className="space-y-3">
                  <ToggleSwitch
                    checked={notifications.lowStock}
                    onChange={(value) => handleNotificationChange('lowStock', value)}
                    label="Low Stock Alerts"
                    description="Get notified when inventory is running low"
                  />
                  <ToggleSwitch
                    checked={notifications.newSupplier}
                    onChange={(value) => handleNotificationChange('newSupplier', value)}
                    label="New Supplier Notifications"
                    description="Alerts when new suppliers are added"
                  />
                  <ToggleSwitch
                    checked={notifications.priceChange}
                    onChange={(value) => handleNotificationChange('priceChange', value)}
                    label="Price Change Alerts"
                    description="Get notified about price fluctuations"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General Preferences */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-teal-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">General Preferences</h3>
            </div>
            
            <div className="space-y-4">
              <ToggleSwitch
                checked={preferences.notifications}
                onChange={(value) => handlePreferenceChange('notifications', value)}
                label="Enable Notifications"
                description="Master toggle for all notifications"
              />
              <ToggleSwitch
                checked={preferences.darkMode}
                onChange={(value) => handlePreferenceChange('darkMode', value)}
                label="Dark Mode"
                description="Switch to dark theme"
              />
              <ToggleSwitch
                checked={preferences.autoSave}
                onChange={(value) => handlePreferenceChange('autoSave', value)}
                label="Auto Save"
                description="Automatically save changes"
              />
              <ToggleSwitch
                checked={preferences.compactView}
                onChange={(value) => handlePreferenceChange('compactView', value)}
                label="Compact View"
                description="Show more content in less space"
              />
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="text-teal-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Security</h3>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={handleChangePassword}
                className="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
              >
                <Shield size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-800">Change Password</p>
                  <p className="text-sm text-gray-500">Update your account password</p>
                </div>
              </button>
              
              <button 
                onClick={handleTwoFactorAuth}
                className="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
              >
                <RefreshCw size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
            <div className="space-y-3">
              <button 
                onClick={handleResetSettings}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reset All Settings
              </button>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;