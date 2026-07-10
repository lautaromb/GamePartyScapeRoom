import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('adminPassword') !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { data, error } = await supabase.from('events').select('*').order('started_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ events: data });
}
