// apps/admin/src/types/dashboard.ts

// ==================== SUMMARY METRICS ====================

export interface MetricSnapshot {
    views: number;
    sessions: number;
    avgDuration: number; // seconds
}

export interface PercentageChange {
    views: number;
    sessions: number;
    avgDuration: number;
}

export interface DashboardSummary {
    today: MetricSnapshot;
    yesterday: MetricSnapshot;
    change: PercentageChange;
}

// ==================== DISH PERFORMANCE ====================

export interface DishPerformance {
    dishId: string;
    dishName: string;
    views: number;
    trend: number; // percentage change
    avgEngagement?: number; // seconds
    thumbnailUrl?: string;
}

export interface TopDishesResponse {
    topViewed: DishPerformance[];
    topEngagement: DishPerformance[];
}

// ==================== CONTENT HEALTH ====================

export interface ContentHealth {
    totalDishes: number;
    completeCount: number; // dishes with both video and thumbnail
    missingVideo: number;
    missingThumbnail: number;
    orphanMedia: number;
    inactiveDishes: number;
}

// ==================== QR STATISTICS ====================

export interface QRStat {
    qrCode: string;
    location?: string;
    scans: number;
    uniqueUsers: number;
    lastScan: string; // ISO date string
    trendData?: Array<{ date: string; scans: number }>;
}

export interface QRBreakdownResponse {
    qrStats: QRStat[];
}

// Type alias for compatibility
export type QRStatsResponse = QRBreakdownResponse;

// ==================== STAGNANT DISHES ====================

export interface StagnantDish {
    id: string;
    name: string;
    lastView: string; // ISO date string
    daysSinceView: number;
}

export interface StagnantDishesResponse {
    dishes: StagnantDish[];
}

// ==================== ALERTS ====================

export type AlertType = 'error' | 'warning' | 'info' | 'success';
export type AlertPriority = 'high' | 'medium' | 'low';

export interface AlertAction {
    label: string;
    href: string;
}

export interface Alert {
    id: string;
    type: AlertType;
    message: string;
    action?: AlertAction;
    priority: AlertPriority;
}

// ==================== RECOMMENDATIONS ====================

export type RecommendationType = 'opportunity' | 'warning' | 'insight';

export interface RecommendationAction {
    label: string;
    href: string;
}

export interface Recommendation {
    id: string;
    type: RecommendationType;
    icon: string; // Material-UI icon name or emoji
    title: string;
    description: string;
    actionable: boolean;
    action?: RecommendationAction;
}

// ==================== DASHBOARD DATA ====================

export interface DashboardData {
    summary?: DashboardSummary;
    topDishes?: TopDishesResponse;
    contentHealth?: ContentHealth;
    qrStats?: QRBreakdownResponse;
    stagnantDishes?: StagnantDishesResponse;
    alerts: Alert[];
    recommendations: Recommendation[];
    isLoading: boolean;
    isIdle?: boolean; // Indicador de inactividad del usuario
}

// ==================== HELPERS ====================

export type TrendDirection = 'up' | 'down' | 'neutral';

export type DashboardPeriod = '1d' | '7d' | '30d';
