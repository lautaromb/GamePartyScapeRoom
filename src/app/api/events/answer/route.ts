import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { eventId, userId, category, answer } = await req.json();
  
  // 1. Fetch Event
  const { data: event, error: eventErr } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (eventErr || !event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
  if (event.status !== 'active') return NextResponse.json({ error: 'Evento cerrado' }, { status: 400 });

  // 1.5. Comprobar si el usuario está congelado
  const { data: user } = await supabase.from('users').select('stats').eq('id', userId).single();
  if (user?.stats?.locked_until && Date.now() < user.stats.locked_until) {
    return NextResponse.json({ error: 'Estás congelado. No puedes participar en esta trivia.' }, { status: 429 });
  }

  // 2. Comprobar si ya respondió
  const { data: existing } = await supabase.from('event_answers').select('*').eq('event_id', eventId).eq('user_id', userId).single();
  if (existing) return NextResponse.json({ error: 'Ya respondiste este evento' }, { status: 400 });

  // 3. Validar respuesta correcta desde JSON
  const catData = event.questions[category];
  if (!catData) return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });

  const isCorrect = answer === catData.correct;

  // 4. Guardar respuesta
  const { error: insErr } = await supabase.from('event_answers').insert({
    id: crypto.randomUUID(),
    event_id: eventId,
    user_id: userId,
    category,
    answer,
    is_correct: isCorrect
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ success: true, isCorrect });
}
