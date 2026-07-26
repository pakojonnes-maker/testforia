-- =====================================================
-- COSTA DEL SOL POIs — FRENCH + GERMAN TRANSLATIONS — MIGRATION 0062
-- =====================================================
-- Adds fr/de translations (name, description, short_tip/cta_label) for the 64
-- POIs/experiences introduced in migration 0060. es/en already existed; the
-- worker falls back to es when a language is missing, so this is purely additive.
-- Remaining languages (it/pt/ca/ar/ru/uk/zh/ja/ko) are a follow-up.
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

-- ════════════════════════════════════════
-- MÁLAGA — FREE
-- ════════════════════════════════════════
('poi_malaga_teatro_romano', 'poi', 'fr', 'name', 'Théâtre romain de Málaga'),
('poi_malaga_teatro_romano', 'poi', 'fr', 'description', 'Au pied de l''Alcazaba, ce théâtre du Ier siècle av. J.-C. est le vestige romain le plus important de la ville. Réutilisé par les Arabes pour construire la forteresse, il se visite aujourd''hui librement avec son centre d''interprétation.'),
('poi_malaga_teatro_romano', 'poi', 'fr', 'short_tip', 'Entrée gratuite. Fermé le lundi. Illuminé la nuit.'),
('poi_malaga_teatro_romano', 'poi', 'de', 'name', 'Römisches Theater von Málaga'),
('poi_malaga_teatro_romano', 'poi', 'de', 'description', 'Am Fuße der Alcazaba gelegen, ist dieses Theater aus dem 1. Jahrhundert v. Chr. das bedeutendste römische Bauwerk der Stadt. Von den Arabern für den Bau der Festung wiederverwendet, kann es heute frei besichtigt werden, inklusive Besucherzentrum.'),
('poi_malaga_teatro_romano', 'poi', 'de', 'short_tip', 'Freier Eintritt. Montags geschlossen. Abends beleuchtet.'),

('poi_malaga_larios', 'poi', 'fr', 'name', 'Rue Marqués de Larios'),
('poi_malaga_larios', 'poi', 'fr', 'description', 'La grande artère commerçante et piétonne du centre historique, bordée d''immeubles de la fin du XIXe siècle. Spectaculairement décorée à Noël et pendant la Feria de Málaga.'),
('poi_malaga_larios', 'poi', 'fr', 'short_tip', 'Au coucher du soleil, elle s''anime de musique de rue et de terrasses'),
('poi_malaga_larios', 'poi', 'de', 'name', 'Straße Marqués de Larios'),
('poi_malaga_larios', 'poi', 'de', 'description', 'Die große Fußgängereinkaufsstraße der Altstadt, gesäumt von Gebäuden aus dem späten 19. Jahrhundert. Zu Weihnachten und während der Feria de Málaga spektakulär geschmückt.'),
('poi_malaga_larios', 'poi', 'de', 'short_tip', 'Bei Sonnenuntergang füllt sie sich mit Straßenmusik und Terrassen'),

('poi_malaga_plaza_constitucion', 'poi', 'fr', 'name', 'Plaza de la Constitución'),
('poi_malaga_plaza_constitucion', 'poi', 'fr', 'description', 'Cœur historique et politique de la ville depuis le Moyen Âge, avec la fontaine de Gênes du XVIe siècle. Point de départ naturel pour explorer le centre à pied.'),
('poi_malaga_plaza_constitucion', 'poi', 'fr', 'short_tip', 'Plusieurs visites guidées gratuites partent d''ici'),
('poi_malaga_plaza_constitucion', 'poi', 'de', 'name', 'Plaza de la Constitución'),
('poi_malaga_plaza_constitucion', 'poi', 'de', 'description', 'Historisches und politisches Herz der Stadt seit dem Mittelalter, mit dem Genueser Brunnen aus dem 16. Jahrhundert. Idealer Ausgangspunkt, um die Altstadt zu Fuß zu erkunden.'),
('poi_malaga_plaza_constitucion', 'poi', 'de', 'short_tip', 'Von hier starten mehrere kostenlose Free-Walking-Touren'),

('poi_malaga_atarazanas', 'poi', 'fr', 'name', 'Marché d''Atarazanas'),
('poi_malaga_atarazanas', 'poi', 'fr', 'description', 'Marché central du XIXe siècle construit sur d''anciens chantiers navals nasrides, avec un grand vitrail Art nouveau. Poisson frais, jambon et bars à tapas à l''intérieur même du marché.'),
('poi_malaga_atarazanas', 'poi', 'fr', 'short_tip', 'Venez en semaine le matin pour éviter la foule'),
('poi_malaga_atarazanas', 'poi', 'de', 'name', 'Markthalle Atarazanas'),
('poi_malaga_atarazanas', 'poi', 'de', 'description', 'Zentrale Markthalle aus dem 19. Jahrhundert, erbaut über einer alten nasridischen Werft, mit einem großen Jugendstil-Glasfenster. Frischer Fisch, Schinken und Tapas-Bars direkt in der Markthalle.'),
('poi_malaga_atarazanas', 'poi', 'de', 'short_tip', 'Am besten wochentags morgens besuchen, um Menschenmassen zu vermeiden'),

('poi_malaga_plaza_merced', 'poi', 'fr', 'name', 'Plaza de la Merced'),
('poi_malaga_plaza_merced', 'poi', 'fr', 'description', 'Vaste place à arcades où Picasso est né, avec un obélisque dédié au général Torrijos. Entourée de terrasses, c''est l''un des lieux de rendez-vous préférés des Malaguègnes.'),
('poi_malaga_plaza_merced', 'poi', 'fr', 'short_tip', 'La maison natale de Picasso se trouve juste sur cette place'),
('poi_malaga_plaza_merced', 'poi', 'de', 'name', 'Plaza de la Merced'),
('poi_malaga_plaza_merced', 'poi', 'de', 'description', 'Weitläufiger Arkadenplatz, auf dem Picasso geboren wurde, mit einem Obelisken zu Ehren von General Torrijos. Von Terrassen gesäumt, einer der beliebtesten Treffpunkte der Malagueños.'),
('poi_malaga_plaza_merced', 'poi', 'de', 'short_tip', 'Picassos Geburtshaus liegt direkt an diesem Platz'),

('poi_malaga_cripta_victoria', 'poi', 'fr', 'name', 'Crypte de la Basilique de la Victoria'),
('poi_malaga_cripta_victoria', 'poi', 'fr', 'description', 'Trésor caché sous la Basilique de la Victoria : une crypte baroque avec des niches et l''impressionnant panthéon des comtes de Buenavista. Peu connue, même des Malaguègnes.'),
('poi_malaga_cripta_victoria', 'poi', 'fr', 'short_tip', 'Si la crypte semble fermée, demandez à la sacristie — elle ouvre parfois sur demande'),
('poi_malaga_cripta_victoria', 'poi', 'de', 'name', 'Krypta der Basilika de la Victoria'),
('poi_malaga_cripta_victoria', 'poi', 'de', 'description', 'Ein verstecktes Juwel unter der Basílica de la Victoria: eine barocke Krypta mit Nischen und dem beeindruckenden Pantheon der Grafen von Buenavista. Selbst unter Einheimischen wenig bekannt.'),
('poi_malaga_cripta_victoria', 'poi', 'de', 'short_tip', 'Wirkt die Krypta geschlossen, in der Sakristei fragen — manchmal öffnet sie auf Anfrage'),

('poi_malaga_cementerio_ingles', 'poi', 'fr', 'name', 'Cimetière anglais'),
('poi_malaga_cementerio_ingles', 'poi', 'fr', 'description', 'Le premier cimetière protestant d''Espagne (1831), un jardin romantique et paisible avec les tombes d''écrivains et de diplomates, à quelques pas de la plage de la Malagueta.'),
('poi_malaga_cementerio_ingles', 'poi', 'fr', 'short_tip', 'Entrée gratuite, fermé le lundi'),
('poi_malaga_cementerio_ingles', 'poi', 'de', 'name', 'Englischer Friedhof'),
('poi_malaga_cementerio_ingles', 'poi', 'de', 'description', 'Spaniens erster protestantischer Friedhof (1831), ein ruhiger, romantischer Garten mit den Gräbern von Schriftstellern und Diplomaten, nur wenige Schritte vom Malagueta-Strand entfernt.'),
('poi_malaga_cementerio_ingles', 'poi', 'de', 'short_tip', 'Freier Eintritt, montags geschlossen'),

('poi_malaga_soho', 'poi', 'fr', 'name', 'Quartier Soho (art urbain)'),
('poi_malaga_soho', 'poi', 'fr', 'description', 'Le musée d''art urbain à ciel ouvert de Málaga (MAUS) : des façades entières peintes par des artistes internationaux comme D*Face, ROA ou Obey. Une autre façon de découvrir le centre.'),
('poi_malaga_soho', 'poi', 'fr', 'short_tip', 'Téléchargez la carte du MAUS pour ne manquer aucune fresque'),
('poi_malaga_soho', 'poi', 'de', 'name', 'Stadtteil Soho (Street Art)'),
('poi_malaga_soho', 'poi', 'de', 'description', 'Málagas Freiluft-Museum für urbane Kunst (MAUS): ganze Hausfassaden, bemalt von internationalen Künstlern wie D*Face, ROA oder Obey. Eine andere Art, die Innenstadt zu entdecken.'),
('poi_malaga_soho', 'poi', 'de', 'short_tip', 'Laden Sie die MAUS-Karte herunter, um kein Wandbild zu verpassen'),

('poi_malaga_pasaje_chinitas', 'poi', 'fr', 'name', 'Pasaje de Chinitas'),
('poi_malaga_pasaje_chinitas', 'poi', 'fr', 'description', 'Ruelle historique liée au flamenco et au poète Federico García Lorca, aujourd''hui bordée de bars à tapas. Tout près de la Plaza de la Constitución.'),
('poi_malaga_pasaje_chinitas', 'poi', 'fr', 'short_tip', 'Une bonne étape tapas avant ou après la visite du centre'),
('poi_malaga_pasaje_chinitas', 'poi', 'de', 'name', 'Pasaje de Chinitas'),
('poi_malaga_pasaje_chinitas', 'poi', 'de', 'description', 'Historische Gasse mit Verbindung zum Flamenco und zum Dichter Federico García Lorca, heute gesäumt von Tapas-Bars. Nur wenige Schritte von der Plaza de la Constitución entfernt.'),
('poi_malaga_pasaje_chinitas', 'poi', 'de', 'short_tip', 'Ein guter Tapas-Stopp vor oder nach dem Bummel durch die Altstadt'),

('poi_malaga_muelle_uno', 'poi', 'fr', 'name', 'Muelle Uno et Palmeral de las Sorpresas'),
('poi_malaga_muelle_uno', 'poi', 'fr', 'description', 'Promenade portuaire rénovée à côté du centre, avec jardins, boutiques, terrasses et vue sur les bateaux de croisière. Le Centre Pompidou Málaga se trouve juste ici.'),
('poi_malaga_muelle_uno', 'poi', 'fr', 'short_tip', 'Idéal pour une promenade au coucher du soleil avec vue sur le château de Gibralfaro'),
('poi_malaga_muelle_uno', 'poi', 'de', 'name', 'Muelle Uno und Palmeral de las Sorpresas'),
('poi_malaga_muelle_uno', 'poi', 'de', 'description', 'Renovierte Hafenpromenade direkt am Zentrum, mit Gärten, Geschäften, Terrassen und Blick auf die Kreuzfahrtschiffe. Das Centre Pompidou Málaga befindet sich genau hier.'),
('poi_malaga_muelle_uno', 'poi', 'de', 'short_tip', 'Perfekt für einen Sonnenuntergangsspaziergang mit Blick auf die Burg Gibralfaro'),

('poi_malaga_malagueta', 'poi', 'fr', 'name', 'Plage de la Malagueta'),
('poi_malaga_malagueta', 'poi', 'fr', 'description', 'La plage urbaine emblématique de Málaga, à 10 minutes à pied du centre historique. Sable foncé, buvettes de plage et promenade maritime complète.'),
('poi_malaga_malagueta', 'poi', 'fr', 'short_tip', 'Les brochettes de sardines grillées (espetos) des chiringuitos sont un classique'),
('poi_malaga_malagueta', 'poi', 'de', 'name', 'Strand La Malagueta'),
('poi_malaga_malagueta', 'poi', 'de', 'description', 'Der klassische Stadtstrand von Málaga, 10 Gehminuten von der Altstadt entfernt. Dunkler Sand, Strandbars und eine durchgehende Strandpromenade.'),
('poi_malaga_malagueta', 'poi', 'de', 'short_tip', 'Gegrillte Sardinenspieße (espetos) an den Strandbars sind ein Klassiker'),

('poi_malaga_mirador_gibralfaro', 'poi', 'fr', 'name', 'Belvédère de Gibralfaro'),
('poi_malaga_mirador_gibralfaro', 'poi', 'fr', 'description', 'Belvédère gratuit près du château offrant les meilleures vues panoramiques sur la ville, le port et les arènes de la Malagueta.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'fr', 'short_tip', 'Prenez le bus 35 ou marchez 30 min depuis le centre — la vue en vaut la peine'),
('poi_malaga_mirador_gibralfaro', 'poi', 'de', 'name', 'Aussichtspunkt Gibralfaro'),
('poi_malaga_mirador_gibralfaro', 'poi', 'de', 'description', 'Kostenloser Aussichtspunkt neben der Burg mit dem besten Panoramablick auf die Stadt, den Hafen und die Stierkampfarena La Malagueta.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'de', 'short_tip', 'Bus 35 nehmen oder 30 Min. vom Zentrum laufen — die Aussicht lohnt sich'),

('poi_malaga_santo_cristo', 'poi', 'fr', 'name', 'Église du Santo Cristo de la Salud'),
('poi_malaga_santo_cristo', 'poi', 'fr', 'description', 'Église baroque du XVIIe siècle à la remarquable façade en marbre rouge, étroitement liée à la Semaine Sainte de Málaga.'),
('poi_malaga_santo_cristo', 'poi', 'fr', 'short_tip', 'Juste à côté de la rue Larios, facile à combiner avec une balade dans le centre'),
('poi_malaga_santo_cristo', 'poi', 'de', 'name', 'Kirche Santo Cristo de la Salud'),
('poi_malaga_santo_cristo', 'poi', 'de', 'description', 'Barockkirche aus dem 17. Jahrhundert mit einer auffälligen Fassade aus rotem Marmor, eng verbunden mit der Karwoche in Málaga.'),
('poi_malaga_santo_cristo', 'poi', 'de', 'short_tip', 'Direkt neben der Calle Larios — leicht mit einem Altstadtbummel zu kombinieren'),

-- ════════════════════════════════════════
-- MÁLAGA — PREMIUM
-- ════════════════════════════════════════
('poi_malaga_alcazaba', 'poi', 'fr', 'name', 'Alcazaba de Málaga'),
('poi_malaga_alcazaba', 'poi', 'fr', 'description', 'Forteresse palatiale mauresque du XIe siècle, la mieux conservée d''Espagne. Jardins, cours avec vue sur la mer et le théâtre romain à ses pieds.'),
('poi_malaga_alcazaba', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_alcazaba', 'poi', 'de', 'name', 'Alcazaba von Málaga'),
('poi_malaga_alcazaba', 'poi', 'de', 'description', 'Maurische Palastfestung aus dem 11. Jahrhundert, die am besten erhaltene Spaniens. Gärten, Innenhöfe mit Meerblick und das Römische Theater zu ihren Füßen.'),
('poi_malaga_alcazaba', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_gibralfaro', 'poi', 'fr', 'name', 'Château de Gibralfaro'),
('poi_malaga_gibralfaro', 'poi', 'fr', 'description', 'Forteresse militaire du XIVe siècle au sommet de la colline du même nom, reliée à l''Alcazaba par un mur d''enceinte. La vue à 360° sur la ville est la meilleure de Málaga.'),
('poi_malaga_gibralfaro', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_gibralfaro', 'poi', 'de', 'name', 'Burg Gibralfaro'),
('poi_malaga_gibralfaro', 'poi', 'de', 'description', 'Militärfestung aus dem 14. Jahrhundert auf dem gleichnamigen Hügel, durch eine Mauer mit der Alcazaba verbunden. Der 360°-Blick über die Stadt ist der beste in Málaga.'),
('poi_malaga_gibralfaro', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_catedral', 'poi', 'fr', 'name', 'Cathédrale de Málaga ("La Manquita")'),
('poi_malaga_catedral', 'poi', 'fr', 'description', 'Cathédrale Renaissance célèbre pour sa tour inachevée, d''où son surnom de "la Manchote". La montée sur les toits offre une vue unique sur la vieille ville.'),
('poi_malaga_catedral', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_catedral', 'poi', 'de', 'name', 'Kathedrale von Málaga ("La Manquita")'),
('poi_malaga_catedral', 'poi', 'de', 'description', 'Renaissance-Kathedrale, berühmt für ihren unvollendeten Turm — daher der Spitzname "die Einarmige". Der Aufstieg aufs Dach bietet einen einzigartigen Blick auf die Altstadt.'),
('poi_malaga_catedral', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_museo_picasso', 'poi', 'fr', 'name', 'Musée Picasso Málaga'),
('poi_malaga_museo_picasso', 'poi', 'fr', 'description', 'Plus de 200 œuvres de l''artiste natif de Málaga au Palais de Buenavista, données par la famille Picasso. Incontournable pour comprendre son évolution artistique.'),
('poi_malaga_museo_picasso', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_museo_picasso', 'poi', 'de', 'name', 'Museo Picasso Málaga'),
('poi_malaga_museo_picasso', 'poi', 'de', 'description', 'Über 200 Werke des in Málaga geborenen Künstlers im Palacio de Buenavista, gestiftet von der Familie Picasso. Unverzichtbar, um seine künstlerische Entwicklung zu verstehen.'),
('poi_malaga_museo_picasso', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_casa_natal_picasso', 'poi', 'fr', 'name', 'Maison natale de Picasso'),
('poi_malaga_casa_natal_picasso', 'poi', 'fr', 'description', 'La maison où Pablo Picasso est né en 1881, sur la Plaza de la Merced. Mobilier d''époque, œuvres de jeunesse et objets personnels de la famille.'),
('poi_malaga_casa_natal_picasso', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_casa_natal_picasso', 'poi', 'de', 'name', 'Geburtshaus von Picasso'),
('poi_malaga_casa_natal_picasso', 'poi', 'de', 'description', 'Das Haus, in dem Pablo Picasso 1881 geboren wurde, an der Plaza de la Merced. Möbel aus jener Zeit, Frühwerke und persönliche Gegenstände der Familie.'),
('poi_malaga_casa_natal_picasso', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_pompidou', 'poi', 'fr', 'name', 'Centre Pompidou Málaga'),
('poi_malaga_pompidou', 'poi', 'fr', 'description', 'La seule antenne du Centre Pompidou hors de France, reconnaissable à son cube de verre coloré sur le port. Art moderne et contemporain issu de la collection parisienne.'),
('poi_malaga_pompidou', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_pompidou', 'poi', 'de', 'name', 'Centre Pompidou Málaga'),
('poi_malaga_pompidou', 'poi', 'de', 'description', 'Die einzige Dependance des Centre Pompidou außerhalb Frankreichs, erkennbar an ihrem bunten Glaswürfel am Hafen. Moderne und zeitgenössische Kunst aus der Pariser Sammlung.'),
('poi_malaga_pompidou', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_thyssen', 'poi', 'fr', 'name', 'Musée Carmen Thyssen Málaga'),
('poi_malaga_thyssen', 'poi', 'fr', 'description', 'Peinture espagnole du XIXe siècle, avec un accent particulier sur l''école andalouse et le costumbrismo, dans un petit palais Renaissance du centre historique.'),
('poi_malaga_thyssen', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_thyssen', 'poi', 'de', 'name', 'Museo Carmen Thyssen Málaga'),
('poi_malaga_thyssen', 'poi', 'de', 'description', 'Spanische Malerei des 19. Jahrhunderts mit Schwerpunkt auf der andalusischen Schule und dem Costumbrismo, in einem Renaissance-Palast der Altstadt.'),
('poi_malaga_thyssen', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_concepcion', 'poi', 'fr', 'name', 'Jardin botanique-historique La Concepción'),
('poi_malaga_concepcion', 'poi', 'fr', 'description', 'Jardin subtropical du XIXe siècle classé Bien d''Intérêt Culturel, sur plus de 25 hectares, avec des palmiers centenaires et un site mégalithique.'),
('poi_malaga_concepcion', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_concepcion', 'poi', 'de', 'name', 'Historisch-Botanischer Garten La Concepción'),
('poi_malaga_concepcion', 'poi', 'de', 'description', 'Subtropischer Garten aus dem 19. Jahrhundert, als Kulturgut geschützt, mit über 25 Hektar, jahrhundertealten Palmen und einer megalithischen Fundstätte.'),
('poi_malaga_concepcion', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_malaga_museo_automovilistico', 'poi', 'fr', 'name', 'Musée de l''Automobile et de la Mode'),
('poi_malaga_museo_automovilistico', 'poi', 'fr', 'description', 'Collection unique associant voitures anciennes de collection et haute couture, dans une ancienne manufacture de tabac reconvertie.'),
('poi_malaga_museo_automovilistico', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_malaga_museo_automovilistico', 'poi', 'de', 'name', 'Automobil- und Modemuseum'),
('poi_malaga_museo_automovilistico', 'poi', 'de', 'description', 'Einzigartige Sammlung, die klassische Oldtimer mit Haute Couture und Hüten kombiniert, in einer umgebauten historischen Tabakfabrik.'),
('poi_malaga_museo_automovilistico', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

-- ════════════════════════════════════════
-- TORREMOLINOS — FREE
-- ════════════════════════════════════════
('poi_torremolinos_san_miguel', 'poi', 'fr', 'name', 'Rue San Miguel'),
('poi_torremolinos_san_miguel', 'poi', 'fr', 'description', 'Rue piétonne commerçante du centre, cœur de Torremolinos depuis les années 60. Boutiques, glaciers et ambiance animée toute la journée.'),
('poi_torremolinos_san_miguel', 'poi', 'fr', 'short_tip', 'Excellent point de départ vers la Cuesta del Tajo'),
('poi_torremolinos_san_miguel', 'poi', 'de', 'name', 'Calle San Miguel'),
('poi_torremolinos_san_miguel', 'poi', 'de', 'description', 'Die Fußgänger-Einkaufsstraße im Zentrum, seit den 1960er Jahren das Herz von Torremolinos. Geschäfte, Eisdielen und den ganzen Tag über lebhafte Atmosphäre.'),
('poi_torremolinos_san_miguel', 'poi', 'de', 'short_tip', 'Ein toller Ausgangspunkt zur Cuesta del Tajo'),

('poi_torremolinos_cuesta_tajo', 'poi', 'fr', 'name', 'Cuesta del Tajo'),
('poi_torremolinos_cuesta_tajo', 'poi', 'fr', 'description', 'Ancienne rue en ravin descendant du centre jusqu''à la plage de La Carihuela, avec vue sur la mer et maisons blanchies à la chaux traditionnelles.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'fr', 'short_tip', 'La descente est facile, la remontée est plutôt raide'),
('poi_torremolinos_cuesta_tajo', 'poi', 'de', 'name', 'Cuesta del Tajo'),
('poi_torremolinos_cuesta_tajo', 'poi', 'de', 'description', 'Alte Schluchtstraße, die vom Zentrum zum Strand von La Carihuela hinabführt, mit Meerblick und traditionellen weiß getünchten Häusern.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'de', 'short_tip', 'Der Abstieg ist einfach, der Aufstieg ziemlich steil'),

('poi_torremolinos_torre_pimentel', 'poi', 'fr', 'name', 'Torre de Pimentel (tour des Moulins)'),
('poi_torremolinos_torre_pimentel', 'poi', 'fr', 'description', 'Tour de guet du XVe siècle qui donne son nom à la ville ("Torre de los Molinos"). L''un des rares vestiges historiques visibles du Torremolinos d''avant le tourisme.'),
('poi_torremolinos_torre_pimentel', 'poi', 'fr', 'short_tip', 'Petite mais chargée d''histoire — facile à combiner avec la Cuesta del Tajo'),
('poi_torremolinos_torre_pimentel', 'poi', 'de', 'name', 'Torre de Pimentel (Mühlenturm)'),
('poi_torremolinos_torre_pimentel', 'poi', 'de', 'description', 'Wachturm aus dem 15. Jahrhundert, der der Stadt ihren Namen gibt ("Turm der Mühlen"). Eines der wenigen sichtbaren historischen Relikte aus der Zeit vor dem Tourismus.'),
('poi_torremolinos_torre_pimentel', 'poi', 'de', 'short_tip', 'Klein, aber geschichtsträchtig — gut mit der Cuesta del Tajo zu kombinieren'),

('poi_torremolinos_carihuela', 'poi', 'fr', 'name', 'Quartier de La Carihuela'),
('poi_torremolinos_carihuela', 'poi', 'fr', 'description', 'Ancien quartier de pêcheurs en bord de mer, aujourd''hui rempli de restaurants de poisson frais et de buvettes de plage. Le front de mer le plus authentique de Torremolinos.'),
('poi_torremolinos_carihuela', 'poi', 'fr', 'short_tip', 'Goûtez les "boquerones victorianos", spécialité locale d''anchois frits'),
('poi_torremolinos_carihuela', 'poi', 'de', 'name', 'Viertel La Carihuela'),
('poi_torremolinos_carihuela', 'poi', 'de', 'description', 'Ehemaliges Fischerviertel am Meer, heute voller Restaurants mit frischem Fisch und Strandbars. Die authentischste Strandpromenade von Torremolinos.'),
('poi_torremolinos_carihuela', 'poi', 'de', 'short_tip', 'Probieren Sie "boquerones victorianos", die lokale Spezialität aus frittierten Sardellen'),

('poi_torremolinos_bajondillo', 'poi', 'fr', 'name', 'Plage du Bajondillo'),
('poi_torremolinos_bajondillo', 'poi', 'fr', 'description', 'L''une des plages les plus centrales et fréquentées de Torremolinos, avec tous les services et un accès facile depuis le centre.'),
('poi_torremolinos_bajondillo', 'poi', 'fr', 'short_tip', 'Très fréquentée en été — arrivez tôt pour avoir de la place'),
('poi_torremolinos_bajondillo', 'poi', 'de', 'name', 'Strand Bajondillo'),
('poi_torremolinos_bajondillo', 'poi', 'de', 'description', 'Einer der zentralsten und beliebtesten Strände von Torremolinos, mit allen Einrichtungen und leicht vom Zentrum aus erreichbar.'),
('poi_torremolinos_bajondillo', 'poi', 'de', 'short_tip', 'Im Sommer sehr voll — früh kommen für einen guten Platz'),

('poi_torremolinos_bateria', 'poi', 'fr', 'name', 'Parque de la Batería'),
('poi_torremolinos_bateria', 'poi', 'fr', 'description', 'Parc côtier avec une ancienne tour de guet et des jardins surplombant la falaise. Un coin tranquille loin de l''agitation, avec vue sur la mer.'),
('poi_torremolinos_bateria', 'poi', 'fr', 'short_tip', 'Idéal pour une promenade paisible au coucher du soleil'),
('poi_torremolinos_bateria', 'poi', 'de', 'name', 'Parque de la Batería'),
('poi_torremolinos_bateria', 'poi', 'de', 'description', 'Küstenpark mit einem alten Wachturm und Gärten über der Klippe. Eine ruhige Ecke abseits des Trubels mit Meerblick.'),
('poi_torremolinos_bateria', 'poi', 'de', 'short_tip', 'Perfekt für einen ruhigen Spaziergang bei Sonnenuntergang'),

('poi_torremolinos_molino_inca', 'poi', 'fr', 'name', 'Jardin botanique Molino de Inca'),
('poi_torremolinos_molino_inca', 'poi', 'fr', 'description', 'Ancienne source et moulin à eau transformés en un luxuriant jardin botanique gratuit, avec bassins, cascades et oiseaux. Une oasis verte que peu de touristes connaissent.'),
('poi_torremolinos_molino_inca', 'poi', 'fr', 'short_tip', 'Entrée gratuite — parfait pour échapper à la chaleur en été'),
('poi_torremolinos_molino_inca', 'poi', 'de', 'name', 'Botanischer Garten Molino de Inca'),
('poi_torremolinos_molino_inca', 'poi', 'de', 'description', 'Eine ehemalige Quelle und Wassermühle, verwandelt in einen üppigen, kostenlosen botanischen Garten mit Teichen, Wasserfällen und Vogelwelt. Eine grüne Oase, die die meisten Touristen nie entdecken.'),
('poi_torremolinos_molino_inca', 'poi', 'de', 'short_tip', 'Freier Eintritt — perfekt, um der Sommerhitze zu entkommen'),

-- ════════════════════════════════════════
-- TORREMOLINOS — PREMIUM
-- ════════════════════════════════════════
('poi_torremolinos_cocodrilos', 'poi', 'fr', 'name', 'Cocodrilos Park'),
('poi_torremolinos_cocodrilos', 'poi', 'fr', 'description', 'Le seul parc à crocodiles d''Espagne, avec plus de 300 spécimens. Comprend un espace reptiles, des présentations et la possibilité de tenir un bébé crocodile.'),
('poi_torremolinos_cocodrilos', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_torremolinos_cocodrilos', 'poi', 'de', 'name', 'Cocodrilos Park'),
('poi_torremolinos_cocodrilos', 'poi', 'de', 'description', 'Spaniens einziger Krokodilpark mit über 300 Exemplaren. Mit Reptilienbereich, Shows und der Möglichkeit, ein Baby-Krokodil zu halten.'),
('poi_torremolinos_cocodrilos', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_torremolinos_aqualand', 'poi', 'fr', 'name', 'Aqualand Torremolinos'),
('poi_torremolinos_aqualand', 'poi', 'fr', 'description', 'Le plus grand parc aquatique de la Costa del Sol occidentale, avec toboggans, piscine à vagues et espace enfants. Le seul parc de la chaîne sur cette partie de la côte.'),
('poi_torremolinos_aqualand', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_torremolinos_aqualand', 'poi', 'de', 'name', 'Aqualand Torremolinos'),
('poi_torremolinos_aqualand', 'poi', 'de', 'description', 'Der größte Wasserpark der westlichen Costa del Sol mit Rutschen, Wellenbad und Kinderbereich. Der einzige Park dieser Kette an diesem Küstenabschnitt.'),
('poi_torremolinos_aqualand', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

-- ════════════════════════════════════════
-- BENALMÁDENA
-- ════════════════════════════════════════
('poi_benalmadena_plaza_espana', 'poi', 'fr', 'name', 'Plaza de España (Benalmádena Pueblo)'),
('poi_benalmadena_plaza_espana', 'poi', 'fr', 'description', 'Place centrale de la vieille ville, lieu de rencontre avec terrasses, proche de l''église de Santo Domingo, avec vue sur la vallée. Idéale pour commencer la visite du village.'),
('poi_benalmadena_plaza_espana', 'poi', 'fr', 'short_tip', 'Bon point de repère pour se garer et explorer le village à pied'),
('poi_benalmadena_plaza_espana', 'poi', 'de', 'name', 'Plaza de España (Benalmádena Pueblo)'),
('poi_benalmadena_plaza_espana', 'poi', 'de', 'description', 'Der zentrale Platz der Altstadt, ein Treffpunkt mit Terrassen, nahe der Kirche Santo Domingo, mit Blick ins Tal. Ein guter Ausgangspunkt für die Erkundung des Dorfes.'),
('poi_benalmadena_plaza_espana', 'poi', 'de', 'short_tip', 'Guter Bezugspunkt zum Parken und Erkunden des Dorfes zu Fuß'),

('poi_benalmadena_teleferico', 'poi', 'fr', 'name', 'Téléphérique de Benalmádena'),
('poi_benalmadena_teleferico', 'poi', 'fr', 'description', 'Montez en 15 minutes aux 769 m du Monte Calamorro pour des vues sur toute la Costa del Sol, Gibraltar et le nord de l''Afrique. Au sommet : spectacles de rapaces et sentiers de randonnée. Unique sur la côte.'),
('poi_benalmadena_teleferico', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_benalmadena_teleferico', 'poi', 'de', 'name', 'Seilbahn Benalmádena'),
('poi_benalmadena_teleferico', 'poi', 'de', 'description', 'In 15 Minuten geht es hinauf auf die 769 m hohe Spitze des Monte Calamorro mit Blick über die gesamte Costa del Sol, Gibraltar und Nordafrika. Oben: Greifvogelshows und Wanderwege. Einzigartig an der Küste.'),
('poi_benalmadena_teleferico', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_benalmadena_mariposario', 'poi', 'fr', 'name', 'Mariposario de Benalmádena'),
('poi_benalmadena_mariposario', 'poi', 'fr', 'description', 'L''une des plus grandes serres à papillons d''Europe, avec des milliers de papillons tropicaux volant librement dans une serre voisine du Stupa bouddhiste.'),
('poi_benalmadena_mariposario', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_benalmadena_mariposario', 'poi', 'de', 'name', 'Schmetterlingspark Benalmádena'),
('poi_benalmadena_mariposario', 'poi', 'de', 'description', 'Einer der größten Schmetterlingsparks Europas, mit Tausenden tropischen Schmetterlingen, die frei in einem Gewächshaus neben der buddhistischen Stupa fliegen.'),
('poi_benalmadena_mariposario', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

('poi_benalmadena_selwo_marina', 'poi', 'fr', 'name', 'Selwo Marina'),
('poi_benalmadena_selwo_marina', 'poi', 'fr', 'description', 'Parc marin avec delphinarium, colonie de manchots et oiseaux exotiques, à côté du port de Benalmádena. Le seul parc de ce type dans la région.'),
('poi_benalmadena_selwo_marina', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_benalmadena_selwo_marina', 'poi', 'de', 'name', 'Selwo Marina'),
('poi_benalmadena_selwo_marina', 'poi', 'de', 'description', 'Meerespark mit Delfinarium, Pinguinkolonie und exotischen Vögeln direkt am Hafen von Benalmádena. Der einzige Park dieser Art in der Region.'),
('poi_benalmadena_selwo_marina', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

-- ════════════════════════════════════════
-- FUENGIROLA — FREE
-- ════════════════════════════════════════
('poi_fuengirola_castillo_sohail', 'poi', 'fr', 'name', 'Château Sohail'),
('poi_fuengirola_castillo_sohail', 'poi', 'fr', 'description', 'Forteresse maure du Xe siècle à l''embouchure de la rivière Fuengirola, reconstruite après un tremblement de terre au XVIIIe siècle. L''enceinte extérieure se visite gratuitement ; elle accueille aujourd''hui des concerts.'),
('poi_fuengirola_castillo_sohail', 'poi', 'fr', 'short_tip', 'Des concerts ont lieu dans le château en été — consultez le programme'),
('poi_fuengirola_castillo_sohail', 'poi', 'de', 'name', 'Burg Sohail'),
('poi_fuengirola_castillo_sohail', 'poi', 'de', 'description', 'Maurische Festung aus dem 10. Jahrhundert an der Mündung des Flusses Fuengirola, nach einem Erdbeben im 18. Jahrhundert wiederaufgebaut. Das Außengelände ist frei zugänglich und dient heute als Konzertort.'),
('poi_fuengirola_castillo_sohail', 'poi', 'de', 'short_tip', 'Im Sommer finden Konzerte in der Burg statt — Programm vorher prüfen'),

('poi_fuengirola_paseo_maritimo', 'poi', 'fr', 'name', 'Promenade Rey de España'),
('poi_fuengirola_paseo_maritimo', 'poi', 'fr', 'description', 'L''une des plus longues promenades maritimes de la Costa del Sol (plus de 7 km), longeant tout le front de mer de Fuengirola.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'fr', 'short_tip', 'Parfait pour courir ou faire du vélo au lever du soleil'),
('poi_fuengirola_paseo_maritimo', 'poi', 'de', 'name', 'Strandpromenade Rey de España'),
('poi_fuengirola_paseo_maritimo', 'poi', 'de', 'description', 'Eine der längsten Strandpromenaden der Costa del Sol (über 7 km) entlang der gesamten Strandfront von Fuengirola.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'de', 'short_tip', 'Ideal zum Joggen oder Radfahren bei Sonnenaufgang'),

('poi_fuengirola_casco_antiguo', 'poi', 'fr', 'name', 'Vieille ville de Fuengirola'),
('poi_fuengirola_casco_antiguo', 'poi', 'fr', 'description', 'Rues piétonnes autour de la Plaza de la Constitución, avec commerces locaux, marché du mardi et bars à tapas traditionnels.'),
('poi_fuengirola_casco_antiguo', 'poi', 'fr', 'short_tip', 'Le marché du mardi au parc des expositions est très populaire'),
('poi_fuengirola_casco_antiguo', 'poi', 'de', 'name', 'Altstadt von Fuengirola'),
('poi_fuengirola_casco_antiguo', 'poi', 'de', 'description', 'Fußgängerzonen rund um die Plaza de la Constitución mit lokalen Geschäften, dem Dienstagsmarkt und traditionellen Tapas-Bars.'),
('poi_fuengirola_casco_antiguo', 'poi', 'de', 'short_tip', 'Der Dienstagsmarkt auf dem Messegelände ist sehr beliebt'),

('poi_fuengirola_parque_fluvial', 'poi', 'fr', 'name', 'Parc fluvial de la rivière Fuengirola'),
('poi_fuengirola_parque_fluvial', 'poi', 'fr', 'description', 'Corridor vert le long du lit de la rivière, avec piste cyclable et zones ombragées. Une escapade tranquille loin de la plage, peu connue des visiteurs.'),
('poi_fuengirola_parque_fluvial', 'poi', 'fr', 'short_tip', 'Relie à pied ou à vélo le Bioparc et le château Sohail'),
('poi_fuengirola_parque_fluvial', 'poi', 'de', 'name', 'Flusspark des Río Fuengirola'),
('poi_fuengirola_parque_fluvial', 'poi', 'de', 'description', 'Grüner Korridor entlang des Flussbetts mit Radweg und schattigen Bereichen. Ein ruhiger Rückzugsort abseits des Strands, den die meisten Besucher nie entdecken.'),
('poi_fuengirola_parque_fluvial', 'poi', 'de', 'short_tip', 'Verbindet zu Fuß oder mit dem Rad zum Bioparc und zur Burg Sohail'),

('poi_fuengirola_boliches', 'poi', 'fr', 'name', 'Los Boliches'),
('poi_fuengirola_boliches', 'poi', 'fr', 'description', 'Ancien quartier de pêcheurs aujourd''hui intégré à Fuengirola, avec des ruelles étroites, sa propre église et une belle ambiance de tapas en bord de mer.'),
('poi_fuengirola_boliches', 'poi', 'fr', 'short_tip', 'Moins touristique que le centre — une bonne option pour manger du poisson frais'),
('poi_fuengirola_boliches', 'poi', 'de', 'name', 'Los Boliches'),
('poi_fuengirola_boliches', 'poi', 'de', 'description', 'Ehemaliges Fischerviertel, heute Teil von Fuengirola, mit engen Gassen, eigener Kirche und toller Tapas-Szene am Meer.'),
('poi_fuengirola_boliches', 'poi', 'de', 'short_tip', 'Weniger touristisch als das Zentrum — gut für frischen Fisch'),

('poi_fuengirola_santa_amalia', 'poi', 'fr', 'name', 'Plage de Santa Amalia'),
('poi_fuengirola_santa_amalia', 'poi', 'fr', 'description', 'Grande plage urbaine bien équipée, labellisée pavillon bleu, avec buvettes et tous les services. L''une des préférées des familles.'),
('poi_fuengirola_santa_amalia', 'poi', 'fr', 'short_tip', 'Bonne option avec des enfants grâce à son accès facile et ses eaux calmes'),
('poi_fuengirola_santa_amalia', 'poi', 'de', 'name', 'Strand Santa Amalia'),
('poi_fuengirola_santa_amalia', 'poi', 'de', 'description', 'Breiter, gut ausgestatteter Stadtstrand mit Blauer Flagge, Strandbars und allen Einrichtungen. Ein Favorit bei Familien.'),
('poi_fuengirola_santa_amalia', 'poi', 'de', 'short_tip', 'Dank einfachem Zugang und ruhigem Wasser gut für Kinder geeignet'),

-- ════════════════════════════════════════
-- FUENGIROLA — PREMIUM
-- ════════════════════════════════════════
('poi_fuengirola_bioparc', 'poi', 'fr', 'name', 'Bioparc Fuengirola'),
('poi_fuengirola_bioparc', 'poi', 'fr', 'description', 'Zoo d''immersion (sans cages ni grilles visibles) avec plus de 200 espèces, dont beaucoup menacées. Classé parmi les 10 meilleures attractions de la province de Málaga sur TripAdvisor.'),
('poi_fuengirola_bioparc', 'poi', 'fr', 'cta_label', 'Acheter des billets'),
('poi_fuengirola_bioparc', 'poi', 'de', 'name', 'Bioparc Fuengirola'),
('poi_fuengirola_bioparc', 'poi', 'de', 'description', 'Ein Immersions-Zoo (ohne sichtbare Gitter oder Käfige) mit über 200 Arten, viele davon vom Aussterben bedroht. Auf TripAdvisor eine der Top-10-Attraktionen der Provinz Málaga.'),
('poi_fuengirola_bioparc', 'poi', 'de', 'cta_label', 'Tickets kaufen'),

-- ════════════════════════════════════════
-- MIJAS — FREE
-- ════════════════════════════════════════
('poi_mijas_casco_antiguo', 'poi', 'fr', 'name', 'Vieille ville de Mijas Pueblo'),
('poi_mijas_casco_antiguo', 'poi', 'fr', 'description', 'Le village blanc perché sur la montagne, avec des rues pavées, des pots de géraniums et une vue sur la Méditerranée. L''un des villages les plus charmants de la Costa del Sol.'),
('poi_mijas_casco_antiguo', 'poi', 'fr', 'short_tip', 'Garez-vous à l''entrée du village — le centre est entièrement piéton'),
('poi_mijas_casco_antiguo', 'poi', 'de', 'name', 'Altstadt von Mijas Pueblo'),
('poi_mijas_casco_antiguo', 'poi', 'de', 'description', 'Das weiße Dorf auf dem Berghang mit gepflasterten Gassen, Geranientöpfen und Blick auf das Mittelmeer. Eines der charmantesten Dörfer der Costa del Sol.'),
('poi_mijas_casco_antiguo', 'poi', 'de', 'short_tip', 'Am Dorfeingang parken — das Zentrum ist komplett autofrei'),

('poi_mijas_mirador_compas', 'poi', 'fr', 'name', 'Mirador del Compás'),
('poi_mijas_mirador_compas', 'poi', 'fr', 'description', 'Balcon naturel avec une vue spectaculaire sur Fuengirola, la côte et, par temps clair, jusqu''à l''Afrique. L''un des meilleurs belvédères gratuits de la région.'),
('poi_mijas_mirador_compas', 'poi', 'fr', 'short_tip', 'Les jours d''hiver dégagés offrent la meilleure visibilité'),
('poi_mijas_mirador_compas', 'poi', 'de', 'name', 'Mirador del Compás'),
('poi_mijas_mirador_compas', 'poi', 'de', 'description', 'Ein natürlicher Balkon mit spektakulärem Blick auf Fuengirola, die Küste und an klaren Tagen sogar bis nach Afrika. Einer der besten kostenlosen Aussichtspunkte der Region.'),
('poi_mijas_mirador_compas', 'poi', 'de', 'short_tip', 'Klare Wintertage bieten die beste Sicht'),

('poi_mijas_jardines_muralla', 'poi', 'fr', 'name', 'Jardins de la Muraille'),
('poi_mijas_jardines_muralla', 'poi', 'fr', 'description', 'Jardins en terrasses construits sur les vestiges de l''ancienne muraille arabe du village, avec des points de vue et une végétation méditerranéenne.'),
('poi_mijas_jardines_muralla', 'poi', 'fr', 'short_tip', 'Une courte promenade mais pleine de charme, idéale avant ou après le repas'),
('poi_mijas_jardines_muralla', 'poi', 'de', 'name', 'Muralla-Gärten'),
('poi_mijas_jardines_muralla', 'poi', 'de', 'description', 'Terrassengärten, angelegt auf den Resten der alten maurischen Dorfmauer, mit Aussichtspunkten und mediterraner Vegetation.'),
('poi_mijas_jardines_muralla', 'poi', 'de', 'short_tip', 'Ein kurzer, aber reizvoller Spaziergang — ideal vor oder nach dem Essen'),

('poi_mijas_ermita_peña', 'poi', 'fr', 'name', 'Ermitage de la Virgen de la Peña'),
('poi_mijas_ermita_peña', 'poi', 'fr', 'description', 'Petit ermitage creusé directement dans la roche, dédié à la sainte patronne de Mijas. L''un des joyaux les plus singuliers du village.'),
('poi_mijas_ermita_peña', 'poi', 'fr', 'short_tip', 'Entrée gratuite — visite courte mais très spéciale'),
('poi_mijas_ermita_peña', 'poi', 'de', 'name', 'Einsiedelei Virgen de la Peña'),
('poi_mijas_ermita_peña', 'poi', 'de', 'description', 'Kleine, direkt in den Fels gehauene Kapelle, der Schutzpatronin von Mijas gewidmet. Eines der einzigartigsten Kleinode des Dorfes.'),
('poi_mijas_ermita_peña', 'poi', 'de', 'short_tip', 'Freier Eintritt — ein kurzer, aber ganz besonderer Besuch'),

('poi_mijas_plaza_virgen_peña', 'poi', 'fr', 'name', 'Plaza Virgen de la Peña'),
('poi_mijas_plaza_virgen_peña', 'poi', 'fr', 'description', 'Place principale du village, point de départ des ânes-taxis, avec la plus belle vue sur la vallée depuis son balcon.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'fr', 'short_tip', 'Point de rendez-vous habituel — tout est facile à trouver depuis ici'),
('poi_mijas_plaza_virgen_peña', 'poi', 'de', 'name', 'Plaza Virgen de la Peña'),
('poi_mijas_plaza_virgen_peña', 'poi', 'de', 'description', 'Der Hauptplatz des Dorfes, Ausgangspunkt der Esel-Taxis, mit dem besten Talblick von seinem Balkon aus.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'de', 'short_tip', 'Ein üblicher Treffpunkt — von hier aus ist alles leicht zu finden'),

('poi_mijas_cac', 'poi', 'fr', 'name', 'CAC Mijas (Centre d''Art Contemporain)'),
('poi_mijas_cac', 'poi', 'fr', 'description', 'Collection permanente comprenant des œuvres originales de Picasso, Dalí et Miró, avec entrée gratuite. Surprenant pour un village de cette taille.'),
('poi_mijas_cac', 'poi', 'fr', 'short_tip', 'Entrée gratuite — incontournable même si les musées ne sont pas votre truc'),
('poi_mijas_cac', 'poi', 'de', 'name', 'CAC Mijas (Zentrum für zeitgenössische Kunst)'),
('poi_mijas_cac', 'poi', 'de', 'description', 'Eine Dauerausstellung mit Originalwerken von Picasso, Dalí und Miró, bei freiem Eintritt. Überraschend für ein Dorf dieser Größe.'),
('poi_mijas_cac', 'poi', 'de', 'short_tip', 'Freier Eintritt — lohnt sich auch für Museumsmuffel'),

('poi_mijas_cala', 'poi', 'fr', 'name', 'Plage de La Cala de Mijas'),
('poi_mijas_cala', 'poi', 'fr', 'description', 'La plage de Mijas Costa, avec une promenade animée, des buvettes de plage et une ambiance plus calme qu''à Fuengirola ou Marbella.'),
('poi_mijas_cala', 'poi', 'fr', 'short_tip', 'Bonne base si vous logez près de la côte plutôt qu''au village'),
('poi_mijas_cala', 'poi', 'de', 'name', 'Strand La Cala de Mijas'),
('poi_mijas_cala', 'poi', 'de', 'description', 'Der Strand von Mijas Costa mit einer lebendigen Promenade, Strandbars und einer ruhigeren Atmosphäre als in Fuengirola oder Marbella.'),
('poi_mijas_cala', 'poi', 'de', 'short_tip', 'Eine gute Basis, wenn Sie eher an der Küste als im Dorf wohnen'),

-- ════════════════════════════════════════
-- MIJAS — PREMIUM
-- ════════════════════════════════════════
('poi_mijas_carromato', 'poi', 'fr', 'name', 'Carromato de Mijas (musée des miniatures)'),
('poi_mijas_carromato', 'poi', 'fr', 'description', 'Musée de miniatures ouvert en 1972 dans une roulotte en bois, avec plus de 300 pièces provenant de 50 pays, réunies par "le Professeur Max". Un joyau insolite du village.'),
('poi_mijas_carromato', 'poi', 'fr', 'cta_label', 'Plus d''infos'),
('poi_mijas_carromato', 'poi', 'de', 'name', 'Carromato de Mijas (Miniaturenmuseum)'),
('poi_mijas_carromato', 'poi', 'de', 'description', 'Ein 1972 eröffnetes Miniaturenmuseum in einem hölzernen Planwagen, mit über 300 Stücken aus 50 Ländern, gesammelt von "Professor Max". Ein kurioses Dorfjuwel.'),
('poi_mijas_carromato', 'poi', 'de', 'cta_label', 'Mehr erfahren'),

('poi_mijas_plaza_toros', 'poi', 'fr', 'name', 'Arènes de Mijas'),
('poi_mijas_plaza_toros', 'poi', 'fr', 'description', 'L''une des rares arènes de forme ovale au monde, construite en 1900 sur une ancienne citerne mauresque. Comprend un petit musée taurin.'),
('poi_mijas_plaza_toros', 'poi', 'fr', 'cta_label', 'Plus d''infos'),
('poi_mijas_plaza_toros', 'poi', 'de', 'name', 'Stierkampfarena von Mijas'),
('poi_mijas_plaza_toros', 'poi', 'de', 'description', 'Eine der wenigen ovalen Stierkampfarenen der Welt, 1900 über einer alten maurischen Zisterne erbaut. Mit einem kleinen Stierkampfmuseum.'),
('poi_mijas_plaza_toros', 'poi', 'de', 'cta_label', 'Mehr erfahren'),

('poi_mijas_burro_taxi', 'poi', 'fr', 'name', 'Ânes-taxis de Mijas'),
('poi_mijas_burro_taxi', 'poi', 'fr', 'description', 'Promenade traditionnelle à dos d''âne dans les rues du village, symbole historique de Mijas depuis les années 60. Départ depuis la Plaza Virgen de la Peña.'),
('poi_mijas_burro_taxi', 'poi', 'fr', 'short_tip', 'Certains visiteurs s''interrogent sur le bien-être animal — à considérer avant de réserver'),
('poi_mijas_burro_taxi', 'poi', 'fr', 'cta_label', 'Plus d''infos'),
('poi_mijas_burro_taxi', 'poi', 'de', 'name', 'Esel-Taxis von Mijas'),
('poi_mijas_burro_taxi', 'poi', 'de', 'description', 'Traditionelle Eselritte durch die Dorfstraßen, seit den 1960er Jahren ein historisches Wahrzeichen von Mijas. Abfahrt an der Plaza Virgen de la Peña.'),
('poi_mijas_burro_taxi', 'poi', 'de', 'short_tip', 'Einige Besucher äußern Bedenken zum Tierwohl — vor der Buchung bedenken'),
('poi_mijas_burro_taxi', 'poi', 'de', 'cta_label', 'Mehr erfahren'),

-- ════════════════════════════════════════
-- MARBELLA — FREE
-- ════════════════════════════════════════
('poi_marbella_naranjos', 'poi', 'fr', 'name', 'Plaza de los Naranjos'),
('poi_marbella_naranjos', 'poi', 'fr', 'description', 'Le cœur de la vieille ville depuis 1485, avec ses orangers, son hôtel de ville Renaissance et ses terrasses dans un cadre impeccablement entretenu.'),
('poi_marbella_naranjos', 'poi', 'fr', 'short_tip', 'Point de départ idéal pour se perdre dans le dédale de ruelles blanches'),
('poi_marbella_naranjos', 'poi', 'de', 'name', 'Plaza de los Naranjos'),
('poi_marbella_naranjos', 'poi', 'de', 'description', 'Das Herz der Altstadt seit 1485, mit Orangenbäumen, dem Renaissance-Rathaus und Terrassen in makellos gepflegter Umgebung.'),
('poi_marbella_naranjos', 'poi', 'de', 'short_tip', 'Der perfekte Ausgangspunkt, um sich im Labyrinth weißer Gassen zu verlieren'),

('poi_marbella_murallas', 'poi', 'fr', 'name', 'Murailles du château arabe'),
('poi_marbella_murallas', 'poi', 'fr', 'description', 'Vestiges de la fortification arabe du Xe siècle qui protégeait l''ancienne Marbella, encore visibles parmi les rues du centre historique.'),
('poi_marbella_murallas', 'poi', 'fr', 'short_tip', 'Facile à combiner avec une balade sur la Plaza de los Naranjos'),
('poi_marbella_murallas', 'poi', 'de', 'name', 'Mauern der arabischen Burg'),
('poi_marbella_murallas', 'poi', 'de', 'description', 'Überreste der maurischen Befestigung aus dem 10. Jahrhundert, die das alte Marbella schützte, noch heute zwischen den Gassen der Altstadt sichtbar.'),
('poi_marbella_murallas', 'poi', 'de', 'short_tip', 'Leicht mit einem Spaziergang über die Plaza de los Naranjos zu kombinieren'),

('poi_marbella_encarnacion', 'poi', 'fr', 'name', 'Église de la Encarnación'),
('poi_marbella_encarnacion', 'poi', 'fr', 'description', 'Église principale de la vieille ville, construite entre le XVIe et le XVIIIe siècle, avec une façade baroque et un clocher qui domine l''horizon du centre historique.'),
('poi_marbella_encarnacion', 'poi', 'fr', 'short_tip', 'Entrée gratuite en dehors des horaires de messe'),
('poi_marbella_encarnacion', 'poi', 'de', 'name', 'Kirche der Encarnación'),
('poi_marbella_encarnacion', 'poi', 'de', 'description', 'Die Hauptkirche der Altstadt, erbaut zwischen dem 16. und 18. Jahrhundert, mit barocker Fassade und einem Glockenturm, der die historische Skyline dominiert.'),
('poi_marbella_encarnacion', 'poi', 'de', 'short_tip', 'Freier Eintritt außerhalb der Messezeiten'),

('poi_marbella_avenida_mar', 'poi', 'fr', 'name', 'Avenida del Mar'),
('poi_marbella_avenida_mar', 'poi', 'fr', 'description', 'Avenue piétonne reliant la vieille ville à la plage, ornée de 10 sculptures originales de Salvador Dalí exposées en plein air — une collection unique sur la côte.'),
('poi_marbella_avenida_mar', 'poi', 'fr', 'short_tip', 'Cherchez "L''Homme éléphant" et "Noblesse du temps", les plus photographiées'),
('poi_marbella_avenida_mar', 'poi', 'de', 'name', 'Avenida del Mar'),
('poi_marbella_avenida_mar', 'poi', 'de', 'description', 'Fußgängerallee, die die Altstadt mit dem Strand verbindet, gesäumt von 10 original Skulpturen von Salvador Dalí im Freien — eine an der Küste einmalige Sammlung.'),
('poi_marbella_avenida_mar', 'poi', 'de', 'short_tip', 'Halten Sie Ausschau nach "Der Elefantenmensch" und "Adel der Zeit", den meistfotografierten Werken'),

('poi_marbella_villa_romana', 'poi', 'fr', 'name', 'Villa romaine de Río Verde'),
('poi_marbella_villa_romana', 'poi', 'fr', 'description', 'Site archéologique d''une villa romaine des Ier-IIe siècles apr. J.-C. avec des mosaïques originales remarquablement conservées. Un joyau caché que peu de touristes visitent.'),
('poi_marbella_villa_romana', 'poi', 'fr', 'short_tip', 'Vérifiez les horaires d''ouverture avant de vous y rendre — ils sont limités'),
('poi_marbella_villa_romana', 'poi', 'de', 'name', 'Römische Villa von Río Verde'),
('poi_marbella_villa_romana', 'poi', 'de', 'description', 'Ausgrabungsstätte einer römischen Villa aus dem 1.-2. Jahrhundert n. Chr. mit bemerkenswert gut erhaltenen Original-Mosaiken. Ein verstecktes Juwel, das kaum Touristen besuchen.'),
('poi_marbella_villa_romana', 'poi', 'de', 'short_tip', 'Öffnungszeiten vorher prüfen — sie sind eingeschränkt'),

('poi_marbella_basilica_vega', 'poi', 'fr', 'name', 'Basilique paléochrétienne de Vega del Mar'),
('poi_marbella_basilica_vega', 'poi', 'fr', 'description', 'Vestiges d''une basilique wisigothe des IVe-VIe siècles, avec une insolite double abside. Située près de l''embouchure de la rivière Guadalmina, à San Pedro de Alcántara.'),
('poi_marbella_basilica_vega', 'poi', 'fr', 'short_tip', 'À combiner avec les thermes romains de Las Bóvedas, juste à côté'),
('poi_marbella_basilica_vega', 'poi', 'de', 'name', 'Frühchristliche Basilika von Vega del Mar'),
('poi_marbella_basilica_vega', 'poi', 'de', 'description', 'Überreste einer westgotischen Basilika aus dem 4.-6. Jahrhundert mit einer ungewöhnlichen doppelten Apsis. Nahe der Mündung des Flusses Guadalmina in San Pedro de Alcántara gelegen.'),
('poi_marbella_basilica_vega', 'poi', 'de', 'short_tip', 'Gut mit den römischen Thermen von Las Bóvedas gleich nebenan zu kombinieren'),

('poi_marbella_termas', 'poi', 'fr', 'name', 'Thermes romains de Las Bóvedas'),
('poi_marbella_termas', 'poi', 'fr', 'description', 'Thermes romains des IIIe-IVe siècles, parmi les mieux conservés d''Andalousie, avec des salles de bain froid, tiède et chaud encore reconnaissables.'),
('poi_marbella_termas', 'poi', 'fr', 'short_tip', 'Visite gratuite mais horaires limités — vérifiez avant de venir'),
('poi_marbella_termas', 'poi', 'de', 'name', 'Römische Thermen von Las Bóvedas'),
('poi_marbella_termas', 'poi', 'de', 'description', 'Römische Thermalbäder aus dem 3.-4. Jahrhundert, zu den besterhaltenen Andalusiens zählend, mit noch erkennbaren Kalt-, Warm- und Heißbaderäumen.'),
('poi_marbella_termas', 'poi', 'de', 'short_tip', 'Kostenloser Besuch, aber eingeschränkte Öffnungszeiten — vorher prüfen'),

('poi_marbella_puerto_banus', 'poi', 'fr', 'name', 'Puerto Banús'),
('poi_marbella_puerto_banus', 'poi', 'fr', 'description', 'La marina de luxe la plus célèbre d''Espagne, avec yachts, voitures de sport et boutiques haut de gamme. Un spectacle gratuit de style de vie et d''observation des gens.'),
('poi_marbella_puerto_banus', 'poi', 'fr', 'short_tip', 'Venez au coucher du soleil pour voir les yachts illuminés'),
('poi_marbella_puerto_banus', 'poi', 'de', 'name', 'Puerto Banús'),
('poi_marbella_puerto_banus', 'poi', 'de', 'description', 'Spaniens berühmtester Luxushafen mit Yachten, Sportwagen und Edelboutiquen. Ein kostenloses Schauspiel aus Menschenbeobachtung und Lifestyle.'),
('poi_marbella_puerto_banus', 'poi', 'de', 'short_tip', 'Bei Sonnenuntergang kommen, um die beleuchteten Yachten zu sehen'),

('poi_marbella_fontanilla', 'poi', 'fr', 'name', 'Plage de la Fontanilla'),
('poi_marbella_fontanilla', 'poi', 'fr', 'description', 'Plage urbaine à côté de la vieille ville, avec promenade, buvettes et le Cable Ski Marbella à proximité. Facile à combiner avec la visite du centre.'),
('poi_marbella_fontanilla', 'poi', 'fr', 'short_tip', 'À 10 minutes à pied de la Plaza de los Naranjos'),
('poi_marbella_fontanilla', 'poi', 'de', 'name', 'Strand La Fontanilla'),
('poi_marbella_fontanilla', 'poi', 'de', 'description', 'Stadtstrand neben der Altstadt, mit Promenade, Strandbars und dem nahegelegenen Cable Ski Marbella. Leicht mit einem Altstadtbesuch zu kombinieren.'),
('poi_marbella_fontanilla', 'poi', 'de', 'short_tip', '10 Gehminuten von der Plaza de los Naranjos entfernt'),

('poi_marbella_museo_ralli', 'poi', 'fr', 'name', 'Musée Ralli Marbella'),
('poi_marbella_museo_ralli', 'poi', 'fr', 'description', 'Musée d''art latino-américain et européen contemporain (Dalí, Botero, entre autres) à l''entrée entièrement gratuite — rare pour une collection de ce niveau.'),
('poi_marbella_museo_ralli', 'poi', 'fr', 'short_tip', 'Fermé le lundi et en été (juil.-août) ; vérifiez avant de vous y rendre'),
('poi_marbella_museo_ralli', 'poi', 'de', 'name', 'Museo Ralli Marbella'),
('poi_marbella_museo_ralli', 'poi', 'de', 'description', 'Museum für lateinamerikanische und zeitgenössische europäische Kunst (u. a. Dalí, Botero) mit völlig freiem Eintritt — ungewöhnlich für eine Sammlung dieses Niveaus.'),
('poi_marbella_museo_ralli', 'poi', 'de', 'short_tip', 'Montags und im Sommer (Jul.-Aug.) geschlossen; vorher prüfen'),

-- ════════════════════════════════════════
-- MARBELLA — PREMIUM
-- ════════════════════════════════════════
('poi_marbella_museo_grabado', 'poi', 'fr', 'name', 'Musée de la Gravure Espagnole Contemporaine'),
('poi_marbella_museo_grabado', 'poi', 'fr', 'description', 'Le seul musée d''Espagne entièrement consacré à la gravure, avec des œuvres de Picasso, Miró et Dalí, dans un bâtiment du XVIe siècle de la vieille ville.'),
('poi_marbella_museo_grabado', 'poi', 'fr', 'cta_label', 'Plus d''infos'),
('poi_marbella_museo_grabado', 'poi', 'de', 'name', 'Museum für zeitgenössische spanische Druckgrafik'),
('poi_marbella_museo_grabado', 'poi', 'de', 'description', 'Spaniens einziges Museum, das ausschließlich der Druckgrafik gewidmet ist, mit Werken von Picasso, Miró und Dalí, in einem Gebäude aus dem 16. Jahrhundert in der Altstadt.'),
('poi_marbella_museo_grabado', 'poi', 'de', 'cta_label', 'Mehr erfahren'),

('poi_marbella_museo_bonsai', 'poi', 'fr', 'name', 'Musée du Bonsaï'),
('poi_marbella_museo_bonsai', 'poi', 'fr', 'description', 'L''une des collections de bonsaïs les plus importantes d''Europe, avec des spécimens centenaires dans le Parque de la Represa. Une expérience unique et méconnue.'),
('poi_marbella_museo_bonsai', 'poi', 'fr', 'cta_label', 'Plus d''infos'),
('poi_marbella_museo_bonsai', 'poi', 'de', 'name', 'Bonsai-Museum'),
('poi_marbella_museo_bonsai', 'poi', 'de', 'description', 'Eine der bedeutendsten Bonsai-Sammlungen Europas mit jahrhundertealten Exemplaren im Parque de la Represa. Ein einzigartiges und wenig bekanntes Erlebnis.'),
('poi_marbella_museo_bonsai', 'poi', 'de', 'cta_label', 'Mehr erfahren');
