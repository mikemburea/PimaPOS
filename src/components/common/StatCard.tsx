import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  subtitle?: string;
}

export default function StatCard({ title, value, change, icon: Icon, color, subtitle }: StatCardProps) {
  const isPositive = change > 0;
  const gradientClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600'
  };

  return (
    <div className={`relative p-6 rounded-xl bg-gradient-to-br ${gradientClasses[color]} text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium opacity-90">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs opacity-75 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="ml-4">
          <Icon className="w-8 h-8 opacity-80" />
        </div>
      </div>
      
      <div className="flex items-center mt-4">
        <div className={`flex items-center ${isPositive ? 'text-green-100' : 'text-red-100'}`}>
          {isPositive ? (
            <ArrowUp className="w-4 h-4 mr-1" />
          ) : (
            <ArrowDown className="w-4 h-4 mr-1" />
          )}
          <span className="text-sm font-medium">
            {Math.abs(change)}%
          </span>
        </div>
        <span className="text-xs opacity-75 ml-2">vs last period</span>
      </div>
    </div>
  );
}