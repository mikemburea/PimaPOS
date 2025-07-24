import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const materialData = [
  { name: 'Aluminum', value: 35, color: '#60A5FA', amount: 2450 },
  { name: 'Copper', value: 25, color: '#F59E0B', amount: 1750 },
  { name: 'Steel', value: 20, color: '#8B5CF6', amount: 1400 },
  { name: 'Lead', value: 12, color: '#EC4899', amount: 840 },
  { name: 'Brass', value: 8, color: '#10B981', amount: 560 }
];

export default function MaterialDistribution() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-xl font-semibold text-slate-800 mb-6">Material Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={materialData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
          >
            {materialData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: 'none', 
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-6 space-y-3">
        {materialData.map((item) => (
          <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-700">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-800">{item.value}%</span>
              <p className="text-xs text-slate-500">{item.amount}kg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}