import React from 'react';
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
  title = 'PimaPOS',
  userName = 'Admin User',
  showNotifications = true,
  notificationCount = 0,
  onNotificationClick,
  onProfileClick
}) => {
  return (
    <header style={{
      ...glassmorphismStyle,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(59, 130, 246, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '1.25rem 2rem'
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

        .logo-container {
          filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.25));
          transition: all 0.3s ease;
        }

        .logo-container:hover {
          filter: drop-shadow(0 6px 12px rgba(59, 130, 246, 0.35));
          transform: scale(1.05);
        }

        .title-gradient {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #0ea5e9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
        }

        .tagline-text {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .notification-btn {
          position: relative;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .notification-btn:hover {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(15px);
        }

        .profile-section:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
          border-color: rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
        }

        .active-tab {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          font-weight: 600;
          color: #1e40af;
          text-transform: capitalize;
          backdrop-filter: blur(10px);
        }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left side - Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* PimaPOS Logo */}
            <div className="logo-container" style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '2px solid rgba(59, 130, 246, 0.15)',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)'
            }}>
              {/* Your PimaPOS Logo SVG */}
              <svg width="36" height="36" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }}>
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
            <div>
              <h1 className="title-gradient" style={{
                fontSize: '1.875rem',
                fontWeight: '800',
                letterSpacing: '-0.025em',
                lineHeight: '1.2'
              }}>
                {title}
              </h1>
              <p className="tagline-text" style={{
                fontSize: '0.75rem',
                marginTop: '-0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Powering the Scrap Business
              </p>
            </div>
          </div>
          
          {/* Active Tab Indicator */}
          <div className="active-tab">
            {activeTab.replace(/-/g, ' ')}
          </div>
        </div>
        
        {/* Right side - Notifications and Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {showNotifications && (
            <button 
              className="notification-btn"
              onClick={onNotificationClick}
            >
              <Bell size={20} color="#64748b" />
              {notificationCount > 0 && (
                <span 
                  className="pulse-notification"
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '18px',
                    height: '18px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderRadius: '50%',
                    border: '2px solid white',
                    fontSize: '0.625rem',
                    color: 'white',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}
          
          <div 
            className="profile-section"
            onClick={onProfileClick}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <User size={18} color="white" />
            </div>
            <div>
              <span style={{ 
                fontSize: '0.875rem', 
                color: '#1e293b', 
                fontWeight: '600',
                display: 'block'
              }}>
                {userName}
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#64748b',
                display: 'block',
                marginTop: '-0.125rem'
              }}>
                Administrator
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;