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
    return <App onNavigateBack={navigateToWelcome} />;
  }
  
  return <PimaPOSWelcome onNavigateToApp={navigateToApp} />;
};

export default AppRouter;