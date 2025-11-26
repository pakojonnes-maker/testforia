// apps/admin/src/lib/utils/alertGenerator.ts

import type {
    Alert,
    ContentHealth,
    QRBreakdownResponse,
    StagnantDishesResponse
} from '../../types/dashboard';
import { daysSinceDate } from './dashboardHelpers';

const priorityWeight: Record<'high' | 'medium' | 'low', number> = {
    high: 1,
    medium: 2,
    low: 3
};

interface AlertGeneratorInput {
    contentHealth?: ContentHealth;
    qrStats?: QRBreakdownResponse;
    stagnantDishes?: StagnantDishesResponse;
}

/**
 * Generate contextual alerts based on dashboard data
 */
export function generateAlerts(data: AlertGeneratorInput): Alert[] {
    const alerts: Alert[] = [];
    const { contentHealth, qrStats, stagnantDishes } = data;

    if (!contentHealth || !qrStats) return alerts;

    // HIGH PRIORITY: Missing video alert
    if (contentHealth.missingVideo > 0) {
        alerts.push({
            id: 'missing-video',
            type: 'warning',
            message: `${contentHealth.missingVideo} ${contentHealth.missingVideo === 1 ? 'plato' : 'platos'} sin video principal`,
            action: {
                label: 'Completar',
                href: '/dishes'
            },
            priority: 'high'
        });
    }

    // HIGH PRIORITY: Missing thumbnails
    if (contentHealth.missingThumbnail > 0) {
        alerts.push({
            id: 'missing-thumbnail',
            type: 'warning',
            message: `${contentHealth.missingThumbnail} ${contentHealth.missingThumbnail === 1 ? 'plato' : 'platos'} sin imagen principal`,
            action: {
                label: 'Añadir imágenes',
                href: '/dishes'
            },
            priority: 'high'
        });
    }

    // MEDIUM PRIORITY: Unused QR codes
    const unusedQRs = qrStats.qrStats?.filter(qr => {
        if (qr.scans === 0) return true;
        if (!qr.lastScan) return false;
        const daysSince = daysSinceDate(qr.lastScan);
        return daysSince > 7;
    });

    if (unusedQRs && unusedQRs.length > 0) {
        alerts.push({
            id: 'unused-qrs',
            type: 'warning',
            message: `${unusedQRs.length} ${unusedQRs.length === 1 ? 'código QR' : 'códigos QR'} sin uso en 7 días`,
            priority: 'medium'
        });
    }

    // MEDIUM PRIORITY: Stagnant dishes
    if (stagnantDishes && stagnantDishes.dishes.length > 3) {
        alerts.push({
            id: 'stagnant-dishes',
            type: 'warning',
            message: `${stagnantDishes.dishes.length} platos sin vistas en 7 días`,
            action: {
                label: 'Ver platos',
                href: '/dishes'
            },
            priority: 'medium'
        });
    }

    // LOW PRIORITY: Content completeness success
    const completionRate = contentHealth.totalDishes > 0
        ? (contentHealth.completeCount / contentHealth.totalDishes) * 100
        : 0;

    if (completionRate >= 90 && contentHealth.totalDishes > 0) {
        alerts.push({
            id: 'content-complete',
            type: 'success',
            message: `${contentHealth.completeCount}/${contentHealth.totalDishes} platos con contenido completo (${completionRate.toFixed(0)}%)`,
            priority: 'low'
        });
    }

    // LOW PRIORITY: Orphan media warning
    if (contentHealth.orphanMedia > 5) {
        alerts.push({
            id: 'orphan-media',
            type: 'info',
            message: `${contentHealth.orphanMedia} archivos multimedia sin asignar`,
            action: {
                label: 'Revisar',
                href: '/media'
            },
            priority: 'low'
        });
    }

    // Sort by priority (high first)
    return alerts.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);
}
