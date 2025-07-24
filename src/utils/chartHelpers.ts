// utils/chartHelpers.ts
export const generateRevenueChartData = () => [
  { date: 'Mon', revenue: 45000, weight: 1200, transactions: 12 },
  { date: 'Tue', revenue: 52000, weight: 1350, transactions: 15 },
  { date: 'Wed', revenue: 48000, weight: 1150, transactions: 11 },
  { date: 'Thu', revenue: 58000, weight: 1480, transactions: 18 },
  { date: 'Fri', revenue: 62000, weight: 1620, transactions: 21 },
  { date: 'Sat', revenue: 55000, weight: 1400, transactions: 16 },
  { date: 'Sun', revenue: 51000, weight: 1300, transactions: 14 }
];

export const generateMaterialDistribution = () => [
  { name: 'Aluminum', value: 35, color: '#60A5FA', amount: 2450 },
  { name: 'Copper', value: 25, color: '#F59E0B', amount: 1750 },
  { name: 'Steel', value: 20, color: '#8B5CF6', amount: 1400 },
  { name: 'Lead', value: 12, color: '#EC4899', amount: 840 },
  { name: 'Brass', value: 8, color: '#10B981', amount: 560 }
];