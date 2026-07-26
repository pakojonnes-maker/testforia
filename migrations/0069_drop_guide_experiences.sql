-- =====================================================
-- DROP LEGACY guide_experiences TABLE — MIGRATION 0069
-- =====================================================
-- guide_experiences was superseded by the unified guide_pois table
-- (is_bookable = 1 discriminator, migration 0059) back in this session.
-- No live worker code references guide_experiences anymore (verified via
-- repo-wide search; the only remaining hit is scratch.js, a throwaway file
-- per CLAUDE.md §7, not part of the deployed worker bundle).
--
-- The table still held 3 old demo rows (zone_nerja: adventure/cooking) that
-- predate the Costa del Sol catalog and were never migrated into guide_pois.
-- Confirmed disposable by the user (2026-07-26) — Nerja isn't part of the
-- current catalog and this was throwaway demo data.
-- =====================================================

DROP TABLE IF EXISTS guide_experiences;
