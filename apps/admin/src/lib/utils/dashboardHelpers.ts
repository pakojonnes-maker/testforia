// apps/admin/src/lib/utils/dashboardHelpers.ts

import type { TrendDirection } from '../../types/dashboard';

/**
 * Format large numbers with K/M suffixes
 * @example formatNumber(1234) => "1.2K"
 * @example formatNumber(1234567) => "1.2M"
 */
export const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

/**
 * Format duration in seconds to human-readable format
 * @example formatDuration(135) => "2m 15s"
 * @example formatDuration(45) => "45s"
 */
export const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

/**
 * Calculate percentage change between two values
 * Handles zero division safely
 */
export const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

/**
 * Determine trend direction based on percentage change
 * @param change - Percentage change value
 * @returns 'up', 'down', or 'neutral'
 */
export const getTrend = (change: number): TrendDirection => {
    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'neutral';
};

/**
 * Calculate days since a given date
 */
export const daysSinceDate = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Format date to locale string
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Get color for trend (MUI theme compatible)
 */
export const getTrendColor = (trend: TrendDirection): 'success.main' | 'error.main' | 'text.secondary' => {
    if (trend === 'up') return 'success.main';
    if (trend === 'down') return 'error.main';
    return 'text.secondary';
};
