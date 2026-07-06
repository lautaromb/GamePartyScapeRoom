import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { nickname, avatar } = await req.json();
  const db = getDb();
  
  let user = db.users.find(u => u.nickname.toLowerCase() === nickname.toLowerCase());
  if (!user) {
    user = { id: crypto.randomUUID(), nickname, avatar, score: 0 };
    db.users.push(user);
    saveDb(db);
  } else {
    // Update avatar if logging in again
    user.avatar = avatar;
    saveDb(db);
  }
  return NextResponse.json(user);
}

export async function GET() {
  const db = getDb();
  const sortedUsers = [...db.users].sort((a, b) => b.score - a.score);
  return NextResponse.json({ users: sortedUsers, winner: db.winner });
}
