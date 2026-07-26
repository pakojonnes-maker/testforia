-- =====================================================
-- ZONE DESCRIPTIONS — CA/RU — MIGRATION 0067
-- =====================================================
-- Same follow-up as 0065, now for ca/ru. zone_nerja untouched (out of scope).
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

('zone_malaga', 'zone', 'ca', 'name', 'Màlaga'),
('zone_malaga', 'zone', 'ca', 'description', 'Capital de la Costa del Sol: nucli antic monumental, museus de primer nivell mundial (Picasso, Pompidou, Thyssen) i un port renovat. Bressol de Picasso.'),
('zone_malaga', 'zone', 'ru', 'name', 'Малага'),
('zone_malaga', 'zone', 'ru', 'description', 'Столица Коста-дель-Соль: монументальный исторический центр, музеи мирового уровня (Пикассо, Помпиду, Тиссен) и обновлённый порт. Родина Пикассо.'),

('zone_torremolinos', 'zone', 'ca', 'name', 'Torremolinos'),
('zone_torremolinos', 'zone', 'ca', 'description', 'La ciutat turística pionera de la Costa del Sol. Platges extenses, el barri mariner de La Carihuela i un ambient animat de dia i de nit.'),
('zone_torremolinos', 'zone', 'ru', 'name', 'Торремолинос'),
('zone_torremolinos', 'zone', 'ru', 'description', 'Первый туристический город Коста-дель-Соль. Протяжённые пляжи, рыбацкий квартал Ла-Карихуэла и оживлённая атмосфера днём и ночью.'),

('zone_fuengirola', 'zone', 'ca', 'name', 'Fuengirola'),
('zone_fuengirola', 'zone', 'ca', 'description', '8 km de platges urbanes, un passeig marítim animat i el Bioparc, un dels zoos d''immersió més reconeguts d''Espanya.'),
('zone_fuengirola', 'zone', 'ru', 'name', 'Фуэнхирола'),
('zone_fuengirola', 'zone', 'ru', 'description', '8 км городских пляжей, оживлённая набережная и Биопарк — один из самых известных зоопарков-иммерсий в Испании.'),

('zone_mijas', 'zone', 'ca', 'name', 'Mijas'),
('zone_mijas', 'zone', 'ca', 'description', 'El poble blanc per excel·lència de la Costa del Sol, enfilat a la serra amb vistes al Mediterrani, carrers florits i els famosos burro-taxi.'),
('zone_mijas', 'zone', 'ru', 'name', 'Михас'),
('zone_mijas', 'zone', 'ru', 'description', 'Классическая белая деревня Коста-дель-Соль, расположенная в горах с видом на Средиземное море, цветущими улицами и знаменитыми ослиными такси.'),

('zone_marbella', 'zone', 'ca', 'name', 'Marbella'),
('zone_marbella', 'zone', 'ca', 'description', 'Luxe, nucli antic andalús impecable i un ric patrimoni romà poc conegut. Inclou Puerto Banús i San Pedro de Alcántara.'),
('zone_marbella', 'zone', 'ru', 'name', 'Марбелья'),
('zone_marbella', 'zone', 'ru', 'description', 'Роскошь, безупречный андалузский старый город и малоизвестное богатое римское наследие. Включает Пуэрто-Банус и Сан-Педро-де-Алькантара.'),

('zone_benalmadena', 'zone', 'ca', 'name', 'Benalmádena'),
('zone_benalmadena', 'zone', 'ca', 'description', 'Joia de la Costa del Sol, Benalmádena combina platges de bandera blava, l''animat Puerto Marina, monuments únics i un nucli antic amb encant. A 20 minuts de Màlaga capital en metro.'),
('zone_benalmadena', 'zone', 'ru', 'name', 'Бенальмадена'),
('zone_benalmadena', 'zone', 'ru', 'description', 'Жемчужина Коста-дель-Соль, Бенальмадена сочетает пляжи с голубым флагом, оживлённую Пуэрто-Марина, уникальные памятники и очаровательный старый город. В 20 минутах от центра Малаги на метро.');
