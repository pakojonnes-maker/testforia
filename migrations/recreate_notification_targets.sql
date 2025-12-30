PRAGMA defer_foreign_keys=TRUE;

DROP TABLE IF EXISTS notification_targets;

CREATE TABLE notification_targets (
  notification_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,         -- Identificador principal del dispositivo (puede ser 'anon' o el ID real)
  user_id TEXT,                     -- Opcional: Solo si el usuario estaba logueado
  
  -- Estado
  sent BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  
  -- Constraints
  PRIMARY KEY (notification_id, visitor_id), -- Clave primaria compuesta correcta
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
