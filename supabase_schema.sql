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
  q_movies TEXT, ans_movies TEXT,
  q_sports TEXT, ans_sports TEXT,
  q_general TEXT, ans_general TEXT
);

-- Tabla de Respuestas a Eventos
CREATE TABLE event_answers (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  category TEXT,
  answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
