import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const password = url.searchParams.get('password');
  
  if (password !== 'misterio90') {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  try {
    // 1. Delete all answers
    await supabase.from('event_answers').delete().neq('id', 'dummy');
    
    // 2. Reset events to inactive (keep the questions)
    await supabase.from('events').update({ status: 'inactive' }).neq('id', 'dummy');
    
    // 3. Delete all users
    await supabase.from('users').delete().neq('id', 'dummy');
    
    // 4. Reset found arrays in codes and missions
    await supabase.from('codes').update({ foundByArray: [] }).neq('id', 'dummy');
    await supabase.from('missions').update({ foundByArray: [] }).neq('id', 'dummy');

    return NextResponse.json({ 
      success: true, 
      message: '¡SISTEMA RESETEADO CON ÉXITO! Todos los jugadores y el progreso han sido borrados. Carga de nuevo tu panel de administrador para subir los eventos de hoy.' 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
