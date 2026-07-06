import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const db = getDb();
  
  const missions = db.codes
    .filter(c => c.hint)
    .map(c => ({
      id: c.id,
      title: c.title || 'Misión Secreta',
      hint: c.hint,
      points: c.firstUserPoints,
      isFoundByMe: userId ? c.foundBy.includes(userId) : false,
      totalFound: c.foundBy.length
    }));
    
  return NextResponse.json({ missions });
}
