import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  
  const { data: codes, error } = await supabase
    .from('codes')
    .select('*')
    .not('hint', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const missions = codes.map(c => ({
    id: c.id,
    title: c.title || 'Misión Secreta',
    hint: c.hint,
    imageUrl: c.image_url,
    points: c.firstUserPoints,
    isFoundByMe: userId && c.foundBy ? c.foundBy.includes(userId) : false,
    totalFound: c.foundBy ? c.foundBy.length : 0
  }));
    
  return NextResponse.json({ missions });
}
