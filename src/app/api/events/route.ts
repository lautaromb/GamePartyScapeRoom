import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('status', ['active', 'waiting'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ event: data || null });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.adminPassword !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { error } = await supabase.from('events').insert({
    id: crypto.randomUUID(),
    questions: body.questions,
    status: 'idle'
  });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (body.adminPassword !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const updateData: any = { status: body.status };
  if (body.status === 'active' || body.status === 'waiting') {
    updateData.started_at = new Date().toISOString();
  }
  
  const { error } = await supabase.from('events').update(updateData).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
