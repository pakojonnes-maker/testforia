PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free',  -- free, starter, professional, enterprise
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  max_restaurants INTEGER DEFAULT 1,
  max_dishes_per_restaurant INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "accounts" VALUES('acc_yucas_01','Cuenta Yucas','info@yucasrestaurante.com','professional',NULL,NULL,1,100,1,'2025-07-31 11:37:50','2025-07-31 11:37:50');
CREATE TABLE menus (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  is_seasonal BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, featured_poster_url TEXT, featured_video_url TEXT, external_url TEXT,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
INSERT INTO "menus" VALUES('menu_yucas_principal','rest_yucas_01','Menú Principal','Nuestra selección de platos más populares',1,0,0,NULL,NULL,'2025-07-31 11:37:52','2025-07-31 11:37:52','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/primary/pabellon.mp4','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/primary/pabellon.mp4','/menu/menu_yucas_principal');
INSERT INTO "menus" VALUES('menu_yucas_bebidas','rest_yucas_01','Bebidas','Refrescantes bebidas tropicales y cócteles tradicionales',1,0,0,NULL,NULL,'2025-07-31 11:37:52','2025-07-31 11:37:52',NULL,NULL,NULL);
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  icon_url TEXT,
  bg_color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
INSERT INTO "sections" VALUES('sect_yucas_entrantes','menu_yucas_principal','rest_yucas_01',2,'roasted-turkey-svgrepo-com.svg',NULL,'2025-07-31 11:37:53','2025-12-07 11:50:48');
INSERT INTO "sections" VALUES('sect_yucas_principales','menu_yucas_principal','rest_yucas_01',1,'ramen-8-svgrepo-com.svg',NULL,'2025-07-31 11:37:53','2025-11-29 13:15:03');
INSERT INTO "sections" VALUES('sect_yucas_postres','menu_yucas_principal','rest_yucas_01',4,'beverage-drink-hot-svgrepo-com.svg',NULL,'2025-07-31 11:37:53','2025-11-29 23:43:19');
INSERT INTO "sections" VALUES('sect_yucas_cocteles','menu_yucas_bebidas','rest_yucas_01',3,NULL,NULL,'2025-07-31 11:37:53','2025-11-29 10:52:10');
INSERT INTO "sections" VALUES('sect_yucas_sin_alcohol','menu_yucas_bebidas','rest_yucas_01',5,NULL,NULL,'2025-07-31 11:37:53','2025-11-29 10:52:10');
INSERT INTO "sections" VALUES('sect_1764459821668_c6t8m','menu_yucas_principal','rest_yucas_01',5,'fast-food-gastronomy-2-svgrepo-com.svg',NULL,'2025-11-29 23:43:41','2025-11-29 23:43:41');
INSERT INTO "sections" VALUES('sect_1764459838590_vnaxb','menu_yucas_principal','rest_yucas_01',6,'fast-food-gastronomy-3-svgrepo-com.svg',NULL,'2025-11-29 23:43:58','2025-11-29 23:43:58');
CREATE TABLE dishes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, out_of_stock, seasonal, hidden
  price REAL NOT NULL,
  discount_price REAL,
  discount_active BOOLEAN DEFAULT FALSE,
  calories INTEGER,
  preparation_time INTEGER, -- en minutos
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  avg_rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total_view_time INTEGER DEFAULT 0,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
INSERT INTO "dishes" VALUES('dish_yucas_tequeños','rest_yucas_01','active',8.5,NULL,0,NULL,NULL,0,0,0,0,1,0,0,4,1,'2025-07-31 11:37:55','2025-07-31 11:37:55',7);
INSERT INTO "dishes" VALUES('dish_yucas_yuca_frita','rest_yucas_01','active',6.75,NULL,0,NULL,NULL,1,1,1,0,1,0,0,4,0,'2025-07-31 11:37:55','2025-07-31 11:37:55',3);
INSERT INTO "dishes" VALUES('dish_yucas_guacamole','rest_yucas_01','active',7.25,NULL,0,NULL,NULL,1,1,1,0,0,0,0,0,0,'2025-07-31 11:37:55','2025-07-31 11:37:55',0);
INSERT INTO "dishes" VALUES('dish_yucas_empanadas','rest_yucas_01','active',9,NULL,0,NULL,NULL,0,0,0,1,0,0,0,0,1,'2025-07-31 11:37:55','2025-07-31 11:37:55',0);
INSERT INTO "dishes" VALUES('dish_yucas_pabellon','rest_yucas_01','active',0,NULL,0,NULL,NULL,1,1,1,1,1,0,0,11,8,'2025-07-31 11:37:55','2025-11-30 00:44:03',204);
INSERT INTO "dishes" VALUES('dish_yucas_arepa','rest_yucas_01','active',11.95,NULL,0,NULL,NULL,1,1,1,1,1,0,0,5,3,'2025-07-31 11:37:55','2025-08-15 19:25:59',9);
INSERT INTO "dishes" VALUES('dish_yucas_lomo','rest_yucas_01','active',16.5,NULL,0,NULL,NULL,0,0,1,0,0,0,0,5,2,'2025-07-31 11:37:55','2025-07-31 11:37:55',26);
INSERT INTO "dishes" VALUES('dish_yucas_cazuela','rest_yucas_01','active',13.75,NULL,0,NULL,NULL,1,0,0,1,1,0,0,2,1,'2025-07-31 11:37:55','2025-07-31 11:37:55',20);
INSERT INTO "dishes" VALUES('dish_yucas_tres_leches','rest_yucas_01','active',6.5,NULL,0,NULL,NULL,1,0,0,0,1,0,0,2,5,'2025-07-31 11:37:56','2025-07-31 11:37:56',46);
INSERT INTO "dishes" VALUES('dish_yucas_quesillo','rest_yucas_01','active',5.75,NULL,0,NULL,NULL,1,0,1,0,0,0,0,2,3,'2025-07-31 11:37:56','2025-07-31 11:37:56',93);
INSERT INTO "dishes" VALUES('dish_yucas_mojito','rest_yucas_01','active',0,NULL,0,NULL,NULL,1,1,1,0,1,0,0,13,12,'2025-07-31 11:37:56','2025-11-30 00:10:03',57);
INSERT INTO "dishes" VALUES('dish_yucas_pina_colada','rest_yucas_01','active',8,NULL,0,NULL,NULL,1,0,1,0,0,0,0,0,0,'2025-07-31 11:37:56','2025-07-31 11:37:56',0);
INSERT INTO "dishes" VALUES('dish_yucas_papelón','rest_yucas_01','active',4.5,NULL,0,NULL,NULL,1,1,1,0,1,0,0,0,0,'2025-07-31 11:37:57','2025-07-31 11:37:57',0);
INSERT INTO "dishes" VALUES('dish_yucas_batido','rest_yucas_01','active',5.25,NULL,0,NULL,NULL,1,0,1,0,0,0,0,0,0,'2025-07-31 11:37:57','2025-07-31 11:37:57',0);
CREATE TABLE section_dishes (
  section_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (section_id, dish_id),
  FOREIGN KEY (section_id) REFERENCES sections(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
);
INSERT INTO "section_dishes" VALUES('sect_yucas_principales','dish_yucas_mojito',1);
INSERT INTO "section_dishes" VALUES('sect_yucas_principales','dish_yucas_pabellon',2);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_mojito',1);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_lomo',2);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_arepa',3);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_tequeños',4);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_yuca_frita',5);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_cazuela',6);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_empanadas',7);
INSERT INTO "section_dishes" VALUES('sect_yucas_entrantes','dish_yucas_guacamole',8);
INSERT INTO "section_dishes" VALUES('sect_yucas_cocteles','dish_yucas_pina_colada',1);
INSERT INTO "section_dishes" VALUES('sect_yucas_postres','dish_yucas_tres_leches',1);
INSERT INTO "section_dishes" VALUES('sect_yucas_postres','dish_yucas_quesillo',2);
INSERT INTO "section_dishes" VALUES('sect_yucas_sin_alcohol','dish_yucas_batido',1);
INSERT INTO "section_dishes" VALUES('sect_yucas_sin_alcohol','dish_yucas_papelón',2);
CREATE TABLE languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  flag_emoji TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
INSERT INTO "languages" VALUES('es','Spanish','Español','🇪🇸',1);
INSERT INTO "languages" VALUES('en','English','English','🇬🇧',1);
CREATE TABLE translations (
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'dish', 'section', 'menu', 'allergen'
  language_code TEXT NOT NULL,
  field TEXT NOT NULL, -- 'name', 'description', etc.
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_id, entity_type, language_code, field),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
INSERT INTO "translations" VALUES('dish_yucas_tequeños','dish','es','name','Tequeños de Queso','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_tequeños','dish','es','description','Deliciosos bastoncitos de masa rellenos de queso blanco, fritos hasta quedar dorados y crujientes. Servidos con salsa de guayaba.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_yuca_frita','dish','es','name','Yuca Frita','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_yuca_frita','dish','es','description','Bastones de yuca crujientes por fuera y suaves por dentro, servidos con salsa de ajo casera.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_guacamole','dish','es','name','Guacamole Tradicional','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_guacamole','dish','es','description','Cremoso guacamole preparado al momento con aguacate, tomate, cebolla, cilantro y un toque de lima. Servido con totopos caseros.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_empanadas','dish','es','name','Empanadas Variadas','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_empanadas','dish','es','description','Selección de empanadas caseras con tres rellenos diferentes: carne mechada, pollo y queso. Acompañadas de guasacaca.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_lomo','dish','es','name','Lomo en Salsa de Yuca','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_lomo','dish','es','description','Tierno lomo de ternera en una cremosa salsa de yuca con especias caribeñas, acompañado de arroz con coco y plátano maduro.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_cazuela','dish','es','name','Cazuela de Yuca y Queso','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_cazuela','dish','es','description','Cremosa cazuela de yuca gratinada con queso, crema y un toque de cilantro. Una delicia vegetariana para compartir.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_tres_leches','dish','es','name','Torta Tres Leches','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_tres_leches','dish','es','description','Esponjoso bizcocho empapado en tres tipos de leche, cubierto con merengue suave y decorado con canela. Un clásico latinoamericano.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_quesillo','dish','es','name','Quesillo Venezolano','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_quesillo','dish','es','description','Suave flan venezolano bañado en caramelo, con un toque de ron y vainilla. Servido frío, es el postre perfecto para cerrar una comida.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_pina_colada','dish','es','name','Piña Colada','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_pina_colada','dish','es','description','Cremoso cóctel tropical con ron, crema de coco y zumo de piña natural. Servido con una rodaja de piña y una cereza.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_papelón','dish','es','name','Papelón con Limón','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_papelón','dish','es','description','Bebida refrescante venezolana preparada con panela y limón recién exprimido. Servida con hielo y hojas de hierbabuena.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_batido','dish','es','name','Batido Tropical','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_batido','dish','es','description','Cremoso batido de frutas tropicales (mango, plátano y piña) con leche o yogur a elección. Una explosión tropical en cada sorbo.','2025-07-31 11:37:57','2025-07-31 11:37:57');
INSERT INTO "translations" VALUES('dish_yucas_tequeños','dish','en','name','Cheese Tequeños','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_tequeños','dish','en','description','Delicious white cheese sticks wrapped in crispy pastry, fried until golden and crunchy. Served with guava sauce.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_yuca_frita','dish','en','name','Fried Cassava','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_yuca_frita','dish','en','description','Crispy cassava sticks, soft on the inside, served with homemade garlic sauce.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_guacamole','dish','en','name','Traditional Guacamole','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_guacamole','dish','en','description','Creamy guacamole freshly prepared with avocado, tomato, onion, cilantro and a touch of lime. Served with homemade tortilla chips.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_empanadas','dish','en','name','Assorted Empanadas','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_empanadas','dish','en','description','Selection of homemade empanadas with three different fillings: shredded beef, chicken and cheese. Accompanied by guasacaca sauce.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_lomo','dish','en','name','Beef in Cassava Sauce','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_lomo','dish','en','description','Tender beef tenderloin in a creamy cassava sauce with Caribbean spices, accompanied by coconut rice and sweet plantain.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_cazuela','dish','en','name','Cassava and Cheese Casserole','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_cazuela','dish','en','description','Creamy cassava casserole au gratin with cheese, cream and a touch of cilantro. A vegetarian delight to share.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_tres_leches','dish','en','name','Tres Leches Cake','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_tres_leches','dish','en','description','Spongy cake soaked in three types of milk, covered with soft meringue and decorated with cinnamon. A Latin American classic.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_quesillo','dish','en','name','Venezuelan Quesillo','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_quesillo','dish','en','description','Soft Venezuelan flan bathed in caramel, with a touch of rum and vanilla. Served cold, it is the perfect dessert to end a meal.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_pina_colada','dish','en','name','Piña Colada','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_pina_colada','dish','en','description','Creamy tropical cocktail with rum, coconut cream and natural pineapple juice. Served with a pineapple slice and a cherry.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_papelón','dish','en','name','Papelón with Lime','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_papelón','dish','en','description','Refreshing Venezuelan drink made with brown sugar cane and freshly squeezed lime. Served with ice and mint leaves.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_batido','dish','en','name','Tropical Smoothie','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('dish_yucas_batido','dish','en','description','Creamy smoothie of tropical fruits (mango, banana and pineapple) with milk or yogurt of your choice. A tropical explosion in every sip.','2025-07-31 11:37:58','2025-07-31 11:37:58');
INSERT INTO "translations" VALUES('allergen_gluten','allergen','es','name','Gluten','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_milk','allergen','es','name','Lácteos','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_eggs','allergen','es','name','Huevo','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_fish','allergen','es','name','Pescado','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_crustaceans','allergen','es','name','Crustáceos','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_nuts','allergen','es','name','Frutos Secos','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_peanuts','allergen','es','name','Cacahuetes','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_soy','allergen','es','name','Soja','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_celery','allergen','es','name','Apio','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_mustard','allergen','es','name','Mostaza','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_sesame','allergen','es','name','Sésamo','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_sulphites','allergen','es','name','Sulfitos','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_lupin','allergen','es','name','Altramuces','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_molluscs','allergen','es','name','Moluscos','2025-07-31 23:37:04','2025-07-31 23:37:04');
INSERT INTO "translations" VALUES('allergen_gluten','allergen','en','name','Gluten','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_milk','allergen','en','name','Milk','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_eggs','allergen','en','name','Eggs','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_fish','allergen','en','name','Fish','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_crustaceans','allergen','en','name','Crustaceans','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_nuts','allergen','en','name','Nuts','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_peanuts','allergen','en','name','Peanuts','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_soy','allergen','en','name','Soy','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_celery','allergen','en','name','Celery','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_mustard','allergen','en','name','Mustard','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_sesame','allergen','en','name','Sesame','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_sulphites','allergen','en','name','Sulphites','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_lupin','allergen','en','name','Lupin','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('allergen_molluscs','allergen','en','name','Molluscs','2025-07-31 23:37:05','2025-07-31 23:37:05');
INSERT INTO "translations" VALUES('dish_yucas_arepa','dish','en','name','Reina Pepiada Arepa','2025-08-15 19:25:59','2025-08-15 19:25:59');
INSERT INTO "translations" VALUES('dish_yucas_arepa','dish','es','name','Arepa Reina Pepiada','2025-08-15 19:25:59','2025-08-15 19:25:59');
INSERT INTO "translations" VALUES('dish_yucas_arepa','dish','en','description','Arepa filled with chicken and avocado salad, a Venezuelan classic you must try.','2025-08-15 19:25:59','2025-08-15 19:25:59');
INSERT INTO "translations" VALUES('dish_yucas_arepa','dish','es','description','Arepa rellena de ensalada de pollo y aguacate, un clásico venezolano que no puedes dejar de probar.s','2025-08-15 19:25:59','2025-08-15 19:25:59');
INSERT INTO "translations" VALUES('sect_yucas_sin_alcohol','section','es','name','Bebidas Sin Alcohol','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_sin_alcohol','section','en','name','Non-Alcoholic Drinks','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_sin_alcohol','section','es','description','Refrescantes opciones naturales','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_sin_alcohol','section','en','description','Refreshing natural options','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_cocteles','section','es','name','Cócteles','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_cocteles','section','en','name','Cocktails','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_cocteles','section','es','description','Bebidas tropicales con alcohol','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_cocteles','section','en','description','Tropical alcoholic drinks','2025-11-29 10:52:10','2025-11-29 10:52:10');
INSERT INTO "translations" VALUES('sect_yucas_principales','section','es','name','Platos Principales','2025-11-29 13:15:03','2025-11-29 13:15:03');
INSERT INTO "translations" VALUES('sect_yucas_principales','section','en','name','Main Courses','2025-11-29 13:15:03','2025-11-29 13:15:03');
INSERT INTO "translations" VALUES('sect_yucas_postres','section','es','name','Postres de dios','2025-11-29 23:43:19','2025-11-29 23:43:19');
INSERT INTO "translations" VALUES('sect_yucas_postres','section','en','name','Desserts','2025-11-29 23:43:19','2025-11-29 23:43:19');
INSERT INTO "translations" VALUES('sect_1764459821668_c6t8m','section','es','name','Pizzas','2025-11-29 23:43:41','2025-11-29 23:43:41');
INSERT INTO "translations" VALUES('sect_1764459838590_vnaxb','section','es','name','Hamburguesas','2025-11-29 23:43:58','2025-11-29 23:43:58');
INSERT INTO "translations" VALUES('dish_yucas_mojito','dish','es','name','Mojito Caribeño','2025-11-30 00:10:03','2025-11-30 00:10:03');
INSERT INTO "translations" VALUES('dish_yucas_mojito','dish','es','description','Refrescante cóctel con ron, hierbabuena fresca, lima, azúcar y soda. Servido con hielo picado y una rodaja de lima.','2025-11-30 00:10:03','2025-11-30 00:10:03');
INSERT INTO "translations" VALUES('dish_yucas_pabellon','dish','es','name','Pabellón Criollos con salsa de texto larga y mas letras','2025-11-30 00:44:03','2025-11-30 00:44:03');
INSERT INTO "translations" VALUES('dish_yucas_pabellon','dish','es','description','El plato nacional venezolanooo carne mechada, arroz blanco, caraotas negras y tajadas de plátano maduro frito. ¡Un clásico lleno de sabor!o','2025-11-30 00:44:03','2025-11-30 00:44:03');
INSERT INTO "translations" VALUES('sect_yucas_entrantes','section','es','name','Entrantes de pollo','2025-12-07 11:50:48','2025-12-07 11:50:48');
INSERT INTO "translations" VALUES('sect_yucas_entrantes','section','en','name','Appetizers','2025-12-07 11:50:48','2025-12-07 11:50:48');
CREATE TABLE allergens (
  id TEXT PRIMARY KEY,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "allergens" VALUES('allergen_gluten','allergen_gluten.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_milk','allergen_milk.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_eggs','allergen_eggs.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_fish','allergen_fish.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_crustaceans','allergen_crustaceans.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_nuts','allergen_nuts.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_peanuts','allergen_peanuts.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_soy','allergen_soy.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_celery','allergen_celery.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_mustard','allergen_mustard.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_sesame','allergen_sesame.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_sulphites','allergen_sulphites.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_lupin','allergen_lupin.svg','2025-07-31 23:37:03');
INSERT INTO "allergens" VALUES('allergen_molluscs','allergen_molluscs.svg','2025-07-31 23:37:03');
CREATE TABLE dish_allergens (
  dish_id TEXT NOT NULL,
  allergen_id TEXT NOT NULL,
  PRIMARY KEY (dish_id, allergen_id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (allergen_id) REFERENCES allergens(id)
);
INSERT INTO "dish_allergens" VALUES('dish_yucas_tequeños','allergen_gluten');
INSERT INTO "dish_allergens" VALUES('dish_yucas_tequeños','allergen_milk');
INSERT INTO "dish_allergens" VALUES('dish_yucas_empanadas','allergen_gluten');
INSERT INTO "dish_allergens" VALUES('dish_yucas_tres_leches','allergen_milk');
INSERT INTO "dish_allergens" VALUES('dish_yucas_tres_leches','allergen_gluten');
INSERT INTO "dish_allergens" VALUES('dish_yucas_tres_leches','allergen_eggs');
INSERT INTO "dish_allergens" VALUES('dish_yucas_quesillo','allergen_milk');
INSERT INTO "dish_allergens" VALUES('dish_yucas_quesillo','allergen_eggs');
INSERT INTO "dish_allergens" VALUES('dish_yucas_pina_colada','allergen_milk');
INSERT INTO "dish_allergens" VALUES('dish_yucas_batido','allergen_milk');
INSERT INTO "dish_allergens" VALUES('dish_yucas_cazuela','allergen_milk');
INSERT INTO "dish_allergens" VALUES('dish_yucas_arepa','allergen_gluten');
INSERT INTO "dish_allergens" VALUES('dish_yucas_mojito','allergen_fish');
INSERT INTO "dish_allergens" VALUES('dish_yucas_pabellon','allergen_celery');
INSERT INTO "dish_allergens" VALUES('dish_yucas_pabellon','allergen_fish');
INSERT INTO "dish_allergens" VALUES('dish_yucas_pabellon','allergen_sesame');
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE dish_ingredients (
  dish_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (dish_id, ingredient_id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  auth_provider TEXT, -- 'google', 'email', etc.
  preferred_language TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP, password_hash TEXT,
  FOREIGN KEY (preferred_language) REFERENCES languages(code)
);
INSERT INTO "users" VALUES('user_yucas_admin','admin@yucasrestaurante.com','Administrador Yucas',NULL,'email',NULL,'2025-07-31 11:38:00','2025-12-07 11:20:17','05c802e250573a7d55ebc2ab60a33476:5ea39fa2c413addc4939be5bc599d981505f073cb456fe6a0dbf19b8c31247bc');
INSERT INTO "users" VALUES('user_yucas_chef','chef@yucasrestaurante.com','Chef Yucas',NULL,'email',NULL,'2025-07-31 11:38:00',NULL,NULL);
CREATE TABLE restaurant_staff (
  restaurant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'owner', 'manager', 'staff'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, user_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT INTO "restaurant_staff" VALUES('rest_yucas_01','user_yucas_admin','owner',1,'2025-07-31 11:38:01');
INSERT INTO "restaurant_staff" VALUES('rest_yucas_01','user_yucas_chef','staff',1,'2025-07-31 11:38:01');
CREATE TABLE user_favorites (
  user_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, dish_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE user_ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE notification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  device_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  deep_link TEXT,
  image_url TEXT,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  status TEXT DEFAULT 'draft',  -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  target_type TEXT DEFAULT 'all',  -- 'all', 'favorites', 'recent', 'custom'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE notification_targets (
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE restaurant_languages (
  restaurant_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  priority INTEGER DEFAULT 10, -- Menor número = mayor prioridad
  completion_percentage INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, language_code),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
INSERT INTO "restaurant_languages" VALUES('rest_yucas_01','es',1,0,1,'2025-07-31 11:37:52','2025-07-31 11:37:52');
INSERT INTO "restaurant_languages" VALUES('rest_yucas_01','en',2,0,1,'2025-07-31 11:37:52','2025-07-31 11:37:52');
CREATE TABLE dietary_labels (
  feature_code TEXT NOT NULL,  -- 'vegetarian', 'vegan', 'gluten_free', etc.
  language_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (feature_code, language_code),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE ingredient_translations (
  ingredient_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (ingredient_id, language_code),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE dish_messages (
  dish_id TEXT NOT NULL,
  message_type TEXT NOT NULL,  -- 'warning', 'info', 'preparation', etc.
  language_code TEXT NOT NULL,
  message TEXT NOT NULL,
  PRIMARY KEY (dish_id, message_type, language_code),
  FOREIGN KEY (dish_id) REFERENCES dishes(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
CREATE TABLE landing_seo (
  restaurant_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, language_code),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
INSERT INTO "landing_seo" VALUES('rest_yucas_01','es','Yucas - Restaurante Latinoamericano en Madrid','Auténtica comida venezolana y latina en el corazón de Madrid. Reserva ya.','restaurante venezolano, comida latina, yuca, tequeños, arepas, Madrid',NULL,NULL,NULL,'2025-07-31 11:38:02');
INSERT INTO "landing_seo" VALUES('rest_yucas_01','en','Yucas - Latin American Restaurant in Madrid','Authentic Venezuelan and Latin food in the heart of Madrid. Book now.','venezuelan restaurant, latin food, yuca, tequeños, arepas, Madrid',NULL,NULL,NULL,'2025-07-31 11:38:02');
CREATE TABLE restaurant_translations (
  restaurant_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  cuisine_type TEXT,
  specialties TEXT,
  chef_note TEXT,
  PRIMARY KEY (restaurant_id, language_code),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (language_code) REFERENCES languages(code)
);
INSERT INTO "restaurant_translations" VALUES('rest_yucas_01','es','Restaurante latinoamericano especializado en platos tradicionales con yuca y sabores tropicales.',NULL,'Latinoamericana',NULL,NULL);
INSERT INTO "restaurant_translations" VALUES('rest_yucas_01','en','Latin American restaurant specialized in traditional dishes with cassava and tropical flavors.',NULL,'Latin American',NULL,NULL);
CREATE TABLE dish_media (
  id TEXT PRIMARY KEY NOT NULL, -- Formato: media_[timestamp]_[hash]
  dish_id TEXT NOT NULL,
  media_type TEXT NOT NULL,     -- 'video', 'image', 'thumbnail'
  content_type TEXT NOT NULL,   -- 'video/mp4', 'image/jpeg'
  r2_key TEXT NOT NULL,         -- Clave única en R2
  display_name TEXT,            -- Nombre para mostrar (opcional)
  width INTEGER,
  height INTEGER,
  duration INTEGER,             -- Para videos (en ms)
  file_size INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, order_index INTEGER DEFAULT 0, role TEXT CHECK(role IN ('PRIMARY_VIDEO', 'PRIMARY_IMAGE', 'GALLERY_IMAGE')),
  
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
);
INSERT INTO "dish_media" VALUES('media_yucas_tequeños_01','dish_yucas_tequeños','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_tequeños/primary/tequeños.mp4','Tequeños de Queso',1280,720,15000,3500000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_pabellon_01','dish_yucas_pabellon','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/primary/pabellon.mp4','Pabellón Criollo',1280,720,20000,4200000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_mojito_01','dish_yucas_mojito','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_mojito/primary/mojito.mp4','Mojito Caribeño',1280,720,12000,2800000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_tres_leches_01','dish_yucas_tres_leches','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/primary/tres_leches.mp4','Torta Tres Leches',1280,720,15000,3200000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_yuca_frita_01','dish_yucas_yuca_frita','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_yuca_frita/primary/yuca_frita.mp4','Yuca Frita',1280,720,10000,2500000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_guacamole_01','dish_yucas_guacamole','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_guacamole/primary/guacamole.jpg','Guacamole Tradicional',800,600,NULL,250000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_empanadas_01','dish_yucas_empanadas','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_empanadas/primary/empanadas.jpg','Empanadas Variadas',800,600,NULL,280000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_arepa_01','dish_yucas_arepa','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_arepa/primary/arepa.jpg','Arepa Reina Pepiada',800,600,NULL,240000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_lomo_01','dish_yucas_lomo','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_lomo/primary/lomo.jpg','Lomo en Salsa',800,600,NULL,260000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_cazuela_01','dish_yucas_cazuela','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_cazuela/primary/cazuela.jpg','Cazuela de Yuca',800,600,NULL,230000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_pina_colada_01','dish_yucas_pina_colada','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_pina_colada/primary/pina_colada.jpg','Piña Colada',800,600,NULL,210000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_papelón_01','dish_yucas_papelón','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_papelón/primary/papelon.jpg','Papelón con Limón',800,600,NULL,200000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_batido_01','dish_yucas_batido','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_batido/primary/batido.jpg','Batido Tropical',800,600,NULL,195000,1,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_tequeños_02','dish_yucas_tequeños','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_tequeños/media/tequeños_plato.jpg','Tequeños servidos',800,600,NULL,210000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_pabellon_02','dish_yucas_pabellon','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/media/pabellon_plato.jpg','Pabellón montado',800,600,NULL,240000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_pabellon_03','dish_yucas_pabellon','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/media/pabellon_ingredientes.jpg','Ingredientes del Pabellón',800,600,NULL,220000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_arepa_02','dish_yucas_arepa','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_arepa/media/arepa_interior.jpg','Interior de la arepa',800,600,NULL,230000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_tres_leches_02','dish_yucas_tres_leches','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/media/tres_leches_porcion.jpg','Porción de Tres Leches',800,600,NULL,215000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_tres_leches_03','dish_yucas_tres_leches','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/media/tres_leches_entera.jpg','Torta Tres Leches entera',800,600,NULL,225000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_mojito_02','dish_yucas_mojito','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_mojito/media/mojito_ingredientes.jpg','Ingredientes del Mojito',800,600,NULL,195000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('media_yucas_cazuela_02','dish_yucas_cazuela','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_cazuela/media/cazuela_servida.jpg','Cazuela servida',800,600,NULL,205000,0,'2025-07-31 11:37:59',0,NULL);
INSERT INTO "dish_media" VALUES('thumb_media_yucas_tequeños_01','dish_yucas_tequeños','thumbnail','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_tequeños/thumbnails/tequeños_thumb.jpg',NULL,320,180,NULL,NULL,0,'2025-07-31 11:38:00',0,NULL);
INSERT INTO "dish_media" VALUES('thumb_media_yucas_pabellon_01','dish_yucas_pabellon','thumbnail','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/thumbnails/pabellon_thumb.jpg',NULL,320,180,NULL,NULL,0,'2025-07-31 11:38:00',0,NULL);
INSERT INTO "dish_media" VALUES('thumb_media_yucas_mojito_01','dish_yucas_mojito','thumbnail','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_mojito/thumbnails/mojito_thumb.jpg',NULL,320,180,NULL,NULL,0,'2025-07-31 11:38:00',0,NULL);
INSERT INTO "dish_media" VALUES('thumb_media_yucas_tres_leches_01','dish_yucas_tres_leches','thumbnail','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/thumbnails/tres_leches_thumb.jpg',NULL,320,180,NULL,NULL,0,'2025-07-31 11:38:00',0,NULL);
INSERT INTO "dish_media" VALUES('thumb_media_yucas_yuca_frita_01','dish_yucas_yuca_frita','thumbnail','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_yuca_frita/thumbnails/yuca_frita_thumb.jpg',NULL,320,180,NULL,NULL,0,'2025-07-31 11:38:00',0,NULL);
INSERT INTO "dish_media" VALUES('media_1755367866813_042v6','dish_yucas_lomo','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_lomo/videos/media_1755367866813_042v6.mp4','PolloSazonado.mp4',1280,720,15000,3677755,1,'2025-08-16T18:11:07.330Z',0,'PRIMARY_VIDEO');
INSERT INTO "dish_media" VALUES('media_1755380352358_2pwqy','dish_yucas_batido','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_batido/videos/media_1755380352358_2pwqy.mp4','langosta.mp4',1280,720,15000,4008127,1,'2025-08-16T21:39:12.763Z',0,'PRIMARY_VIDEO');
INSERT INTO "dish_media" VALUES('media_1755380419886_6qtqx','dish_yucas_batido','image','image/jpeg','restaurants/rest_yucas_01/dishes/dish_yucas_batido/thumbnails/media_1755380419886_6qtqx.jpg','batidito.jpg',800,600,NULL,50377,1,'2025-08-16T21:40:20.207Z',0,'PRIMARY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1758987343158_gwmni','dish_yucas_mojito','video','video/mp4','restaurants/rest_yucas_01/dishes/dish_yucas_mojito/videos/media_1758987343158_gwmni.mp4','dulce manzana.mp4',1280,720,15000,2493640,1,'2025-09-27T15:35:43.407Z',0,'PRIMARY_VIDEO');
INSERT INTO "dish_media" VALUES('media_1764073676186_x6urj','dish_yucas_pabellon','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/thumbnails/media_1764073676186_x6urj.png','Captura de pantalla 2025-11-25 132717.png',800,600,NULL,554213,1,'2025-11-25T12:27:56.378Z',0,'GALLERY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1764073788794_rw7ib','dish_yucas_pabellon','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/thumbnails/media_1764073788794_rw7ib.png','Captura de pantalla 2024-01-14 233635.png',800,600,NULL,580711,1,'2025-11-25T12:29:49.034Z',0,'PRIMARY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1764077588922_st3fz','dish_yucas_pabellon','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_pabellon/gallery/media_1764077588922_st3fz.png','Captura de pantalla 2024-01-14 233506.png',800,600,NULL,588896,0,'2025-11-25T13:33:09.106Z',0,'GALLERY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1764077956925_vqemg','dish_yucas_quesillo','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_quesillo/thumbnails/media_1764077956925_vqemg.png','Captura de pantalla 2024-01-03 004710.png',800,600,NULL,293227,1,'2025-11-25T13:39:17.169Z',0,'PRIMARY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1764084852105_upqz4','dish_yucas_tres_leches','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/gallery/media_1764084852105_upqz4.png','Captura de pantalla 2025-11-08 135719.png',800,600,NULL,229718,0,'2025-11-25T15:34:12.387Z',0,'GALLERY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1764084852595_2e7dd','dish_yucas_tres_leches','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/gallery/media_1764084852595_2e7dd.png','Captura de pantalla 2025-11-09 112521.png',800,600,NULL,173753,0,'2025-11-25T15:34:12.818Z',0,'GALLERY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1764100237632_zw9n7','dish_yucas_arepa','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_arepa/gallery/media_1764100237632_zw9n7.png','pabellon_thumb.png',800,600,NULL,324752,0,'2025-11-25T19:50:37.862Z',0,'GALLERY_IMAGE');
INSERT INTO "dish_media" VALUES('media_1765108182300_4kojh','dish_yucas_mojito','image','image/png','restaurants/rest_yucas_01/dishes/dish_yucas_mojito/thumbnails/media_1765108182300_4kojh.png','Captura de pantalla 2024-03-23 111541.png',800,600,NULL,1000526,1,'2025-12-07T11:49:43.008Z',0,'PRIMARY_IMAGE');
CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  location TEXT,          -- ubicación física (ej. "mesa 12", "escaparate")
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  restaurant_id TEXT NOT NULL,
  device_type TEXT,
  os_name TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  language_code TEXT,
  timezone_offset INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  device_pixel_ratio REAL,
  network_type TEXT,
  pwa_installed INTEGER DEFAULT 0,         -- 0/1
  qr_code_id TEXT,
  consent_analytics INTEGER DEFAULT 1,     -- 0/1
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id)
);
INSERT INTO "sessions" VALUES('7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Madrid','http://localhost:5173/r/yucas',NULL,NULL,NULL,'2025-12-04T00:06:48.063Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('db3342f8-f30d-4c65-9aab-98538d46ef84',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-06T11:57:51.185Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-06T12:39:00.020Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-06T12:59:12.482Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('ef54eb79-15fc-4bc1-b33f-f57b41f8bd00',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-06T13:18:41.425Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-06T13:29:03.190Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T11:18:36.303Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('f289af76-e63a-475a-8b6e-f9ea0760e61a',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T11:22:30.699Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T11:36:54.134Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('864576de-3b66-4073-9d56-dba291e55a23',NULL,'rest_yucas_01','mobile','macOS','Safari','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T11:43:10.238Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('3fdff039-cbc3-4363-805f-a3d001c964cb',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-07T11:47:12.295Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('c287fb85-2423-4017-b968-6422677e69fc',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-07T11:48:25.418Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('5d9d9ba3-38ed-4015-b05e-62f397195b73',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-07T11:49:59.855Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('a42d92b3-b188-4f17-865a-8e5bc03e7e73',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-07T11:50:58.328Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('cfcd0eaa-8fc6-4890-a827-40d499999dbe',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia',NULL,NULL,NULL,NULL,'2025-12-07T11:54:37.918Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','mobile','Linux','Chrome','ES','Madrid',NULL,NULL,NULL,NULL,'2025-12-07T12:14:35.571Z',NULL,NULL,'es','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('c0f22810-94de-44ae-932c-203902ddc1c5',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T12:46:06.524Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('4c218c7f-0659-4f7e-925a-bf77b81711a8',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T12:59:41.735Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T13:01:01.703Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
INSERT INTO "sessions" VALUES('81021b85-f47a-440e-a58c-832b575c155b',NULL,'rest_yucas_01','desktop','Windows','Chrome','ES','Valencia','http://localhost:5174/r/yucas',NULL,NULL,NULL,'2025-12-07T13:14:31.652Z',NULL,NULL,'es-ES','Europe/Madrid',NULL,NULL,NULL,'4g',0,NULL,1);
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  restaurant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,                 -- view_dish, view_section, favorite, rating, share, click_reserve, click_call, click_directions, ...
  entity_id TEXT,                           -- id del plato, sección, etc.
  entity_type TEXT,                         -- dish, section, menu, landing, ...
  value TEXT,                               -- payload textual
  numeric_value REAL,                       -- rating, dwell, etc.
  props TEXT,                               -- JSON arbitrario
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
INSERT INTO "events" VALUES('evt_miqoeqm5_22cjow','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-04T00:06:50.703Z');
INSERT INTO "events" VALUES('evt_miqoeqnf_f02r04','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-04T00:06:50.836Z');
INSERT INTO "events" VALUES('evt_miqoexv7_4n1nmo','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','4',4,'{"duration_seconds":4}','2025-12-04T00:06:55.179Z');
INSERT INTO "events" VALUES('evt_miqoexwi_tqkf74','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:06:56.845Z');
INSERT INTO "events" VALUES('evt_miqoexxq_6jjrvq','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-04T00:06:56.971Z');
INSERT INTO "events" VALUES('evt_miqoexz2_jiqfhz','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-04T00:06:57.013Z');
INSERT INTO "events" VALUES('evt_miqoey0b_99of4j','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','favorite','dish_yucas_mojito','dish','true',NULL,NULL,'2025-12-04T00:07:01.206Z');
INSERT INTO "events" VALUES('evt_miqoey1p_ruivtu','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','5',5,'{"duration_seconds":5}','2025-12-04T00:07:02.793Z');
INSERT INTO "events" VALUES('evt_miqoey33_e63c70','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-04T00:07:02.854Z');
INSERT INTO "events" VALUES('evt_miqoey4f_nlpx2a','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','12',12,'{"duration_seconds":12,"dishes_viewed":2}','2025-12-04T00:07:02.892Z');
INSERT INTO "events" VALUES('evt_miqofa7u_ouf5w3','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','2',2,'{"duration_seconds":2}','2025-12-04T00:07:05.759Z');
INSERT INTO "events" VALUES('evt_miqofa94_rcfijc','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-04T00:07:05.967Z');
INSERT INTO "events" VALUES('evt_miqofaae_sno2yp','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','viewdish','dish_yucas_lomo','dish',NULL,NULL,NULL,'2025-12-04T00:07:06.058Z');
INSERT INTO "events" VALUES('evt_miqofabq_3u4qbp','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','favorite','dish_yucas_lomo','dish','true',NULL,NULL,'2025-12-04T00:07:11.202Z');
INSERT INTO "events" VALUES('evt_miqofad1_ijpcgt','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_lomo','dish','8',8,'{"duration_seconds":8}','2025-12-04T00:07:14.089Z');
INSERT INTO "events" VALUES('evt_miqofaec_tmfsau','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_entrantes','section','11',11,'{"duration_seconds":11,"dishes_viewed":2}','2025-12-04T00:07:14.231Z');
INSERT INTO "events" VALUES('evt_miqofafl_y1ze6j','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:07:18.822Z');
INSERT INTO "events" VALUES('evt_miqofagy_efd5mj','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','4',4,'{"duration_seconds":4,"dishes_viewed":1}','2025-12-04T00:07:18.870Z');
INSERT INTO "events" VALUES('evt_miqoffe2_2g126g','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','25',25,'{"dish_index":2,"total_dishes":8,"depth_percent":25}','2025-12-04T00:07:22.063Z');
INSERT INTO "events" VALUES('evt_miqofffm_uc2o8o','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','viewdish','dish_yucas_arepa','dish',NULL,NULL,NULL,'2025-12-04T00:07:22.087Z');
INSERT INTO "events" VALUES('evt_miqoffgy_g5zfn6','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_arepa','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:07:23.454Z');
INSERT INTO "events" VALUES('evt_miqoffi7_gdcnu2','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_entrantes','section','4',4,'{"duration_seconds":4,"dishes_viewed":2}','2025-12-04T00:07:23.504Z');
INSERT INTO "events" VALUES('evt_miqoffjg_1obqsh','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:07:25.390Z');
INSERT INTO "events" VALUES('evt_miqoffkq_hvenvx','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','1',1,'{"duration_seconds":1,"dishes_viewed":1}','2025-12-04T00:07:25.391Z');
INSERT INTO "events" VALUES('evt_miqofflz_riy81k','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','view_section','sect_yucas_postres','section',NULL,NULL,NULL,'2025-12-04T00:07:25.428Z');
INSERT INTO "events" VALUES('evt_miqoffn9_awf3sr','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','viewdish','dish_yucas_tres_leches','dish',NULL,NULL,NULL,'2025-12-04T00:07:25.638Z');
INSERT INTO "events" VALUES('evt_miqoflhn_rsexld','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:07:27.137Z');
INSERT INTO "events" VALUES('evt_miqofliy_ph5b4b','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_postres','section','1',1,'{"duration_seconds":1,"dishes_viewed":1}','2025-12-04T00:07:27.189Z');
INSERT INTO "events" VALUES('evt_miqoflkj_fqldi2','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:07:29.183Z');
INSERT INTO "events" VALUES('evt_miqoflls_oq1vpf','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','1',1,'{"duration_seconds":1,"dishes_viewed":1}','2025-12-04T00:07:29.184Z');
INSERT INTO "events" VALUES('evt_miqofln4_qs1gnw','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','media_error','dish_yucas_tres_leches','dish','video_play_failed',NULL,'{"error_type":"video_play_failed","media_url":"https://visualtasteworker.franciscotortosaestudios.workers.dev/media/restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/primary/tres_leches.mp4","section_id":"sect_yucas_postres"}','2025-12-04T00:07:29.339Z');
INSERT INTO "events" VALUES('evt_miqoflol_2idwpx','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','1',1,'{"duration_seconds":1}','2025-12-04T00:07:31.667Z');
INSERT INTO "events" VALUES('evt_miqoflpx_74pld4','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','section_time','sect_yucas_postres','section','2',2,'{"duration_seconds":2,"dishes_viewed":1}','2025-12-04T00:07:31.819Z');
INSERT INTO "events" VALUES('evt_miqoflr9_hnykvi','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','38',38,'{"dish_index":3,"total_dishes":8,"depth_percent":38}','2025-12-04T00:07:33.526Z');
INSERT INTO "events" VALUES('evt_miqog1np_w5p3rt','7a576c59-0021-4f29-bc66-d1481deb9e0f',NULL,'rest_yucas_01','cart_created','cart_uw4d7rzx9oimiqog3ef','cart',NULL,NULL,NULL,'2025-12-04T00:07:54.424Z');
INSERT INTO "events" VALUES('evt_miu8ov11_m1fqsu','db3342f8-f30d-4c65-9aab-98538d46ef84',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-06T11:57:56.701Z');
INSERT INTO "events" VALUES('evt_miu8ov2e_3whboj','db3342f8-f30d-4c65-9aab-98538d46ef84',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-06T11:57:56.780Z');
INSERT INTO "events" VALUES('evt_miua5rzt_hpyr68','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-06T12:39:05.572Z');
INSERT INTO "events" VALUES('evt_miua5s18_hrbbjm','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-06T12:39:05.730Z');
INSERT INTO "events" VALUES('evt_miua5s2h_9opqza','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','1',1,'{"duration_seconds":1}','2025-12-06T12:39:07.291Z');
INSERT INTO "events" VALUES('evt_miua5s3p_y977cz','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-06T12:39:07.300Z');
INSERT INTO "events" VALUES('evt_miua5s4z_nlpb8x','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','1',1,'{"duration_seconds":1,"dishes_viewed":2}','2025-12-06T12:39:07.345Z');
INSERT INTO "events" VALUES('evt_miua5s64_64ntui','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-06T12:39:07.403Z');
INSERT INTO "events" VALUES('evt_miua5vxi_44e784','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-06T12:39:08.904Z');
INSERT INTO "events" VALUES('evt_miua5vyp_2lpu0n','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-06T12:39:08.986Z');
INSERT INTO "events" VALUES('evt_miua5vzx_gd3fld','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','viewdish','dish_yucas_lomo','dish',NULL,NULL,NULL,'2025-12-06T12:39:09.054Z');
INSERT INTO "events" VALUES('evt_miua5w14_gwab69','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_lomo','dish','3',3,'{"duration_seconds":3}','2025-12-06T12:39:12.304Z');
INSERT INTO "events" VALUES('evt_miua5w2a_t3ph0k','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','25',25,'{"dish_index":2,"total_dishes":8,"depth_percent":25}','2025-12-06T12:39:12.371Z');
INSERT INTO "events" VALUES('evt_miua5w3o_5lg3ko','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','viewdish','dish_yucas_arepa','dish',NULL,NULL,NULL,'2025-12-06T12:39:12.436Z');
INSERT INTO "events" VALUES('evt_miua5w4s_mmmdev','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','38',38,'{"dish_index":3,"total_dishes":8,"depth_percent":38}','2025-12-06T12:39:13.401Z');
INSERT INTO "events" VALUES('evt_miua5w61_41ij0v','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','viewdish','dish_yucas_tequeños','dish',NULL,NULL,NULL,'2025-12-06T12:39:13.503Z');
INSERT INTO "events" VALUES('evt_miua62bd_adr4in','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','50',50,'{"dish_index":4,"total_dishes":8,"depth_percent":50}','2025-12-06T12:39:14.338Z');
INSERT INTO "events" VALUES('evt_miua62ck_19h2jl','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','viewdish','dish_yucas_yuca_frita','dish',NULL,NULL,NULL,'2025-12-06T12:39:14.452Z');
INSERT INTO "events" VALUES('evt_miua62dr_quopfk','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','section_time','sect_yucas_entrantes','section','9',9,'{"duration_seconds":9,"dishes_viewed":5}','2025-12-06T12:39:16.521Z');
INSERT INTO "events" VALUES('evt_miua62ew_oh2ep6','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','1',1,'{"duration_seconds":1}','2025-12-06T12:39:17.803Z');
INSERT INTO "events" VALUES('evt_miua62g2_is89s4','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-06T12:39:17.853Z');
INSERT INTO "events" VALUES('evt_miua62hd_mmc28u','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-06T12:39:19.869Z');
INSERT INTO "events" VALUES('evt_miua62ii_my2mzz','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','3',3,'{"duration_seconds":3,"dishes_viewed":1}','2025-12-06T12:39:19.924Z');
INSERT INTO "events" VALUES('evt_miua62jn_c3n297','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','63',63,'{"dish_index":5,"total_dishes":8,"depth_percent":63}','2025-12-06T12:39:21.764Z');
INSERT INTO "events" VALUES('evt_miua65j2_o52htf','35d86f26-053d-4eb4-8637-44d57ec42686',NULL,'rest_yucas_01','cart_created','cart_ky5geagpagmiua69jq','cart',NULL,NULL,NULL,'2025-12-06T12:39:25.910Z');
INSERT INTO "events" VALUES('evt_miuavrjn_8x8vxe','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-06T12:59:18.180Z');
INSERT INTO "events" VALUES('evt_miuavrkr_6o5idv','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-06T12:59:18.625Z');
INSERT INTO "events" VALUES('evt_miuaw9g2_6utp0l','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','cart_created','cart_525bc9d1rt3miuawdcn','cart',NULL,NULL,NULL,'2025-12-06T12:59:43.895Z');
INSERT INTO "events" VALUES('evt_miuawdlr_sg9acq','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','20',20,'{"duration_seconds":20}','2025-12-06T12:59:39.160Z');
INSERT INTO "events" VALUES('evt_miuawdna_bkifcx','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-06T12:59:39.359Z');
INSERT INTO "events" VALUES('evt_miuawdoh_64mpuc','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-06T12:59:39.501Z');
INSERT INTO "events" VALUES('evt_miuawdpn_05tlek','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','favorite','dish_yucas_mojito','dish','true',NULL,NULL,'2025-12-06T12:59:41.220Z');
INSERT INTO "events" VALUES('evt_miuawdqu_xpbw42','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','8',8,'{"duration_seconds":8}','2025-12-06T12:59:47.770Z');
INSERT INTO "events" VALUES('evt_miuawds0_lsygop','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-06T12:59:47.818Z');
INSERT INTO "events" VALUES('evt_miuawdt6_z92ac4','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','29',29,'{"duration_seconds":29,"dishes_viewed":2}','2025-12-06T12:59:48.025Z');
INSERT INTO "events" VALUES('evt_miuawdue_qufg8b','a8ff0367-a760-48f0-93a3-95b35b1e8dbf',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-06T12:59:49.432Z');
INSERT INTO "events" VALUES('evt_miubkux3_5ghtrr','ef54eb79-15fc-4bc1-b33f-f57b41f8bd00',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-06T13:18:49.046Z');
INSERT INTO "events" VALUES('evt_miuby59p_rrzmue','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-06T13:29:07.894Z');
INSERT INTO "events" VALUES('evt_miuby5az_q6lx44','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-06T13:29:08.180Z');
INSERT INTO "events" VALUES('evt_miuby5c9_1y31j7','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','2',2,'{"duration_seconds":2}','2025-12-06T13:29:10.604Z');
INSERT INTO "events" VALUES('evt_miuby9m7_x24ybw','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','cart_created','cart_5tp6jo8w1bmiubycx9','cart',NULL,NULL,NULL,'2025-12-06T13:29:16.269Z');
INSERT INTO "events" VALUES('evt_miubyfxe_oo7wzs','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','favorite','dish_yucas_pabellon','dish','true',NULL,NULL,'2025-12-06T13:29:12.725Z');
INSERT INTO "events" VALUES('evt_miubyfym_z3kec8','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','9',9,'{"duration_seconds":9}','2025-12-06T13:29:20.650Z');
INSERT INTO "events" VALUES('evt_miubyfzw_f1uga2','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-06T13:29:20.828Z');
INSERT INTO "events" VALUES('evt_miubyg1a_y0lt49','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-06T13:29:20.933Z');
INSERT INTO "events" VALUES('evt_miubyg2y_dazhi0','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','2',2,'{"duration_seconds":2}','2025-12-06T13:29:23.115Z');
INSERT INTO "events" VALUES('evt_miubyg4g_t582yf','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-06T13:29:23.139Z');
INSERT INTO "events" VALUES('evt_miubyg5p_kpj1yo','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','15',15,'{"duration_seconds":15,"dishes_viewed":2}','2025-12-06T13:29:23.235Z');
INSERT INTO "events" VALUES('evt_miubyg6y_algw0t','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-06T13:29:24.533Z');
INSERT INTO "events" VALUES('evt_miubyl2z_dc9rxj','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-06T13:29:25.832Z');
INSERT INTO "events" VALUES('evt_miubyl48_xr7fvq','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-06T13:29:25.973Z');
INSERT INTO "events" VALUES('evt_miubyl5g_sxcqgc','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_lomo','dish',NULL,NULL,NULL,'2025-12-06T13:29:26.065Z');
INSERT INTO "events" VALUES('evt_miubyl6p_2ylpnm','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_lomo','dish','1',1,'{"duration_seconds":1}','2025-12-06T13:29:27.081Z');
INSERT INTO "events" VALUES('evt_miubyl7w_evc89c','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','25',25,'{"dish_index":2,"total_dishes":8,"depth_percent":25}','2025-12-06T13:29:27.235Z');
INSERT INTO "events" VALUES('evt_miubyl96_w5l9sv','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_arepa','dish',NULL,NULL,NULL,'2025-12-06T13:29:27.359Z');
INSERT INTO "events" VALUES('evt_miubylae_06j0uo','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_arepa','dish','3',3,'{"duration_seconds":3}','2025-12-06T13:29:31.048Z');
INSERT INTO "events" VALUES('evt_miubylbx_gh6qla','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','38',38,'{"dish_index":3,"total_dishes":8,"depth_percent":38}','2025-12-06T13:29:31.194Z');
INSERT INTO "events" VALUES('evt_miubypic_4tuqle','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','cart_item_added','dish_yucas_tequeños','dish','{"cartId":"cart_5tp6jo8w1bmiubycx9","quantity":1,"price":8.5,"sequence":2,"totalItems":2,"totalValue":8.5,"uniqueDishes":2,"items":[{"dishId":"dish_yucas_pabellon","name":"Pabellón Criollos con salsa de texto larga y mas letras","quantity":1,"price":0},{"dishId":"dish_yucas_tequeños","name":"Tequeños de Queso","quantity":1,"price":8.5}]}',NULL,NULL,'2025-12-06T13:29:36.807Z');
INSERT INTO "events" VALUES('evt_miubyul5_8a0xio','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','cart_item_added','dish_yucas_cazuela','dish','{"cartId":"cart_5tp6jo8w1bmiubycx9","quantity":1,"price":13.75,"sequence":3,"totalItems":3,"totalValue":22.25,"uniqueDishes":3,"items":[{"dishId":"dish_yucas_pabellon","name":"Pabellón Criollos con salsa de texto larga y mas letras","quantity":1,"price":0},{"dishId":"dish_yucas_tequeños","name":"Tequeños de Queso","quantity":1,"price":8.5},{"dishId":"dish_yucas_cazuela","name":"Cazuela de Yuca y Queso","quantity":1,"price":13.75}]}',NULL,NULL,'2025-12-06T13:29:43.402Z');
INSERT INTO "events" VALUES('evt_miubz6tv_604wkk','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_tequeños','dish',NULL,NULL,NULL,'2025-12-06T13:29:31.321Z');
INSERT INTO "events" VALUES('evt_miubz6v4_nnt11x','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tequeños','dish','7',7,'{"duration_seconds":7}','2025-12-06T13:29:38.449Z');
INSERT INTO "events" VALUES('evt_miubz6wf_h0jc5p','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','50',50,'{"dish_index":4,"total_dishes":8,"depth_percent":50}','2025-12-06T13:29:38.452Z');
INSERT INTO "events" VALUES('evt_miubz6xq_fq7csb','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_yuca_frita','dish',NULL,NULL,NULL,'2025-12-06T13:29:38.577Z');
INSERT INTO "events" VALUES('evt_miubz6z3_34z2xt','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','63',63,'{"dish_index":5,"total_dishes":8,"depth_percent":63}','2025-12-06T13:29:39.656Z');
INSERT INTO "events" VALUES('evt_miubz712_m5pn0l','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','viewdish','dish_yucas_cazuela','dish',NULL,NULL,NULL,'2025-12-06T13:29:39.762Z');
INSERT INTO "events" VALUES('evt_miubz72y_qhdotr','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','favorite','dish_yucas_cazuela','dish','true',NULL,NULL,'2025-12-06T13:29:45.367Z');
INSERT INTO "events" VALUES('evt_miubz74c_kui469','e4de3e52-ceda-437c-8f87-68f3170fdbdc',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_cazuela','dish','19',19,'{"duration_seconds":19}','2025-12-06T13:29:59.406Z');
INSERT INTO "events" VALUES('evt_mivmq8ol_hz9am5','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:18:43.482Z');
INSERT INTO "events" VALUES('evt_mivmq8ps_5msuam','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-07T11:18:43.784Z');
INSERT INTO "events" VALUES('evt_mivmqlog_1yrrio','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','cart_created','cart_r977b8sbuvmivmqqwf','cart',NULL,NULL,NULL,'2025-12-07T11:19:03.087Z');
INSERT INTO "events" VALUES('evt_mivmqwiz_dx31ay','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','favorite','dish_yucas_pabellon','dish','true',NULL,NULL,'2025-12-07T11:19:10.379Z');
INSERT INTO "events" VALUES('evt_mivmqwk7_v9343x','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','27',27,'{"duration_seconds":27}','2025-12-07T11:19:11.677Z');
INSERT INTO "events" VALUES('evt_mivmqwlg_2hzlvh','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-07T11:19:11.790Z');
INSERT INTO "events" VALUES('evt_mivmqwmo_xte358','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T11:19:11.820Z');
INSERT INTO "events" VALUES('evt_mivmqwnu_ntagkz','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','3',3,'{"duration_seconds":3}','2025-12-07T11:19:15.424Z');
INSERT INTO "events" VALUES('evt_mivmqwp0_9zj2rb','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-07T11:19:15.444Z');
INSERT INTO "events" VALUES('evt_mivmqwqg_s50u70','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','32',32,'{"duration_seconds":32,"dishes_viewed":2}','2025-12-07T11:19:15.548Z');
INSERT INTO "events" VALUES('evt_mivmqwro_ekrmg6','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-07T11:19:17.223Z');
INSERT INTO "events" VALUES('evt_mivmr12q_uesx75','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','cart_opened','cart_r977b8sbuvmivmqqwf','cart','{"totalItems":1,"totalValue":0}',NULL,NULL,'2025-12-07T11:19:22.989Z');
INSERT INTO "events" VALUES('evt_mivmr752_l3ftbr','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','cart_item_added','dish_yucas_lomo','dish','{"cartId":"cart_r977b8sbuvmivmqqwf","quantity":1,"price":16.5,"sequence":2,"totalItems":2,"totalValue":16.5,"uniqueDishes":2,"items":[{"dishId":"dish_yucas_pabellon","name":"Pabellón Criollos con salsa de texto larga y mas letras","quantity":1,"price":0},{"dishId":"dish_yucas_lomo","name":"Lomo en Salsa de Yuca","quantity":1,"price":16.5}]}',NULL,NULL,'2025-12-07T11:19:30.861Z');
INSERT INTO "events" VALUES('evt_mivmrduh_izrnfu','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-07T11:19:18.721Z');
INSERT INTO "events" VALUES('evt_mivmrdvz_probqm','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-07T11:19:18.860Z');
INSERT INTO "events" VALUES('evt_mivmrdx8_2uw3fe','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_lomo','dish',NULL,NULL,NULL,'2025-12-07T11:19:18.995Z');
INSERT INTO "events" VALUES('evt_mivmrdye_g56how','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_lomo','dish','14',14,'{"duration_seconds":14}','2025-12-07T11:19:33.485Z');
INSERT INTO "events" VALUES('evt_mivmrdzi_zzcc5q','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','25',25,'{"dish_index":2,"total_dishes":8,"depth_percent":25}','2025-12-07T11:19:33.620Z');
INSERT INTO "events" VALUES('evt_mivmre0p_43zy1n','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_arepa','dish',NULL,NULL,NULL,'2025-12-07T11:19:33.763Z');
INSERT INTO "events" VALUES('evt_mivmre20_dvjxpm','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','favorite','dish_yucas_arepa','dish','true',NULL,NULL,'2025-12-07T11:19:37.946Z');
INSERT INTO "events" VALUES('evt_mivmre3c_dnt9bj','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_arepa','dish','5',5,'{"duration_seconds":5}','2025-12-07T11:19:39.699Z');
INSERT INTO "events" VALUES('evt_mivmrgpo_lq6t2f','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','38',38,'{"dish_index":3,"total_dishes":8,"depth_percent":38}','2025-12-07T11:19:39.838Z');
INSERT INTO "events" VALUES('evt_mivmrgqx_dz4vke','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_tequeños','dish',NULL,NULL,NULL,'2025-12-07T11:19:39.958Z');
INSERT INTO "events" VALUES('evt_mivmrgs8_t3gkqu','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','50',50,'{"dish_index":4,"total_dishes":8,"depth_percent":50}','2025-12-07T11:19:41.064Z');
INSERT INTO "events" VALUES('evt_mivmrgtf_2745dd','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_yuca_frita','dish',NULL,NULL,NULL,'2025-12-07T11:19:41.179Z');
INSERT INTO "events" VALUES('evt_mivmrgup_don011','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_yuca_frita','dish','1',1,'{"duration_seconds":1}','2025-12-07T11:19:42.217Z');
INSERT INTO "events" VALUES('evt_mivmrgvz_svxbte','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','63',63,'{"dish_index":5,"total_dishes":8,"depth_percent":63}','2025-12-07T11:19:42.220Z');
INSERT INTO "events" VALUES('evt_mivmrgxa_riid56','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','viewdish','dish_yucas_cazuela','dish',NULL,NULL,NULL,'2025-12-07T11:19:42.348Z');
INSERT INTO "events" VALUES('evt_mivmrgyj_hz1t3l','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_cazuela','dish','1',1,'{"duration_seconds":1}','2025-12-07T11:19:43.447Z');
INSERT INTO "events" VALUES('evt_mivmt4zb_gttopk','c9485733-07a3-46d7-af13-fdbcd4870068',NULL,'rest_yucas_01','cart_opened','cart_r977b8sbuvmivmqqwf','cart','{"totalItems":2,"totalValue":16.5}',NULL,NULL,'2025-12-07T11:21:01.331Z');
INSERT INTO "events" VALUES('evt_mivmv9iy_aosz4t','f289af76-e63a-475a-8b6e-f9ea0760e61a',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:22:38.578Z');
INSERT INTO "events" VALUES('evt_mivmv9k4_0vezrq','f289af76-e63a-475a-8b6e-f9ea0760e61a',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-07T11:22:38.851Z');
INSERT INTO "events" VALUES('evt_mivndrr6_0fynek','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:37:01.817Z');
INSERT INTO "events" VALUES('evt_mivndrsl_yvd0lt','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-07T11:37:02.094Z');
INSERT INTO "events" VALUES('evt_mivnfoau_jgu06f','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','cart_created','cart_f1sk1xytpemivnfthj','cart',NULL,NULL,NULL,'2025-12-07T11:38:32.839Z');
INSERT INTO "events" VALUES('evt_mivnfsgy_d57gv3','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','cart_opened','cart_f1sk1xytpemivnfthj','cart','{"totalItems":2,"totalValue":0}',NULL,NULL,'2025-12-07T11:38:38.267Z');
INSERT INTO "events" VALUES('evt_mivngcc7_ggyio6','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','favorite','dish_yucas_pabellon','dish','true',NULL,NULL,'2025-12-07T11:37:27.583Z');
INSERT INTO "events" VALUES('evt_mivngcde_3d3p2h','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','109',109,'{"duration_seconds":109}','2025-12-07T11:38:52.072Z');
INSERT INTO "events" VALUES('evt_mivngcej_j7e87q','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-07T11:38:52.200Z');
INSERT INTO "events" VALUES('evt_mivngcg0_sbnyjh','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T11:38:52.311Z');
INSERT INTO "events" VALUES('evt_mivngch8_9g9uzn','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','2',2,'{"duration_seconds":2}','2025-12-07T11:38:54.465Z');
INSERT INTO "events" VALUES('evt_mivngcii_7dtzxb','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','5',5,'{"duration_seconds":5}','2025-12-07T11:39:01.748Z');
INSERT INTO "events" VALUES('evt_mivngcjn_hnpp1r','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-07T11:39:03.963Z');
INSERT INTO "events" VALUES('evt_mivngckx_6jdl4z','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','122',122,'{"duration_seconds":122,"dishes_viewed":2}','2025-12-07T11:39:04.072Z');
INSERT INTO "events" VALUES('evt_mivnghba_acw536','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','view_section','sect_yucas_postres','section',NULL,NULL,NULL,'2025-12-07T11:39:04.159Z');
INSERT INTO "events" VALUES('evt_mivnghch_490i5r','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','viewdish','dish_yucas_tres_leches','dish',NULL,NULL,NULL,'2025-12-07T11:39:04.427Z');
INSERT INTO "events" VALUES('evt_mivnghec_64c1ys','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','media_error','dish_yucas_tres_leches','dish','video_play_failed',NULL,'{"error_type":"video_play_failed","media_url":"https://visualtasteworker.franciscotortosaestudios.workers.dev/media/restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/primary/tres_leches.mp4","section_id":"sect_yucas_postres"}','2025-12-07T11:39:05.736Z');
INSERT INTO "events" VALUES('evt_mivnghhj_bnecq7','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','4',4,'{"duration_seconds":4}','2025-12-07T11:39:08.634Z');
INSERT INTO "events" VALUES('evt_mivnghix_l47u0o','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','scroll_depth','sect_yucas_postres','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-07T11:39:08.729Z');
INSERT INTO "events" VALUES('evt_mivnghka_w98hfq','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','viewdish','dish_yucas_quesillo','dish',NULL,NULL,NULL,'2025-12-07T11:39:08.762Z');
INSERT INTO "events" VALUES('evt_mivnghlk_ggkcrv','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','1',1,'{"duration_seconds":1}','2025-12-07T11:39:10.429Z');
INSERT INTO "events" VALUES('evt_mivnghms_0e2xap','f2f093e7-86bc-4d39-a174-e32e15d5c638',NULL,'rest_yucas_01','section_time','sect_yucas_postres','section','6',6,'{"duration_seconds":6,"dishes_viewed":2}','2025-12-07T11:39:10.533Z');
INSERT INTO "events" VALUES('evt_mivnltyd_08xduq','864576de-3b66-4073-9d56-dba291e55a23',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-07T11:43:17.384Z');
INSERT INTO "events" VALUES('evt_mivnltzk_bqai28','864576de-3b66-4073-9d56-dba291e55a23',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:43:17.386Z');
INSERT INTO "events" VALUES('evt_mivnsl53_mhih8y','c287fb85-2423-4017-b968-6422677e69fc',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:48:32.607Z');
INSERT INTO "events" VALUES('evt_mivnsl6f_54xf3g','c287fb85-2423-4017-b968-6422677e69fc',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T11:48:32.748Z');
INSERT INTO "events" VALUES('evt_mivnum0x_w95a4b','5d9d9ba3-38ed-4015-b05e-62f397195b73',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:50:07.104Z');
INSERT INTO "events" VALUES('evt_mivnum28_tpyhel','5d9d9ba3-38ed-4015-b05e-62f397195b73',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T11:50:07.253Z');
INSERT INTO "events" VALUES('evt_mivnvv57_mrcq6v','a42d92b3-b188-4f17-865a-8e5bc03e7e73',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:51:05.694Z');
INSERT INTO "events" VALUES('evt_mivnvv6n_f07f94','a42d92b3-b188-4f17-865a-8e5bc03e7e73',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T11:51:05.838Z');
INSERT INTO "events" VALUES('evt_mivo0kks_dxzqb3','cfcd0eaa-8fc6-4890-a827-40d499999dbe',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T11:54:47.018Z');
INSERT INTO "events" VALUES('evt_mivo0km4_ip38du','cfcd0eaa-8fc6-4890-a827-40d499999dbe',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T11:54:47.211Z');
INSERT INTO "events" VALUES('evt_mivoq8u8_p55f3a','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T12:14:35.992Z');
INSERT INTO "events" VALUES('evt_mivoq8vu_suiuws','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T12:14:36.065Z');
INSERT INTO "events" VALUES('evt_mivoq8x4_uakmni','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','2',2,'{"duration_seconds":2}','2025-12-07T12:14:38.461Z');
INSERT INTO "events" VALUES('evt_mivoq8yc_bo5t0n','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-07T12:14:38.461Z');
INSERT INTO "events" VALUES('evt_mivoq8zi_4u7gz4','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-07T12:14:38.600Z');
INSERT INTO "events" VALUES('evt_mivoqfq8_xfd5wz','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','2',2,'{"duration_seconds":2}','2025-12-07T12:14:41.129Z');
INSERT INTO "events" VALUES('evt_mivoqfrd_rrrhla','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-07T12:14:45.918Z');
INSERT INTO "events" VALUES('evt_mivoqfsj_g284oh','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','3',3,'{"duration_seconds":3}','2025-12-07T12:14:45.937Z');
INSERT INTO "events" VALUES('evt_mivoqfto_x4ftam','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','9',9,'{"duration_seconds":9,"dishes_viewed":2}','2025-12-07T12:14:45.937Z');
INSERT INTO "events" VALUES('evt_mivoqfuy_ohl0vo','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-07T12:14:46.837Z');
INSERT INTO "events" VALUES('evt_mivoqfw4_b539hs','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','media_error','dish_yucas_mojito','dish','video_play_failed',NULL,'{"error_type":"video_play_failed","media_url":"https://visualtasteworker.franciscotortosaestudios.workers.dev/media/restaurants/rest_yucas_01/dishes/dish_yucas_mojito/videos/media_1758987343158_gwmni.mp4","section_id":"sect_yucas_entrantes"}','2025-12-07T12:14:46.843Z');
INSERT INTO "events" VALUES('evt_mivoqfxa_ex4wut','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_lomo','dish',NULL,NULL,NULL,'2025-12-07T12:14:46.975Z');
INSERT INTO "events" VALUES('evt_mivoqfyh_uozksi','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','25',25,'{"dish_index":2,"total_dishes":8,"depth_percent":25}','2025-12-07T12:14:47.631Z');
INSERT INTO "events" VALUES('evt_mivoqly8_wobkqb','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_arepa','dish',NULL,NULL,NULL,'2025-12-07T12:14:47.781Z');
INSERT INTO "events" VALUES('evt_mivoqlzg_sn3c67','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','38',38,'{"dish_index":3,"total_dishes":8,"depth_percent":38}','2025-12-07T12:14:48.343Z');
INSERT INTO "events" VALUES('evt_mivoqm0p_oip56c','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_tequeños','dish',NULL,NULL,NULL,'2025-12-07T12:14:48.481Z');
INSERT INTO "events" VALUES('evt_mivoqm1w_bmjs8y','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','50',50,'{"dish_index":4,"total_dishes":8,"depth_percent":50}','2025-12-07T12:14:49.216Z');
INSERT INTO "events" VALUES('evt_mivoqm35_eyfiyh','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_yuca_frita','dish',NULL,NULL,NULL,'2025-12-07T12:14:49.355Z');
INSERT INTO "events" VALUES('evt_mivoqm4b_mvlxev','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_yuca_frita','dish','2',2,'{"duration_seconds":2}','2025-12-07T12:14:51.579Z');
INSERT INTO "events" VALUES('evt_mivoqm5g_lbxw72','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','view_section','sect_yucas_postres','section',NULL,NULL,NULL,'2025-12-07T12:14:55.843Z');
INSERT INTO "events" VALUES('evt_mivoqm6p_7k9b62','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','section_time','sect_yucas_entrantes','section','9',9,'{"duration_seconds":9,"dishes_viewed":5}','2025-12-07T12:14:55.872Z');
INSERT INTO "events" VALUES('evt_mivor42z_f410dm','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','section_time','sect_1764459821668_c6t8m','section','8',8,'{"duration_seconds":8,"dishes_viewed":0}','2025-12-07T12:15:04.485Z');
INSERT INTO "events" VALUES('evt_mivor448_4i3pul','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_tres_leches','dish','true',NULL,NULL,'2025-12-07T12:15:08.481Z');
INSERT INTO "events" VALUES('evt_mivor45e_etjvxo','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_tres_leches','dish','false',NULL,NULL,'2025-12-07T12:15:09.630Z');
INSERT INTO "events" VALUES('evt_mivor46n_emh501','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_tres_leches','dish','true',NULL,NULL,'2025-12-07T12:15:10.131Z');
INSERT INTO "events" VALUES('evt_mivor47w_v177eo','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','8',8,'{"duration_seconds":8}','2025-12-07T12:15:13.300Z');
INSERT INTO "events" VALUES('evt_mivor497_diiepv','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','scroll_depth','sect_yucas_postres','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-07T12:15:13.300Z');
INSERT INTO "events" VALUES('evt_mivor4ae_kq94uv','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','viewdish','dish_yucas_quesillo','dish',NULL,NULL,NULL,'2025-12-07T12:15:13.436Z');
INSERT INTO "events" VALUES('evt_mivor4bj_90kze4','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_quesillo','dish','true',NULL,NULL,'2025-12-07T12:15:19.440Z');
INSERT INTO "events" VALUES('evt_mivorouc_yyse8p','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','cart_created','cart_n1byg6g05fdmivorouk','cart',NULL,NULL,NULL,'2025-12-07T12:15:46.316Z');
INSERT INTO "events" VALUES('evt_mivorwks_9fh7tk','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','cart_opened','cart_n1byg6g05fdmivorouk','cart','{"totalItems":1,"totalValue":5.75}',NULL,NULL,'2025-12-07T12:15:56.238Z');
INSERT INTO "events" VALUES('evt_mivos8yq_1xmcpj','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','cart_opened','cart_n1byg6g05fdmivorouk','cart','{"totalItems":1,"totalValue":5.75}',NULL,NULL,'2025-12-07T12:16:12.417Z');
INSERT INTO "events" VALUES('evt_mivosf5w_s4m3gz','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_quesillo','dish','false',NULL,NULL,'2025-12-07T12:15:33.976Z');
INSERT INTO "events" VALUES('evt_mivosf74_ake351','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_quesillo','dish','true',NULL,NULL,'2025-12-07T12:15:34.550Z');
INSERT INTO "events" VALUES('evt_mivosf8d_nda5r6','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','25',25,'{"duration_seconds":25}','2025-12-07T12:15:39.819Z');
INSERT INTO "events" VALUES('evt_mivosf9m_0oy51t','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','21',21,'{"duration_seconds":21}','2025-12-07T12:16:02.274Z');
INSERT INTO "events" VALUES('evt_mivosfav_e3cd5j','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','13',13,'{"duration_seconds":13}','2025-12-07T12:16:16.418Z');
INSERT INTO "events" VALUES('evt_mivosfc3_5p93vp','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','1',1,'{"duration_seconds":1}','2025-12-07T12:16:18.356Z');
INSERT INTO "events" VALUES('evt_mivosfda_b24hya','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_tres_leches','dish','false',NULL,NULL,'2025-12-07T12:16:19.915Z');
INSERT INTO "events" VALUES('evt_mivosfej_s1jbsl','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','1',1,'{"duration_seconds":1}','2025-12-07T12:16:20.473Z');
INSERT INTO "events" VALUES('evt_mivosyb6_2zf7qt','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','1',1,'{"duration_seconds":1}','2025-12-07T12:16:21.808Z');
INSERT INTO "events" VALUES('evt_mivosycf_kwl6j9','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','6',6,'{"duration_seconds":6}','2025-12-07T12:16:28.858Z');
INSERT INTO "events" VALUES('evt_mivosydo_ownboy','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','1',1,'{"duration_seconds":1}','2025-12-07T12:16:30.672Z');
INSERT INTO "events" VALUES('evt_mivosyex_qwwk72','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','1',1,'{"duration_seconds":1}','2025-12-07T12:16:32.426Z');
INSERT INTO "events" VALUES('evt_mivosyg5_uc5gss','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','1',1,'{"duration_seconds":1}','2025-12-07T12:16:33.892Z');
INSERT INTO "events" VALUES('evt_mivosyhe_miu3z9','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_tres_leches','dish','true',NULL,NULL,'2025-12-07T12:16:37.235Z');
INSERT INTO "events" VALUES('evt_mivosyil_5az40n','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','favorite','dish_yucas_tres_leches','dish','false',NULL,NULL,'2025-12-07T12:16:37.845Z');
INSERT INTO "events" VALUES('evt_mivosyjy_abtcni','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','11',11,'{"duration_seconds":11}','2025-12-07T12:16:45.283Z');
INSERT INTO "events" VALUES('evt_mivoukun_5j5fyu','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','6',6,'{"duration_seconds":6}','2025-12-07T12:17:09.061Z');
INSERT INTO "events" VALUES('evt_mivoukvw_s0yot3','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','12',12,'{"duration_seconds":12}','2025-12-07T12:17:21.577Z');
INSERT INTO "events" VALUES('evt_mivoukx5_kr01lp','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','16',16,'{"duration_seconds":16}','2025-12-07T12:17:39.717Z');
INSERT INTO "events" VALUES('evt_mivoukyq_1qkb4c','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_tres_leches','dish','6',6,'{"duration_seconds":6}','2025-12-07T12:17:46.814Z');
INSERT INTO "events" VALUES('evt_mivoul06_9smmf1','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_quesillo','dish','2',2,'{"duration_seconds":2}','2025-12-07T12:17:49.697Z');
INSERT INTO "events" VALUES('evt_mivoul1l_v770bk','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','section_time','sect_yucas_postres','section','165',165,'{"duration_seconds":165,"dishes_viewed":2}','2025-12-07T12:17:49.697Z');
INSERT INTO "events" VALUES('evt_mivoul2z_z05ja0','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','4',4,'{"duration_seconds":4}','2025-12-07T12:17:55.436Z');
INSERT INTO "events" VALUES('evt_mivoul4b_0fxdie','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','5',5,'{"duration_seconds":5}','2025-12-07T12:18:00.665Z');
INSERT INTO "events" VALUES('evt_mivqc97j_v2hmk3','4c218c7f-0659-4f7e-925a-bf77b81711a8',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T12:59:48.938Z');
INSERT INTO "events" VALUES('evt_mivqdyh8_vluzw5','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T13:01:08.905Z');
INSERT INTO "events" VALUES('evt_mivqdyid_bznjfy','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T13:01:09.039Z');
INSERT INTO "events" VALUES('evt_mivqep7y_iexj0f','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','17',17,'{"duration_seconds":17}','2025-12-07T13:01:26.280Z');
INSERT INTO "events" VALUES('evt_mivqep95_bagnuy','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','scroll_depth','sect_yucas_principales','section','50',50,'{"dish_index":1,"total_dishes":2,"depth_percent":50}','2025-12-07T13:01:26.372Z');
INSERT INTO "events" VALUES('evt_mivqepab_rqpcga','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','viewdish','dish_yucas_pabellon','dish',NULL,NULL,NULL,'2025-12-07T13:01:26.400Z');
INSERT INTO "events" VALUES('evt_mivqepbg_ypqsv5','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_pabellon','dish','17',17,'{"duration_seconds":17}','2025-12-07T13:01:44.329Z');
INSERT INTO "events" VALUES('evt_mivqepcn_lb8tfj','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','view_section','sect_yucas_entrantes','section',NULL,NULL,NULL,'2025-12-07T13:01:44.338Z');
INSERT INTO "events" VALUES('evt_mivqepdw_c3wl7u','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','section_time','sect_yucas_principales','section','35',35,'{"duration_seconds":35,"dishes_viewed":2}','2025-12-07T13:01:44.387Z');
INSERT INTO "events" VALUES('evt_mivqepf5_ppfzn3','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','dish_view_duration','dish_yucas_mojito','dish','1',1,'{"duration_seconds":1}','2025-12-07T13:01:46.365Z');
INSERT INTO "events" VALUES('evt_mivqepgc_7di0nl','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','scroll_depth','sect_yucas_entrantes','section','13',13,'{"dish_index":1,"total_dishes":8,"depth_percent":13}','2025-12-07T13:01:46.365Z');
INSERT INTO "events" VALUES('evt_mivqezc3_yq3jzu','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','cart_created','cart_0u7db3xmke8mivqf4m4','cart',NULL,NULL,NULL,'2025-12-07T13:01:59.452Z');
INSERT INTO "events" VALUES('evt_mivqi9tt_awre3q','bfb2ccff-567b-4a2d-9b03-53be357484db',NULL,'rest_yucas_01','cart_item_added','dish_yucas_mojito','dish','{"cartId":"cart_0u7db3xmke8mivqf4m4","quantity":1,"price":0,"sequence":2,"totalItems":2,"totalValue":8.5,"uniqueDishes":2,"items":[{"dishId":"dish_yucas_tequeños","name":"Tequeños de Queso","quantity":1,"price":8.5},{"dishId":"dish_yucas_mojito","name":"Mojito Caribeño","quantity":1,"price":0}]}',NULL,NULL,'2025-12-07T13:04:33.007Z');
INSERT INTO "events" VALUES('evt_mivqvbfj_g3th2x','81021b85-f47a-440e-a58c-832b575c155b',NULL,'rest_yucas_01','view_section','sect_yucas_principales','section',NULL,NULL,NULL,'2025-12-07T13:14:38.903Z');
INSERT INTO "events" VALUES('evt_mivqvbgs_buyve8','81021b85-f47a-440e-a58c-832b575c155b',NULL,'rest_yucas_01','viewdish','dish_yucas_mojito','dish',NULL,NULL,NULL,'2025-12-07T13:14:39.056Z');
CREATE TABLE qr_scans (
  id TEXT PRIMARY KEY,
  qr_code_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE TABLE daily_analytics (
  restaurant_id TEXT NOT NULL,
  date TEXT NOT NULL,                        -- YYYY-MM-DD (UTC)
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration REAL DEFAULT 0,       -- segundos
  dish_views INTEGER DEFAULT 0,
  favorites_added INTEGER DEFAULT 0,
  ratings_submitted INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reserve_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  directions_clicks INTEGER DEFAULT 0, avg_dish_view_duration REAL DEFAULT 0, avg_section_time REAL DEFAULT 0, avg_scroll_depth REAL DEFAULT 0, media_errors INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, date),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
) WITHOUT ROWID;
INSERT INTO "daily_analytics" VALUES('rest_yucas_01','2025-12-04',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
INSERT INTO "daily_analytics" VALUES('rest_yucas_01','2025-12-06',5,5,5,0,16,3,0,0,0,0,0,5,11.4,39,0);
INSERT INTO "daily_analytics" VALUES('rest_yucas_01','2025-12-07',14,14,14,0,27,8,0,0,0,0,0,9.21,48.25,39,2);
CREATE TABLE dish_daily_metrics (
  restaurant_id TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  date TEXT NOT NULL,                         -- YYYY-MM-DD (UTC)
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  avg_dwell_seconds REAL DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  ratings INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  reserve_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  directions_clicks INTEGER DEFAULT 0, avg_view_duration REAL DEFAULT 0, total_view_time INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, dish_id, date),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
) WITHOUT ROWID;
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_arepa','2025-12-04',1,0,0,0,0,0,0,0,0,0,1,1);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_arepa','2025-12-06',2,2,0,0,0,0,0,0,0,0,1.5,3);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_arepa','2025-12-07',2,2,0,1,0,0,0,0,0,0,2.5,5);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_cazuela','2025-12-06',1,1,0,1,0,0,0,0,0,0,19,19);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_cazuela','2025-12-07',1,1,0,0,0,0,0,0,0,0,1,1);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_lomo','2025-12-04',1,0,0,1,0,0,0,0,0,0,8,8);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_lomo','2025-12-06',2,2,0,0,0,0,0,0,0,0,2,4);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_lomo','2025-12-07',2,2,0,0,0,0,0,0,0,0,7,14);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_mojito','2025-12-04',1,0,0,1,0,0,0,0,0,0,5,5);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_mojito','2025-12-06',3,3,0,1,0,0,0,0,0,0,3.1666666666666665,11);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_mojito','2025-12-07',9,9,0,0,0,0,0,0,0,0,1,13);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_pabellon','2025-12-04',1,0,0,0,0,0,0,0,0,0,0,0);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_pabellon','2025-12-06',4,4,0,1,0,0,0,0,0,0,0.75,12);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_pabellon','2025-12-07',6,6,0,2,0,0,0,0,0,0,2.8333333333333335,153);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_quesillo','2025-12-07',2,2,0,2,0,0,0,0,0,0,0.5,60);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_tequeños','2025-12-06',2,2,0,0,0,0,0,0,0,0,3.5,7);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_tequeños','2025-12-07',2,2,0,0,0,0,0,0,0,0,0,0);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_tres_leches','2025-12-04',1,0,0,0,0,0,0,0,0,0,0,0);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_tres_leches','2025-12-07',1,1,0,3,0,0,0,0,0,0,4,30);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_yuca_frita','2025-12-06',2,2,0,0,0,0,0,0,0,0,0,0);
INSERT INTO "dish_daily_metrics" VALUES('rest_yucas_01','dish_yucas_yuca_frita','2025-12-07',2,2,0,0,0,0,0,0,0,0,1.5,3);
CREATE TABLE section_daily_metrics (
  restaurant_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  date TEXT NOT NULL,                         -- YYYY-MM-DD (UTC)
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  dish_views INTEGER DEFAULT 0,
  avg_dwell_seconds REAL DEFAULT 0,
  reserve_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  directions_clicks INTEGER DEFAULT 0, avg_time_spent REAL DEFAULT 0, avg_scroll_depth INTEGER DEFAULT 0, total_dishes_viewed INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, section_id, date),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
) WITHOUT ROWID;
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_entrantes','2025-12-04',1,0,2,0,0,0,0,0,0,4);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_entrantes','2025-12-06',3,3,10,0,0,0,0,0,4,5);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_entrantes','2025-12-07',4,4,9,0,0,0,0,0,7,5);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_postres','2025-12-04',1,0,1,0,0,0,0,0,0,2);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_postres','2025-12-07',2,2,3,0,0,0,0,3,25,4);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_principales','2025-12-04',1,0,2,0,0,0,0,0,0,5);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_principales','2025-12-06',5,5,6,0,0,0,0,0.2,0,7);
INSERT INTO "section_daily_metrics" VALUES('rest_yucas_01','sect_yucas_principales','2025-12-07',12,12,15,0,0,0,0,0,2,8);
CREATE TABLE entry_exit_flows (
  restaurant_id TEXT NOT NULL,
  date TEXT NOT NULL,                          -- YYYY-MM-DD (UTC)
  from_entity_type TEXT NOT NULL,              -- menu | section | dish | landing | ...
  from_entity_id TEXT,
  to_entity_type TEXT NOT NULL,
  to_entity_id TEXT,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (restaurant_id, date, from_entity_type, from_entity_id, to_entity_type, to_entity_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
) WITHOUT ROWID;
CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  text_color TEXT,
  background_color TEXT,
  font_family TEXT,
  font_accent TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "themes" VALUES('theme_default','Default Theme','#18312E','#262cd9','#d2bc4b','#FFFFFF','#183018','Fraunces variable, sans-serif','Fraunces variable, sans-serif',0,'2025-10-17 23:20:16');
CREATE TABLE reel_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "reel_templates" VALUES('tpl_classic','Classic Reels','[translate:Estilo clásico vertical - transiciones suaves]',1,0,'2025-10-17 23:20:16');
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  email TEXT,
  phone TEXT,
  theme_id TEXT REFERENCES themes(id),
  reel_template_id TEXT REFERENCES reel_templates(id),
  language_default TEXT DEFAULT 'es',
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, logo_url TEXT, address TEXT, website TEXT, city TEXT, country TEXT, cover_image_url TEXT);
INSERT INTO "restaurants" VALUES('rest_yucas_01','acc_yucas_01','Yucas','yucas','Este es un bonito restaurante bañado por el mar del mediterraneo que sobrevibe ante olas impetuosas','info@yucas.com','+34123456789','theme_default','tpl_classic','es','{\"wifi\": true, \"terraza\": true}',1,'2025-10-17 23:20:16','2025-10-24 21:04:13',NULL,NULL,'http://localhost:5174/yucas','Benalmadena','',NULL);
CREATE TABLE localization_strings (
  context TEXT NOT NULL,
  key_name TEXT NOT NULL,
  language_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (context, key_name, language_code)
);
INSERT INTO "localization_strings" VALUES('ui','menu_title','es','[translate:Menú]','[translate:Etiqueta superior en navegación]');
INSERT INTO "localization_strings" VALUES('ui','menu_title','en','Menu','Navigation title translation');
INSERT INTO "localization_strings" VALUES('landing','contact_visit_us','es','VISÍTANOS','Título principal de sección contacto');
INSERT INTO "localization_strings" VALUES('landing','contact_visit_us','en','VISIT US','Contact section main title');
INSERT INTO "localization_strings" VALUES('landing','contact_visit_us','fr','NOUS RENDRE VISITE','Titre principal section contact');
INSERT INTO "localization_strings" VALUES('landing','contact_visit_us','de','BESUCH UNS','Kontakt Haupttitel');
INSERT INTO "localization_strings" VALUES('landing','contact_visit_us','it','VISITACI','Titolo principale sezione contatti');
INSERT INTO "localization_strings" VALUES('landing','contact_visit_us','pt','VISITE-NOS','Título principal seção contato');
INSERT INTO "localization_strings" VALUES('landing','contact_daily','es','Diario','Horario diario');
INSERT INTO "localization_strings" VALUES('landing','contact_daily','en','Daily','Daily schedule');
INSERT INTO "localization_strings" VALUES('landing','contact_daily','fr','Quotidien','Horaire quotidien');
INSERT INTO "localization_strings" VALUES('landing','contact_daily','de','Täglich','Täglicher Zeitplan');
INSERT INTO "localization_strings" VALUES('landing','contact_daily','it','Giornaliero','Orario giornaliero');
INSERT INTO "localization_strings" VALUES('landing','contact_daily','pt','Diário','Horário diário');
INSERT INTO "localization_strings" VALUES('landing','contact_booking','es','Solicitud de Reserva','Texto para reservas');
INSERT INTO "localization_strings" VALUES('landing','contact_booking','en','Booking Request','Booking text');
INSERT INTO "localization_strings" VALUES('landing','contact_booking','fr','Demande de Réservation','Texte de réservation');
INSERT INTO "localization_strings" VALUES('landing','contact_booking','de','Buchungsanfrage','Buchungstext');
INSERT INTO "localization_strings" VALUES('landing','contact_booking','it','Richiesta di Prenotazione','Testo prenotazione');
INSERT INTO "localization_strings" VALUES('landing','contact_booking','pt','Pedido de Reserva','Texto de reserva');
INSERT INTO "localization_strings" VALUES('landing','contact_directions','es','Cómo llegar','Link de direcciones');
INSERT INTO "localization_strings" VALUES('landing','contact_directions','en','Get directions','Directions link');
INSERT INTO "localization_strings" VALUES('landing','contact_directions','fr','Itinéraire','Lien itinéraire');
INSERT INTO "localization_strings" VALUES('landing','contact_directions','de','Wegbeschreibung','Wegbeschreibungslink');
INSERT INTO "localization_strings" VALUES('landing','contact_directions','it','Come arrivare','Link indicazioni');
INSERT INTO "localization_strings" VALUES('landing','contact_directions','pt','Como chegar','Link de direções');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_title','es','Nuestro Boletín','Título newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_title','en','Our Newsletter','Newsletter title');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_title','fr','Notre Newsletter','Titre newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_title','de','Unser Newsletter','Newsletter-Titel');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_title','it','La Nostra Newsletter','Titolo newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_title','pt','Nossa Newsletter','Título newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_text','es','Suscríbete y obtén 25% de descuento. Recibe las últimas novedades.','Texto promoción newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_text','en','Subscribe & Get 25% Off. Get latest updates.','Newsletter promo text');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_text','fr','Abonnez-vous et obtenez 25% de réduction. Recevez les dernières mises à jour.','Texte promo newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_text','de','Abonnieren & 25% Rabatt erhalten. Erhalten Sie die neuesten Updates.','Newsletter-Promo-Text');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_text','it','Iscriviti e ricevi il 25% di sconto. Ricevi gli ultimi aggiornamenti.','Testo promo newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_text','pt','Inscreva-se e ganhe 25% de desconto. Receba as últimas novidades.','Texto promo newsletter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_placeholder','es','Ingresa tu email','Placeholder input email');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_placeholder','en','Enter your email','Email input placeholder');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_placeholder','fr','Entrez votre email','Placeholder email');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_placeholder','de','Geben Sie Ihre E-Mail ein','E-Mail-Platzhalter');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_placeholder','it','Inserisci la tua email','Segnaposto email');
INSERT INTO "localization_strings" VALUES('landing','contact_newsletter_placeholder','pt','Digite seu email','Placeholder de email');
INSERT INTO "localization_strings" VALUES('landing','contact_subscribe','es','SUSCRIBIRSE','Botón suscribir');
INSERT INTO "localization_strings" VALUES('landing','contact_subscribe','en','SUBSCRIBE','Subscribe button');
INSERT INTO "localization_strings" VALUES('landing','contact_subscribe','fr','S''ABONNER','Bouton s''abonner');
INSERT INTO "localization_strings" VALUES('landing','contact_subscribe','de','ABONNIEREN','Abonnieren-Button');
INSERT INTO "localization_strings" VALUES('landing','contact_subscribe','it','ISCRIVITI','Pulsante iscriviti');
INSERT INTO "localization_strings" VALUES('landing','contact_subscribe','pt','INSCREVER-SE','Botão inscrever');
INSERT INTO "localization_strings" VALUES('landing','contact_closed','es','Cerrado','Estado cerrado');
INSERT INTO "localization_strings" VALUES('landing','contact_closed','en','Closed','Closed status');
INSERT INTO "localization_strings" VALUES('landing','contact_closed','fr','Fermé','Statut fermé');
INSERT INTO "localization_strings" VALUES('landing','contact_closed','de','Geschlossen','Geschlossen-Status');
INSERT INTO "localization_strings" VALUES('landing','contact_closed','it','Chiuso','Stato chiuso');
INSERT INTO "localization_strings" VALUES('landing','contact_closed','pt','Fechado','Status fechado');
INSERT INTO "localization_strings" VALUES('landing','menu_title','es','Menú del Chef','Título sección menú');
INSERT INTO "localization_strings" VALUES('landing','menu_title','en','Chef''s Menu','Menu section title');
INSERT INTO "localization_strings" VALUES('landing','menu_title','fr','Menu du Chef','Titre section menu');
INSERT INTO "localization_strings" VALUES('landing','menu_title','de','Menü des Chefs','Menüabschnittstitel');
INSERT INTO "localization_strings" VALUES('landing','menu_title','it','Menu dello Chef','Titolo sezione menu');
INSERT INTO "localization_strings" VALUES('landing','menu_title','pt','Menu do Chef','Título seção menu');
INSERT INTO "localization_strings" VALUES('landing','menu_subtitle','es','Elige un menú y descubre una experiencia visual y gastronómica','Subtítulo menú');
INSERT INTO "localization_strings" VALUES('landing','menu_subtitle','en','Choose a menu and discover a visual and gastronomic experience','Menu subtitle');
INSERT INTO "localization_strings" VALUES('landing','menu_subtitle','fr','Choisissez un menu et découvrez une expérience visuelle et gastronomique','Sous-titre menu');
INSERT INTO "localization_strings" VALUES('landing','menu_subtitle','de','Wählen Sie ein Menü und entdecken Sie ein visuelles und gastronomisches Erlebnis','Menü-Untertitel');
INSERT INTO "localization_strings" VALUES('landing','menu_subtitle','it','Scegli un menu e scopri un''esperienza visiva e gastronomica','Sottotitolo menu');
INSERT INTO "localization_strings" VALUES('landing','menu_subtitle','pt','Escolha um menu e descubra uma experiência visual e gastronômica','Subtítulo menu');
INSERT INTO "localization_strings" VALUES('landing','menu_view_btn','es','Ver Menú','Botón ver menú');
INSERT INTO "localization_strings" VALUES('landing','menu_view_btn','en','View Menu','View menu button');
INSERT INTO "localization_strings" VALUES('landing','menu_view_btn','fr','Voir le Menu','Bouton voir menu');
INSERT INTO "localization_strings" VALUES('landing','menu_view_btn','de','Menü ansehen','Menü ansehen Button');
INSERT INTO "localization_strings" VALUES('landing','menu_view_btn','it','Vedi Menu','Pulsante vedi menu');
INSERT INTO "localization_strings" VALUES('landing','menu_view_btn','pt','Ver Menu','Botão ver menu');
INSERT INTO "localization_strings" VALUES('landing','nav_previous','es','Anterior','Botón anterior');
INSERT INTO "localization_strings" VALUES('landing','nav_previous','en','Previous','Previous button');
INSERT INTO "localization_strings" VALUES('landing','nav_previous','fr','Précédent','Bouton précédent');
INSERT INTO "localization_strings" VALUES('landing','nav_previous','de','Zurück','Zurück-Button');
INSERT INTO "localization_strings" VALUES('landing','nav_previous','it','Precedente','Pulsante precedente');
INSERT INTO "localization_strings" VALUES('landing','nav_previous','pt','Anterior','Botão anterior');
INSERT INTO "localization_strings" VALUES('landing','nav_next','es','Siguiente','Botón siguiente');
INSERT INTO "localization_strings" VALUES('landing','nav_next','en','Next','Next button');
INSERT INTO "localization_strings" VALUES('landing','nav_next','fr','Suivant','Bouton suivant');
INSERT INTO "localization_strings" VALUES('landing','nav_next','de','Weiter','Weiter-Button');
INSERT INTO "localization_strings" VALUES('landing','nav_next','it','Successivo','Pulsante successivo');
INSERT INTO "localization_strings" VALUES('landing','nav_next','pt','Próximo','Botão próximo');
INSERT INTO "localization_strings" VALUES('landing','nav_page','es','Página','Indicador de página');
INSERT INTO "localization_strings" VALUES('landing','nav_page','en','Page','Page indicator');
INSERT INTO "localization_strings" VALUES('landing','nav_page','fr','Page','Indicateur de page');
INSERT INTO "localization_strings" VALUES('landing','nav_page','de','Seite','Seitenanzeiger');
INSERT INTO "localization_strings" VALUES('landing','nav_page','it','Pagina','Indicatore pagina');
INSERT INTO "localization_strings" VALUES('landing','nav_page','pt','Página','Indicador de página');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','es','Experiencia Deliciosa','Título fallback hero');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','en','Delightful Experience','Hero fallback title');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','fr','Expérience Délicieuse','Titre fallback hero');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','de','Köstliches Erlebnis','Hero-Fallback-Titel');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','it','Esperienza Deliziosa','Titolo fallback hero');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','pt','Experiência Deliciosa','Título fallback banner');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','es','Un sabor de perfección en cada plato - gastronomía refinada con un toque moderno.','Subtítulo fallback hero');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','en','A taste of perfection in every dish - fine dining with a modern twist.','Hero fallback subtitle');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','fr','Un goût de perfection dans chaque plat - gastronomie raffinée avec une touche moderne.','Sous-titre fallback hero');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','de','Ein Geschmack der Perfektion in jedem Gericht - gehobene Küche mit modernem Touch.','Hero-Fallback-Untertitel');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','it','Un sapore di perfezione in ogni piatto - cucina raffinata con un tocco moderno.','Sottotitolo fallback hero');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','pt','Um sabor de perfeição em cada prato - gastronomia refinada com um toque moderno.','Subtítulo fallback banner');
INSERT INTO "localization_strings" VALUES('landing','view_more','es','Ver más','Botón ver más');
INSERT INTO "localization_strings" VALUES('landing','view_more','en','View more','View more button');
INSERT INTO "localization_strings" VALUES('landing','view_more','fr','Voir plus','Bouton voir plus');
INSERT INTO "localization_strings" VALUES('landing','view_more','de','Mehr sehen','Mehr sehen Button');
INSERT INTO "localization_strings" VALUES('landing','view_more','it','Vedi altro','Pulsante vedi altro');
INSERT INTO "localization_strings" VALUES('landing','view_more','pt','Ver mais','Botão ver mais');
INSERT INTO "localization_strings" VALUES('landing','view_less','es','Ver menos','Botón ver menos');
INSERT INTO "localization_strings" VALUES('landing','view_less','en','View less','View less button');
INSERT INTO "localization_strings" VALUES('landing','view_less','fr','Voir moins','Bouton voir moins');
INSERT INTO "localization_strings" VALUES('landing','view_less','de','Weniger sehen','Weniger sehen Button');
INSERT INTO "localization_strings" VALUES('landing','view_less','it','Vedi meno','Pulsante vedi meno');
INSERT INTO "localization_strings" VALUES('landing','view_less','pt','Ver menos','Botão ver menos');
INSERT INTO "localization_strings" VALUES('landing','loading','es','Cargando...','Texto de carga');
INSERT INTO "localization_strings" VALUES('landing','loading','en','Loading...','Loading text');
INSERT INTO "localization_strings" VALUES('landing','loading','fr','Chargement...','Texte de chargement');
INSERT INTO "localization_strings" VALUES('landing','loading','de','Laden...','Ladetext');
INSERT INTO "localization_strings" VALUES('landing','loading','it','Caricamento...','Testo di caricamento');
INSERT INTO "localization_strings" VALUES('landing','loading','pt','Carregando...','Texto de carregamento');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','cn','美味体验','Hero fallback title');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','kr','즐거운 경험','Hero fallback title');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','ru','Восхитительный Опыт','Hero fallback title');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_title','ua','Чудовий Досвід','Hero fallback title');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','cn','每道菜都完美无缺 - 精致餐饮与现代风格','Hero fallback subtitle');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','kr','모든 요리의 완벽함 - 현대적 감각의 고급 요리','Hero fallback subtitle');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','ru','Вкус совершенства в каждом блюде','Hero fallback subtitle');
INSERT INTO "localization_strings" VALUES('landing','hero_fallback_subtitle','ua','Смак досконалості в кожній страві','Hero fallback subtitle');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_title','es','Disfruta Cada Momento con Sabor','About section title');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_title','en','Enjoy Every Moment with Tasty','About section title');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_title','fr','Profitez de Chaque Moment avec Saveur','About section title');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_title','de','Genießen Sie Jeden Moment mit Geschmack','About section title');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_title','it','Goditi Ogni Momento con Gusto','About section title');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_title','pt','Aproveite Cada Momento com Sabor','About section title');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_description','es','Experimenta el arte culinario en su máxima expresión donde los sabores tradicionales se encuentran con la innovación moderna creando momentos gastronómicos inolvidables.','About section description');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_description','en','Experience culinary artistry at its finest where traditional flavors meet modern innovation creating unforgettable dining moments.','About section description');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_description','fr','Découvrez l''art culinaire à son meilleur où les saveurs traditionnelles rencontrent l''innovation moderne créant des moments gastronomiques inoubliables.','About section description');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_description','de','Erleben Sie kulinarische Kunst vom Feinsten, wo traditionelle Aromen auf moderne Innovation treffen und unvergessliche kulinarische Momente schaffen.','About section description');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_description','it','Sperimenta l''arte culinaria al suo meglio dove i sapori tradizionali incontrano l''innovazione moderna creando momenti gastronomici indimenticabili.','About section description');
INSERT INTO "localization_strings" VALUES('landing','about_fallback_description','pt','Experimente a arte culinária em seu melhor onde os sabores tradicionais encontram a inovação moderna criando momentos gastronômicos inesquecíveis.','About section description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_title','es','Calidad Premium','Quality feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_title','en','Premium Quality','Quality feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_title','fr','Qualité Premium','Quality feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_title','de','Premium-Qualität','Quality feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_title','it','Qualità Premium','Quality feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_title','pt','Qualidade Premium','Quality feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_desc','es','Ingredientes de primera calidad','Quality feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_desc','en','First-class ingredients','Quality feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_desc','fr','Ingrédients de première qualité','Quality feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_desc','de','Erstklassige Zutaten','Quality feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_desc','it','Ingredienti di prima qualità','Quality feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_quality_desc','pt','Ingredientes de primeira qualidade','Quality feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_title','es','Recetas Auténticas','Authentic feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_title','en','Authentic Recipes','Authentic feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_title','fr','Recettes Authentiques','Authentic feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_title','de','Authentische Rezepte','Authentic feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_title','it','Ricette Autentiche','Authentic feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_title','pt','Receitas Autênticas','Authentic feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_desc','es','Tradición en cada plato','Authentic feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_desc','en','Tradition in every dish','Authentic feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_desc','fr','Tradition dans chaque plat','Authentic feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_desc','de','Tradition in jedem Gericht','Authentic feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_desc','it','Tradizione in ogni piatto','Authentic feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_authentic_desc','pt','Tradição em cada prato','Authentic feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_title','es','Experiencia Única','Experience feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_title','en','Unique Experience','Experience feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_title','fr','Expérience Unique','Experience feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_title','de','Einzigartige Erfahrung','Experience feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_title','it','Esperienza Unica','Experience feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_title','pt','Experiência Única','Experience feature title');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_desc','es','Servicio excepcional','Experience feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_desc','en','Exceptional service','Experience feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_desc','fr','Service exceptionnel','Experience feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_desc','de','Ausgezeichneter Service','Experience feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_desc','it','Servizio eccezionale','Experience feature description');
INSERT INTO "localization_strings" VALUES('landing','about_feature_experience_desc','pt','Serviço excepcional','Experience feature description');
INSERT INTO "localization_strings" VALUES('landing','about_label','es','Sobre Nosotros','About us label');
INSERT INTO "localization_strings" VALUES('landing','about_label','en','About Us','About us label');
INSERT INTO "localization_strings" VALUES('landing','about_label','fr','À Propos','About us label');
INSERT INTO "localization_strings" VALUES('landing','about_label','de','Über Uns','About us label');
INSERT INTO "localization_strings" VALUES('landing','about_label','it','Chi Siamo','About us label');
INSERT INTO "localization_strings" VALUES('landing','about_label','pt','Sobre Nós','About us label');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_title','es','Momentos de nuestra mesa','Gallery title');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_title','en','Moments from our table','Gallery title');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_title','fr','Moments de notre table','Gallery title');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_title','de','Momente von unserem Tisch','Gallery title');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_title','it','Momenti dalla nostra tavola','Gallery title');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_title','pt','Momentos da nossa mesa','Gallery title');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_subtitle','es','Descubre el ambiente, la presentación y los pequeños detalles que hacen cada visita memorable.','Gallery subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_subtitle','en','Discover the ambience, plating and little details that make every visit memorable.','Gallery subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_subtitle','fr','Découvrez l''ambiance, le dressage et les petits détails qui rendent chaque visite mémorable.','Gallery subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_subtitle','de','Entdecken Sie das Ambiente, das Anrichten und die kleinen Details, die jeden Besuch unvergesslich machen.','Gallery subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_subtitle','it','Scopri l''atmosfera, l''impiattamento e i piccoli dettagli che rendono ogni visita memorabile.','Gallery subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_fallback_subtitle','pt','Descubra o ambiente, a apresentação e os pequenos detalhes que tornam cada visita memorável.','Gallery subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_title','es','Galería','Gallery');
INSERT INTO "localization_strings" VALUES('landing','gallery_title','en','Gallery','Gallery');
INSERT INTO "localization_strings" VALUES('landing','gallery_title','fr','Galerie','Gallery');
INSERT INTO "localization_strings" VALUES('landing','gallery_title','de','Galerie','Gallery');
INSERT INTO "localization_strings" VALUES('landing','gallery_title','it','Galleria','Gallery');
INSERT INTO "localization_strings" VALUES('landing','gallery_title','pt','Galeria','Gallery');
INSERT INTO "localization_strings" VALUES('landing','gallery_subtitle','es','Descubre nuestros platos en imágenes','Gallery default subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_subtitle','en','Discover our dishes in images','Gallery default subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_subtitle','fr','Découvrez nos plats en images','Gallery default subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_subtitle','de','Entdecken Sie unsere Gerichte in Bildern','Gallery default subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_subtitle','it','Scopri i nostri piatti in immagini','Gallery default subtitle');
INSERT INTO "localization_strings" VALUES('landing','gallery_subtitle','pt','Descubra nossos pratos em imagens','Gallery default subtitle');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_clients','es','Clientes Satisfechos','Satisfied clients stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_clients','en','Satisfied Clients','Satisfied clients stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_clients','fr','Clients Satisfaits','Satisfied clients stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_clients','de','Zufriedene Kunden','Satisfied clients stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_clients','it','Clienti Soddisfatti','Satisfied clients stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_clients','pt','Clientes Satisfeitos','Satisfied clients stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_dishes','es','Platos Servidos','Dishes served stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_dishes','en','Dishes Served','Dishes served stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_dishes','fr','Plats Servis','Dishes served stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_dishes','de','Servierte Gerichte','Dishes served stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_dishes','it','Piatti Serviti','Dishes served stat');
INSERT INTO "localization_strings" VALUES('landing','contact_stats_dishes','pt','Pratos Servidos','Dishes served stat');
INSERT INTO "localization_strings" VALUES('landing','contact_subtitle','es','Reserva tu mesa ahora y descubre el sabor auténtico','Contact subtitle');
INSERT INTO "localization_strings" VALUES('landing','contact_subtitle','en','Reserve your table now and discover authentic flavor','Contact subtitle');
INSERT INTO "localization_strings" VALUES('landing','contact_subtitle','fr','Réservez votre table maintenant et découvrez la saveur authentique','Contact subtitle');
INSERT INTO "localization_strings" VALUES('landing','contact_subtitle','de','Reservieren Sie jetzt Ihren Tisch und entdecken Sie authentischen Geschmack','Contact subtitle');
INSERT INTO "localization_strings" VALUES('landing','contact_subtitle','it','Prenota il tuo tavolo ora e scopri il sapore autentico','Contact subtitle');
INSERT INTO "localization_strings" VALUES('landing','contact_subtitle','pt','Reserve sua mesa agora e descubra o sabor autêntico','Contact subtitle');
INSERT INTO "localization_strings" VALUES('landing','aria_close','es','Cerrar','Close button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_close','en','Close','Close button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_close','fr','Fermer','Close button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_close','de','Schließen','Close button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_close','it','Chiudi','Close button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_close','pt','Fechar','Close button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_menu','es','Menú','Menu button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_menu','en','Menu','Menu button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_menu','fr','Menu','Menu button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_menu','de','Menü','Menu button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_menu','it','Menu','Menu button aria');
INSERT INTO "localization_strings" VALUES('landing','aria_menu','pt','Menu','Menu button aria');
CREATE TABLE reel_template_configs (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES reel_templates(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT,
  value_type TEXT DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE web_customizations (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  override_theme BOOLEAN DEFAULT TRUE,
  override_colors JSON,
  override_fonts JSON,
  layout_style TEXT DEFAULT 'modern',
  layout_settings JSON,
  seo_title TEXT,
  seo_description TEXT,
  custom_meta JSON,
  custom_css TEXT,
  custom_js TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "web_customizations" VALUES('web_yucas_01','rest_yucas_01',1,'{"primary":"#001E63","secondary":"#E8BA77"}','{"heading":"Playfair Display","body":"Inter"}','modern','{"show_gallery":true,"hero_style":"split","show_menu":true}','Yucas Beach Restaurant - Sabores del Caribe','Descubre los sabores tropicales de Yucas','{"gradient": "linear-gradient(135deg, #001E63 0%, #E8BA77 100%)"}',NULL,NULL,1,'2025-10-18 00:08:44','2025-10-18 00:08:44');
CREATE TABLE restaurant_reel_configs (
  id TEXT PRIMARY KEY,                           -- ID único para la config
  restaurant_id TEXT NOT NULL,                   -- FK a restaurantes
  template_id TEXT NOT NULL,                     -- FK a plantilla de reels
  config_overrides JSON,                         -- JSON con overrides de comportamiento (e.g. duración, animaciones)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES reel_templates(id)
);
INSERT INTO "restaurant_reel_configs" VALUES('config_yucas_01','rest_yucas_01','tpl_classic','{"primary_color":"#6bff7c","secondary_color":"#34c02a","text_color":"#2C3E50","background_color":"#FFFFFF","reel_primary_color":"#b55a6c","reel_secondary_color":"#d2bc4b","reel_text_color":"#d2bc4b","reel_background_color":"#18312E"}','2025-10-18 10:09:24','2025-12-03 15:05:48');
CREATE TABLE restaurant_details (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL UNIQUE,
  
  -- Horarios (JSON con estructura por día)
  opening_hours TEXT,                    -- JSON: {"monday": {"open": "9:00", "close": "22:00", "closed": false}, ...}
  timezone TEXT DEFAULT 'Europe/Madrid',
  special_hours TEXT,                    -- JSON: Horarios especiales (festivos, eventos)
  
  -- Reservas y contacto
  reservation_url TEXT,
  reservation_phone TEXT,
  reservation_email TEXT,
  whatsapp_number TEXT,
  
  -- Ubicación y mapa
  google_maps_url TEXT,
  latitude REAL,
  longitude REAL,
  parking_info TEXT,
  public_transport_info TEXT,
  neighborhood TEXT,                     -- Barrio o zona
  
  -- Redes sociales
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  tripadvisor_url TEXT,
  
  -- Información adicional
  accepts_credit_cards BOOLEAN DEFAULT TRUE,
  accepts_reservations BOOLEAN DEFAULT TRUE,
  has_wifi BOOLEAN DEFAULT TRUE,
  is_wheelchair_accessible BOOLEAN DEFAULT FALSE,
  has_outdoor_seating BOOLEAN DEFAULT FALSE,
  has_delivery BOOLEAN DEFAULT FALSE,
  has_takeaway BOOLEAN DEFAULT FALSE,
  pet_friendly BOOLEAN DEFAULT FALSE,
  
  -- Capacidad
  max_capacity INTEGER,
  private_room_capacity INTEGER,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
INSERT INTO "restaurant_details" VALUES('details_rest_yucas_01','rest_yucas_01',NULL,'Europe/Madrid',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'http://localhost:5174/yucasface','https://instagram.com',NULL,NULL,NULL,NULL,1,0,1,0,1,0,0,0,50,NULL,'2025-10-24 21:04:13','2025-10-24 21:04:13');
CREATE TABLE landing_section_library (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,       -- 'hero', 'about', 'menu', 'gallery', 'location', 'contact'
  name TEXT NOT NULL,                     -- 'Hero Banner', 'Sobre Nosotros', etc.
  description TEXT,
  icon_name TEXT,                         -- 'HomeIcon', 'InfoIcon', etc. (Material UI)
  category TEXT DEFAULT 'content',        -- 'hero', 'content', 'media', 'contact'
  
  -- Variantes disponibles
  available_variants TEXT NOT NULL,       -- JSON: [{key, name, description}, ...]
  
  -- Props configurables
  customizable_props TEXT NOT NULL,       -- JSON: [{key, label, type, options, default}, ...]
  
  -- Config por defecto
  default_config TEXT,                    -- JSON con valores por defecto
  
  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,        -- Orden en el selector del admin
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "landing_section_library" VALUES('lsl_hero','hero','Hero Banner','Sección principal de portada con imagen/video de fondo y llamada a la acción','HomeIcon','hero','[{"key":"fullscreen","name":"Pantalla completa","description":"Hero que ocupa toda la pantalla"},{"key":"centered","name":"Centrado","description":"Contenido centrado (80vh)"},{"key":"split","name":"Split screen","description":"Texto a un lado, imagen al otro"},{"key":"video","name":"Con video","description":"Video de fondo en loop"},{"key":"premium","name":"Premium window","description":"Ventana móvil + óvalo desktop con carrusel R2"}]','[{"key":"height","label":"Altura","type":"select","options":["60vh","80vh","100vh"],"default":"80vh"},{"key":"overlay_opacity","label":"Oscurecer fondo","type":"slider","min":0,"max":0.8,"step":0.05,"default":0.3},{"key":"text_align","label":"Alineación","type":"select","options":["left","center","right"],"default":"center"},{"key":"title_override","label":"Título personalizado","type":"text","maxLength":60,"default":""},{"key":"subtitle_override","label":"Subtítulo","type":"textarea","maxLength":200,"default":""},{"key":"cta_text","label":"Texto del botón","type":"text","maxLength":30,"default":"Ver Menú"},{"key":"cta_style","label":"Estilo del botón","type":"select","options":["solid","outlined","ghost"],"default":"solid"},{"key":"background_media","label":"Imagen/Video de fondo","type":"media","accept":"image/*,video/*","default":""},{"key":"show_scroll_indicator","label":"Mostrar indicador scroll","type":"boolean","default":true},{"key":"autoplay_ms","label":"Autoplay (ms)","type":"number","min":0,"max":60000,"step":500,"default":0},{"key":"arrows_desktop","label":"Flechas en desktop","type":"boolean","default":true}]','{"height":"80vh","overlay_opacity":0.3,"text_align":"center","cta_text":"Ver Menú","cta_style":"solid","show_scroll_indicator":true}',1,1,'2025-10-21 23:35:25','2025-10-21 23:35:25');
INSERT INTO "landing_section_library" VALUES('lsl_about','about','Sobre Nosotros','Descripción del restaurante con texto e imagen','InfoIcon','content','[{"key":"two_column","name":"Dos Columnas","description":"Layout clásico con imagen y texto en columnas"},{"key":"premium","name":"Premium con Tags","description":"Layout premium con título decorado con tag images y 3 imágenes floating parallax (estilo Restoria)"}]','{"show_subtitle":{"label":"Mostrar subtítulo","type":"boolean","default":true},"show_button":{"label":"Mostrar botón","type":"boolean","default":true},"section_padding":{"label":"Padding de sección","type":"text","default":"80px 0"},"image_position":{"label":"Posición imagen (two_column)","type":"select","options":["left","right"],"default":"left"}}','{"image_position":"right","show_cuisine_type":true,"show_specialties":true,"show_chef_note":false,"background_style":"white"}',1,2,'2025-10-21 23:35:26','2025-11-02 13:58:22');
INSERT INTO "landing_section_library" VALUES('lsl_menu','menu','Menú Destacado','Preview de los platos más destacados','RestaurantMenuIcon','content',replace('[\n    {"key":"grid","name":"Cuadrícula","description":"Cards en grid responsive"},\n    {"key":"masonry","name":"Masonry","description":"Grid tipo Pinterest"},\n    {"key":"carousel","name":"Carrusel","description":"Carrusel deslizable"},\n    {"key":"list","name":"Lista","description":"Lista vertical"},\n    {"key":"premium","name":"Premium","description":"Galería de vídeos + menús destacados"}\n  ]','\n',char(10)),replace('[\n    {"key":"columns","label":"Columnas (grid)","type":"select","options":[2,3,4],"default":3},\n    {"key":"show_prices","label":"Mostrar precios","type":"boolean","default":true},\n    {"key":"show_description","label":"Mostrar descripción","type":"boolean","default":true},\n    {"key":"show_dietary_icons","label":"Iconos dietéticos","type":"boolean","default":true},\n    {"key":"max_items","label":"Máximo de platos","type":"number","min":3,"max":12,"default":6},\n    {"key":"card_style","label":"Estilo de card","type":"select","options":["minimal","elevated","bordered"],"default":"elevated"},\n    {"key":"hover_effect","label":"Efecto hover","type":"select","options":["none","zoom","lift","glow"],"default":"zoom"},\n    {"key":"cta_text","label":"Texto botón Ver Más","type":"text","default":"Ver menú completo"},\n\n    {"key":"premium_layout_title","label":"Título de la galería","type":"text","default":"Chef’s Video Gallery"},\n    {"key":"premium_videos_source","label":"Fuente de vídeos","type":"select","options":["manual","from_menus"],"default":"from_menus"},\n    {"key":"premium_manual_videos","label":"Vídeos (manual)","type":"array","schema":{"src":"url","poster":"url","href":"url","title":"text"},"default":[]},\n    {"key":"premium_per_page_desktop","label":"Videos por página (desktop)","type":"number","min":1,"max":6,"default":3},\n    {"key":"premium_per_page_tablet","label":"Videos por página (tablet)","type":"number","min":1,"max":4,"default":2},\n    {"key":"premium_per_page_mobile","label":"Videos por página (mobile)","type":"number","min":1,"max":2,"default":1},\n    {"key":"premium_autoplay_on_hover","label":"Auto‑play al hover","type":"boolean","default":true},\n    {"key":"premium_loop","label":"Repetir vídeo","type":"boolean","default":true},\n    {"key":"premium_show_dots","label":"Mostrar puntos de paginación","type":"boolean","default":true}\n  ]','\n',char(10)),'{"columns":3,"show_prices":true,"show_description":true,"show_dietary_icons":true,"max_items":6,"card_style":"elevated","hover_effect":"zoom","cta_text":"Ver menú completo"}',1,3,'2025-10-21 23:35:27','2025-10-21 23:35:27');
INSERT INTO "landing_section_library" VALUES('lsl_gallery','gallery','Galería de Fotos','Galería visual de imágenes del restaurante','PhotoLibraryIcon','media',replace('[\n    {"key":"grid","name":"Cuadrícula uniforme","description":"Grid con imágenes del mismo tamaño"},\n    {"key":"masonry","name":"Masonry","description":"Grid tipo Pinterest"},\n    {"key":"slider","name":"Slider","description":"Slider con navegación"},\n    {"key":"premium","name":"Galería Premium","description":"Diseño moderno con hover, lightbox y efectos visuales"}\n  ]','\n',char(10)),replace('[\n    {"key":"columns","label":"Columnas (Desktop)","type":"select","options":[2,3,4,5],"default":3},\n    {"key":"max_images","label":"Máximo de imágenes","type":"number","min":4,"max":24,"default":12},\n    {"key":"aspect_ratio","label":"Formato de imagen","type":"select","options":["square","portrait","landscape"],"default":"square"},\n    {"key":"gap","label":"Espaciado entre fotos","type":"select","options":["none","small","medium","large"],"default":"small"},\n    {"key":"lightbox_enabled","label":"Activar Lightbox (Zoom)","type":"boolean","default":true},\n    {"key":"show_captions","label":"Mostrar textos/títulos","type":"boolean","default":false},\n    {"key":"filter_by_featured","label":"Solo imágenes destacadas","type":"boolean","default":false}\n  ]','\n',char(10)),'{"columns":3,"max_images":12,"aspect_ratio":"square","gap":"small","show_captions":false,"lightbox_enabled":true,"filter_by_featured":false}',1,4,'2025-10-21 23:35:27','2025-11-21 12:00:38');
INSERT INTO "landing_section_library" VALUES('lsl_location','location','Ubicación y Horarios','Mapa interactivo, dirección y horarios','LocationOnIcon','contact','[{"key":"map_prominent","name":"Mapa destacado","description":"Mapa grande arriba"},{"key":"info_prominent","name":"Info destacada","description":"Info arriba, mapa abajo"},{"key":"side_by_side","name":"Lado a lado","description":"Mapa e info en columnas"}]','[{"key":"map_height","label":"Altura del mapa","type":"select","options":["300px","400px","500px","600px"],"default":"400px"},{"key":"map_zoom","label":"Zoom inicial","type":"number","min":10,"max":18,"default":15},{"key":"show_directions_button","label":"Botón Cómo llegar","type":"boolean","default":true},{"key":"show_opening_hours","label":"Mostrar horarios","type":"boolean","default":true},{"key":"show_parking_info","label":"Info de parking","type":"boolean","default":false},{"key":"show_transport_info","label":"Transporte público","type":"boolean","default":false},{"key":"marker_style","label":"Estilo marcador","type":"select","options":["default","custom_logo","pin"],"default":"default"}]','{"map_height":"400px","map_zoom":15,"show_directions_button":true,"show_opening_hours":true,"show_parking_info":false,"show_transport_info":false,"marker_style":"default"}',1,5,'2025-10-21 23:35:28','2025-10-21 23:35:28');
INSERT INTO "landing_section_library" VALUES('lsl_contact','contact','Contacto','Información de contacto y redes sociales','ContactMailIcon','contact','[{"key":"full_form","name":"Formulario completo","description":"Formulario de contacto"},{"key":"simple_info","name":"Info simple","description":"Email, teléfono y redes"},{"key":"cards","name":"Tarjetas","description":"Cards con iconos"},{"key":"premium","name":"Premium","description":"Layout elegante con imágenes ovaladas"}]','[{"key":"show_email","label":"Mostrar email","type":"boolean","default":true},{"key":"show_phone","label":"Mostrar teléfono","type":"boolean","default":true},{"key":"show_whatsapp","label":"Mostrar WhatsApp","type":"boolean","default":true},{"key":"show_social_links","label":"Redes sociales","type":"boolean","default":true},{"key":"form_fields","label":"Campos formulario","type":"multiselect","options":["name","email","phone","subject","message"],"default":["name","email","message"]},{"key":"show_reservation_cta","label":"Botón Reservar Mesa","type":"boolean","default":true},{"key":"background_style","label":"Estilo de fondo","type":"select","options":["white","gray","primary","dark"],"default":"gray"},{"key":"contact_images","label":"URLs imágenes laterales (premium)","type":"array","default":[]}]','{"show_email":true,"show_phone":true,"show_whatsapp":true,"show_social_links":true,"form_fields":["name","email","message"],"show_reservation_cta":true,"background_style":"gray"}',1,6,'2025-10-21 23:35:29','2025-11-11 15:34:33');
INSERT INTO "landing_section_library" VALUES('lsl_header','header','Header Navegable','Barra superior con navegación a secciones del landing','MenuIcon','layout','[{"key":"simple","name":"Simple","description":"Barra superior básica"},{"key":"sticky","name":"Pegajosa","description":"Se fija al hacer scroll"},{"key":"floating","name":"Flotante","description":"Caja redondeada flotante"},{"key":"centered","name":"Centrada","description":"Logo y enlaces centrados"}]','[{"key":"show_logo","label":"Mostrar logo","type":"boolean","default":true},{"key":"show_title","label":"Mostrar título","type":"boolean","default":true},{"key":"condense_on_scroll","label":"Contraer al hacer scroll","type":"boolean","default":true},{"key":"border_style","label":"Borde","type":"select","options":["none","hairline","accent"],"default":"hairline"},{"key":"radius","label":"Radio","type":"select","options":["0","8","12","16"],"default":"12"},{"key":"max_width","label":"Ancho máx","type":"select","options":["1024px","1280px","1440px"],"default":"1280px"},{"key":"align","label":"Alineación","type":"select","options":["left","center","between"],"default":"between"},{"key":"cta_text","label":"CTA texto","type":"text","default":""},{"key":"cta_link","label":"CTA enlace","type":"text","default":""}]','{"show_logo":true,"show_title":true,"condense_on_scroll":true,"border_style":"hairline","radius":"12","max_width":"1280px","align":"between"}',1,0,'2025-11-09 16:48:00','2025-11-09 16:48:00');
CREATE TABLE restaurant_landing_sections (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  section_key TEXT NOT NULL,              -- FK a landing_section_library.section_key
  
  -- Orden y estado
  order_index INTEGER NOT NULL,           -- 1, 2, 3... (orden de aparición)
  is_active BOOLEAN DEFAULT TRUE,         -- Mostrar/ocultar sin borrar
  
  -- Configuración
  variant TEXT DEFAULT 'default',         -- Variante elegida: 'fullscreen', 'grid', etc.
  config_data TEXT NOT NULL DEFAULT '{}', -- JSON con toda la personalización
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (section_key) REFERENCES landing_section_library(section_key) ON DELETE RESTRICT,
  
  UNIQUE(restaurant_id, section_key),     -- Solo 1 instancia de cada sección por restaurante
  UNIQUE(restaurant_id, order_index)      -- No puede haber 2 secciones en mismo orden
);
INSERT INTO "restaurant_landing_sections" VALUES('rls_yucas_hero','rest_yucas_01','hero',2,1,'premium','{"height":"100vh","overlay_opacity":0.4,"text_align":"center","cta_text":"Menú","cta_style":"solid","show_scroll_indicator":false,"title_override":"","subtitle_override":""}','2025-10-22 11:57:40','2025-12-03 13:49:36');
INSERT INTO "restaurant_landing_sections" VALUES('rls_yucas_about','rest_yucas_01','about',4,1,'premium','{"show_subtitle":true,"show_button":true,"section_padding":"80px 0","background_style":"dark"}','2025-10-22 11:57:40','2025-12-03 13:49:37');
INSERT INTO "restaurant_landing_sections" VALUES('rls_yucas_menu','rest_yucas_01','menu',3,1,'premium','{"columns":3,"show_prices":true,"show_description":true,"max_items":3,"card_style":"bordered","hover_effect":"zoom"}','2025-10-22 11:57:40','2025-12-03 13:51:50');
INSERT INTO "restaurant_landing_sections" VALUES('rls_yucas_contact','rest_yucas_01','contact',7,1,'premium','{"show_email":true,"show_phone":true,"show_whatsapp":true,"show_social_links":true}','2025-10-22 11:57:40','2025-12-03 13:49:37');
INSERT INTO "restaurant_landing_sections" VALUES('rls_1761141833640_hqi8vkghi','rest_yucas_01','gallery',5,1,'premium','{"columns":3,"max_images":9,"aspect_ratio":"square","gap":"small","show_captions":false,"lightbox_enabled":true,"filter_by_featured":true}','2025-10-22 14:03:53','2025-12-03 13:49:37');
INSERT INTO "restaurant_landing_sections" VALUES('rls_1762707043898_8r7pbug3j','rest_yucas_01','header',1,1,'simple','{"show_logo":true,"show_title":true,"condense_on_scroll":false,"border_style":"hairline","radius":"12","max_width":"1440px","align":"center"}','2025-11-09 16:50:43','2025-12-03 13:49:36');
CREATE TABLE cart_daily_metrics (
  restaurantid TEXT NOT NULL,
  date TEXT NOT NULL,
  total_carts_created INTEGER DEFAULT 0,
  total_carts_shown INTEGER DEFAULT 0,
  total_carts_abandoned INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0.0,
  total_estimated_value REAL DEFAULT 0.0,
  avg_cart_value REAL DEFAULT 0.0,
  shown_carts_value REAL DEFAULT 0.0,
  total_items_added INTEGER DEFAULT 0,
  avg_items_per_cart REAL DEFAULT 0.0,
  avg_time_to_show INTEGER DEFAULT 0,
  avg_time_to_abandon INTEGER DEFAULT 0,
  top_dish_id TEXT,
  top_dish_count INTEGER DEFAULT 0,
  PRIMARY KEY (restaurantid, date),
  FOREIGN KEY (restaurantid) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (top_dish_id) REFERENCES dishes(id) ON DELETE SET NULL
) WITHOUT ROWID;
INSERT INTO "cart_daily_metrics" VALUES('rest_yucas_01','2025-12-04',1,0,0,0,0,0,0,0,0,0,0,NULL,0);
INSERT INTO "cart_daily_metrics" VALUES('rest_yucas_01','2025-12-06',3,0,0,0,22.25,7.416666666666667,0,3,1,0,0,NULL,0);
INSERT INTO "cart_daily_metrics" VALUES('rest_yucas_01','2025-12-07',4,0,0,0,25,6.25,0,4,1,0,0,NULL,0);
CREATE TABLE restaurant_media (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
    
    -- Context + Role pattern
    context TEXT NOT NULL,               -- 'hero' | 'about' | 'tag' | 'gallery' | 'cover'
    role TEXT,                           -- Rol específico dentro del contexto
    
    -- Metadata
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    file_size_bytes INTEGER,
    
    -- Control
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    metadata_json TEXT,                  -- JSON flexible para props custom
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
INSERT INTO "restaurant_media" VALUES('rm_yucas_hero1','rest_yucas_01','restaurants/rest_yucas_01/landing/hero/slide1.png','image','hero','slide','Plato gourmet principal',NULL,NULL,NULL,1,0,NULL,'2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_hero2','rest_yucas_01','restaurants/rest_yucas_01/landing/hero/slide2.png','image','hero','slide','Arepa venezolana',NULL,NULL,NULL,1,1,NULL,'2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_hero3','rest_yucas_01','restaurants/rest_yucas_01/landing/hero/slide3.png','image','hero','slide','Plato con carne',NULL,NULL,NULL,1,2,NULL,'2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_hero4','rest_yucas_01','restaurants/rest_yucas_01/landing/hero/slide4.jpg','image','hero','slide','Comida casera',NULL,NULL,NULL,1,3,NULL,'2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_about1','rest_yucas_01','restaurants/rest_yucas_01/landing/about/about1.png','image','about','floating_left','Interior restaurante',NULL,NULL,NULL,1,0,'{"parallax_depth": 0.5, "position": "left"}','2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_about2','rest_yucas_01','restaurants/rest_yucas_01/landing/about/about2.png','image','about','floating_center','Chef cocinando',NULL,NULL,NULL,1,1,'{"parallax_depth": 0.5, "position": "center"}','2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_about3','rest_yucas_01','restaurants/rest_yucas_01/landing/about/about3.png','image','about','floating_right','Mesa con platos',NULL,NULL,NULL,1,2,'{"parallax_depth": 0.9, "position": "right"}','2025-11-01 17:50:34','2025-11-01 17:50:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_tag_mains','rest_yucas_01','restaurants/rest_yucas_01/landing/tags/tag1.png','image','tag','mains','Mains',NULL,NULL,NULL,1,0,'{"display_text": "Mains"}','2025-11-01 17:50:35','2025-11-01 17:50:35');
INSERT INTO "restaurant_media" VALUES('rm_yucas_tag_drinks','rest_yucas_01','restaurants/rest_yucas_01/landing/tags/tag2.png','image','tag','drinks','Drinks',NULL,NULL,NULL,1,1,'{"display_text": "Drinks"}','2025-11-01 17:50:35','2025-11-01 17:50:35');
INSERT INTO "restaurant_media" VALUES('rm_yucas_tag_desserts','rest_yucas_01','restaurants/rest_yucas_01/landing/tags/tag3.png','image','tag','desserts','Desserts',NULL,NULL,NULL,1,2,'{"display_text": "Desserts"}','2025-11-01 17:50:35','2025-11-01 17:50:35');
INSERT INTO "restaurant_media" VALUES('rm_yucas_cover_main','rest_yucas_01','restaurants/rest_yucas_01/landing/covers/main-cover.jpg','image','cover','main','Cover principal',NULL,NULL,NULL,1,0,NULL,'2025-11-01 17:50:36','2025-11-01 17:50:36');
INSERT INTO "restaurant_media" VALUES('rm_yucas_cover_menu','rest_yucas_01','restaurants/rest_yucas_01/landing/covers/menu-cover.jpg','image','cover','menu','Cover menú',NULL,NULL,NULL,1,0,NULL,'2025-11-01 17:50:36','2025-11-01 17:50:36');
INSERT INTO "restaurant_media" VALUES('rm_yucas_about_main','rest_yucas_01','restaurants/rest_yucas_01/landing/about/about1.png','image','about','main_image','Interior del restaurante Yucas',NULL,NULL,NULL,1,0,NULL,'2025-11-02 13:15:49','2025-11-02 13:15:49');
INSERT INTO "restaurant_media" VALUES('rm_yucas_gal_01','rest_yucas_01','restaurants/rest_yucas_01/landing/gallery/gallery1.png','image','gallery','gallery_image','Ambiente del restaurante',NULL,NULL,NULL,1,1,NULL,'2025-11-21 13:55:34','2025-11-21 13:55:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_gal_02','rest_yucas_01','restaurants/rest_yucas_01/landing/gallery/gallery2.png','image','gallery','gallery_image','Platos exclusivos',NULL,NULL,NULL,1,2,NULL,'2025-11-21 13:55:34','2025-11-21 13:55:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_gal_03','rest_yucas_01','restaurants/rest_yucas_01/landing/gallery/gallery3.png','image','gallery','gallery_image','Detalle de mesa',NULL,NULL,NULL,1,3,NULL,'2025-11-21 13:55:34','2025-11-21 13:55:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_gal_04','rest_yucas_01','restaurants/rest_yucas_01/landing/gallery/gallery4.png','image','gallery','gallery_image','Interiores',NULL,NULL,NULL,1,4,NULL,'2025-11-21 13:55:34','2025-11-21 13:55:34');
INSERT INTO "restaurant_media" VALUES('rm_yucas_gal_05','rest_yucas_01','restaurants/rest_yucas_01/landing/gallery/gallery5.png','image','gallery','gallery_image','Terraza',NULL,NULL,NULL,1,5,NULL,'2025-11-21 13:55:34','2025-11-21 13:55:34');
CREATE TABLE cart_sessions (
  id TEXT PRIMARY KEY,
  sessionid TEXT NOT NULL,
  restaurantid TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  showntostaffat TIMESTAMP,
  abandonedat TIMESTAMP,
  cartsnapshotjson TEXT,
  totalitems INTEGER DEFAULT 0,
  uniquedishes INTEGER DEFAULT 0,
  estimatedvalue REAL DEFAULT 0.0,
  timespentseconds INTEGER DEFAULT 0,
  modificationscount INTEGER DEFAULT 0,
  devicetype TEXT,
  languagecode TEXT,
  qrcodeid TEXT,
  FOREIGN KEY (sessionid) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurantid) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (qrcodeid) REFERENCES qr_codes(id) ON DELETE SET NULL
);
INSERT INTO "cart_sessions" VALUES('cart_uw4d7rzx9oimiqog3ef','7a576c59-0021-4f29-bc66-d1481deb9e0f','rest_yucas_01','active','2025-12-04T00:07:54.424Z','2025-12-04 00:07:52',NULL,NULL,NULL,0,0,0,0,0,'desktop','es-ES',NULL);
INSERT INTO "cart_sessions" VALUES('cart_ky5geagpagmiua69jq','35d86f26-053d-4eb4-8637-44d57ec42686','rest_yucas_01','active','2025-12-06T12:39:25.910Z','2025-12-06 12:39:20',NULL,NULL,NULL,0,0,0,0,0,'desktop','es-ES',NULL);
INSERT INTO "cart_sessions" VALUES('cart_525bc9d1rt3miuawdcn','a8ff0367-a760-48f0-93a3-95b35b1e8dbf','rest_yucas_01','active','2025-12-06T12:59:43.895Z','2025-12-06 12:59:38',NULL,NULL,NULL,0,0,0,0,0,'mobile','es-ES',NULL);
INSERT INTO "cart_sessions" VALUES('cart_5tp6jo8w1bmiubycx9','e4de3e52-ceda-437c-8f87-68f3170fdbdc','rest_yucas_01','active','2025-12-06T13:29:16.269Z','2025-12-06T13:29:43.402Z',NULL,NULL,'[{"dishId":"dish_yucas_pabellon","name":"Pabellón Criollos con salsa de texto larga y mas letras","quantity":1,"price":0},{"dishId":"dish_yucas_tequeños","name":"Tequeños de Queso","quantity":1,"price":8.5},{"dishId":"dish_yucas_cazuela","name":"Cazuela de Yuca y Queso","quantity":1,"price":13.75}]',3,3,22.25,0,2,'mobile','es-ES',NULL);
INSERT INTO "cart_sessions" VALUES('cart_r977b8sbuvmivmqqwf','c9485733-07a3-46d7-af13-fdbcd4870068','rest_yucas_01','active','2025-12-07T11:19:03.087Z','2025-12-07T11:19:30.861Z',NULL,NULL,'[{"dishId":"dish_yucas_pabellon","name":"Pabellón Criollos con salsa de texto larga y mas letras","quantity":1,"price":0},{"dishId":"dish_yucas_lomo","name":"Lomo en Salsa de Yuca","quantity":1,"price":16.5}]',2,2,16.5,0,1,'mobile','es-ES',NULL);
INSERT INTO "cart_sessions" VALUES('cart_f1sk1xytpemivnfthj','f2f093e7-86bc-4d39-a174-e32e15d5c638','rest_yucas_01','active','2025-12-07T11:38:32.839Z','2025-12-07 11:38:26',NULL,NULL,NULL,0,0,0,0,0,'mobile','es-ES',NULL);
INSERT INTO "cart_sessions" VALUES('cart_n1byg6g05fdmivorouk','c1b9016c-cd7f-4034-bf13-5a5d2a8fea47','rest_yucas_01','active','2025-12-07T12:15:46.316Z','2025-12-07 12:15:46',NULL,NULL,NULL,0,0,0,0,0,'mobile','es',NULL);
INSERT INTO "cart_sessions" VALUES('cart_0u7db3xmke8mivqf4m4','bfb2ccff-567b-4a2d-9b03-53be357484db','rest_yucas_01','active','2025-12-07T13:01:59.452Z','2025-12-07T13:04:33.007Z',NULL,NULL,'[{"dishId":"dish_yucas_tequeños","name":"Tequeños de Queso","quantity":1,"price":8.5},{"dishId":"dish_yucas_mojito","name":"Mojito Caribeño","quantity":1,"price":0}]',2,2,8.5,0,1,'desktop','es-ES',NULL);
CREATE TABLE marketing_campaigns (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,              -- Internal name (e.g., "Welcome Summer 2025")
    type TEXT NOT NULL,              -- 'welcome_modal', 'exit_intent', 'banner', 'newsletter'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,      -- Higher number = higher priority
    
    -- Configuration & Content
    -- We use JSON for flexibility within the structured table.
    -- content: { title, description, image_url, ... }
    -- settings: { show_email, show_phone, auto_open, delay, ... }
    content JSON,
    settings JSON,
    
    -- Scheduling
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
INSERT INTO "marketing_campaigns" VALUES('camp_yucas_welcome_01','rest_yucas_01','Bienvenida Yucas 2025','welcome_modal',1,0,replace('{\n        "title": "¡Bienvenido a Yucas!",\n        "description": "Disfruta de la auténtica experiencia latina. Suscríbete y recibe un postre gratis en tu primera visita.",\n        "image_url": "https://pub-813e0e75525741699742d0e74e442805.r2.dev/restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/primary/tres_leches.mp4"\n    }','\n',char(10)),replace('{\n        "show_capture_form": true,\n        "show_email": true,\n        "show_phone": true,\n        "auto_open": true,\n        "delay": 2000\n    }','\n',char(10)),'2025-12-02 18:59:33',NULL,'2025-12-02 18:59:33','2025-12-02 18:59:33');
CREATE TABLE marketing_leads (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    campaign_id TEXT,                -- Link to the specific campaign (optional but recommended)
    
    type TEXT NOT NULL CHECK(type IN ('email', 'phone')),
    contact_value TEXT NOT NULL,
    
    -- Metadata
    source TEXT,                     -- 'welcome_modal', 'footer', etc. (redundant if campaign_id is used, but good for backup)
    consent_given BOOLEAN DEFAULT TRUE,
    metadata JSON,                   -- { device: 'mobile', url: '/menu', ... }
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL
);
INSERT INTO "marketing_leads" VALUES('64b3c100-d81e-4703-854d-6e27950f1a33','rest_yucas_01','camp_yucas_welcome_01','phone','666666666','welcome_modal',1,NULL,'2025-12-02 21:07:22');
INSERT INTO "marketing_leads" VALUES('1f796f74-d97b-4af0-a03b-cd252095a170','rest_yucas_01','camp_yucas_welcome_01','email','1@email','welcome_modal',1,NULL,'2025-12-02 21:09:15');
INSERT INTO "marketing_leads" VALUES('2ffb8670-9a42-4903-b88f-73bdd5726039','rest_yucas_01','camp_yucas_welcome_01','phone','333423423423','welcome_modal',1,NULL,'2025-12-02 23:23:40');
INSERT INTO "marketing_leads" VALUES('18e7f916-cb5d-46ef-90ed-6f9ec04b56eb','rest_yucas_01','camp_yucas_welcome_01','email','meloinventno@email.com','welcome_modal',1,NULL,'2025-12-03 13:36:45');
INSERT INTO "marketing_leads" VALUES('949dadfb-3cde-4dc5-8e94-b8242c16952a','rest_yucas_01','camp_yucas_welcome_01','phone','47635347','welcome_modal',1,NULL,'2025-12-07 11:41:07');
CREATE INDEX idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX idx_sections_restaurant ON sections(restaurant_id);
CREATE INDEX idx_translations_entity ON translations(entity_id, entity_type);
CREATE INDEX idx_translations_language ON translations(language_code);
CREATE INDEX idx_translations_lookup ON translations(entity_type, language_code);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_dish ON user_favorites(dish_id);
CREATE INDEX idx_dish_media ON dish_media (dish_id, media_type, is_primary);
CREATE INDEX idx_qr_codes_restaurant ON qr_codes(restaurant_id);
CREATE INDEX idx_sessions_rest_date ON sessions(restaurant_id, started_at);
CREATE INDEX idx_sessions_qr ON sessions(qr_code_id);
CREATE INDEX idx_events_rest_type_time ON events(restaurant_id, event_type, created_at);
CREATE INDEX idx_events_entity ON events(entity_id, entity_type);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_qr_scans_qr ON qr_scans(qr_code_id);
CREATE INDEX idx_qr_scans_session ON qr_scans(session_id);
CREATE INDEX idx_daily_rest_date ON daily_analytics(restaurant_id, date);
CREATE INDEX idx_dish_metrics_rest_date ON dish_daily_metrics(restaurant_id, date);
CREATE INDEX idx_dish_metrics_dish ON dish_daily_metrics(dish_id);
CREATE INDEX idx_section_metrics_rest_date ON section_daily_metrics(restaurant_id, date);
CREATE INDEX idx_section_metrics_section ON section_daily_metrics(section_id);
CREATE INDEX idx_flows_rest_date ON entry_exit_flows(restaurant_id, date);
CREATE INDEX idx_restaurant_details_restaurant ON restaurant_details(restaurant_id);
CREATE INDEX idx_lsl_active ON landing_section_library(is_active, display_order);
CREATE INDEX idx_rls_restaurant ON restaurant_landing_sections(restaurant_id);
CREATE INDEX idx_rls_order ON restaurant_landing_sections(restaurant_id, order_index);
CREATE INDEX idx_rls_active ON restaurant_landing_sections(restaurant_id, is_active);
CREATE INDEX idx_cartdaily_restaurant_date ON cart_daily_metrics(restaurantid, date);
CREATE INDEX idx_rm_restaurant ON restaurant_media(restaurant_id);
CREATE INDEX idx_rm_context_role ON restaurant_media(context, role);
CREATE INDEX idx_rm_active ON restaurant_media(is_active);
CREATE INDEX idx_events_type_date ON events(event_type, created_at);
CREATE INDEX idx_events_entity_type ON events(entity_id, entity_type, event_type);
CREATE INDEX idx_cartsessions_session ON cart_sessions(sessionid);
CREATE INDEX idx_cartsessions_restaurant_status ON cart_sessions(restaurantid, status);
CREATE INDEX idx_cartsessions_created ON cart_sessions(createdat);
CREATE INDEX idx_marketing_campaigns_restaurant ON marketing_campaigns(restaurant_id, is_active);
CREATE INDEX idx_marketing_leads_restaurant ON marketing_leads(restaurant_id);
CREATE INDEX idx_marketing_leads_campaign ON marketing_leads(campaign_id);
