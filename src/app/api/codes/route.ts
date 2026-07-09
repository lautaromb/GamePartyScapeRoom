import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { code, firstUserPoints, subsequentPoints, adminPassword, title, hint } = await req.json();
  if (adminPassword !== 'misterio90') {
    return NextResponse.json({ error: 'Acceso Denegado' }, { status: 401 });
  }
  
  if (!code || isNaN(firstUserPoints) || isNaN(subsequentPoints)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const upperCode = code.toUpperCase();
  
  // Check if code exists
  const { data: existingCodes } = await supabase
    .from('codes')
    .select('*')
    .eq('code', upperCode);
    
  if (existingCodes && existingCodes.length > 0) {
    return NextResponse.json({ error: 'El código ya existe' }, { status: 400 });
  }

  const { error } = await supabase
    .from('codes')
    .insert({
      id: crypto.randomUUID(),
      code: upperCode,
      firstUserPoints: parseInt(firstUserPoints),
      subsequentPoints: parseInt(subsequentPoints),
      foundBy: [],
      title: title || null,
      hint: hint || null
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if(url.searchParams.get('adminPassword') !== 'misterio90') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: codes, error } = await supabase.from('codes').select('*');
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ codes });
}
