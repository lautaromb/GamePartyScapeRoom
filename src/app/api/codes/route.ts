import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { code, firstUserPoints, subsequentPoints, adminPassword, title, hint } = await req.json();
  if (adminPassword !== 'misterio90') {
    return NextResponse.json({ error: 'Acceso Denegado' }, { status: 401 });
  }
  
  if (!code || isNaN(firstUserPoints) || isNaN(subsequentPoints)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const db = getDb();
  
  if (db.codes.find(c => c.code === code.toUpperCase())) {
     return NextResponse.json({ error: 'El código ya existe' }, { status: 400 });
  }

  db.codes.push({
    id: crypto.randomUUID(),
    code: code.toUpperCase(),
    firstUserPoints: parseInt(firstUserPoints),
    subsequentPoints: parseInt(subsequentPoints),
    foundBy: [],
    title: title || undefined,
    hint: hint || undefined
  });
  saveDb(db);
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    if(url.searchParams.get('adminPassword') !== 'misterio90') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ codes: getDb().codes });
}
