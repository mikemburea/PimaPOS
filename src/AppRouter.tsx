// AppRouter.tsx - Fixed version with proper component interfaces
import React, { useState } from 'react';
import App from './App';
import PimaPOSWelcome from './PimaPOSWelcome';

// Define the props interface for PimaPOSWelcome if it doesn't exist
// You might need to add this interface to your PimaPOSWelcome component file
interface PimaPOSWelcomeProps {
  onNavigateToApp: () => void;
}

const AppRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'welcome' | 'app'>('welcome');
  
  const navigateToApp = () => {
    setCurrentPage('app');
  };
  
  const navigateToWelcome = () => {
    setCurrentPage('welcome');
  };
  
  if (currentPage === 'app') {
    // Pass the proper navigation function to App component
    return <App onNavigateBack={navigateToWelcome} />;
  }
  
  // Cast PimaPOSWelcome to accept the prop - this is a temporary fix
  // The proper solution is to add the interface to PimaPOSWelcome component
  const PimaPOSWelcomeComponent = PimaPOSWelcome as React.ComponentType<PimaPOSWelcomeProps>;
  
  return <PimaPOSWelcomeComponent onNavigateToApp={navigateToApp} />;
};

export default AppRouter;