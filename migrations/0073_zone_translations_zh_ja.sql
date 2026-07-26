-- =====================================================
-- COSTA DEL SOL ZONES — CHINESE + JAPANESE DESCRIPTIONS — MIGRATION 0073
-- =====================================================
-- Zone-level description translations, same pattern as 0065 (fr/de/it/pt),
-- 0067 (ca/ru), and 0071 (ar/uk). The guide header pulls this via entity_type='zone'.
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

('zone_malaga', 'zone', 'zh', 'description', '太阳海岸的首府：拥有考古学纪念碑的宏伟历史中心、世界级博物馆（毕加索、蓬皮杜、蒂森）和翻新的港口。毕加索的故乡。'),
('zone_malaga', 'zone', 'ja', 'description', 'コスタ・デル・ソルの首都：考古学的なモニュメントの壮大な歴史地区、世界級の美術館（ピカソ、ポンピドゥー、ティッセン）と再開発されたポート。ピカソの故郷。'),

('zone_torremolinos', 'zone', 'zh', 'description', '太阳海岸的旅游先锋。绵延的海滩、渔民区拉卡里瓦拉，白天黑夜都热闹非凡。'),
('zone_torremolinos', 'zone', 'ja', 'description', 'コスタ・デル・ソルの観光開拓者。広がるビーチ、漁師街ラ・カリウエラ、昼夜問わず賑やかな雰囲気。'),

('zone_fuengirola', 'zone', 'zh', 'description', '8公里城市海滩、熙攘的海滨长廊，以及生态动物园（西班牙最著名的沉浸式动物园之一）。'),
('zone_fuengirola', 'zone', 'ja', 'description', '8km以上の都市ビーチ、活気ある海岸プロムナード、そしてビオパルク（スペインで最も有名な没入型動物園の一つ）。'),

('zone_mijas', 'zone', 'zh', 'description', '太阳海岸独特的"白色小镇"，依山而建，俯瞰地中海，花盆遍布街道，因其著名的驴出租车而闻名。'),
('zone_mijas', 'zone', 'ja', 'description', 'コスタ・デル・ソルで最も有名な「白い村」。山々に位置し地中海を望む花咲く路地と、有名なロバ・タクシー。'),

('zone_marbella', 'zone', 'zh', 'description', '奢华、无可挑剔的安达卢西亚老城，以及鲜为人知的丰富罗马遗产。包括巴努斯港和圣佩德罗德阿尔坎塔拉。'),
('zone_marbella', 'zone', 'ja', 'description', 'ラグジュアリー、完璧なアンダルシア旧市街、そして豊かだが知られていないローマ遺産。プエルト・バヌスとサン・ペドロ・デ・アルカンタラを含む。'),

('zone_benalmadena', 'zone', 'zh', 'description', '太阳海岸的瑰宝，贝纳尔马德纳汇聚了蓝旗海滩、充满生气的马里纳港、独特的地标和迷人的老城。乘地铁距离马拉加市中心仅20分钟。'),
('zone_benalmadena', 'zone', 'ja', 'description', 'コスタ・デル・ソルの真珠。ベナルマデナは青旗ビーチ、活気あるプエルト・マリーナ、ユニークな見所、そして魅力的な旧市街を兼ね備えている。マラガ市中心部からメトロで20分。');
