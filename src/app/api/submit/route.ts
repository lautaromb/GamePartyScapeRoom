import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: Request) {
  const { userId, code } = await req.json();
  const db = getDb();
  
  if (db.winner) {
    return NextResponse.json({ error: `El juego ya terminó. ¡Ganó ${db.winner}!` }, { status: 400 });
  }

  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return NextResponse.json({ error: 'Usuario no encontrado. Vuelve a iniciar sesión.' }, { status: 404 });

  const upperCode = (code || '').toUpperCase();
  const codeIndex = db.codes.findIndex(c => c.code === upperCode);
  
  if (codeIndex === -1) {
    return NextResponse.json({ error: 'Ese código no existe o está mal escrito...' }, { status: 400 });
  }

  const codeObj = db.codes[codeIndex];
  if (codeObj.foundBy.includes(userId)) {
    return NextResponse.json({ error: '¡Ya usaste este código! Busca otro.' }, { status: 400 });
  }

  // Calculate points
  const isFirst = codeObj.foundBy.length === 0;
  const pointsToAward = isFirst ? codeObj.firstUserPoints : codeObj.subsequentPoints;

  // Update DB
  db.codes[codeIndex].foundBy.push(userId);
  db.users[userIndex].score += pointsToAward;

  let message = isFirst 
    ? `¡Eres la primera persona en encontrar este código! Felicidades, te llevas ${pointsToAward} puntos.` 
    : `¡Código correcto! Ganaste ${pointsToAward} punto(s).`;

  let isWinner = false;
  // Check for winner (Max 30 points)
  if (db.users[userIndex].score >= 30) {
    db.winner = db.users[userIndex].nickname;
    message = `¡HAS GANADO EL JUEGO! Alcanzaste los 30 puntos.`;
    isWinner = true;
  }

  saveDb(db);
  
  return NextResponse.json({ 
      success: true, 
      message, 
      newScore: db.users[userIndex].score,
      isWinner
  });
}
