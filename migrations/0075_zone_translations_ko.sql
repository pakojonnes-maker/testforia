-- =====================================================
-- COSTA DEL SOL ZONES — KOREAN DESCRIPTIONS — MIGRATION 0075
-- =====================================================
-- Zone-level description translations. Final language migration — all 13 languages complete.
-- The guide header pulls this via entity_type='zone'.
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

('zone_malaga', 'zone', 'ko', 'description', '태양 해안의 수도: 고고학 기념물이 있는 웅대한 역사 중심부, 세계 수준의 박물관(피카소, 퐁피두, 티센), 재개발된 항구. 피카소의 고향.'),

('zone_torremolinos', 'zone', 'ko', 'description', '태양 해안의 관광 개척자. 넓게 펼쳐진 해변, 어촌 지구 라 카리우엘라, 낮과 밤 모두 활발한 분위기.'),

('zone_fuengirola', 'zone', 'ko', 'description', '8km 이상의 도시 해변, 활기찬 해변 산책로, 스페인에서 가장 유명한 몰입형 동물원 중 하나인 비오파르크.'),

('zone_mijas', 'zone', 'ko', 'description', '태양 해안의 가장 특징적인 "하얀 마을"로 산에 위치하여 지중해를 내려다보며 꽃이 피는 거리와 유명한 당나귀 택시가 있습니다.'),

('zone_marbella', 'zone', 'ko', 'description', '럭셔리, 완벽한 안달루시아 구도시, 풍부하지만 알려지지 않은 로마 유산. 푸에르토 바누스와 산 페드로 데 알칸타라를 포함합니다.'),

('zone_benalmadena', 'zone', 'ko', 'description', '태양 해안의 진주인 베날마데나는 파란 깃발 해변, 활기찬 푸에르토 마리나, 독특한 랜드마크, 매력적인 구도시를 결합합니다. 지하철로 말라가 시내 중심에서 20분.');
