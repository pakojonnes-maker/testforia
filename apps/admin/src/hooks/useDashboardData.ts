// apps/admin/src/hooks/useDashboardData.ts

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../lib/apiClient';
import { generateAlerts } from '../lib/utils/alertGenerator';
import { generateRecommendations } from '../lib/utils/recommendationGenerator';
import type { DashboardData, DashboardPeriod } from '../types/dashboard';

/**
 * Custom hook to fetch and manage all dashboard data
 * @param restaurantId - Current restaurant ID
 * @param period - Time period for metrics ('1d', '7d', '30d')
 * @returns Dashboard data with alerts and recommendations
 */
export function useDashboardData(
    restaurantId: string | undefined,
    period: DashboardPeriod = '7d'
): DashboardData {
    // Summary metrics (today vs yesterday)
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['dashboard-summary', restaurantId, period],
        queryFn: () => apiClient.getDashboardSummary(restaurantId!, period),
        enabled: !!restaurantId,
        refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
        staleTime: 2 * 60 * 1000 // Consider data fresh for 2 minutes
    });

    // Top performing dishes
    const { data: topDishes, isLoading: loadingDishes } = useQuery({
        queryKey: ['dashboard-top-dishes', restaurantId, period],
        queryFn: () => apiClient.getTopDishes(restaurantId!, period),
        enabled: !!restaurantId,
        staleTime: 2 * 60 * 1000
    });

    // Content health check
    const { data: contentHealth, isLoading: loadingHealth } = useQuery({
        queryKey: ['dashboard-content-health', restaurantId],
        queryFn: () => apiClient.getContentHealth(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 5 * 60 * 1000 // Less frequent updates needed
    });

    // QR code statistics
    const { data: qrStats, isLoading: loadingQR } = useQuery({
        queryKey: ['dashboard-qr-stats', restaurantId],
        queryFn: () => apiClient.getQRBreakdown(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 5 * 60 * 1000
    });

    // Stagnant dishes (low performance)
    const { data: stagnantDishes, isLoading: loadingStagnant } = useQuery({
        queryKey: ['dashboard-stagnant', restaurantId],
        queryFn: () => apiClient.getStagnantDishes(restaurantId!, 7),
        enabled: !!restaurantId,
        staleTime: 10 * 60 * 1000 // Even less frequent
    });

    // Overall loading state
    const isLoading = loadingSummary || loadingDishes || loadingHealth || loadingQR || loadingStagnant;

    // Generate contextual alerts based on data
    const alerts = useMemo(() => {
        if (!contentHealth || !qrStats) return [];
        return generateAlerts({
            contentHealth,
            qrStats,
            stagnantDishes
        });
    }, [contentHealth, qrStats, stagnantDishes]);

    // Generate smart recommendations
    const recommendations = useMemo(() => {
        if (!summary || !topDishes) return [];
        return generateRecommendations({
            summary,
            topDishes,
            stagnantDishes
        });
    }, [summary, topDishes, stagnantDishes]);

    return {
        summary,
        topDishes,
        contentHealth,
        qrStats,
        stagnantDishes,
        alerts,
        recommendations,
        isLoading
    };
}
