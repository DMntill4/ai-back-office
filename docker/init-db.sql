-- Habilitar extensión para UUIDs y criptografía
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear usuarios para desarrollo evitando conflictos de permisos entre colaboradores
DO $$
BEGIN
    -- Usuario para desarrollador 1 / aplicación
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dev_user') THEN
        CREATE ROLE dev_user WITH LOGIN PASSWORD 'dev_password' SUPERUSER CREATEDB;
    END IF;

    -- Usuario para desarrollador 2 (ej. developtwo)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'developtwo') THEN
        CREATE ROLE developtwo WITH LOGIN PASSWORD 'developtwo_password' SUPERUSER CREATEDB;
    END IF;
END
$$;

-- Conceder todos los privilegios sobre la base de datos
GRANT ALL PRIVILEGES ON DATABASE ai_back_office TO dev_user;
GRANT ALL PRIVILEGES ON DATABASE ai_back_office TO developtwo;

-- Conceder todos los privilegios sobre el esquema público
GRANT ALL ON SCHEMA public TO dev_user;
GRANT ALL ON SCHEMA public TO developtwo;
