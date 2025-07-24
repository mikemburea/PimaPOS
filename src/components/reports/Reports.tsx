// src/components/reports/Reports.tsx
import React from 'react';
import type { DashboardStats, Transaction } from '../../types';

interface ReportsProps {
  type: string;
  stats: DashboardStats;
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ type, stats, transactions }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {type.charAt(0).toUpperCase() + type.slice(1)} Reports
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700">Total Transactions</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700">Week Growth</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.weekGrowth}%</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700">Month Growth</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.monthGrowth}%</p>
        </div>
      </div>
      <p className="text-gray-600">Detailed {type} report data will be displayed here...</p>
    </div>
  );
};

export default Reports;
