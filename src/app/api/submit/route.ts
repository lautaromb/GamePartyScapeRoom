import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: Request) {
  const { userId, code } = await req.json();
  
  // 1. Check if there is a winner already
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('score', { ascending: false });
    
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const user = users.find(u => u.id === userId);
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado. Vuelve a iniciar sesión.' }, { status: 404 });

  const winner = users.find(u => u.score >= 30);
  if (winner) {
    return NextResponse.json({ error: `El juego ya terminó. ¡Ganó ${winner.nickname}!` }, { status: 400 });
  }

  // 2. Buscar código
  const upperCode = (code || '').toUpperCase();
  const { data: codes, error: codesError } = await supabase
    .from('codes')
    .select('*')
    .eq('code', upperCode);

  if (codesError || !codes || codes.length === 0) {
    return NextResponse.json({ error: 'Ese código no existe o está mal escrito...' }, { status: 400 });
  }

  const codeObj = codes[0];

  // 3. Verificar si el usuario ya usó este código
  const foundByArray = codeObj.foundBy || [];
  if (foundByArray.includes(userId)) {
    return NextResponse.json({ error: '¡Ya usaste este código! Busca otro.' }, { status: 400 });
  }

  // 4. Calcular puntos
  const isFirst = foundByArray.length === 0;
  const pointsToAward = isFirst ? codeObj.firstUserPoints : codeObj.subsequentPoints;

  // 5. Actualizar array foundBy en el código
  const newFoundBy = [...foundByArray, userId];
  const { error: updateCodeError } = await supabase
    .from('codes')
    .update({ foundBy: newFoundBy })
    .eq('id', codeObj.id);

  if (updateCodeError) return NextResponse.json({ error: updateCodeError.message }, { status: 500 });

  // 6. Actualizar puntaje y trofeos del usuario
  const newScore = user.score + pointsToAward;
  let stats = user.stats || {};
  let trophies = user.trophies || [];

  if (isFirst) {
    stats.first_finder_count = (stats.first_finder_count || 0) + 1;
    if (stats.first_finder_count >= 3 && !trophies.includes('Sabueso')) {
      trophies.push('Sabueso');
    }
  }

  const { error: updateUserError } = await supabase
    .from('users')
    .update({ score: newScore, stats, trophies })
    .eq('id', userId);

  if (updateUserError) return NextResponse.json({ error: updateUserError.message }, { status: 500 });

  // 7. Preparar mensaje de respuesta
  let message = isFirst 
    ? `¡Eres la primera persona en encontrar este código! Felicidades, te llevas ${pointsToAward} puntos.` 
    : `¡Código correcto! Ganaste ${pointsToAward} punto(s).`;

  let isWinner = false;
  if (newScore >= 30) {
    message = `¡HAS GANADO EL JUEGO! Alcanzaste los 30 puntos.`;
    isWinner = true;
  }

  return NextResponse.json({ 
      success: true, 
      message, 
      newScore,
      isWinner
  });
}
