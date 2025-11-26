// apps/admin/src/lib/utils/recommendationGenerator.ts

import type {
    Recommendation,
    DashboardSummary,
    TopDishesResponse,
    StagnantDishesResponse
} from '../../types/dashboard';

interface RecommendationGeneratorInput {
    summary?: DashboardSummary;
    topDishes?: TopDishesResponse;
    stagnantDishes?: StagnantDishesResponse;
}

/**
 * Generate smart business recommendations based on dashboard data
 */
export function generateRecommendations(data: RecommendationGeneratorInput): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const { summary, topDishes, stagnantDishes } = data;

    if (!summary || !topDishes) return recommendations;

    // OPPORTUNITY: High engagement dish with many views
    if (topDishes.topViewed && topDishes.topViewed.length > 0) {
        const topDish = topDishes.topViewed[0];
        if (topDish.trend > 30 && topDish.views > 50) {
            recommendations.push({
                id: 'trending-dish',
                type: 'opportunity',
                icon: '📈',
                title: 'Plato en tendencia detectado',
                description: `"${topDish.dishName}" ha incrementado sus vistas un ${topDish.trend.toFixed(0)}%. Considera promocionarlo en redes sociales o como plato del día.`,
                actionable: true,
                action: {
                    label: 'Ver plato',
                    href: `/dishes/${topDish.dishId}`
                }
            });
        }
    }

    // INSIGHT: Session duration trend
    if (summary.change.avgDuration < -15) {
        recommendations.push({
            id: 'decreasing-engagement',
            type: 'warning',
            icon: '⏱️',
            title: 'Reducción en tiempo de sesión',
            description: `El tiempo promedio de sesión ha disminuido un ${Math.abs(summary.change.avgDuration).toFixed(0)}%. Revisa la calidad de los videos y la información de los platos.`,
            actionable: true,
            action: {
                label: 'Revisar platos',
                href: '/dishes'
            }
        });
    }

    // OPPORTUNITY: Growing traffic
    if (summary.change.views > 25) {
        recommendations.push({
            id: 'growing-traffic',
            type: 'opportunity',
            icon: '🚀',
            title: 'Crecimiento de tráfico',
            description: `Las visitas han aumentado un ${summary.change.views.toFixed(0)}%. Es un buen momento para actualizar tu menú con platos de temporada.`,
            actionable: false
        });
    }

    // WARNING: Stagnant content
    if (stagnantDishes && stagnantDishes.dishes.length > 5) {
        recommendations.push({
            id: 'stagnant-content',
            type: 'warning',
            icon: '⚠️',
            title: 'Contenido sin actividad',
            description: `${stagnantDishes.dishes.length} platos sin vistas en una semana. Considera actualizar las imágenes, videos o moverlos a secciones más visibles.`,
            actionable: true,
            action: {
                label: 'Ver platos',
                href: '/dishes'
            }
        });
    }

    // INSIGHT: Low session count despite high views
    if (summary.today.views > 100 && summary.today.sessions < 50) {
        recommendations.push({
            id: 'returning-visitors',
            type: 'insight',
            icon: '💡',
            title: 'Alta retención de visitantes',
            description: 'Los usuarios están viendo múltiples platos por sesión. Esto indica un menú atractivo y buena navegación.',
            actionable: false
        });
    }

    // Limit to top 3-4 most relevant recommendations
    return recommendations.slice(0, 4);
}
