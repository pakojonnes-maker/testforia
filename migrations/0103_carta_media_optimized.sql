-- 0103: medios de las cartas, ya optimizados (datos de producción, 2026-10-03).
--
-- Qué hace, sobre dish_media de los 4 restaurantes activos (89 filas):
--   - 46 fotos recomprimidas a WebP de 1600 px como mucho (p. ej. los PNG de 7 MB de Bon Bon
--     Jazz pasan a 72-87 KB) y 14 vídeos con el índice (moov) delante de los datos, sin
--     recodificar. Van a CLAVES NUEVAS de R2 (-opt.webp, -fs.mp4) ya subidas; los originales
--     siguen en R2 y 0103_carta_media_optimized.rollback.sql vuelve a apuntar a ellos.
--   - Medidas reales en todas las filas: había 62 con 800x600 y 22 con 1280x720 inventados por
--     el antiguo getDimensionsFromBuffer (casi todos los vídeos son verticales).
--   - Borra 25 filas de Yucas cuyos ficheros no existen en R2 (404): la carta los pedía y
--     saltaba al siguiente. El rollback las vuelve a crear.
-- Generado con lib/mediaPrep.ts (el mismo código que usa el admin al subir); comprobado en
-- Chrome que los vídeos nuevos se reproducen con la misma duración y medidas.
-- Tras aplicarla: subir ver:restaurant:{slug} de cada carta (la respuesta de /reels va en KV).
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 39786, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_bon_bon/thumbnails/media_1771160218713_7sf9m-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771160218713_7sf9m';
UPDATE dish_media SET width = 1080, height = 1920, duration = 8000, file_size = 7925864, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_brownie/videos/media_1771163800310_auel3-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1771163800310_auel3';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 40508, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_closing/thumbnails/media_1771160152882_mqrtf-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771160152882_mqrtf';
UPDATE dish_media SET width = 1024, height = 559, duration = NULL, file_size = 33730, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_cloud_lily/thumbnails/media_1771158476512_si6ud-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771158476512_si6ud';
UPDATE dish_media SET width = 1280, height = 720, duration = 8000, file_size = 1566182, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_gilda/videos/media_1771163591841_33ag7-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1771163591841_33ag7';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 49218, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_grannys/thumbnails/media_1771162048980_k5i2m-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771162048980_k5i2m';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 41654, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_kiwi_fizz/thumbnails/media_1771162071902_y191o-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771162071902_y191o';
UPDATE dish_media SET width = 893, height = 1600, duration = NULL, file_size = 72312, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_mai_tai/thumbnails/media_1771159101897_ncpuu-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771159101897_ncpuu';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 36484, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_manhattan/thumbnails/media_1771160182304_hexdh-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771160182304_hexdh';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 40426, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_nojito/thumbnails/media_1771162093814_vrmqs-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771162093814_vrmqs';
UPDATE dish_media SET width = 893, height = 1600, duration = NULL, file_size = 87464, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_old_fashioned/thumbnails/media_1771158938711_nqig3-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771158938711_nqig3';
UPDATE dish_media SET width = 1024, height = 559, duration = NULL, file_size = 32990, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_pisco_sour/thumbnails/media_1771158499893_sdpud-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771158499893_sdpud';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 40148, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_pornstar/thumbnails/media_1771159958594_zap0l-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771159958594_zap0l';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 2324243, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_quiche/videos/media_1771163832182_959gv-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1771163832182_959gv';
UPDATE dish_media SET width = 572, height = 1024, duration = NULL, file_size = 44362, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_singapore/thumbnails/media_1771160084295_ihl2h-opt.webp', content_type = 'image/webp' WHERE id = 'media_1771160084295_ihl2h';
UPDATE dish_media SET width = 1080, height = 1920, duration = 8000, file_size = 6006886, r2_key = 'restaurants/rest_bonbonjazz/dishes/dish_bbj_tabla_esp/videos/media_1771163559952_n7apu-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1771163559952_n7apu';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 2885397, r2_key = 'restaurants/rest_wawcafe_01/dishes/dish_1767124055951_yb72n/videos/media_1767124123128_hlw1r-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767124123128_hlw1r';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 1911506, r2_key = 'restaurants/rest_wawcafe_01/dishes/dish_1767124215700_0u7xh/videos/media_1767124242145_zktkb-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767124242145_zktkb';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 2164647, r2_key = 'restaurants/rest_wawcafe_01/dishes/dish_waw_croissant/videos/media_1767124371301_5prny-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767124371301_5prny';
UPDATE dish_media SET width = 1346, height = 1038, duration = NULL, file_size = 51816, r2_key = 'restaurants/rest_wawcafe_01/dishes/dish_waw_latte/thumbnails/media_1767122404812_9gczq-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767122404812_9gczq';
UPDATE dish_media SET width = 1280, height = 720, duration = 8000, file_size = 1562916, r2_key = 'restaurants/rest_wawcafe_01/dishes/dish_waw_latte/videos/media_1767122316068_zj945-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767122316068_zj945';
UPDATE dish_media SET width = 1280, height = 720, duration = 8000, file_size = 1697787, r2_key = 'restaurants/rest_wawcafe_01/dishes/dish_waw_matcha/videos/media_1767122648761_d65hx-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767122648761_d65hx';
UPDATE dish_media SET width = 667, height = 656, duration = NULL, file_size = 60070, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_cheese/thumbnails/media_1768818695191_u9rn7-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818695191_u9rn7';
UPDATE dish_media SET width = 651, height = 695, duration = NULL, file_size = 70010, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_cheese_gf/thumbnails/media_1768818728366_97efo-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818728366_97efo';
UPDATE dish_media SET width = 647, height = 647, duration = NULL, file_size = 52280, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_chicken/thumbnails/media_1768818862733_zzyck-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818862733_zzyck';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 3870757, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_chicken/videos/media_1767882887817_0u0dk-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767882887817_0u0dk';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 30972, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_classic/thumbnails/media_1767885237377_tn3x5-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885237377_tn3x5';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 3773211, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_classic/videos/media_1767883228832_gsctf-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767883228832_gsctf';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 28920, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_classic_gf/thumbnails/media_1768322584998_26o91-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768322584998_26o91';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 3773211, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_classic_gf/videos/media_1767883261231_q8eoc-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767883261231_q8eoc';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 12026, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_coke/thumbnails/media_1767885733560_zn57f-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885733560_zn57f';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 13076, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_coke_00/thumbnails/media_1767885765064_3rrwc-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885765064_3rrwc';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 11452, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_coke_zero/thumbnails/media_1767885747611_qi9xc-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885747611_qi9xc';
UPDATE dish_media SET width = 683, height = 478, duration = NULL, file_size = 42630, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_croq/thumbnails/media_1768818832906_23cn8-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818832906_23cn8';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 11782, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_fanta_lemon/thumbnails/media_1767885826290_upfdb-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885826290_upfdb';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 15116, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_fanta_orange/thumbnails/media_1767885837453_2u0sp-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885837453_2u0sp';
UPDATE dish_media SET width = 698, height = 643, duration = NULL, file_size = 80984, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_kentucky/thumbnails/media_1768818949499_iiiao-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818949499_iiiao';
UPDATE dish_media SET width = 685, height = 483, duration = NULL, file_size = 30910, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_kids_cheese/thumbnails/media_1768819050187_bc506-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768819050187_bc506';
UPDATE dish_media SET width = 703, height = 598, duration = NULL, file_size = 43716, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_kids_pops/thumbnails/media_1768819114456_n21f8-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768819114456_n21f8';
UPDATE dish_media SET width = 692, height = 563, duration = NULL, file_size = 26892, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_kids_smash/thumbnails/media_1768819086551_feyvq-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768819086551_feyvq';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 14734, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_mayo_xp/thumbnails/media_1767883928221_2ejhq-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767883928221_2ejhq';
UPDATE dish_media SET width = 702, height = 510, duration = NULL, file_size = 58450, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_new_fries/thumbnails/media_1768818788765_92hw2-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818788765_92hw2';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 26380, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_salsa_bbq/thumbnails/media_1767883981379_228bi-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767883981379_228bi';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 16550, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_salsa_trufa/thumbnails/media_1767883950292_4dyot-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767883950292_4dyot';
UPDATE dish_media SET width = 651, height = 695, duration = NULL, file_size = 70010, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_smashchkn/thumbnails/media_1768819195464_gofe0-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768819195464_gofe0';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 5257374, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_smashchkn/videos/media_1767883092774_cguh2-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767883092774_cguh2';
UPDATE dish_media SET width = 641, height = 690, duration = NULL, file_size = 67344, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_veggie/thumbnails/media_1768818895577_ma2po-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768818895577_ma2po';
UPDATE dish_media SET width = 500, height = 500, duration = NULL, file_size = 14268, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_water/thumbnails/media_1767885856041_8rrc5-opt.webp', content_type = 'image/webp' WHERE id = 'media_1767885856041_8rrc5';
UPDATE dish_media SET width = 655, height = 650, duration = NULL, file_size = 73364, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_xpace/thumbnails/media_1768753981454_m5uje-opt.webp', content_type = 'image/webp' WHERE id = 'media_1768753981454_m5uje';
UPDATE dish_media SET width = 720, height = 1280, duration = 8000, file_size = 6398226, r2_key = 'restaurants/rest_xpecado/dishes/dish_xp_xpace/videos/media_1767883370630_khnyq-fs.mp4', content_type = 'video/mp4' WHERE id = 'media_1767883370630_khnyq';
DELETE FROM dish_media WHERE id = 'media_yucas_arepa_02';
UPDATE dish_media SET width = 515, height = 861, duration = NULL, file_size = 26824, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_arepa/gallery/media_1764100237632_zw9n7-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764100237632_zw9n7';
DELETE FROM dish_media WHERE id = 'media_yucas_arepa_01';
DELETE FROM dish_media WHERE id = 'media_yucas_batido_01';
UPDATE dish_media SET width = 1080, height = 850, duration = NULL, file_size = 30798, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_batido/thumbnails/media_1755380419886_6qtqx-opt.webp', content_type = 'image/webp' WHERE id = 'media_1755380419886_6qtqx';
UPDATE dish_media SET width = 576, height = 1024, duration = 32660, file_size = 4008127 WHERE id = 'media_1755380352358_2pwqy';
DELETE FROM dish_media WHERE id = 'media_yucas_cazuela_02';
DELETE FROM dish_media WHERE id = 'media_yucas_cazuela_01';
DELETE FROM dish_media WHERE id = 'media_yucas_empanadas_01';
DELETE FROM dish_media WHERE id = 'media_yucas_guacamole_01';
DELETE FROM dish_media WHERE id = 'media_yucas_lomo_01';
UPDATE dish_media SET width = 576, height = 1024, duration = 33969, file_size = 3677755 WHERE id = 'media_1755367866813_042v6';
DELETE FROM dish_media WHERE id = 'media_yucas_mojito_02';
UPDATE dish_media SET width = 817, height = 838, duration = NULL, file_size = 85736, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_mojito/thumbnails/media_1765108182300_4kojh-opt.webp', content_type = 'image/webp' WHERE id = 'media_1765108182300_4kojh';
DELETE FROM dish_media WHERE id = 'thumb_media_yucas_mojito_01';
DELETE FROM dish_media WHERE id = 'media_yucas_mojito_01';
UPDATE dish_media SET width = 576, height = 1024, duration = 24635, file_size = 2493640 WHERE id = 'media_1758987343158_gwmni';
DELETE FROM dish_media WHERE id = 'media_yucas_pabellon_02';
DELETE FROM dish_media WHERE id = 'media_yucas_pabellon_03';
UPDATE dish_media SET width = 623, height = 705, duration = NULL, file_size = 40478, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/gallery/media_1764077588922_st3fz-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764077588922_st3fz';
UPDATE dish_media SET width = 530, height = 869, duration = NULL, file_size = 31092, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/thumbnails/media_1764073676186_x6urj-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764073676186_x6urj';
UPDATE dish_media SET width = 713, height = 810, duration = NULL, file_size = 89092, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/thumbnails/media_1764073788794_rw7ib-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764073788794_rw7ib';
DELETE FROM dish_media WHERE id = 'thumb_media_yucas_pabellon_01';
UPDATE dish_media SET width = 576, height = 1024, duration = 45012, file_size = 5188124 WHERE id = 'media_yucas_pabellon_01';
DELETE FROM dish_media WHERE id = 'media_yucas_papelón_01';
DELETE FROM dish_media WHERE id = 'media_yucas_pina_colada_01';
UPDATE dish_media SET width = 375, height = 668, duration = NULL, file_size = 24218, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_quesillo/thumbnails/media_1764077956925_vqemg-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764077956925_vqemg';
DELETE FROM dish_media WHERE id = 'media_yucas_tequeños_02';
DELETE FROM dish_media WHERE id = 'thumb_media_yucas_tequeños_01';
DELETE FROM dish_media WHERE id = 'media_yucas_tequeños_01';
DELETE FROM dish_media WHERE id = 'media_yucas_tres_leches_02';
DELETE FROM dish_media WHERE id = 'media_yucas_tres_leches_03';
UPDATE dish_media SET width = 429, height = 718, duration = NULL, file_size = 35978, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/gallery/media_1764084852105_upqz4-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764084852105_upqz4';
UPDATE dish_media SET width = 383, height = 335, duration = NULL, file_size = 20218, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/gallery/media_1764084852595_2e7dd-opt.webp', content_type = 'image/webp' WHERE id = 'media_1764084852595_2e7dd';
UPDATE dish_media SET width = 472, height = 904, duration = NULL, file_size = 1322, r2_key = 'restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/thumbnails/media_1766502834540_bidbi-opt.webp', content_type = 'image/webp' WHERE id = 'media_1766502834540_bidbi';
DELETE FROM dish_media WHERE id = 'thumb_media_yucas_tres_leches_01';
DELETE FROM dish_media WHERE id = 'media_yucas_tres_leches_01';
DELETE FROM dish_media WHERE id = 'thumb_media_yucas_yuca_frita_01';
DELETE FROM dish_media WHERE id = 'media_yucas_yuca_frita_01';
