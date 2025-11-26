// ===========================================================================
// CLOUDFLARE WORKER - DASHBOARD API
//=============================================================================
// Optimized worker for VisualTaste Dashboard analytics endpoints
// Author: AI Assistant
// Date: 2025-11-25
// 
// Endpoints:
// - GET /restaurants/:id/analytics/summary?period={1d|7d|30d}
// - GET /restaurants/:id/analytics/dishes/top?period={7d|30d}&limit=10
// - GET /restaurants/:id/analytics/qr-breakdown

try {
  // Route to specific endpoint handlers
  if (pathname.includes('/analytics/summary')) {
    return await handleAnalyticsSummary(env, restaurantId, url);
  }

  if (pathname.includes('/analytics/dishes/top')) {
    return await handleTopDishes(env, restaurantId, url);
  }

  if (pathname.includes('/analytics/qr-breakdown')) {
    return await handleQRBreakdown(env, restaurantId);
  }

  if (pathname.includes('/content/health')) {
    return await handleContentHealth(env, restaurantId);
  }

  if (pathname.includes('/dishes/stagnant')) {
    return await handleStagnantDishes(env, restaurantId, url);
  }

  // Not a dashboard endpoint
  return null;

} catch (error) {
  console.error('[Dashboard Worker] Error:', error);
  return createResponse({
    success: false,
    message: "Error interno del servidor",
    error: error.message
  }, 500);
}
}

// ===========================================================================
// ENDPOINT HANDLERS
// ===========================================================================

/**
 * GET /restaurants/:id/analytics/summary?period={1d|7d|30d}
 * Returns metrics comparison between today/period and yesterday/previous period
 */
async function handleAnalyticsSummary(env, restaurantId, url) {
  const params = new URLSearchParams(url.search);
  const period = params.get('period') || '7d';

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const yesterday = getDateOffset(today, -1);

  // Calculate date ranges based on period
  let currentStart, currentEnd, previousStart, previousEnd;

  if (period === '1d') {
    currentStart = currentEnd = today;
    previousStart = previousEnd = yesterday;
  } else {
    const days = period === '7d' ? 7 : 30;
    currentEnd = today;
    currentStart = getDateOffset(today, -(days - 1));
    previousEnd = getDateOffset(today, -days);
    previousStart = getDateOffset(today, -(days * 2 - 1));
  }

  // Fetch current period metrics
  const currentMetrics = await env.DB.prepare(`
    SELECT 
      COALESCE(SUM(total_views), 0) as views,
      COALESCE(SUM(total_sessions), 0) as sessions,
      COALESCE(AVG(avg_session_duration), 0) as avgDuration
    FROM daily_analytics
    WHERE restaurant_id = ?
      AND date BETWEEN ? AND ?
  `).bind(restaurantId, currentStart, currentEnd).first();

  // Fetch previous period metrics
  const previousMetrics = await env.DB.prepare(`
    SELECT 
      COALESCE(SUM(total_views), 0) as views,
      COALESCE(SUM(total_sessions), 0) as sessions,
      COALESCE(AVG(avg_session_duration), 0) as avgDuration
    FROM daily_analytics
    WHERE restaurant_id = ?
      AND date BETWEEN ? AND ?
  `).bind(restaurantId, previousStart, previousEnd).first();

  // Calculate percentage changes
  const viewsChange = calculatePercentageChange(
    previousMetrics.views,
    currentMetrics.views
  );
  const sessionsChange = calculatePercentageChange(
    previousMetrics.sessions,
    currentMetrics.sessions
  );
  const durationChange = calculatePercentageChange(
    previousMetrics.avgDuration,
    currentMetrics.avgDuration
  );

  return createResponse({
    success: true,
    today: {
      views: Math.round(currentMetrics.views),
      sessions: Math.round(currentMetrics.sessions),
      avgDuration: Math.round(currentMetrics.avgDuration)
    },
    yesterday: {
      views: Math.round(previousMetrics.views),
      sessions: Math.round(previousMetrics.sessions),
      avgDuration: Math.round(previousMetrics.avgDuration)
    },
    change: {
      views: Number(viewsChange.toFixed(1)),
      sessions: Number(sessionsChange.toFixed(1)),
      avgDuration: Number(durationChange.toFixed(1))
    },
    period: period,
    dateRange: {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd }
    }
  });
}

/**
 * GET /restaurants/:id/analytics/dishes/top?period={7d|30d}&limit=10
 * Returns top performing dishes by views
 */
async function handleTopDishes(env, restaurantId, url) {
  const params = new URLSearchParams(url.search);
  const period = params.get('period') || '7d';
  const limit = Math.min(parseInt(params.get('limit') || '10'), 50);

  const days = period === '7d' ? 7 : 30;
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = getDateOffset(endDate, -(days - 1));

  // Get previous period for trend calculation
  const prevEndDate = getDateOffset(endDate, -days);
  const prevStartDate = getDateOffset(endDate, -(days * 2 - 1));

  // Fetch top dishes with current period views
  const topDishes = await env.DB.prepare(`
    SELECT 
      d.id as dishId,
      COALESCE(SUM(ddm.views), 0) as views,
      COALESCE(AVG(ddm.avg_dwell_seconds), 0) as avgDwell
    FROM dishes d
    LEFT JOIN dish_daily_metrics ddm ON d.id = ddm.dish_id 
      AND ddm.date BETWEEN ? AND ?
    WHERE d.restaurant_id = ?
      AND d.status = 'active'
    GROUP BY d.id
    HAVING views > 0
    ORDER BY views DESC
    LIMIT ?
  `).bind(startDate, endDate, restaurantId, limit).all();

  // Enhance with names and trend data
  const enrichedDishes = await Promise.all(
    topDishes.results.map(async (dish) => {
      // Get dish name from translations
      const nameRow = await env.DB.prepare(`
        SELECT value as name
        FROM translations
        WHERE entity_id = ?
          AND entity_type = 'dish'
          AND field = 'name'
          AND language_code = 'es'
        LIMIT 1
      `).bind(dish.dishId).first();

      // Get thumbnail from dish_media
      const mediaRow = await env.DB.prepare(`
        SELECT r2_key
        FROM dish_media
        WHERE dish_id = ?
          AND (role = 'PRIMARY_IMAGE' OR is_primary = 1)
        ORDER BY is_primary DESC, order_index ASC
        LIMIT 1
      `).bind(dish.dishId).first();

      // Calculate previous period views for trend
      const prevViews = await env.DB.prepare(`
        SELECT COALESCE(SUM(views), 0) as views
        FROM dish_daily_metrics
        WHERE dish_id = ?
          AND date BETWEEN ? AND ?
      `).bind(dish.dishId, prevStartDate, prevEndDate).first();

      const trend = calculatePercentageChange(prevViews.views, dish.views);

      return {
        dishId: dish.dishId,
        dishName: nameRow?.name || 'Sin nombre',
        views: Math.round(dish.views),
        trend: Number(trend.toFixed(1)),
        thumbnailUrl: mediaRow?.r2_key ? `/media/${mediaRow.r2_key}` : null,
        avgDwell: Math.round(dish.avgDwell)
      };
    })
  );

  return createResponse({
    success: true,
    topViewed: enrichedDishes,
    period: period,
    dateRange: { start: startDate, end: endDate }
  });
}

/**
 * GET /restaurants/:id/analytics/qr-breakdown
 * Returns QR code scan statistics
 */
async function handleQRBreakdown(env, restaurantId) {
  const qrStats = await env.DB.prepare(`
    SELECT 
      qr.id as qrCode,
      qr.location,
      COUNT(DISTINCT qs.id) as scans,
      COUNT(DISTINCT qs.session_id) as uniqueUsers,
      MAX(qs.scanned_at) as lastScan
    FROM qr_codes qr
    LEFT JOIN qr_scans qs ON qr.id = qs.qr_code_id
    WHERE qr.restaurant_id = ?
    GROUP BY qr.id, qr.location
    HAVING scans > 0
    ORDER BY scans DESC
  `).bind(restaurantId).all();

  return createResponse({
    success: true,
    qrStats: qrStats.results.map(stat => ({
      qrCode: stat.qrCode,
      location: stat.location || 'Sin ubicación',
      scans: stat.scans,
      uniqueUsers: stat.uniqueUsers,
      lastScan: stat.lastScan
    }))
  });
}

/**
 * GET /restaurants/:id/content/health
 * Returns content completeness metrics
 */
async function handleContentHealth(env, restaurantId) {
  // Total dishes count
  const totalDishes = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM dishes
    WHERE restaurant_id = ?
      AND status != 'hidden'
  `).bind(restaurantId).first();

  // Dishes with primary video
  const withVideo = await env.DB.prepare(`
    SELECT COUNT(DISTINCT dish_id) as count
    FROM dish_media
    WHERE dish_id IN (
      SELECT id FROM dishes WHERE restaurant_id = ? AND status != 'hidden'
    )
    AND role = 'PRIMARY_VIDEO'
  `).bind(restaurantId).first();

  // Dishes with primary image
  const withImage = await env.DB.prepare(`
    SELECT COUNT(DISTINCT dish_id) as count
    FROM dish_media
    WHERE dish_id IN (
      SELECT id FROM dishes WHERE restaurant_id = ? AND status != 'hidden'
    )
    AND (role = 'PRIMARY_IMAGE' OR is_primary = 1)
  `).bind(restaurantId).first();

  // Inactive dishes
  const inactiveDishes = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM dishes
    WHERE restaurant_id = ?
      AND status IN ('hidden', 'out_of_stock')
  `).bind(restaurantId).first();

  // Orphan media (media without dish)
  const orphanMedia = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM dish_media
    WHERE dish_id NOT IN (
      SELECT id FROM dishes WHERE restaurant_id = ?
    )
  `).bind(restaurantId).first();

  const total = totalDishes.count;
  const complete = Math.min(withVideo.count, withImage.count); // Both video and image
  const missingVideo = total - withVideo.count;
  const missingThumbnail = total - withImage.count;

  return createResponse({
    success: true,
    totalDishes: total,
    completeCount: complete,
    missingVideo: missingVideo,
    missingThumbnail: missingThumbnail,
    orphanMedia: orphanMedia.count,
    inactiveDishes: inactiveDishes.count,
    completionPercentage: total > 0 ? Math.round((complete / total) * 100) : 0
  });
}

/**
 * GET /restaurants/:id/dishes/stagnant?days=7
 * Returns dishes with low/no views in recent period
 */
async function handleStagnantDishes(env, restaurantId, url) {
  const params = new URLSearchParams(url.search);
  const days = parseInt(params.get('days') || '7');

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = getDateOffset(endDate, -(days - 1));

  // Find dishes with no views in the period
  const stagnantDishes = await env.DB.prepare(`
    SELECT 
      d.id,
      d.created_at,
      COALESCE(SUM(ddm.views), 0) as recentViews,
      d.view_count as totalViews
    FROM dishes d
    LEFT JOIN dish_daily_metrics ddm ON d.id = ddm.dish_id
      AND ddm.date BETWEEN ? AND ?
    WHERE d.restaurant_id = ?
      AND d.status = 'active'
    GROUP BY d.id
    HAVING recentViews = 0
    ORDER BY d.created_at DESC
    LIMIT 20
  `).bind(startDate, endDate, restaurantId).all();

  // Enrich with names and last view date
  const enrichedDishes = await Promise.all(
    stagnantDishes.results.map(async (dish) => {
      const nameRow = await env.DB.prepare(`
        SELECT value as name
        FROM translations
        WHERE entity_id = ?
          AND entity_type = 'dish'
          AND field = 'name'
          AND language_code = 'es'
        LIMIT 1
      `).bind(dish.id).first();

      // Get last view date from dish_daily_metrics
      const lastViewRow = await env.DB.prepare(`
        SELECT MAX(date) as lastView
        FROM dish_daily_metrics
        WHERE dish_id = ?
          AND views > 0
      `).bind(dish.id).first();

      const lastView = lastViewRow?.lastView || dish.created_at;
      const daysSinceView = Math.floor(
        (new Date() - new Date(lastView)) / (1000 * 60 * 60 * 24)
      );

      return {
        id: dish.id,
        name: nameRow?.name || 'Sin nombre',
        lastView: lastView,
        daysSinceView: daysSinceView,
        totalViews: dish.totalViews
      };
    })
  );

  return createResponse({
    success: true,
    dishes: enrichedDishes,
    period: {
      days: days,
      start: startDate,
      end: endDate
    }
  });
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Calculate percentage change between two values
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value
 * @returns {number} Percentage change
 */
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) {
    return newValue > 0 ? 100 : 0;
  }
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Get date offset by days
 * @param {string} dateStr - Date in YYYY-MM-DD format
    const response = await handleDashboardRequests(request, env);
    return response || new Response("Not Found", { status: 404 });
  }
};
