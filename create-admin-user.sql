-- ===========================================================================
-- CREATE ADMIN USER SQL SCRIPT (PBKDF2 Version)
-- ===========================================================================
-- Este script crea un usuario administrador para acceder al panel de admin
-- 
-- IMPORTANTE: 
-- 1. Ejecuta este script en tu base de datos D1
-- 2. Cambia el email, contraseña y restaurant_id según tus necesidades
-- 3. El password_hash ya está generado para la contraseña "admin123"
--    usando el algoritmo PBKDF2 (SHA-256, 100k iteraciones)
-- 4. CAMBIA LA CONTRASEÑA inmediatamente después del primer login
-- ===========================================================================

-- Datos del usuario a crear:
-- Email: admin@visualtaste.com
-- Contraseña: admin123
-- Hash (PBKDF2): salt:hash (hex)

-- PASO 1: Insertar el usuario
-- Reemplaza 'your_restaurant_id_here' con el ID real de tu restaurante
INSERT INTO users (
  id,
  email,
  display_name,
  password_hash,
  auth_provider,
  created_at,
  last_login
) VALUES (
  'user_admin_' || hex(randomblob(8)),
  'admin@visualtaste.com',
  'Administrador',
  -- Hash para 'admin123' (PBKDF2-SHA256, 100k iteraciones)
  'a1b2c3d4e5f678901234567890abcdef:d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef1234', -- ⚠️ ESTO ES UN EJEMPLO, USA EL GENERADOR ABAJO
  'email',
  CURRENT_TIMESTAMP,
  NULL
);

-- ⚠️ NOTA CRÍTICA:
-- Como PBKDF2 usa un salt aleatorio, no puedo pre-generar un hash estático válido 
-- que funcione con el código que acabo de escribir sin conocer el salt exacto.
-- 
-- Para generar un hash válido para 'admin123', debes usar la consola de tu navegador
-- o un script de Node.js con el siguiente código:

/*
async function generateHash(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  
  const buf2hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
  console.log(`${buf2hex(salt)}:${buf2hex(hash)}`);
}
generateHash('admin123');
*/

-- COPIA EL RESULTADO DE ARRIBA Y REEMPLAZA EL VALOR EN EL INSERT

-- PASO 2: Asociar el usuario al restaurante
-- Reemplaza 'your_restaurant_id_here' con el ID real de tu restaurante
INSERT INTO restaurant_staff (
  restaurant_id,
  user_id,
  role,
  is_active,
  created_at
) VALUES (
  'your_restaurant_id_here',  -- ⚠️ CAMBIAR ESTO
  (SELECT id FROM users WHERE email = 'admin@visualtaste.com'),
  'owner',
  TRUE,
  CURRENT_TIMESTAMP
);
