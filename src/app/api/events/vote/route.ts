import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { eventId, voterId, votedUserId } = await req.json();

  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (!event || event.status !== 'active') return NextResponse.json({ error: 'Votación cerrada' }, { status: 400 });

  const { data: existing } = await supabase.from('event_answers').select('*').eq('event_id', eventId).eq('user_id', voterId).single();
  if (existing) return NextResponse.json({ error: 'Ya votaste en esta ronda' }, { status: 400 });

  const { error: insErr } = await supabase.from('event_answers').insert({
    id: crypto.randomUUID(),
    event_id: eventId,
    user_id: voterId,
    category: 'voting',
    answer: votedUserId,
    is_correct: true
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { data: user } = await supabase.from('users').select('score').eq('id', votedUserId).single();
  if (user) {
    await supabase.from('users').update({ score: user.score + 1 }).eq('id', votedUserId);
  }

  return NextResponse.json({ success: true });
}
