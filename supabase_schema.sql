-- Tabla de Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL,
  score INTEGER DEFAULT 0
);

-- Tabla de Códigos/Misiones
CREATE TABLE codes (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "firstUserPoints" INTEGER NOT NULL,
  "subsequentPoints" INTEGER NOT NULL,
  "foundBy" UUID[] DEFAULT '{}',
  title TEXT,
  hint TEXT
);
