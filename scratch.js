// ============================================
// APARTMENT POIS
// ============================================
async function checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds) {
    const apt = await env.DB.prepare('SELECT agency_id, slug FROM guide_apartments WHERE id = ?').bind(aptId).first();
    if (!apt) return { error: errorResponse('Apartment not found', 404) };
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return { error: errorResponse('Forbidden', 403) };
    return { apt };
}

async function listApartmentPois(env, aptId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const result = await env.DB.prepare(`
        SELECT gap.poi_id, gap.order_override, p.* 
        FROM guide_apartment_pois gap
        JOIN guide_pois p ON gap.poi_id = p.id
        WHERE gap.apartment_id = ?
        ORDER BY gap.order_override ASC
    `).bind(aptId).all();

    return jsonResponse({ success: true, pois: result.results || [] });
}

async function assignApartmentPoi(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.poi_id) return errorResponse('poi_id required');

    await env.DB.prepare(`
        INSERT INTO guide_apartment_pois (apartment_id, poi_id, order_override)
        VALUES (?, ?, ?)
        ON CONFLICT(apartment_id, poi_id) DO UPDATE SET order_override = excluded.order_override
    `).bind(aptId, data.poi_id, data.order_override || 0).run();

    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function reorderApartmentPois(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.items || !Array.isArray(data.items)) return errorResponse('items array required');

    const statements = data.items.map(i => 
        env.DB.prepare('UPDATE guide_apartment_pois SET order_override = ? WHERE apartment_id = ? AND poi_id = ?')
        .bind(i.order_override, aptId, i.poi_id)
    );
    if (statements.length > 0) await env.DB.batch(statements);

    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function removeApartmentPoi(env, aptId, poiId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    await env.DB.prepare('DELETE FROM guide_apartment_pois WHERE apartment_id = ? AND poi_id = ?').bind(aptId, poiId).run();
    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// ============================================
// GUIDE INFO STEPS
// ============================================
async function listGuideInfoSteps(env, aptId, infoId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const result = await env.DB.prepare('SELECT * FROM guide_info_steps WHERE info_id = ? ORDER BY step_number ASC').bind(infoId).all();
    return jsonResponse({ success: true, steps: result.results || [] });
}

async function createGuideInfoStep(env, aptId, infoId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const id = generateId('step');
    await env.DB.prepare(`
        INSERT INTO guide_info_steps (id, info_id, step_number, has_checklist)
        VALUES (?, ?, ?, ?)
    `).bind(id, infoId, data.step_number || 0, data.has_checklist ? 1 : 0).run();

    if (data.title_es || data.content_es || data.checklist_items_es) {
        await saveTranslations(env, id, 'guide_step', {
            es: { title: data.title_es, content: data.content_es, checklist_items: data.checklist_items_es },
            en: { title: data.title_en, content: data.content_en, checklist_items: data.checklist_items_en }
        });
    }

    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true, id });
}

async function reorderGuideInfoSteps(env, aptId, infoId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.items || !Array.isArray(data.items)) return errorResponse('items array required');

    const statements = data.items.map(i => 
        env.DB.prepare('UPDATE guide_info_steps SET step_number = ? WHERE id = ? AND info_id = ?')
        .bind(i.step_number, i.id, infoId)
    );
    if (statements.length > 0) await env.DB.batch(statements);

    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function updateGuideInfoStep(env, aptId, infoId, stepId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const sets = [];
    const vals = [];
    if (data.step_number !== undefined) { sets.push('step_number = ?'); vals.push(data.step_number); }
    if (data.has_checklist !== undefined) { sets.push('has_checklist = ?'); vals.push(data.has_checklist ? 1 : 0); }
    if (sets.length > 0) {
        vals.push(stepId);
        await env.DB.prepare(`UPDATE guide_info_steps SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }

    if (data.title_es || data.content_es || data.checklist_items_es) {
        await saveTranslations(env, stepId, 'guide_step', {
            es: { title: data.title_es, content: data.content_es, checklist_items: data.checklist_items_es },
            en: { title: data.title_en, content: data.content_en, checklist_items: data.checklist_items_en }
        });
    }

    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function deleteGuideInfoStep(env, aptId, infoId, stepId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    await env.DB.prepare('DELETE FROM guide_info_steps WHERE id = ?').bind(stepId).run();
    await env.DB.prepare('DELETE FROM translations WHERE entity_id = ? AND entity_type = ?').bind(stepId, 'guide_step').run();

    await invalidateGuideCache(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// ============================================
// COMMISSIONS
// ============================================
async function listCommissions(env, agencyId, params) {
    let query = \`
        SELECT c.*, a.name as agency_name
        FROM guide_commissions c
        LEFT JOIN guide_agencies a ON c.agency_id = a.id
        WHERE 1=1
    \`;
    const qParams = [];
    
    if (agencyId) { query += ' AND c.agency_id = ?'; qParams.push(agencyId); }
    if (params.get('status')) { query += ' AND c.status = ?'; qParams.push(params.get('status')); }
    if (params.get('from')) { query += ' AND c.created_at >= ?'; qParams.push(params.get('from') + 'T00:00:00'); }
    if (params.get('to')) { query += ' AND c.created_at <= ?'; qParams.push(params.get('to') + 'T23:59:59'); }

    query += ' ORDER BY c.created_at DESC';
    const result = await env.DB.prepare(query).bind(...qParams).all();
    return jsonResponse({ success: true, commissions: result.results || [] });
}

async function getCommissionsSummary(env, agencyId) {
    let query = \`
        SELECT status, COUNT(*) as count, SUM(amount) as total_amount
        FROM guide_commissions
        WHERE 1=1
    \`;
    const params = [];
    if (agencyId) { query += ' AND agency_id = ?'; params.push(agencyId); }
    query += ' GROUP BY status';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, summary: result.results || [] });
}

async function updateCommission(env, id, data, isSuperAdmin, userAgencyIds) {
    const comm = await env.DB.prepare('SELECT agency_id FROM guide_commissions WHERE id = ?').bind(id).first();
    if (!comm) return errorResponse('Not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(comm.agency_id)) return errorResponse('Forbidden', 403);

    const sets = [];
    const vals = [];
    if (data.status) { sets.push('status = ?'); vals.push(data.status); }
    if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
    
    if (sets.length === 0) return errorResponse('No fields to update');
    vals.push(id);
    await env.DB.prepare(\`UPDATE guide_commissions SET \${sets.join(', ')} WHERE id = ?\`).bind(...vals).run();
    return jsonResponse({ success: true });
}

// ============================================
// ENHANCED STATS
// ============================================
async function getStatsDashboard(env, agencyId, params) {
    const fromTs = params.get('from') ? params.get('from') + 'T00:00:00' : new Date(Date.now() - 30 * 86400000).toISOString();
    const toTs = params.get('to') ? params.get('to') + 'T23:59:59' : new Date().toISOString();

    const apartments = await env.DB.prepare('SELECT id, name FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE').bind(agencyId).all();
    const aptIds = (apartments.results || []).map(a => a.id);
    if (aptIds.length === 0) return jsonResponse({ success: true, dashboard: {} });

    const placeholders = aptIds.map(() => '?').join(',');

    const [sessions, devices, intents, languages, exps, aptActivity] = await Promise.all([
        env.DB.prepare(\`SELECT COUNT(*) as c, AVG(duration_seconds) as d, DATE(started_at) as date FROM guide_sessions WHERE apartment_id IN (\${placeholders}) AND started_at BETWEEN ? AND ? GROUP BY DATE(started_at)\`).bind(...aptIds, fromTs, toTs).all(),
        env.DB.prepare(\`SELECT COUNT(DISTINCT device_fingerprint) as c FROM guide_sessions WHERE apartment_id IN (\${placeholders}) AND started_at BETWEEN ? AND ? AND device_fingerprint IS NOT NULL\`).bind(...aptIds, fromTs, toTs).first(),
        env.DB.prepare(\`SELECT COUNT(*) as c FROM guide_affiliate_intents WHERE agency_id = ? AND created_at BETWEEN ? AND ?\`).bind(agencyId, fromTs, toTs).first(),
        env.DB.prepare(\`SELECT language_code as code, COUNT(*) as count FROM guide_sessions WHERE apartment_id IN (\${placeholders}) AND started_at BETWEEN ? AND ? GROUP BY language_code\`).bind(...aptIds, fromTs, toTs).all(),
        env.DB.prepare(\`SELECT e.id, e.name, COUNT(i.id) as clicks FROM guide_experiences e JOIN guide_affiliate_intents i ON e.id = i.target_id WHERE i.target_type = 'experience' AND i.agency_id = ? AND i.created_at BETWEEN ? AND ? GROUP BY e.id ORDER BY clicks DESC LIMIT 5\`).bind(agencyId, fromTs, toTs).all(),
        env.DB.prepare(\`SELECT apartment_id, COUNT(DISTINCT device_fingerprint) as unique_devices_today, MAX(started_at) as last_session_at FROM guide_sessions WHERE apartment_id IN (\${placeholders}) AND started_at >= date('now') GROUP BY apartment_id\`).bind(...aptIds).all()
    ]);

    const totalSessions = (sessions.results || []).reduce((sum, r) => sum + r.c, 0);
    const avgDuration = (sessions.results || []).reduce((sum, r) => sum + r.d, 0) / (sessions.results?.length || 1);
    const totalIntents = intents?.c || 0;

    return jsonResponse({
        success: true,
        dashboard: {
            total_sessions: totalSessions,
            unique_devices: devices?.c || 0,
            avg_duration_seconds: Math.round(avgDuration),
            total_intents: totalIntents,
            conversion_rate: totalSessions > 0 ? (totalIntents / totalSessions) : 0,
            sessions_by_day: (sessions.results || []).map(r => ({ date: r.date, count: r.c })),
            languages: languages.results || [],
            top_experiences: exps.results || [],
            apartments_activity: (apartments.results || []).map(a => {
                const act = (aptActivity.results || []).find(ac => ac.apartment_id === a.id);
                return { id: a.id, name: a.name, unique_devices_today: act?.unique_devices_today || 0, last_session_at: act?.last_session_at || null };
            })
        }
    });
}

async function getStatsDevices(env, aptId, params, isSuperAdmin, userAgencyIds) {
    if (!aptId) return errorResponse('apartment_id required');
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const date = params.get('date') || new Date().toISOString().split('T')[0];
    const sessions = await env.DB.prepare(\`
        SELECT device_fingerprint, started_at, language_code as language, country_code as country
        FROM guide_sessions
        WHERE apartment_id = ? AND DATE(started_at) = ? AND device_fingerprint IS NOT NULL
        ORDER BY started_at DESC
    \`).bind(aptId, date).all();

    const uniqueDevices = new Set((sessions.results || []).map(s => s.device_fingerprint)).size;

    return jsonResponse({
        success: true,
        date,
        unique_devices: uniqueDevices,
        sessions: (sessions.results || []).map(s => ({ started_at: s.started_at, language: s.language, country: s.country }))
    });
}

async function getStatsExperiences(env, zoneId, params) {
    if (!zoneId) return errorResponse('zone_id required');
    const fromTs = params.get('from') ? params.get('from') + 'T00:00:00' : new Date(Date.now() - 30 * 86400000).toISOString();
    const toTs = params.get('to') ? params.get('to') + 'T23:59:59' : new Date().toISOString();

    const exps = await env.DB.prepare(\`
        SELECT e.id, e.name, e.action_type, COUNT(i.id) as clicks, SUM(i.commission_value) as commission_earned
        FROM guide_experiences e
        LEFT JOIN guide_affiliate_intents i ON e.id = i.target_id AND i.target_type = 'experience' AND i.created_at BETWEEN ? AND ?
        WHERE e.zone_id = ?
        GROUP BY e.id
        ORDER BY clicks DESC
    \`).bind(fromTs, toTs, zoneId).all();

    return jsonResponse({ success: true, experiences: exps.results || [] });
}

// ============================================
// POI MEDIA
// ============================================
async function addPoiMedia(env, poiId, request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return errorResponse('file required');

        const ext = file.name.split('.').pop();
        const uuid = generateId('');
        const r2Key = \`guide/pois/\${poiId}/\${uuid}.\${ext}\`;

        await env.R2_BUCKET.put(r2Key, file.stream(), {
            httpMetadata: { contentType: file.type }
        });

        const id = generateId('pm');
        await env.DB.prepare(\`
            INSERT INTO guide_poi_media (id, poi_id, r2_key, media_type)
            VALUES (?, ?, ?, 'image')
        \`).bind(id, poiId, r2Key).run();

        return jsonResponse({ success: true, id, r2_key: r2Key });
    } catch (err) {
        return errorResponse('Upload failed: ' + err.message, 500);
    }
}

async function deletePoiMedia(env, poiId, mediaId) {
    const media = await env.DB.prepare('SELECT r2_key FROM guide_poi_media WHERE id = ? AND poi_id = ?').bind(mediaId, poiId).first();
    if (!media) return errorResponse('Not found', 404);

    await env.R2_BUCKET.delete(media.r2_key);
    await env.DB.prepare('DELETE FROM guide_poi_media WHERE id = ?').bind(mediaId).run();

    return jsonResponse({ success: true });
}
