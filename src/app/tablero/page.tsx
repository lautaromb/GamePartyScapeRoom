'use client';
import { useState, useEffect, useRef } from 'react';
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

  // Event State
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [eventCategory, setEventCategory] = useState<string | null>(null);
  const [eventAnswer, setEventAnswer] = useState('');
  const [eventTimeLeft, setEventTimeLeft] = useState(45);
  const [eventDone, setEventDone] = useState(false);
  const [eventResults, setEventResults] = useState<any>(null);

  // Avoid closure issues
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;
  const eventDoneRef = useRef(eventDone);
  eventDoneRef.current = eventDone;

  const fetchData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        router.push('/');
        return;
      }
      
      const ts = Date.now();
      const resUsers = await fetch(`/api/users?t=${ts}`);
      const dataUsers = await resUsers.json();
      setUsers(dataUsers.users);
      
      setWinner((prevWinner) => {
        if (dataUsers.winner && !prevWinner) {
           confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
        }
        return dataUsers.winner;
      });
      
      const myUser = dataUsers.users.find((u: any) => u.id === userId);
      if (myUser) {
        setMe(myUser);
      } else {
        localStorage.removeItem('userId');
        router.push('/');
        return;
      }

      const resMissions = await fetch(`/api/missions?userId=${userId}&t=${ts}`);
      const dataMissions = await resMissions.json();
      setMissions(dataMissions.missions);

      // Fetch active event
      const resEv = await fetch(`/api/events?t=${ts}`);
      const dataEv = await resEv.json();
      
      if (dataEv.event) {
        if (!activeEventRef.current || activeEventRef.current.id !== dataEv.event.id) {
          setActiveEvent(dataEv.event);
          setEventCategory(null);
          setEventDone(false);
          setEventResults(null);
        }
      } else {
        // If there is no active event, but we were showing results, keep showing them until user closes
        if (!eventDoneRef.current) {
          setActiveEvent(null);
        }
      }

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'codes' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        fetchData();
        // If the payload shows the event changed to finished, explicitly fetch results
        const newRecord = payload.new as any;
        if (newRecord && newRecord.status === 'finished') {
          if (activeEventRef.current && activeEventRef.current.id === newRecord.id) {
             setEventDone(true);
             fetchEventResults(newRecord.id);
          }
        }
      })
      .subscribe();

    const storedLock = localStorage.getItem('lockUntil');
    if (storedLock && parseInt(storedLock) > Date.now()) {
      setLockUntil(parseInt(storedLock));
    }

    return () => { supabase.removeChannel(channel); };
  }, [router]); // Eliminated activeEvent from dependencies so it doesn't reconnect constantly

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

  const manuallyCheckEvent = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const resEv = await fetch(`/api/events?t=${ts}`);
      const dataEv = await resEv.json();
      
      if (dataEv.event) {
        setActiveEvent(dataEv.event);
        setEventCategory(null);
        setEventDone(false);
        setEventResults(null);
      } else {
        alert("Aún no hay ningún evento activo. ¡Esperá el aviso por micrófono!");
      }
    } catch (e) {
      alert("Error de conexión al buscar el evento.");
    }
    setLoading(false);
  };

  // Event Timer
  useEffect(() => {
    if (activeEvent && activeEvent.status === 'active' && !eventDone) {
      const started = new Date(activeEvent.started_at).getTime();
      const interval = setInterval(() => {
        const left = Math.ceil(45 - (Date.now() - started) / 1000);
        if (left <= 0) {
          setEventTimeLeft(0);
          setEventDone(true);
          fetchEventResults(activeEvent.id);
          clearInterval(interval);
        } else {
          setEventTimeLeft(left);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeEvent, eventDone]);

  const fetchEventResults = async (eventId: string) => {
    const res = await fetch(`/api/events/finish?eventId=${eventId}&t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      setEventResults(data.answers);
    }
  };

  const handleEventSubmit = async () => {
    if (!eventAnswer.trim() || !eventCategory) return;
    setLoading(true);
    const res = await fetch('/api/events/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: activeEvent.id, userId: me.id, category: eventCategory, answer: eventAnswer })
    });
    const data = await res.json();
    setEventDone(true);
    setLoading(false);
    
    // Alerta temporal, igual ahora verán los resultados en vivo.
    if (data.isCorrect) {
      alert('¡Respuesta enviada! Es correcta. Espera los resultados.');
    } else if (res.ok) {
      alert('Respuesta enviada. Espera los resultados.');
    } else {
      alert(data.error || 'Error al enviar');
    }
  };

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

  // EVENT OVERLAY UI
  if (activeEvent) {
    return (
      <main className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', background: '#0a0a0a', zIndex: 100, position: 'relative' }}>
        <h1 className="spooky-title" style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite' }}>🚨 EVENTO GLOBAL 🚨</h1>
        
        {!eventDone ? (
          <>
            <div style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 'bold', color: eventTimeLeft <= 10 ? '#ff6b6b' : 'var(--accent-primary)', marginBottom: '1rem' }}>
              00:{eventTimeLeft.toString().padStart(2, '0')}
            </div>

            {!eventCategory ? (
              <div className="glass" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#fff' }}>Elige tu categoría (¡Rápido!)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <button className="btn-slime" style={{ background: '#3b82f6' }} onClick={() => setEventCategory('music')}>🎵 Música</button>
                  <button className="btn-slime" style={{ background: '#eab308', color: '#000' }} onClick={() => setEventCategory('movies')}>🎬 Cine/Series</button>
                  <button className="btn-slime" style={{ background: '#22c55e' }} onClick={() => setEventCategory('sports')}>⚽ Deportes</button>
                  <button className="btn-slime" style={{ background: '#a855f7' }} onClick={() => setEventCategory('general')}>🌎 Conocimiento</button>
                </div>
              </div>
            ) : (
              <div className="glass" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ textTransform: 'uppercase', color: 'var(--accent-secondary)', fontWeight: 'bold', marginBottom: '1rem' }}>Categoría: {eventCategory}</div>
                <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '2rem' }}>
                  {activeEvent.questions && activeEvent.questions[eventCategory]?.q}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const qData = activeEvent.questions?.[eventCategory];
                    if (!qData) return null;
                    const options = [qData.correct, ...qData.wrong];
                    options.sort((a, b) => (a.length - b.length) > 0 ? 1 : -1);
                    const rotated = [...options.slice(1), options[0]];

                    return rotated.map((opt, i) => (
                      <button 
                        key={i} 
                        className="btn-slime" 
                        style={{ fontSize: '1.1rem', padding: '1rem', background: eventAnswer === opt ? 'var(--accent-secondary)' : 'var(--bg-card)', color: '#fff' }}
                        onClick={() => setEventAnswer(opt)}
                      >
                        {opt}
                      </button>
                    ));
                  })()}
                </div>

                <button className="btn-slime btn-dark" style={{ marginTop: 'auto' }} onClick={handleEventSubmit} disabled={loading || !eventAnswer}>
                  {loading ? 'ENVIANDO...' : '¡ENVIAR RESPUESTA!'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="glass" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--accent-primary)', marginBottom: '1rem' }}>¡TIEMPO AGOTADO!</h2>
            
            {!eventResults ? (
               <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Calculando resultados oficiales...</p>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--accent-primary)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Resultados Oficiales</h3>
                
                {['music', 'movies', 'sports', 'general'].map(cat => {
                  const ans = eventResults.filter((a: any) => a.category === cat && a.is_correct);
                  if (ans.length === 0) return null;
                  
                  ans.sort((a:any, b:any) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime());
                  const firstTime = new Date(ans[0].answered_at).getTime();

                  return (
                    <div key={cat} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                      <strong style={{ textTransform: 'uppercase', color: 'var(--accent-secondary)' }}>{cat}</strong>
                      <div style={{ marginTop: '0.5rem' }}>
                        {ans.map((a: any) => {
                          const isWinner = Math.abs(new Date(a.answered_at).getTime() - firstTime) < 1000;
                          return (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                              <span>{isWinner ? '👑' : '✅'} {a.users?.nickname || 'Jugador'}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(a.answered_at).toLocaleTimeString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            <button className="btn-slime" style={{ marginTop: 'auto' }} onClick={() => setActiveEvent(null)}>
              CERRAR Y VOLVER AL TABLERO
            </button>
          </div>
        )}
      </main>
    );
  }

  // NORMAL GAME UI
  return (
    <>
      <main className="container">
        {winner && (
          <div style={{background: 'var(--accent-primary)', color: '#000', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 0 30px var(--accent-primary)', fontFamily: 'Macondo'}}>
            🥁 ¡mis 30 - Lautaro! 🥁<br/><br/><span style={{fontSize:'1.2rem', fontFamily: 'Outfit'}}>{winner} ha escapado de la jungla primero.</span>
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

        <button 
          className="btn-slime" 
          style={{ width: '100%', marginBottom: '1.5rem', background: '#ff6b6b', padding: '1rem', fontSize: '1.2rem', animation: 'pulse 2s infinite' }}
          onClick={manuallyCheckEvent}
          disabled={loading}
        >
          {loading ? 'BUSCANDO...' : '🚨 ENTRAR A TRIVIA EN VIVO 🚨'}
        </button>

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
                  {m.imageUrl && (
                    <img 
                      src={m.imageUrl} 
                      alt="Pista visual" 
                      style={{ width: '100%', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--accent-primary)' }} 
                    />
                  )}
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
