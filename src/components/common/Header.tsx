import React, { useState, useRef, useEffect } from 'react';
import { Bell, User } from 'lucide-react';

interface HeaderProps {
  activeTab?: string;
  title?: string;
  userName?: string;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
}

// Export the enhanced modern gradient style for consistency across components
export const glassmorphismStyle = {
  background: `
    linear-gradient(135deg, 
      rgba(255, 255, 255, 0.95) 0%,
      rgba(248, 250, 252, 0.90) 15%,
      rgba(241, 245, 249, 0.85) 30%,
      rgba(226, 232, 240, 0.80) 45%,
      rgba(241, 245, 249, 0.85) 60%,
      rgba(248, 250, 252, 0.90) 75%,
      rgba(255, 255, 255, 0.95) 100%
    ),
    linear-gradient(45deg, 
      rgba(59, 130, 246, 0.15) 0%,
      rgba(99, 102, 241, 0.12) 20%,
      rgba(139, 92, 246, 0.10) 40%,
      rgba(59, 130, 246, 0.08) 60%,
      rgba(37, 99, 235, 0.12) 80%,
      rgba(29, 78, 216, 0.15) 100%
    ),
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)
  `,
  backdropFilter: 'blur(24px) saturate(120%)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.4)'
};

const Header: React.FC<HeaderProps> = ({ 
  activeTab = 'dashboard', 
  title = 'MeruScrap',
  userName = 'Admin User',
  showNotifications = true,
  notificationCount = 0,
  onNotificationClick,
  onProfileClick
}) => {
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close popup
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      popupRef.current && 
      profileRef.current &&
      !popupRef.current.contains(event.target as Node) &&
      !profileRef.current.contains(event.target as Node)
    ) {
      setShowProfilePopup(false);
    }
  };

  if (showProfilePopup) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
  
  // Add this explicit return to satisfy TypeScript
  return undefined;
}, [showProfilePopup]);

  const handleProfileClickInternal = () => {
    setShowProfilePopup(!showProfilePopup);
    // Still call the original onClick if provided
    if (onProfileClick) {
      onProfileClick();
    }
  };
  return (
    <header style={{
      ...glassmorphismStyle,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(59, 130, 246, 0.12)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.75rem 1rem'
    }}>
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        
        .pulse-notification {
          animation: pulse 2s infinite;
        }

        /* Mobile-first styles */
        .logo-container {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 2px solid rgba(59, 130, 246, 0.15);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
          filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
          transition: all 0.3s ease;
        }

        .logo-container:hover {
          filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3));
          transform: scale(1.05);
        }

        .logo-svg {
          width: 24px;
          height: 24px;
        }

        .title-gradient {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #0ea5e9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
        }

        .title-text {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .tagline-text {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 500;
          letter-spacing: 0.5px;
          font-size: 0.5rem;
          margin-top: -0.125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .notification-btn {
          position: relative;
          padding: 0.375rem;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          min-width: 40px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-btn:hover {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(59, 130, 246, 0.15);
        }

        .notification-btn svg {
          width: 16px;
          height: 16px;
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius: 50%;
          border: 1.5px solid white;
          font-size: 0.5rem;
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0.25rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(15px);
          min-height: 40px;
          min-width: 40px;
          position: relative;
        }

        .profile-section:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
          border-color: rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
          box-shadow: 0 3px 12px rgba(59, 130, 246, 0.12);
        }

        .profile-avatar {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
          flex-shrink: 0;
        }

        .profile-avatar svg {
          width: 14px;
          height: 14px;
        }

        /* Hide profile details on mobile by default */
        .profile-details {
          display: none;
        }

        /* Mobile Profile Popup */
        .profile-popup {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          padding: 0.75rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(59, 130, 246, 0.1);
          backdrop-filter: blur(20px);
          z-index: 100;
          min-width: 140px;
          opacity: 0;
          transform: translateY(-8px) scale(0.95);
          transition: all 0.2s ease-out;
          pointer-events: none;
        }

        .profile-popup.show {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        .profile-popup::before {
          content: '';
          position: absolute;
          top: -6px;
          right: 12px;
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-bottom: none;
          border-right: none;
          transform: rotate(45deg);
          backdrop-filter: blur(20px);
        }

        .popup-user-name {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 600;
          display: block;
          line-height: 1.3;
          margin-bottom: 0.125rem;
        }

        .popup-user-role {
          font-size: 0.75rem;
          color: #64748b;
          display: block;
          line-height: 1.2;
        }

        .popup-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.2) 50%, transparent 100%);
          margin: 0.5rem 0;
        }

        .popup-status {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.6875rem;
          color: #059669;
          font-weight: 500;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
        }

        .user-name {
          display: none;
        }

        .user-role {
          display: none;
        }

        .active-tab {
          display: none;
        }

        .left-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .logo-title-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          flex: 1;
        }

        .right-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .header-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        /* Tablet styles (sm: 640px and up) */
        @media (min-width: 640px) {
          .header-main {
            padding: 0;
          }

          .logo-container {
            width: 42px;
            height: 42px;
            border-radius: 10px;
          }

          .logo-svg {
            width: 28px;
            height: 28px;
          }

          .title-text {
            font-size: 1.5rem;
          }

          .tagline-text {
            font-size: 0.625rem;
          }

          .notification-btn {
            padding: 0.5rem;
            border-radius: 12px;
            min-width: 44px;
            min-height: 44px;
          }

          .notification-btn svg {
            width: 18px;
            height: 18px;
          }

          .notification-badge {
            width: 16px;
            height: 16px;
            font-size: 0.625rem;
          }

          /* Show profile details on tablet and up, hide popup */
          .profile-section {
            gap: 0.5rem;
            padding: 0.375rem 0.75rem;
            border-radius: 16px;
            min-height: 44px;
            min-width: auto;
          }

          .profile-details {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .user-name {
            display: block;
            font-size: 0.875rem;
            color: #1e293b;
            font-weight: 600;
            line-height: 1.2;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .user-role {
            display: block;
            font-size: 0.75rem;
            color: #64748b;
            margin-top: -0.125rem;
            line-height: 1;
          }

          .profile-popup {
            display: none;
          }

          .profile-avatar {
            width: 32px;
            height: 32px;
          }

          .profile-avatar svg {
            width: 16px;
            height: 16px;
          }

          .left-section {
            gap: 1rem;
          }

          .logo-title-section {
            gap: 0.75rem;
          }

          .right-section {
            gap: 0.75rem;
          }
        }

        /* Desktop styles (lg: 1024px and up) */
        @media (min-width: 1024px) {
          .active-tab {
            display: block;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            font-weight: 600;
            color: #1e40af;
            text-transform: capitalize;
            backdrop-filter: blur(10px);
            font-size: 0.875rem;
            white-space: nowrap;
          }

          .logo-container {
            width: 48px;
            height: 48px;
            border-radius: 12px;
          }

          .logo-svg {
            width: 32px;
            height: 32px;
          }

          .title-text {
            font-size: 1.875rem;
          }

          .tagline-text {
            font-size: 0.75rem;
          }

          .notification-btn {
            padding: 0.625rem;
            border-radius: 14px;
            min-width: 48px;
            min-height: 48px;
          }

          .notification-btn svg {
            width: 20px;
            height: 20px;
          }

          .notification-badge {
            width: 18px;
            height: 18px;
            font-size: 0.625rem;
            border: 2px solid white;
          }

          .profile-section {
            gap: 0.75rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            min-height: 48px;
          }

          .profile-avatar {
            width: 36px;
            height: 36px;
          }

          .profile-avatar svg {
            width: 18px;
            height: 18px;
          }

          .user-name {
            font-size: 0.875rem;
            max-width: none;
          }

          .user-role {
            font-size: 0.75rem;
          }

          .left-section {
            gap: 1.5rem;
          }

          .logo-title-section {
            gap: 1rem;
          }

          .right-section {
            gap: 1rem;
          }
        }

        /* Extra small mobile phones */
        @media (max-width: 375px) {
          .title-text {
            font-size: 1.125rem;
          }

          .tagline-text {
            font-size: 0.4rem;
          }

          .profile-section {
            padding: 0.1875rem;
            min-width: 36px;
            min-height: 36px;
          }

          .notification-btn {
            padding: 0.25rem;
            min-width: 36px;
            min-height: 36px;
          }

          .notification-btn svg {
            width: 14px;
            height: 14px;
          }

          .profile-avatar {
            width: 24px;
            height: 24px;
          }

          .profile-avatar svg {
            width: 12px;
            height: 12px;
          }

          .notification-badge {
            width: 12px;
            height: 12px;
            font-size: 0.4375rem;
          }

          .profile-popup {
            min-width: 120px;
            right: -10px;
          }

          .popup-user-name {
            font-size: 0.8125rem;
          }

          .popup-user-role {
            font-size: 0.6875rem;
          }
        }
      `}</style>
      
      <div className="header-main">
        {/* Left side - Logo and Title */}
        <div className="left-section">
          <div className="logo-title-section">
            {/* PimaPOS Logo */}
            <div className="logo-container">
              {/* Your PimaPOS Logo SVG */}
              <svg className="logo-svg" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.3))' }}>
                {/* Bluetooth icon in top-left */}
                <rect x="8" y="8" width="20" height="20" rx="6" fill="#3b82f6"/>
                <path d="M14 14 L14 22 L20 18 L14 14 Z M14 18 L20 22 L14 18 Z" fill="#ffffff" strokeWidth="0.5"/>
                
                {/* Main POS device */}
                <rect x="35" y="28" width="30" height="18" rx="4" fill="#3b82f6" stroke="#1e40af" strokeWidth="1"/>
                
                {/* Screen */}
                <rect x="38" y="31" width="24" height="8" rx="2" fill="#ffffff"/>
                
                {/* Buttons */}
                <circle cx="42" cy="42" r="1.5" fill="#1e40af"/>
                <circle cx="58" cy="42" r="1.5" fill="#1e40af"/>
                
                {/* Base/Stand */}
                <path d="M28 48 L72 48 L68 68 L32 68 Z" fill="#3b82f6" stroke="#1e40af" strokeWidth="1"/>
                
                {/* Base detail */}
                <rect x="35" y="65" width="30" height="2" rx="1" fill="#ffffff"/>
                
                {/* Connectivity lines */}
                <path d="M18 18 L35 35" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                <path d="M15 82 L85 82" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
                
                {/* Letter P */}
                <path d="M75 15 L75 35 M75 15 L85 15 L85 25 L75 25" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            
            {/* Title and Tagline */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="title-gradient title-text">
                {title}
              </h1>
              <p className="tagline-text">
                Powering the Scrap Business
              </p>
            </div>
          </div>
          
          {/* Active Tab Indicator - Hidden on mobile/tablet, shown on desktop */}
          <div className="active-tab">
            {activeTab.replace(/-/g, ' ')}
          </div>
        </div>
        
        {/* Right side - Notifications and Profile */}
        <div className="right-section">
          {showNotifications && (
            <button 
              className="notification-btn"
              onClick={onNotificationClick}
              aria-label="Notifications"
            >
              <Bell color="#64748b" />
              {notificationCount > 0 && (
                <span 
                  className="pulse-notification notification-badge"
                  aria-label={`${notificationCount} notifications`}
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}
          
          <div 
            ref={profileRef}
            className="profile-section"
            onClick={handleProfileClickInternal}
            role="button"
            aria-label="User profile"
            aria-expanded={showProfilePopup}
          >
            <div className="profile-avatar">
              <User color="white" />
            </div>
            <div className="profile-details">
              <span className="user-name">
                {userName}
              </span>
              <span className="user-role">
                Administrator
              </span>
            </div>

            {/* Mobile Profile Popup */}
            <div 
              ref={popupRef}
              className={`profile-popup ${showProfilePopup ? 'show' : ''}`}
              role="tooltip"
              aria-hidden={!showProfilePopup}
            >
              <div className="popup-user-name">{userName}</div>
              <div className="popup-user-role">Administrator</div>
              <div className="popup-divider"></div>
              <div className="popup-status">
                <div className="status-dot"></div>
                Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;