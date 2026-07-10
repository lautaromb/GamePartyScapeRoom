import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();
  if (body.adminPassword !== 'misterio90') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const eventId = body.eventId;
  
  const { error: updateErr } = await supabase.from('events').update({ status: 'finished' }).eq('id', eventId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  
  const { data: allAnswers } = await supabase.from('event_answers').select('*').eq('event_id', eventId);
  
  if (allAnswers && allAnswers.length > 0) {
    const categories = ['music', 'movies', 'sports', 'general'];
    for (const cat of categories) {
      const catAnswers = allAnswers.filter(a => a.category === cat).sort((a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime());
      const correctAnswers = catAnswers.filter(a => a.is_correct);
      
      if (correctAnswers.length > 0) {
        const firstTime = new Date(correctAnswers[0].answered_at).getTime();
        const winners = correctAnswers.filter(a => Math.abs(new Date(a.answered_at).getTime() - firstTime) < 1000);
        
        const isTie = winners.length > 1;
        const firstPlacePoints = isTie ? 2 : 3;
        
        for (let i = 0; i < correctAnswers.length; i++) {
          const ans = correctAnswers[i];
          const isWinner = winners.some(w => w.id === ans.id);
          const pts = isWinner ? firstPlacePoints : 1;
          
          const isSecond = i === 1; // Exactly 2nd place in speed

          const { data: user } = await supabase.from('users').select('score, stats, trophies').eq('id', ans.user_id).single();
          if (user) {
            let stats = user.stats || {};
            let trophies = user.trophies || [];

            stats.correct_streak = (stats.correct_streak || 0) + 1;
            if (stats.correct_streak >= 5 && !trophies.includes('Cerebrito')) trophies.push('Cerebrito');

            if (cat === 'sports') {
              stats.sports_correct_count = (stats.sports_correct_count || 0) + 1;
              if (stats.sports_correct_count >= 3 && !trophies.includes('Pepe Argento')) trophies.push('Pepe Argento');
            }

            if (isWinner) {
              stats.first_place_streak = (stats.first_place_streak || 0) + 1;
              stats.second_place_streak = 0;
              if (stats.first_place_streak >= 3 && !trophies.includes('Pistolero')) trophies.push('Pistolero');
            } else if (isSecond) {
              stats.second_place_streak = (stats.second_place_streak || 0) + 1;
              stats.first_place_streak = 0;
              if (stats.second_place_streak >= 3 && !trophies.includes('Francia')) trophies.push('Francia');
            } else {
              stats.first_place_streak = 0;
              stats.second_place_streak = 0;
            }

            if (user.score + pts >= 30 && user.score < 30) {
              stats.win_time = Date.now();
              const { data: currentUsers } = await supabase.from('users').select('score');
              const alreadyFinished = currentUsers?.filter(u => u.score >= 30).length || 0;
              if (alreadyFinished === 0 && !trophies.includes('Oro')) trophies.push('Oro');
              else if (alreadyFinished === 1 && !trophies.includes('Plata')) trophies.push('Plata');
              else if (alreadyFinished === 2 && !trophies.includes('Bronce')) trophies.push('Bronce');
            }

            await supabase.from('users').update({ score: user.score + pts, stats, trophies }).eq('id', ans.user_id);
          }
        }
      }

      // Reset streaks for incorrect answers
      const incorrectAnswers = catAnswers.filter(a => !a.is_correct);
      for (const ans of incorrectAnswers) {
        const { data: user } = await supabase.from('users').select('stats, trophies').eq('id', ans.user_id).single();
        if (user) {
          let stats = user.stats || {};
          stats.correct_streak = 0;
          stats.first_place_streak = 0;
          stats.second_place_streak = 0;
          await supabase.from('users').update({ stats }).eq('id', ans.user_id);
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
