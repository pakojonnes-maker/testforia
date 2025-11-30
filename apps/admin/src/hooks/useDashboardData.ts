// apps/admin/src/hooks/useDashboardData.ts

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../lib/apiClient';
import { generateAlerts } from '../lib/utils/alertGenerator';
import { generateRecommendations } from '../lib/utils/recommendationGenerator';
import { useIdleDetection } from './useIdleDetection';
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
    // ✅ Detección de inactividad - Pausar queries cuando el usuario está inactivo
    const { isIdle } = useIdleDetection({
        idleTimeout: 5 * 60 * 1000, // 5 minutos sin actividad = inactivo
        logoutTimeout: 30 * 60 * 1000, // 30 minutos sin actividad = auto-logout
        onIdle: () => {
            console.log('[Dashboard] Usuario inactivo - pausando auto-refresh');
        },
        onActive: () => {
            console.log('[Dashboard] Usuario activo - reanudando auto-refresh');
        },
        enabled: true
    });

    // Summary metrics (today vs yesterday)
    // ✅ Solo auto-refresh si el usuario NO está inactivo
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['dashboard-summary', restaurantId, period],
        queryFn: () => apiClient.getDashboardSummary(restaurantId!, period),
        enabled: !!restaurantId,
        refetchInterval: isIdle ? false : 30 * 60 * 1000, // 30 min cuando activo, deshabilitado cuando inactivo
        staleTime: 10 * 60 * 1000 // Datos frescos por 10 minutos
    });

    // Top performing dishes
    const { data: topDishes, isLoading: loadingDishes } = useQuery({
        queryKey: ['dashboard-top-dishes', restaurantId, period],
        queryFn: () => {
            // getTopDishes solo acepta '7d' | '30d', si es '1d' usar '7d'
            const validPeriod = period === '1d' ? '7d' : period;
            return apiClient.getTopDishes(restaurantId!, validPeriod);
        },
        enabled: !!restaurantId,
        refetchInterval: isIdle ? false : 30 * 60 * 1000,
        staleTime: 10 * 60 * 1000
    });

    // Content health check
    const { data: contentHealth, isLoading: loadingHealth } = useQuery({
        queryKey: ['dashboard-content-health', restaurantId],
        queryFn: () => apiClient.getContentHealth(restaurantId!),
        enabled: !!restaurantId,
        refetchInterval: isIdle ? false : 60 * 60 * 1000, // 1 hora
        staleTime: 30 * 60 * 1000
    });

    // QR code statistics
    const { data: qrStats, isLoading: loadingQR } = useQuery({
        queryKey: ['dashboard-qr-stats', restaurantId],
        queryFn: () => apiClient.getQRBreakdown(restaurantId!),
        enabled: !!restaurantId,
        refetchInterval: isIdle ? false : 60 * 60 * 1000, // 1 hora
        staleTime: 30 * 60 * 1000
    });

    // Stagnant dishes (low performance)
    const { data: stagnantDishes, isLoading: loadingStagnant } = useQuery({
        queryKey: ['dashboard-stagnant', restaurantId],
        queryFn: () => apiClient.getStagnantDishes(restaurantId!, 7),
        enabled: !!restaurantId,
        refetchInterval: isIdle ? false : 60 * 60 * 1000, // 1 hora
        staleTime: 30 * 60 * 1000
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
        isLoading,
        isIdle // ✅ Indicador de inactividad para la UI
    };
}
