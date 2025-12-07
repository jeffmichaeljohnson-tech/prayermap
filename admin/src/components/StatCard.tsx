/**
 * StatCard Component
 * Displays a single statistic with icon, value, and optional change indicator
 */

import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'pink' | 'orange' | 'teal';
  loading?: boolean;
}

const colorStyles = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  pink: 'bg-pink-100 text-pink-600',
  orange: 'bg-orange-100 text-orange-600',
  teal: 'bg-teal-100 text-teal-600',
};

export function StatCard({
  title,
  value,
  subtitle,
  changeLabel,
  icon,
  color,
  loading = false,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
          {icon}
        </div>
        {changeLabel && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded font-medium">
            {changeLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {loading ? (
        <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-900">
          {value.toLocaleString()}
        </p>
      )}
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

