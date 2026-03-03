-- Migration: Criar tabelas do sistema de gestao de ativos
-- Executar no PostgreSQL do EasyPanel

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(50) NOT NULL,
  role VARCHAR(100),
  phone VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  model VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  imei_1 VARCHAR(20),
  imei_2 VARCHAR(20),
  serial_number VARCHAR(100),
  patrimony VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim_cards (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  iccid VARCHAR(30),
  operator VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credentials (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  recovery_email VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL,
  return_date DATE,
  accessories JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  delivery_notes TEXT,
  return_notes TEXT,
  return_condition VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indices para performance de busca
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_imei1 ON assets(imei_1);
CREATE INDEX IF NOT EXISTS idx_assets_imei2 ON assets(imei_2);
CREATE INDEX IF NOT EXISTS idx_sim_cards_phone ON sim_cards(phone_number);
CREATE INDEX IF NOT EXISTS idx_sim_cards_iccid ON sim_cards(iccid);
CREATE INDEX IF NOT EXISTS idx_sim_cards_status ON sim_cards(status);
CREATE INDEX IF NOT EXISTS idx_credentials_email ON credentials(email);
CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_user ON allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_asset ON allocations(asset_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON allocations(status);
