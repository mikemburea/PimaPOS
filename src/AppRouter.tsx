// AppRouter.tsx - Final version with all components properly integrated
import React, { useState } from 'react';
import App from './App';
import PimaPOSWelcome from './PimaPOSWelcome';

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
  
  // Pass the proper navigation function to PimaPOSWelcome component
  return <PimaPOSWelcome onNavigateToApp={navigateToApp} />;
};

export default AppRouter;