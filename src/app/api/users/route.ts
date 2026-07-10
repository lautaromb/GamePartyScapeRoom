export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { nickname, avatar } = await req.json();
  
  // Buscar si el usuario ya existe (case insensitive)
  const { data: existingUsers, error: searchError } = await supabase
    .from('users')
    .select('*')
    .ilike('nickname', nickname);

  if (searchError) return NextResponse.json({ error: searchError.message }, { status: 500 });

  if (existingUsers && existingUsers.length > 0) {
    const user = existingUsers[0];
    // Actualizar avatar al iniciar sesión de nuevo
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar })
      .eq('id', user.id)
      .select()
      .single();
      
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json(updatedUser);
  } else {
    // Crear nuevo usuario
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ id: crypto.randomUUID(), nickname, avatar, score: 0 })
      .select()
      .single();
      
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json(newUser);
  }
}

export async function GET() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Determinar ganador (si alguien tiene 30 o más puntos)
  const winner = users.find(u => u.score >= 30)?.nickname || null;

  return NextResponse.json({ users, winner });
}
