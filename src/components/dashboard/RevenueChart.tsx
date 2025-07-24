// components/dashboard/RevenueChart.tsx
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { generateRevenueChartData } from '../../utils/chartHelpers';

export default function RevenueChart() {
  const revenueData = generateRevenueChartData();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Revenue & Activity Trend</h3>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">7 Days</button>
          <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">30 Days</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={revenueData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="date" stroke="#64748B" />
          <YAxis stroke="#64748B" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: 'none', 
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3B82F6" 
            strokeWidth={3}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}