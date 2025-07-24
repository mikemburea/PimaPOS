// utils/helpers.ts
export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

export const formatWeight = (weight: number): string => {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)}T`;
  }
  return `${weight}kg`;
};

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: 'text-emerald-700',
    pending: 'text-amber-700',
    failed: 'text-red-700',
    active: 'text-emerald-700',
    inactive: 'text-gray-700'
  };
  return colors[status] || 'text-gray-700';
};