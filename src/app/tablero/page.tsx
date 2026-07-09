'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scroll, ScanLine, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/db';
import confetti from 'canvas-confetti';

export default function Tablero() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('misiones'); 
  const [users, setUsers] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      const resUsers = await fetch('/api/users');
      const dataUsers = await resUsers.json();
      setUsers(dataUsers.users);
      
      setWinner((prevWinner) => {
        if (dataUsers.winner && !prevWinner) {
           confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
        }
        return dataUsers.winner;
      });
      
      const myUser = dataUsers.users.find((u: any) => u.id === userId);
      if (myUser) setMe(myUser);

      const resMissions = await fetch(`/api/missions?userId=${userId}`);
      const dataMissions = await resMissions.json();
      setMissions(dataMissions.missions);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      router.push('/');
      return;
    }
    fetchData();

    const channel = supabase.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'codes' }, () => {
        fetchData();
      })
      .subscribe();

    const storedLock = localStorage.getItem('lockUntil');
    if (storedLock && parseInt(storedLock) > Date.now()) {
      setLockUntil(parseInt(storedLock));
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (lockUntil && lockUntil > Date.now()) {
      const interval = setInterval(() => {
        const left = Math.ceil((lockUntil - Date.now()) / 1000);
        if (left <= 0) {
          setLockUntil(null);
          setLockSecondsLeft(0);
          clearInterval(interval);
        } else {
          setLockSecondsLeft(left);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setLockUntil(null);
    }
  }, [lockUntil]);

  const handleSubmit = async (submitCode: string) => {
    if (!submitCode.trim()) return;
    if (lockUntil && lockUntil > Date.now()) {
      setMsg({ text: 'Estás congelado. Espera a que pase el tiempo.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });
    
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me?.id, code: submitCode })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMsg({ text: data.message, type: 'success' });
        setCode('');
        localStorage.setItem('fails', '0');
        fetchData();
        if (data.isWinner) {
           confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, zIndex: 9999 });
        }
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        let fails = parseInt(localStorage.getItem('fails') || '0') + 1;
        if (fails >= 3) {
          const newLock = Date.now() + 30000;
          localStorage.setItem('lockUntil', newLock.toString());
          localStorage.setItem('fails', '0');
          setLockUntil(newLock);
          setLockSecondsLeft(30);
          setMsg({ text: '¡Demasiados errores! Has sido congelado por 30 segundos.', type: 'error' });
        } else {
          localStorage.setItem('fails', fails.toString());
          setMsg({ text: data.error, type: 'error' });
        }
      }
    } catch (e) {
      setMsg({ text: 'Error de conexión', type: 'error' });
    }
    setLoading(false);
  };

  if (!me) return <div style={{padding: '2rem', textAlign: 'center', color: 'var(--accent-primary)'}}>Adentrándose en la jungla...</div>;

  const isLocked = lockUntil !== null && lockSecondsLeft > 0;

  return (
    <>
      <main className="container">
        {winner && (
          <div style={{background: 'var(--accent-primary)', color: '#000', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 0 30px var(--accent-primary)', fontFamily: 'Macondo'}}>
            🥁 ¡JUMANJI! 🥁<br/><br/><span style={{fontSize:'1.2rem', fontFamily: 'Outfit'}}>{winner} ha escapado de la jungla primero.</span>
          </div>
        )}

        {isLocked && (
          <div style={{background: 'rgba(255, 0, 0, 0.2)', border: '2px solid red', color: '#ff6b6b', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem', fontWeight: 'bold', fontSize: '1.2rem', animation: 'shake 0.5s'}}>
            ❄️ ¡CONGELADO! ❄️<br/>
            <span style={{fontSize: '1rem'}}>Demasiados intentos fallidos. Espera {lockSecondsLeft} segundos.</span>
          </div>
        )}

        <div className="glass" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{me.avatar} {me.nickname}</div>
          <div style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', fontFamily: 'Macondo, cursive' }}>
            {me.score} / 30
          </div>
        </div>

        {activeTab === 'misiones' && (
          <div>
            <h2 className="spooky-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Acertijos</h2>
            
            {msg.text && activeTab === 'misiones' && (
              <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', background: msg.type === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(255,179,0,0.2)', color: msg.type === 'error' ? '#ff6b6b' : 'var(--accent-primary)', border: `1px solid ${msg.type === 'error' ? '#ff6b6b' : 'var(--accent-primary)'}` }}>
                {msg.text}
              </div>
            )}

            {missions.length === 0 ? (
              <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>La jungla está en paz por ahora...</p>
            ) : (
              missions.map(m => (
                <div key={m.id} className={`mission-card ${m.isFoundByMe ? 'completed' : ''} ${isShaking && !m.isFoundByMe ? 'shake' : ''}`} onClick={() => {
                  if(!m.isFoundByMe && !isLocked) {
                    const ans = prompt(`Misión: ${m.title}\n\nAcertijo: ${m.hint}\n\nIngresa tu respuesta (el objeto o código):`);
                    if(ans) handleSubmit(ans);
                  }
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <strong style={{color: m.isFoundByMe ? 'var(--accent-primary)' : '#fff', fontSize: '1.2rem'}}>{m.title}</strong>
                    {m.isFoundByMe ? <CheckCircle2 color="var(--accent-primary)"/> : <AlertCircle color="var(--accent-secondary)"/>}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '10px' }}>"{m.hint}"</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    <span style={{color: 'var(--accent-primary)'}}>{m.isFoundByMe ? '¡Completada!' : `Recompensa: ${m.points} puntos`}</span>
                    <span style={{color: 'var(--text-muted)'}}>Descubierta por: {m.totalFound}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'escaner' && (
          <div>
            <h2 className="spooky-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Exploración</h2>
            <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
              <ScanLine size={48} color="var(--accent-primary)" style={{margin: '0 auto 1rem auto', filter: 'drop-shadow(0 0 10px var(--accent-glow))'}} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                ¿Encontraste una runa antigua o un código en la jungla? ¡Ingrésalo aquí!
              </p>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: BANANA"
                className={`input-spooky ${isShaking ? 'shake' : ''}`}
                disabled={isLocked}
              />
              <button className="btn-slime" onClick={() => handleSubmit(code)} disabled={loading || isLocked}>
                {loading ? 'Verificando...' : (isLocked ? 'CONGELADO' : 'VALIDAR CÓDIGO')}
              </button>

              {msg.text && (
                <div style={{ 
                  marginTop: '1.5rem', padding: '1rem', borderRadius: '8px',
                  background: msg.type === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(255,179,0,0.2)',
                  color: msg.type === 'error' ? '#ff6b6b' : 'var(--accent-primary)',
                  border: `1px solid ${msg.type === 'error' ? '#ff6b6b' : 'var(--accent-primary)'}`
                }}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div>
             <h2 className="spooky-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Posiciones</h2>
             <div className="glass" style={{ padding: '1rem' }}>
              {users.map((u, index) => (
                <div key={u.id} className={`leaderboard-item ${index === 0 && u.score > 0 ? 'first-place' : ''}`}>
                  <div className="leaderboard-rank">#{index + 1}</div>
                  <div style={{ fontSize: '1.5rem', margin: '0 10px' }}>{u.avatar}</div>
                  <div style={{ flex: 1, fontSize: '1.1rem', fontWeight: u.id === me?.id ? 'bold' : 'normal', color: u.id === me?.id ? 'var(--accent-primary)' : 'inherit' }}>
                    {u.nickname} {u.id === me?.id ? '(Tú)' : ''}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    {u.score} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'misiones' ? 'active' : ''}`} onClick={() => { setActiveTab('misiones'); setMsg({text:'', type:''}); }}>
          <Scroll size={24} />
          <span>MISIONES</span>
        </div>
        <div className={`nav-item ${activeTab === 'escaner' ? 'active' : ''}`} onClick={() => { setActiveTab('escaner'); setMsg({text:'', type:''}); }}>
          <ScanLine size={24} />
          <span>EXPLORAR</span>
        </div>
        <div className={`nav-item ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => { setActiveTab('ranking'); setMsg({text:'', type:''}); }}>
          <Trophy size={24} />
          <span>RANKING</span>
        </div>
      </nav>
    </>
  );
}
