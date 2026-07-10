import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();
  if (body.adminPassword !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const eventId = body.eventId;
  
  const { error: updateErr } = await supabase.from('events').update({ status: 'finished' }).eq('id', eventId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  
  const { data: answers } = await supabase.from('event_answers').select('*').eq('event_id', eventId).eq('is_correct', true);
  
  if (answers && answers.length > 0) {
    const categories = ['music', 'movies', 'sports', 'general'];
    for (const cat of categories) {
      const catAnswers = answers.filter(a => a.category === cat).sort((a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime());
      
      if (catAnswers.length > 0) {
        const firstTime = new Date(catAnswers[0].answered_at).getTime();
        const winners = catAnswers.filter(a => Math.abs(new Date(a.answered_at).getTime() - firstTime) < 1000);
        
        const isTie = winners.length > 1;
        const firstPlacePoints = isTie ? 2 : 3;
        
        for (const ans of catAnswers) {
          const isWinner = winners.some(w => w.id === ans.id);
          const pts = isWinner ? firstPlacePoints : 1;
          
          const { data: user } = await supabase.from('users').select('score').eq('id', ans.user_id).single();
          if (user) {
            await supabase.from('users').update({ score: user.score + pts }).eq('id', ans.user_id);
          }
        }
      }
    }
  }
  
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  
  const { data: answers } = await supabase.from('event_answers').select('*, users(nickname, avatar)').eq('event_id', eventId);
  return NextResponse.json({ answers: answers || [] });
}
