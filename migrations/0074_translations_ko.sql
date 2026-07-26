-- =====================================================
-- COSTA DEL SOL POIs — KOREAN TRANSLATIONS — MIGRATION 0074
-- =====================================================
-- Adds ko (Korean) translations (name, description, short_tip/cta_label) for the 74
-- POIs/experiences in the unified guide_pois table. All 13 languages now complete:
-- es/en/fr/de/it/pt/ca/ru/ar/uk/zh/ja/ko
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

-- ════════════════════════════════════════
-- MÁLAGA
-- ════════════════════════════════════════
('poi_malaga_alcazaba', 'poi', 'ko', 'name', '말라가 알카사바 성'),
('poi_malaga_alcazaba', 'poi', 'ko', 'description', '11세기 아랍 궁전식 요새로 스페인에서 가장 잘 보존된 예입니다. 정원, 해양을 보는 안뜰이 있으며 산자락에는 로마 극장이 있습니다.'),
('poi_malaga_alcazaba', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_atarazanas', 'poi', 'ko', 'name', '아타라자나스 시장'),
('poi_malaga_atarazanas', 'poi', 'ko', 'description', '옛 나스리 조선소 유지 위에 지어진 19세기 중앙 시장으로 웅대한 아르누보 스테인드 글라스 창을 특징으로 합니다. 신선한 생선, 햄, 타파스를 시장 내에서 즐길 수 있습니다.'),
('poi_malaga_atarazanas', 'poi', 'ko', 'short_tip', '혼잡을 피하려면 평일 아침을 권장합니다'),

('poi_malaga_casa_natal_picasso', 'poi', 'ko', 'name', '피카소 생가 박물관'),
('poi_malaga_casa_natal_picasso', 'poi', 'ko', 'description', '파블로 피카소가 1881년 태어난 집으로 메르세데 광장에 위치합니다. 당시의 가구, 초기 작품, 가족의 사적인 물건이 전시되어 있습니다.'),
('poi_malaga_casa_natal_picasso', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_catedral', 'poi', 'ko', 'name', '말라가 대성당("라 만키타")'),
('poi_malaga_catedral', 'poi', 'ko', 'description', '미완성 탑으로 알려진 르네상스 양식의 대성당으로 "라 만키타(한팔의 여성)"라는 애칭으로 불립니다. 지붕에 올라가면 역사 지구의 독특한 경치를 볼 수 있습니다.'),
('poi_malaga_catedral', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_cementerio_ingles', 'poi', 'ko', 'name', '영국인 공동묘지'),
('poi_malaga_cementerio_ingles', 'poi', 'ko', 'description', '스페인 최초의 개신교 공동묘지(1831년 건립)로 작가와 외교관이 묻혀있는 낭만적이고 고요한 정원식 공동묘지입니다. 말라게타 비치에서 불과 몇 걸음 거리.'),
('poi_malaga_cementerio_ingles', 'poi', 'ko', 'short_tip', '무료 입장, 월요일 휴무'),

('poi_malaga_concepcion', 'poi', 'ko', 'name', '라 콘셉시온 역사 식물원'),
('poi_malaga_concepcion', 'poi', 'ko', 'description', '문화 유산으로 지정된 19세기 아열대 정원으로 25헥타르 이상의 부지에 100년 이상 된 야자수와 거석 유적이 있습니다.'),
('poi_malaga_concepcion', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_cripta_victoria', 'poi', 'ko', 'name', '빅토리아 성당 지하 성당'),
('poi_malaga_cripta_victoria', 'poi', 'ko', 'description', '빅토리아 성당 아래에 숨겨진 보물: 니시와 웅대한 부에나비스타 백작 팬테온을 갖춘 바로크 양식의 지하 성당. 말라가 주민들도 거의 알지 못합니다.'),
('poi_malaga_cripta_victoria', 'poi', 'ko', 'short_tip', '지하 성당이 개방되어 있지 않으면 성물함실에 문의하세요 — 때때로 신청이 필요합니다'),

('poi_malaga_gibralfaro', 'poi', 'ko', 'name', '히브랄파로 성'),
('poi_malaga_gibralfaro', 'poi', 'ko', 'description', '동일한 이름의 언덕 위에 위치한 14세기 군사 요새로 성벽이 알카사바와 연결되어 있습니다. 360도 전망은 말라가 최고의 경치지 중 하나입니다.'),
('poi_malaga_gibralfaro', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_larios', 'poi', 'ko', 'name', '마르케스 데 라리오스 거리'),
('poi_malaga_larios', 'poi', 'ko', 'description', '역사 중심부의 주요 상업 보행자 거리로 19세기 말 건물이 줄지어 서있습니다. 크리스마스와 말라가 축제 기간에는 장식이 장관입니다.'),
('poi_malaga_larios', 'poi', 'ko', 'short_tip', '저녁 시간에는 거리 음악과 테라스 카페로 활발합니다'),

('poi_malaga_malagueta', 'poi', 'ko', 'name', '말라게타 비치'),
('poi_malaga_malagueta', 'poi', 'ko', 'description', '말라가 시를 대표하는 도시 해변으로 역사 중심부에서 도보 10분 거리. 검은 모래와 해변 바, 완벽한 해변 산책로가 있습니다.'),
('poi_malaga_malagueta', 'poi', 'ko', 'short_tip', '해변 바의 구이 정어리는 고전적인 음식입니다'),

('poi_malaga_mirador_gibralfaro', 'poi', 'ko', 'name', '히브랄파로 전망대'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ko', 'description', '성 옆의 무료 전망대로 도시, 항구, 말라게타 투우장의 최고의 전체 경치를 볼 수 있습니다.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ko', 'short_tip', '35번 버스를 타거나 시내 중심부에서 도보 30분 — 경치가 충분히 가치있습니다'),

('poi_malaga_muelle_uno', 'poi', 'ko', 'name', '무엘레 우노와 팔메랄 데 라스 소르프레사스'),
('poi_malaga_muelle_uno', 'poi', 'ko', 'description', '시내 중심부에 인접한 재개발된 항만 산책로로 정원, 상점, 테라스, 유람선 경치를 즐길 수 있습니다. 포뮤피도우 센터 말라가가 여기에 있습니다.'),
('poi_malaga_muelle_uno', 'poi', 'ko', 'short_tip', '히브랄파로 성을 바라보며 저녁 산책을 즐기기에 완벽합니다'),

('poi_malaga_museo_automovilistico', 'poi', 'ko', 'name', '자동차 & 패션 박물관'),
('poi_malaga_museo_automovilistico', 'poi', 'ko', 'description', '고전 자동차와 오뜨꾸뛔르, 모자를 결합한 독특한 컬렉션으로 개조된 옛 담배 공장에 전시되어 있습니다.'),
('poi_malaga_museo_automovilistico', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_museo_picasso', 'poi', 'ko', 'name', '말라가 피카소 미술관'),
('poi_malaga_museo_picasso', 'poi', 'ko', 'description', '부에나비스타 궁전에서 말라가 출신 예술가의 200점 이상의 작품을 전시하며 모두 피카소 가족의 기증입니다. 그의 예술적 진화를 이해하기 위해 반드시 방문해야 할 곳입니다.'),
('poi_malaga_museo_picasso', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_pasaje_chinitas', 'poi', 'ko', 'name', '파사헤 데 치니타스'),
('poi_malaga_pasaje_chinitas', 'poi', 'ko', 'description', '플라멩코와 페데리코 가르시아 로르카와 관련된 역사적인 골목으로 현재는 바와 타파스 바로 가득 차 있습니다. 헌법 광장 바로 옆.'),
('poi_malaga_pasaje_chinitas', 'poi', 'ko', 'short_tip', '시내 중심 관광 전후에 타파스를 즐기기에 좋은 장소입니다'),

('poi_malaga_plaza_constitucion', 'poi', 'ko', 'name', '헌법 광장'),
('poi_malaga_plaza_constitucion', 'poi', 'ko', 'description', '중세 이래 도시의 역사와 정치의 중심지이며 16세기 제노바 분수가 있습니다. 도보로 시내 중심을 탐험하기 위한 자연스러운 출발점.'),
('poi_malaga_plaza_constitucion', 'poi', 'ko', 'short_tip', '여러 무료 도보 투어가 여기에서 시작됩니다'),

('poi_malaga_plaza_merced', 'poi', 'ko', 'name', '메르세데 광장'),
('poi_malaga_plaza_merced', 'poi', 'ko', 'description', '피카소의 탄생지이며 토리호스 장군을 기리는 오벨리스크가 있는 넓은 아케이드 광장입니다. 테라스 카페로 둘러싸여 있으며 말라가 시민의 인기 있는 만남의 장소 중 하나입니다.'),
('poi_malaga_plaza_merced', 'poi', 'ko', 'short_tip', '피카소 생가 박물관은 이 광장 바로 옆에 있습니다'),

('poi_malaga_pompidou', 'poi', 'ko', 'name', '퐁피두 센터 말라가'),
('poi_malaga_pompidou', 'poi', 'ko', 'description', '프랑스 외 유일의 퐁피두 센터 분관으로 항구의 형형색색한 유리 큐브 건물로 유명합니다. 파리 컬렉션의 현대 및 현대미술을 전시합니다.'),
('poi_malaga_pompidou', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_malaga_santo_cristo', 'poi', 'ko', 'name', '산토 크리스토 데 라 살루 교회'),
('poi_malaga_santo_cristo', 'poi', 'ko', 'description', '빨간 대리석 파사드가 눈에 띄는 17세기 바로크 양식 교회로 말라가의 세마나 산타(성주간) 전통과 깊은 관련이 있습니다.'),
('poi_malaga_santo_cristo', 'poi', 'ko', 'short_tip', '라리오스 거리 바로 옆에 있어 시내 중심 산책과 결합하기 쉽습니다'),

('poi_malaga_soho', 'poi', 'ko', 'name', '소호 지구(스트릿 아트)'),
('poi_malaga_soho', 'poi', 'ko', 'description', '옥외의 "말라가 스트릿 아트 미술관"(MAUS): D*Face, ROA, Obey 등의 국제 아티스트의 벽화로 건물 전면이 그려져 있습니다. 시내 중심에서 색다른 산책을 즐길 수 있습니다.'),
('poi_malaga_soho', 'poi', 'ko', 'short_tip', 'MAUS 지도를 다운로드하여 벽화를 놓치지 마세요'),

('poi_malaga_teatro_romano', 'poi', 'ko', 'name', '말라가 로마 극장'),
('poi_malaga_teatro_romano', 'poi', 'ko', 'description', '알카사바 기슭에 위치한 기원전 1세기 극장으로 시의 가장 중요한 로마 유적입니다. 아랍인들이 성 건설에 재사용했으며, 현재는 방문객 센터와 함께 자유롭게 관람할 수 있습니다.'),
('poi_malaga_teatro_romano', 'poi', 'ko', 'short_tip', '무료 입장. 월요일 휴무. 야간에는 조명이 밝혀집니다.'),

('poi_malaga_thyssen', 'poi', 'ko', 'name', '말라가 카르멘 티센 미술관'),
('poi_malaga_thyssen', 'poi', 'ko', 'description', '안달루시아 화파와 풍속화를 중심으로 한 19세기 스페인 회화 컬렉션으로 역사 중심부의 르네상스 양식 소궁전에 전시됩니다.'),
('poi_malaga_thyssen', 'poi', 'ko', 'cta_label', '입장권 구매'),

-- ════════════════════════════════════════
-- TORREMOLINOS
-- ════════════════════════════════════════
('poi_torremolinos_aqualand', 'poi', 'ko', 'name', '아쿠알란드 토레몰리노스'),
('poi_torremolinos_aqualand', 'poi', 'ko', 'description', '태양 해안 서부 최대 규모의 워터파크로 슬라이드, 파도 풀, 어린이 구역을 완비하고 있습니다. 이 체인의 유일한 지역 시설입니다.'),
('poi_torremolinos_aqualand', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_torremolinos_bajondillo', 'poi', 'ko', 'name', '바혼디요 비치'),
('poi_torremolinos_bajondillo', 'poi', 'ko', 'description', '토레몰리노스의 가장 중심적이고 분주한 해변 중 하나로 모든 편의 시설이 완비되어 있으며 시내 중심에서 쉽게 접근할 수 있습니다.'),
('poi_torremolinos_bajondillo', 'poi', 'ko', 'short_tip', '여름에는 매우 혼잡합니다 — 자리를 확보하려면 일찍 도착하세요'),

('poi_torremolinos_bateria', 'poi', 'ko', 'name', '배터리아 공원'),
('poi_torremolinos_bateria', 'poi', 'ko', 'description', '옛 망루와 절벽 위의 정원이 있는 해변 공원입니다. 소음에서 벗어난 조용한 곳으로 해경을 즐길 수 있습니다.'),
('poi_torremolinos_bateria', 'poi', 'ko', 'short_tip', '저녁 산책에 완벽합니다'),

('poi_torremolinos_carihuela', 'poi', 'ko', 'name', '라 카리우엘라 지구'),
('poi_torremolinos_carihuela', 'poi', 'ko', 'description', '한때의 어촌으로 현재는 신선한 생선 레스토랑과 해변 바로 가득 차 있습니다. 토레몰리노스에서 가장 진정성 있는 해변 산책로입니다.'),
('poi_torremolinos_carihuela', 'poi', 'ko', 'short_tip', '"보케로네스 빅토리아노스(튀긴 멸치)"를 꼭 주문해보세요, 이 지역의 명물입니다'),

('poi_torremolinos_cocodrilos', 'poi', 'ko', 'name', '악어 공원(코코드릴로스 파크)'),
('poi_torremolinos_cocodrilos', 'poi', 'ko', 'description', '스페인 유일의 악어 전문 공원으로 300마리 이상의 악어를 사육합니다. 파충류 지구, 쇼, 새끼 악어를 안아보는 체험도 있습니다.'),
('poi_torremolinos_cocodrilos', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_torremolinos_cuesta_tajo', 'poi', 'ko', 'name', '쿠에스타 델 타호'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ko', 'description', '시내 중심에서 라 카리우엘라 해변으로 내려가는 옛 계곡 거리로 해경과 전통적인 하얀 석회 벽의 집들을 볼 수 있습니다.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ko', 'short_tip', '내리막은 쉽지만, 오르막은 상당히 가파릅니다'),

('poi_torremolinos_molino_inca', 'poi', 'ko', 'name', '몰리노 데 잉카 식물원'),
('poi_torremolinos_molino_inca', 'poi', 'ko', 'description', '옛 샘물과 물레방앗간을 무료로 운영하는 울창한 식물원으로 변환한 곳입니다. 연못, 폭포, 조류가 있으며 관광객에게 거의 알려지지 않은 녹색 오아시스입니다.'),
('poi_torremolinos_molino_inca', 'poi', 'ko', 'short_tip', '무료 입장 — 여름 더위를 피하기에 완벽합니다'),

('poi_torremolinos_san_miguel', 'poi', 'ko', 'name', '산 미겔 거리'),
('poi_torremolinos_san_miguel', 'poi', 'ko', 'description', '시내 중심의 상업 보행자 거리로 1960년대 이래 토레몰리노스의 중심지였습니다. 상점과 아이스크림 가게가 즐비하며 하루 종일 분위기가 활발합니다.'),
('poi_torremolinos_san_miguel', 'poi', 'ko', 'short_tip', '쿠에스타 델 타호로 가기 위한 완벽한 출발점입니다'),

('poi_torremolinos_torre_pimentel', 'poi', 'ko', 'name', '피멘텔 탑(물레방앗간 탑)'),
('poi_torremolinos_torre_pimentel', 'poi', 'ko', 'description', '이 도시의 이름의 유래가 된 15세기 망루("토레 데 로스 몰리노스(물레방앗간의 탑)")입니다. 관광지 이전 토레몰리노스를 오늘날에 보여주는 몇 안 되는 역사 유적 중 하나.'),
('poi_torremolinos_torre_pimentel', 'poi', 'ko', 'short_tip', '작지만 역사가 깊으며 쿠에스타 델 타호와 함께 방문하기 쉽습니다'),

-- ════════════════════════════════════════
-- BENALMÁDENA
-- ════════════════════════════════════════
('exp_benalmadena_catamaran', 'poi', 'ko', 'name', '쌍동선 투어'),
('exp_benalmadena_catamaran', 'poi', 'ko', 'description', '돌핀 워칭, 스노클링, 무제한 바가 포함된 태양 해안을 따라 3시간 크루즈. 푸에르토 마리나에서 매일 출발. 잊을 수 없는 경험!'),
('exp_benalmadena_catamaran', 'poi', 'ko', 'cta_label', '지금 예약'),

('exp_benalmadena_kayak', 'poi', 'ko', 'name', '카약 렌탈'),
('exp_benalmadena_kayak', 'poi', 'ko', 'description', '푸에르토 마리나에서 출발하여 카약으로 태양 해안을 탐험하세요. 모든 장비 포함. 경험 불필요. 공인 인스트럭터 이용 가능.'),
('exp_benalmadena_kayak', 'poi', 'ko', 'cta_label', 'WhatsApp으로 예약'),

('exp_benalmadena_spa', 'poi', 'ko', 'name', '스파 & 마사지'),
('exp_benalmadena_spa', 'poi', 'ko', 'description', '아파트에서 10분 거리의 웰니스 센터. 편안한 마사지, 안달루시아 전통 요법, 터키식 욕조, 스파 욕조. 이 가이드를 언급하면 숙박객은 10% 할인.'),
('exp_benalmadena_spa', 'poi', 'ko', 'cta_label', '전화로 예약'),

('exp_benalmadena_taxi', 'poi', 'ko', 'name', '말라가 공항 픽업'),
('exp_benalmadena_taxi', 'poi', 'ko', 'description', '아파트와 말라가-태양 해안 공항 사이의 개인 택시 서비스. 24시간 7일 이용 가능. 자리 확보를 위해 미리 예약해주세요.'),
('exp_benalmadena_taxi', 'poi', 'ko', 'cta_label', '픽업 신청'),

('poi_benalmadena_colomares', 'poi', 'ko', 'name', '콜로마레스 성'),
('poi_benalmadena_colomares', 'poi', 'ko', 'description', '크리스토퍼 콜럼버스와 아메리카 발견을 기리는 독특한 기념물. 로마네스크, 고딕, 무데하르, 비잔틴 양식이 결합. 세계에서 가장 작은 교회의 기네스 세계 기록을 보유.'),
('poi_benalmadena_colomares', 'poi', 'ko', 'short_tip', '내부 예배당은 1명만 들어갈 수 있습니다 — 가장 독특한 사진을 찍기에 좋습니다'),

('poi_benalmadena_malapesquera', 'poi', 'ko', 'name', '말라페스께라 비치'),
('poi_benalmadena_malapesquera', 'poi', 'ko', 'description', '파란 깃발 인증을 받은 모래해변으로 잔잔한 물이 특징. 해변 바, 샤워 시설, 선베드 완비, 성수기 중 라이프가드 배치. 안달루시아 구이 정어리(에스페트)를 즐기기에 완벽한 장소.'),
('poi_benalmadena_malapesquera', 'poi', 'ko', 'short_tip', '해변 바의 구이 정어리는 반드시 먹어보세요'),

('poi_benalmadena_mariposario', 'poi', 'ko', 'name', '베날마데나 나비 정원'),
('poi_benalmadena_mariposario', 'poi', 'ko', 'description', '유럽 최대 규모의 나비 정원 중 하나로, 불탑 근처의 온실 내에서 수천 마리의 열대 나비가 날아다닙니다.'),
('poi_benalmadena_mariposario', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_benalmadena_parque_paloma', 'poi', 'ko', 'name', '팔로마 공원'),
('poi_benalmadena_parque_paloma', 'poi', 'ko', 'description', '호수, 방목 동물(공작, 토끼, 기러기), 피크닉 구역이 있는 넓은 도시 공원. 가족 나들이에 이상적이며 무료 입장.'),
('poi_benalmadena_parque_paloma', 'poi', 'ko', 'short_tip', '새벽에 방문하면 공작이 깨어나는 모습을 볼 수 있습니다'),

('poi_benalmadena_plaza_espana', 'poi', 'ko', 'name', '스페인 광장(베날마데나 푸에블로)'),
('poi_benalmadena_plaza_espana', 'poi', 'ko', 'description', '구도시의 중심 광장으로 야외 자리가 있는 모임 공간. 근처에는 산토 도밍고 교회가 있으며 계곡의 경치를 볼 수 있습니다. 마을 투어를 시작하기에 이상적.'),
('poi_benalmadena_plaza_espana', 'poi', 'ko', 'short_tip', '주차 후 마을을 도보로 탐험하기에 좋은 참고점'),

('poi_benalmadena_pueblo', 'poi', 'ko', 'name', '베날마데나 푸에블로'),
('poi_benalmadena_pueblo', 'poi', 'ko', 'description', '역사 지구: 돌 포장 거리, 색색의 화분으로 장식된 하얀 집, 빅토리아 전망대에서 웅장한 해양 경치. 전콜럼버스 미술관과 산토 도밍고 교회를 놓치지 마세요.'),
('poi_benalmadena_pueblo', 'poi', 'ko', 'short_tip', '산토 도밍고 교회 옆 전망대는 태양 해안에서 가장 아름다운 일몰을 볼 수 있습니다'),

('poi_benalmadena_puerto_marina', 'poi', 'ko', 'name', '푸에르토 마리나'),
('poi_benalmadena_puerto_marina', 'poi', 'ko', 'description', '1,000척 이상의 선박을 수용할 수 있는 유럽에서 가장 아름다운 마리나 중 하나. 해변 산책로에는 레스토랑, 테라스, 상점이 있으며 자정까지 분위기가 활발합니다.'),
('poi_benalmadena_puerto_marina', 'poi', 'ko', 'short_tip', '해변 테라스 레스토랑에서 저녁 시간에 방문할 가치가 있습니다'),

('poi_benalmadena_selwo_marina', 'poi', 'ko', 'name', '셀워 마리나 공원'),
('poi_benalmadena_selwo_marina', 'poi', 'ko', 'description', '돌핀 쇼, 펭귀너리, 희귀 조류를 갖춘 해양 공원으로 베날마데나 항구 바로 옆에 위치. 이 지역의 유일한 유형의 시설.'),
('poi_benalmadena_selwo_marina', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_benalmadena_stupa', 'poi', 'ko', 'name', '깨달음 불탑'),
('poi_benalmadena_stupa', 'poi', 'ko', 'description', '높이 33m인 서유럽 최대 규모의 불탑 중 하나. 2003년 건립되었으며 해안선의 웅장한 파노라마와 독특한 평온한 분위기를 제공합니다.'),
('poi_benalmadena_stupa', 'poi', 'ko', 'short_tip', '여기서 본 지중해 경치는 이 지역에서 가장 아름다운 것 중 하나입니다'),

('poi_benalmadena_teleferico', 'poi', 'ko', 'name', '베날마데나 케이블카'),
('poi_benalmadena_teleferico', 'poi', 'ko', 'description', '15분 내에 높이 769m의 칼라모로 산에 올라 태양 해안 전체, 지브롤터, 북아프리카의 경치를 볼 수 있습니다. 산꼭대기에는 맹금류 쇼와 하이킹 코스가 있습니다. 해안선의 독특한 경험.'),
('poi_benalmadena_teleferico', 'poi', 'ko', 'cta_label', '입장권 구매'),

-- ════════════════════════════════════════
-- FUENGIROLA
-- ════════════════════════════════════════
('poi_fuengirola_bioparc', 'poi', 'ko', 'name', '푸엔히롤라 비오파르크'),
('poi_fuengirola_bioparc', 'poi', 'ko', 'description', '보이는 우리나 펜스가 없는 침수형 동물원으로 200종 이상의 동물을 사육하며, 많은 동물이 멸종위기종입니다. 트립어드바이저에서 말라가 주 상위 10대 명소 중 하나.'),
('poi_fuengirola_bioparc', 'poi', 'ko', 'cta_label', '입장권 구매'),

('poi_fuengirola_boliches', 'poi', 'ko', 'name', '로스 볼리체스'),
('poi_fuengirola_boliches', 'poi', 'ko', 'description', '옛 어촌으로 현재 푸엔히롤라에 병합되었으며, 좁은 거리, 자체 교회, 해변 타파스 바의 분위기가 좋습니다.'),
('poi_fuengirola_boliches', 'poi', 'ko', 'short_tip', '시내 중심부보다 관광객이 적으며 신선한 생선 식사에 좋은 선택입니다'),

('poi_fuengirola_casco_antiguo', 'poi', 'ko', 'name', '푸엔히롤라 구도시'),
('poi_fuengirola_casco_antiguo', 'poi', 'ko', 'description', '헌법 광장을 중심으로 한 보행자 도로로 지역 상점, 화요일 시장, 전통 타파스 바가 있습니다.'),
('poi_fuengirola_casco_antiguo', 'poi', 'ko', 'short_tip', '박람회 장소의 화요일 시장은 매우 인기가 있습니다'),

('poi_fuengirola_castillo_sohail', 'poi', 'ko', 'name', '소하일 성'),
('poi_fuengirola_castillo_sohail', 'poi', 'ko', 'description', '푸엔히롤라 강 어귀에 위치한 10세기 아랍 요새로 18세기 지진 후 재건되었습니다. 외부 지역은 무료로 둘러볼 수 있으며 현재 콘서트 장소로 사용됩니다.'),
('poi_fuengirola_castillo_sohail', 'poi', 'ko', 'short_tip', '여름에 성 내에서 콘서트가 개최됩니다 — 일정을 확인하세요'),

('poi_fuengirola_parque_fluvial', 'poi', 'ko', 'name', '푸엔히롤라 강변 공원'),
('poi_fuengirola_parque_fluvial', 'poi', 'ko', 'description', '자전거 도로와 그늘진 구역이 있는 강을 따라 이어진 녹색 복도. 해변에서 벗어난 조용한 피난처로 관광객에게는 거의 알려지지 않았습니다.'),
('poi_fuengirola_parque_fluvial', 'poi', 'ko', 'short_tip', '도보 또는 자전거로 비오파르크와 소하일 성까지 연결됩니다'),

('poi_fuengirola_paseo_maritimo', 'poi', 'ko', 'name', '레이 데 에스파냐 해변 산책로'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ko', 'description', '태양 해안에서 가장 긴 해변 산책로 중 하나(7km 이상)로 푸엔히롤라의 모든 해변을 따라 뻗어있습니다.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ko', 'short_tip', '새벽의 조깅이나 자전거 타기에 이상적인 장소입니다'),

('poi_fuengirola_santa_amalia', 'poi', 'ko', 'name', '산타 아말리아 비치'),
('poi_fuengirola_santa_amalia', 'poi', 'ko', 'description', '파란 깃발 인증을 받은 넓고 잘 갖춘 도시 해변으로 해변 바와 각종 편의 시설이 있습니다. 가족 나들이의 인기 있는 선택지 중 하나.'),
('poi_fuengirola_santa_amalia', 'poi', 'ko', 'short_tip', '교통 접근이 좋고 물이 잔잔하여 아이 동반에 완벽합니다'),

-- ════════════════════════════════════════
-- MIJAS
-- ════════════════════════════════════════
('poi_mijas_burro_taxi', 'poi', 'ko', 'name', '미하스 당나귀 택시'),
('poi_mijas_burro_taxi', 'poi', 'ko', 'description', '1960년대부터 미하스의 역사적 상징이 되어온 마을 거리의 전통적인 당나귀 타기. 비르헨 데 라 페냐 광장에서 출발.'),
('poi_mijas_burro_taxi', 'poi', 'ko', 'short_tip', '일부 방문객들은 동물 복지에 대한 우려를 표시합니다 — 예약 전에 고려하세요'),
('poi_mijas_burro_taxi', 'poi', 'ko', 'cta_label', '더 많은 정보'),

('poi_mijas_cac', 'poi', 'ko', 'name', 'CAC 미하스(현대 미술 센터)'),
('poi_mijas_cac', 'poi', 'ko', 'description', '피카소, 달리, 미로의 오리지널 작품을 포함한 상설 컬렉션을 무료로 전시합니다. 이 규모의 마을로서는 놀라운 내용.'),
('poi_mijas_cac', 'poi', 'ko', 'short_tip', '무료 입장 — 미술관 팬이 아니더라도 방문할 가치가 있습니다'),

('poi_mijas_cala', 'poi', 'ko', 'name', '라 칼라 데 미하스 비치'),
('poi_mijas_cala', 'poi', 'ko', 'description', '미하스 코스타의 대표 해변으로 분주한 산책로와 해변 바가 있으며 푸엔히롤라나 마르벨라보다 차분한 분위기입니다.'),
('poi_mijas_cala', 'poi', 'ko', 'short_tip', '마을이 아닌 해안 근처에 머물 때 좋은 거점입니다'),

('poi_mijas_carromato', 'poi', 'ko', 'name', '미하스 카로마토(미니어처 박물관)'),
('poi_mijas_carromato', 'poi', 'ko', 'description', '1972년 목재 마차 내에 개관한 미니어처 박물관으로 "프로페서 맥스"가 50개국에서 수집한 300점 이상의 컬렉션을 전시합니다. 마을의 특이한 보석.'),
('poi_mijas_carromato', 'poi', 'ko', 'cta_label', '더 많은 정보'),

('poi_mijas_casco_antiguo', 'poi', 'ko', 'name', '미하스 푸에블로 구도시'),
('poi_mijas_casco_antiguo', 'poi', 'ko', 'description', '산비탈에 위치한 하얀 마을로 돌 포장 거리, 제라늄 화분, 지중해를 보는 경치가 특징입니다. 태양 해안에서 가장 매력적인 마을 중 하나입니다.'),
('poi_mijas_casco_antiguo', 'poi', 'ko', 'short_tip', '마을 입구에 주차하세요 — 중심부는 완전히 보행자 전용입니다'),

('poi_mijas_ermita_peña', 'poi', 'ko', 'name', '비르헨 데 라 페냐 예배당'),
('poi_mijas_ermita_peña', 'poi', 'ko', 'description', '미하스의 수호성모에 봉헌된 바위를 직접 파서 만든 작은 예배당입니다. 마을의 가장 독특한 보석 중 하나.'),
('poi_mijas_ermita_peña', 'poi', 'ko', 'short_tip', '무료 입장 — 짧지만 매우 특별한 방문입니다'),

('poi_mijas_jardines_muralla', 'poi', 'ko', 'name', '무라야 정원'),
('poi_mijas_jardines_muralla', 'poi', 'ko', 'description', '마을의 옛 아랍 성벽 유적 위에 지어진 계단식 정원으로 전망대와 지중해 식생이 특징입니다.'),
('poi_mijas_jardines_muralla', 'poi', 'ko', 'short_tip', '짧지만 매력적인 산책으로 식사 전후에 좋습니다'),

('poi_mijas_mirador_compas', 'poi', 'ko', 'name', '콤파스 전망대'),
('poi_mijas_mirador_compas', 'poi', 'ko', 'description', '푸엔히롤라, 해안선을 볼 수 있고 맑은 날씨에는 아프리카 대륙까지도 볼 수 있는 자연 전망대입니다. 이 지역 최고의 무료 전망지 중 하나.'),
('poi_mijas_mirador_compas', 'poi', 'ko', 'short_tip', '겨울 맑은 날씨에 시야가 최고입니다'),

('poi_mijas_plaza_toros', 'poi', 'ko', 'name', '미하스 투우장'),
('poi_mijas_plaza_toros', 'poi', 'ko', 'description', '세계에서 가장 드문 타원형 투우장 중 하나로 1900년에 옛 아랍 저수지 위에 건설되었습니다. 작은 투우 박물관이 내부에 있습니다.'),
('poi_mijas_plaza_toros', 'poi', 'ko', 'cta_label', '더 많은 정보'),

('poi_mijas_plaza_virgen_peña', 'poi', 'ko', 'name', '비르헨 데 라 페냐 광장'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ko', 'description', '마을의 중심 광장으로 당나귀 택시의 출발점이며, 발코니에서는 계곡의 최고의 경치를 볼 수 있습니다.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ko', 'short_tip', '정번 만남의 장소 — 여기서부터 모든 것을 쉽게 찾을 수 있습니다'),

-- ════════════════════════════════════════
-- MARBELLA
-- ════════════════════════════════════════
('poi_marbella_avenida_mar', 'poi', 'ko', 'name', '아베니다 델 마르'),
('poi_marbella_avenida_mar', 'poi', 'ko', 'description', '구도시와 해변을 연결하는 보행자 도로로 살바도르 달리의 오리지널 조각 10점이 야외 전시되어 있습니다 — 해안선의 독특한 컬렉션.'),
('poi_marbella_avenida_mar', 'poi', 'ko', 'short_tip', '"엘리팬트(코끼리)"와 "더 노블니스 오브 타임(시간의 귀족)"을 찾아보세요, 가장 많이 촬영되는 작품들입니다'),

('poi_marbella_basilica_vega', 'poi', 'ko', 'name', '베가 델 마르 초기 기독교 바실리카'),
('poi_marbella_basilica_vega', 'poi', 'ko', 'description', '4~6세기 서고트족 바실리카 유적으로 드문 이중 제단 구조를 가지고 있습니다. 과달미나 강 하구 근처, 산 페드로 데 알칸타라 지역에 위치합니다.'),
('poi_marbella_basilica_vega', 'poi', 'ko', 'short_tip', '근처의 라스 보베다스 로마 욕탕과 함께 방문하기 좋습니다'),

('poi_marbella_encarnacion', 'poi', 'ko', 'name', '에스쿨라 데 라 인카르나시온 교회'),
('poi_marbella_encarnacion', 'poi', 'ko', 'description', '16~18세기에 건축된 구도시의 주요 교회로 바로크 양식의 파사드와 역사 중심부의 스카이라인을 내려다보는 종탑이 특징입니다.'),
('poi_marbella_encarnacion', 'poi', 'ko', 'short_tip', '미사 시간 외에는 무료로 입장 가능합니다'),

('poi_marbella_fontanilla', 'poi', 'ko', 'name', '폰타니야 비치'),
('poi_marbella_fontanilla', 'poi', 'ko', 'description', '구도시에 인접한 도시 해변으로 산책로, 해변 바가 있으며 근처에는 케이블스키 마르벨라 시설이 있습니다. 시내 중심 관광과 결합하기 쉽습니다.'),
('poi_marbella_fontanilla', 'poi', 'ko', 'short_tip', '오렌지 광장에서 도보 10분입니다'),

('poi_marbella_murallas', 'poi', 'ko', 'name', '아랍 성벽 유적'),
('poi_marbella_murallas', 'poi', 'ko', 'description', '옛 마르벨라를 보호했던 10세기 아랍 요새의 구조로 구도시의 거리 사이에서 아직 볼 수 있습니다.'),
('poi_marbella_murallas', 'poi', 'ko', 'short_tip', '오렌지 광장 산책과 결합하기 쉽습니다'),

('poi_marbella_museo_bonsai', 'poi', 'ko', 'name', '분재 박물관'),
('poi_marbella_museo_bonsai', 'poi', 'ko', 'description', '유럽 최고 수준의 분재 컬렉션 중 하나로 르프레사 공원 내에 100년 이상 된 분재가 전시되어 있습니다. 독특하고 알려지지 않은 경험.'),
('poi_marbella_museo_bonsai', 'poi', 'ko', 'cta_label', '더 많은 정보'),

('poi_marbella_museo_grabado', 'poi', 'ko', 'name', '스페인 현대 판화 미술관'),
('poi_marbella_museo_grabado', 'poi', 'ko', 'description', '판화 미술로 헌신하는 스페인 유일의 미술관으로 피카소, 미로, 달리의 작품을 소장하고 있습니다. 구도시의 16세기 건물에 위치합니다.'),
('poi_marbella_museo_grabado', 'poi', 'ko', 'cta_label', '더 많은 정보'),

('poi_marbella_museo_ralli', 'poi', 'ko', 'name', '마르벨라 랄리 미술관'),
('poi_marbella_museo_ralli', 'poi', 'ko', 'description', '달리, 보테로 등 라틴아메리카 및 현대 유럽 미술을 수집한 미술관으로 완전 무료 입장입니다 — 이 규모의 컬렉션으로는 드문 일입니다.'),
('poi_marbella_museo_ralli', 'poi', 'ko', 'short_tip', '월요일과 여름(7-8월) 휴무; 방문 전에 확인하세요'),

('poi_marbella_naranjos', 'poi', 'ko', 'name', '오렌지 광장(플라사 데 로스 나란호스)'),
('poi_marbella_naranjos', 'poi', 'ko', 'description', '1485년 이래 구도시의 중심지로 오렌지 나무, 르네상스 양식의 시청, 완벽하게 유지된 테라스가 있습니다.'),
('poi_marbella_naranjos', 'poi', 'ko', 'short_tip', '하얀 거리의 미로에 빠져드는 데 완벽한 출발점입니다'),

('poi_marbella_puerto_banus', 'poi', 'ko', 'name', '푸에르토 바누스'),
('poi_marbella_puerto_banus', 'poi', 'ko', 'description', '스페인에서 가장 유명한 럭셔리 마리나로 요트, 스포츠카, 고급 부티크가 즐비합니다. 사람들과 생활 방식 자체가 무료 구경거리입니다.'),
('poi_marbella_puerto_banus', 'poi', 'ko', 'short_tip', '저녁에 가면 조명으로 밝혀진 요트를 볼 수 있습니다'),

('poi_marbella_termas', 'poi', 'ko', 'name', '라스 보베다스 로마 욕탕'),
('poi_marbella_termas', 'poi', 'ko', 'description', '3~4세기 로마식 온천 욕탕으로 안달루시아에서 가장 잘 보존된 욕탕 중 하나입니다. 냉수탕, 온수탕, 뜨거운 물탕의 구조가 명확하게 식별됩니다.'),
('poi_marbella_termas', 'poi', 'ko', 'short_tip', '무료로 관람할 수 있지만 개방 시간이 제한됨 — 사전에 확인하세요'),

('poi_marbella_villa_romana', 'poi', 'ko', 'name', '리오 베르데 로마 별장 유적'),
('poi_marbella_villa_romana', 'poi', 'ko', 'description', '1~2세기 로마 별장의 고고학 유적으로 보존 상태가 매우 좋은 오리지널 모자이크가 남아있습니다. 관광객이 거의 알지 못하는 숨겨진 보석.'),
('poi_marbella_villa_romana', 'poi', 'ko', 'short_tip', '개방 시간이 제한되어 있으므로 방문 전에 확인하세요');
