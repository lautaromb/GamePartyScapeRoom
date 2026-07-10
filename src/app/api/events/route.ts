import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: Request) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .single();
    
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ event: data || null });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.adminPassword !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { error } = await supabase.from('events').insert({
    id: crypto.randomUUID(),
    q_music: body.q_music, ans_music: body.ans_music,
    q_movies: body.q_movies, ans_movies: body.ans_movies,
    q_sports: body.q_sports, ans_sports: body.ans_sports,
    q_general: body.q_general, ans_general: body.ans_general,
    status: 'idle'
  });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (body.adminPassword !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const updateData: any = { status: body.status };
  if (body.status === 'active') {
    updateData.started_at = new Date().toISOString();
  }
  
  const { error } = await supabase.from('events').update(updateData).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
