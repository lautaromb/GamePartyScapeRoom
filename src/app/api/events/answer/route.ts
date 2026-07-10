import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { eventId, userId, category, answer } = await req.json();
  
  const { data: event, error: eventErr } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (!event || event.status !== 'active') return NextResponse.json({ error: 'Evento no activo' }, { status: 400 });
  
  const startedAt = new Date(event.started_at).getTime();
  const now = Date.now();
  if (now - startedAt > 50000) return NextResponse.json({ error: 'Tiempo agotado' }, { status: 400 });
  
  const { data: existing } = await supabase.from('event_answers').select('*').eq('event_id', eventId).eq('user_id', userId).single();
  if (existing) return NextResponse.json({ error: 'Ya respondiste' }, { status: 400 });
  
  let correctAns = '';
  if (category === 'music') correctAns = event.ans_music;
  else if (category === 'movies') correctAns = event.ans_movies;
  else if (category === 'sports') correctAns = event.ans_sports;
  else if (category === 'general') correctAns = event.ans_general;
  
  const isCorrect = correctAns && correctAns.trim().toLowerCase() === answer.trim().toLowerCase();
  
  const { error: insErr } = await supabase.from('event_answers').insert({
    id: crypto.randomUUID(),
    event_id: eventId,
    user_id: userId,
    category,
    answer,
    is_correct: isCorrect,
    answered_at: new Date().toISOString()
  });
  
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  
  return NextResponse.json({ success: true, isCorrect });
}
