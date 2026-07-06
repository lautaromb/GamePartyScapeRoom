import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

export type User = { id: string; nickname: string; avatar: string; score: number };
export type Code = { 
  id: string; 
  code: string; 
  firstUserPoints: number; 
  subsequentPoints: number; 
  foundBy: string[];
  title?: string;
  hint?: string;
};

export type DbSchema = {
  users: User[];
  codes: Code[];
  winner: string | null;
};

const defaultDb: DbSchema = { users: [], codes: [], winner: null };

export function getDb(): DbSchema {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
  }
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export function saveDb(data: DbSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
