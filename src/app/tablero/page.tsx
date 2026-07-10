'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Scroll, ScanLine, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/db';
import confetti from 'canvas-confetti';

const TROPHIES_DATA: Record<string, {emoji: string, desc: string}> = {
  'Oro': {emoji: '🏆', desc: '¡Primer puesto general!'},
  'Plata': {emoji: '🥈', desc: '¡Segundo puesto general!'},
  'Bronce': {emoji: '🥉', desc: '¡Tercer puesto general!'},
  'Cerebrito': {emoji: '🧠', desc: '5 preguntas correctas al hilo'},
  'Sabueso': {emoji: '🐕', desc: 'Encontraste 3 pistas antes que todos'},
  'Francia': {emoji: '🇫🇷', desc: 'Segundo lugar en rapidez 3 veces seguidas'},
  'Pepe Argento': {emoji: '⚽', desc: 'Respondiste bien 3 preguntas sobre deportes'},
  'Pistolero': {emoji: '🔫', desc: 'Respondiste primero 3 veces seguidas'}
};

export default function Tablero() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('misiones'); 
  const [users, setUsers] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [winners, setWinners] = useState<string[]>([]);
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
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [eventTimeLeft, setEventTimeLeft] = useState(45);
  const [eventDone, setEventDone] = useState(false);
  const [eventResults, setEventResults] = useState<any>(null);

  // Floating Toast UI
  const [toast, setToast] = useState<{text: string, type: 'success'|'error'|'info'} | null>(null);
  const showToast = (text: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), type === 'info' ? 8000 : 4000);
  };

  // 8-bit Sound Effects
  const playSfx = (type: 'win' | 'blip' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'blip') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
      }
    } catch(e) {}
  };

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
      
      setWinners((prevWinners) => {
        if (dataUsers.winners && dataUsers.winners.length > 0 && prevWinners.length !== dataUsers.winners.length) {
           confetti({ particleCount: 250, spread: 100, origin: { y: 0.5 }, zIndex: 9999 });
           playSfx('win');
        }
        return dataUsers.winners || [];
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
          setHasSubmitted(false);
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

  // Prevent DDOS from 30 clients fetching at the exact same millisecond
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetchData = () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    const jitter = Math.floor(Math.random() * 1500); // 0 to 1.5s delay
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 500 + jitter);
  };

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      router.push('/');
      return;
    }
    fetchData();

    const channel = supabase.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => debouncedFetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'codes' }, () => debouncedFetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        const newRecord = payload.new as any;
        if (!newRecord) return;
        
        // Instant UI update for events to avoid relying on slow polling
        if (newRecord.status === 'active' || newRecord.status === 'waiting') {
           setActiveEvent(newRecord);
           setEventCategory(null);
           setHasSubmitted(false);
           setEventDone(false);
           setEventResults(null);
        } else if (newRecord.status === 'finished') {
           if (activeEventRef.current && activeEventRef.current.id === newRecord.id) {
              setEventDone(true);
              fetchEventResults(newRecord.id);
           }
        }
        debouncedFetchData();
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
        showToast("Aún no hay ningún evento activo. ¡Esperá el aviso por micrófono!", 'error');
      }
    } catch (e) {
      showToast("Error de conexión al buscar el evento.", 'error');
    }
    setLoading(false);
  };

  // Event Timer y Auto-Refresh
  useEffect(() => {
    if (activeEvent && !eventDone) {
      const started = new Date(activeEvent.started_at).getTime();
      const isWaiting = activeEvent.status === 'waiting';
      const duration = isWaiting ? 20 : 45;

      const interval = setInterval(async () => {
        // 1. Check local timer every second
        const left = Math.ceil(duration - (Date.now() - started) / 1000);
        if (left <= 0) {
          setEventTimeLeft(0);
          if (!isWaiting) {
            setEventDone(true);
            fetchEventResults(activeEvent.id);
            fetchData(); // Actualizar ranking
            clearInterval(interval);
          }
        } else {
          setEventTimeLeft(left);
        }
        
        // 2. Failsafe Poll
        const shouldPoll = (isWaiting && left <= 0 && Math.abs(left) % 2 === 0) || (left > 0 && left % 5 === 0);
        if (shouldPoll) {
          try {
            const res = await fetch(`/api/events?t=${Date.now()}`);
            const data = await res.json();
            if (data.event) {
              if (isWaiting && data.event.status === 'active') {
                setActiveEvent(data.event);
                clearInterval(interval);
              }
            } else {
              setEventTimeLeft(0);
              if (!isWaiting) {
                setEventDone(true);
                fetchEventResults(activeEvent.id);
                fetchData();
              } else {
                setActiveEvent(null);
              }
              clearInterval(interval);
            }
          } catch (e) {}
        }
      }, 1000); // 1 segundo para el reloj local
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
    setHasSubmitted(true);
    setLoading(false);
    
    // Alerta personalizada en vez de nativa
    if (data.isCorrect) {
      showToast('¡Respuesta enviada!', 'success');
      playSfx('blip');
    } else if (res.ok) {
      showToast('¡Respuesta enviada!', 'info');
      playSfx('blip');
    } else {
      showToast(data.error || 'Error al enviar', 'error');
      playSfx('error');
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
        playSfx('blip');
        localStorage.setItem('fails', '0');
        fetchData();
        if (data.isWinner) {
           confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, zIndex: 9999 });
           playSfx('win');
        }
      } else if (res.status === 429) {
        setIsShaking(true);
        playSfx('error');
        setTimeout(() => setIsShaking(false), 500);
        const newLock = Date.now() + 60000;
        localStorage.setItem('lockUntil', newLock.toString());
        setLockUntil(newLock);
        setLockSecondsLeft(60);
        setMsg({ text: data.error, type: 'error' });
        fetchData(); // Actualizar puntaje (-1)
      } else {
        setIsShaking(true);
        playSfx('error');
        setTimeout(() => setIsShaking(false), 500);
        setMsg({ text: data.error, type: 'error' });
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
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(255,50,50,0.9)' : toast.type === 'success' ? 'rgba(50,255,50,0.9)' : 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
          animation: 'pulse 1s',
          fontWeight: 'bold',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${toast.type === 'error' ? '#ff6b6b' : toast.type === 'success' ? '#22c55e' : 'var(--accent-primary)'}`
        }}>
          {toast.text}
        </div>
      )}

      {/* EVENT OVERLAY UI */}
      {activeEvent ? (
        <main className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', background: '#0a0a0a', zIndex: 100, position: 'relative' }}>
          <h1 className="spooky-title" style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite' }}>🚨 EVENTO GLOBAL 🚨</h1>
        
        {!eventDone ? (
          <>
            <div style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 'bold', color: eventTimeLeft <= 10 ? '#ff6b6b' : 'var(--accent-primary)', marginBottom: '1rem' }}>
              00:{eventTimeLeft.toString().padStart(2, '0')}
            </div>

            {activeEvent.status === 'waiting' ? (
              <div className="glass" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h3 style={{color: 'var(--accent-secondary)', marginBottom: '1rem', fontSize: '1.8rem', textAlign: 'center'}}>⏳ Sala de Espera</h3>
                <p style={{color: '#fff', fontSize: '1.1rem', textAlign: 'center'}}>Esperando a que los demás se unan... ¡La trivia está por comenzar!</p>
              </div>
            ) : !eventCategory ? (
              <div className="glass" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#fff' }}>Elige tu categoría (¡Rápido!)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <button className="btn-slime" style={{ background: '#3b82f6' }} onClick={() => setEventCategory('music')}>🎵 Música</button>
                  <button className="btn-slime" style={{ background: '#eab308', color: '#000' }} onClick={() => setEventCategory('movies')}>🎬 Cine/Series</button>
                  <button className="btn-slime" style={{ background: '#22c55e' }} onClick={() => setEventCategory('sports')}>⚽ Deportes</button>
                  <button className="btn-slime" style={{ background: '#a855f7' }} onClick={() => setEventCategory('general')}>🌎 Conocimiento</button>
                </div>
              </div>
            ) : isLocked ? (
              <div className="glass" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,0,0,0.2)', border: '2px solid red' }}>
                <h3 style={{color: '#ff6b6b', marginBottom: '1rem', fontSize: '1.5rem'}}>¡ESTÁS CONGELADO!</h3>
                <p style={{color: '#fff', fontSize: '1.1rem', textAlign: 'center'}}>No puedes participar en esta trivia. Espera {lockSecondsLeft} segundos.</p>
              </div>
            ) : hasSubmitted ? (
              <div className="glass" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h3 style={{color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '1.5rem'}}>¡Respuesta enviada!</h3>
                <p style={{color: '#fff', fontSize: '1.1rem', textAlign: 'center'}}>Esperando a que termine el tiempo y voten los demás...</p>
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
                <h3 style={{ borderBottom: '1px solid var(--accent-primary)', paddingBottom: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>📊 Estadísticas de la Ronda</h3>
                
                {['music', 'movies', 'sports', 'general'].map(cat => {
                  const catAnswers = eventResults.filter((a: any) => a.category === cat);
                  if (catAnswers.length === 0) return null;
                  
                  const correctAnswers = catAnswers.filter((a: any) => a.is_correct).sort((a:any, b:any) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime());
                  const firstTime = correctAnswers.length > 0 ? new Date(correctAnswers[0].answered_at).getTime() : 0;
                  
                  // Contar votos por respuesta
                  const votes: Record<string, number> = {};
                  let maxVotes = 0;
                  catAnswers.forEach((a: any) => {
                    votes[a.answer] = (votes[a.answer] || 0) + 1;
                    if (votes[a.answer] > maxVotes) maxVotes = votes[a.answer];
                  });

                  const catIcons: any = { music: '🎵 Música', movies: '🎬 Cine', sports: '⚽ Deportes', general: '🌎 Cultura' };

                  return (
                    <div key={cat} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <strong style={{ display: 'block', textTransform: 'uppercase', color: 'var(--accent-secondary)', fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center' }}>
                        {catIcons[cat]}
                      </strong>
                      
                      {/* BAR CHART */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        {Object.entries(votes).sort((a,b) => b[1] - a[1]).map(([ansText, count], idx) => {
                          const percentage = Math.round((count / catAnswers.length) * 100);
                          const isCorrect = correctAnswers.some((c:any) => c.answer === ansText);
                          
                          return (
                            <div key={idx} style={{ marginBottom: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                                <span>{ansText} {isCorrect ? '✅' : '❌'}</span>
                                <span>{percentage}% ({count})</span>
                              </div>
                              <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${percentage}%`, 
                                  height: '100%', 
                                  background: isCorrect ? 'var(--accent-primary)' : '#ff6b6b',
                                  transition: 'width 1s ease-out' 
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* WINNERS */}
                      {correctAnswers.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Acertaron:</div>
                          {correctAnswers.map((a: any) => {
                            const isWinner = Math.abs(new Date(a.answered_at).getTime() - firstTime) < 1000;
                            return (
                              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: isWinner ? 'var(--accent-secondary)' : '#fff', fontWeight: isWinner ? 'bold' : 'normal' }}>
                                  {isWinner ? '👑' : '👏'} {a.users?.nickname || 'Jugador'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(a.answered_at).toLocaleTimeString()}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            
            <button className="btn-slime" style={{ marginTop: 'auto' }} onClick={() => { setActiveEvent(null); fetchData(); }}>
              CERRAR Y VOLVER AL TABLERO
            </button>
          </div>
        )}
        </main>
      ) : (
        // NORMAL GAME UI
        <>
          <main className="container">
            {winners.length > 0 && (
              <div className="podium-overlay">
                <img src="/cake_30.jpg" alt="Cake 30" className="podium-cake" />
                <div className="podium-title">¡EL PODIO ESTÁ FORMADO!</div>
                <div className="podium-list">
                  {winners[0] && <div>🥇 {winners[0]}</div>}
                  {winners[1] && <div>🥈 {winners[1]}</div>}
                  {winners[2] && <div>🥉 {winners[2]}</div>}
                </div>
              </div>
            )}
            {winners.length === 0 && me?.score >= 30 && (
              <div style={{background: 'rgba(255, 179, 0, 0.2)', color: 'var(--accent-primary)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem', border: '2px solid var(--accent-primary)', fontWeight: 'bold', fontSize: '1.2rem', animation: 'pulse 2s infinite', boxShadow: '0 0 20px rgba(255,179,0,0.4)'}}>
                <span style={{fontSize: '2rem'}}>🏁</span><br/>
                ¡CRUZASTE LA META!<br/>
                <span style={{fontSize: '1rem', color: '#fff', fontWeight: 'normal'}}>Ya estás en el podio. Esperando a que lleguen los demás competidores para revelar los puestos...</span>
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
             
             {users.length > 0 && (
               <div style={{ position: 'relative', background: 'linear-gradient(90deg, #1a1a1a 0%, #333 100%)', height: '60px', borderRadius: '30px', marginBottom: '2rem', border: '3px solid #ff00ff', overflow: 'hidden', boxShadow: '0 0 15px rgba(255,0,255,0.5), inset 0 0 20px rgba(0,0,0,1)' }}>
                 {/* Dashed line */}
                 <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', borderTop: '2px dashed rgba(255,255,255,0.2)', transform: 'translateY(-50%)' }}></div>
                 <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '1.8rem', opacity: 0.8, filter: 'drop-shadow(0 0 5px #fff)' }}>🏁</div>
                 {users.slice(0, 3).map((u, i) => {
                   const percentage = Math.min(100, Math.max(0, (u.score / 30) * 100));
                   return (
                     <div key={u.id} style={{ position: 'absolute', left: `calc(${percentage}% - 25px)`, top: '10px', fontSize: '1.8rem', transition: 'left 1s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 3 - i, filter: `drop-shadow(0 0 8px ${i===0?'gold':i===1?'silver':'#cd7f32'})` }} title={`${u.nickname} - ${u.score}pts`}>
                       {u.avatar}
                     </div>
                   );
                 })}
               </div>
             )}

             <div className="glass" style={{ padding: '1rem' }}>
              {users.map((u, index) => (
                <div key={u.id} className={`leaderboard-item ${index === 0 && u.score > 0 ? 'first-place' : ''}`}>
                  <div className="leaderboard-rank">#{index + 1}</div>
                  <div style={{ fontSize: '1.5rem', margin: '0 10px' }}>{u.avatar}</div>
                  <div style={{ flex: 1, fontSize: '1.1rem', fontWeight: u.id === me?.id ? 'bold' : 'normal', color: u.id === me?.id ? 'var(--accent-primary)' : 'inherit' }}>
                    {u.nickname} {u.id === me?.id ? '(Tú)' : ''}
                    {(u.trophies && u.trophies.length > 0) && (
                      <div style={{display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap'}}>
                        {u.trophies.map((t: string) => (
                          <div 
                            key={t} 
                            onClick={() => showToast(`${t}: ${TROPHIES_DATA[t]?.desc}`, 'info')} 
                            style={{cursor: 'pointer', background: 'linear-gradient(45deg, #ffd700, #ffb300)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', boxShadow: '0 2px 5px rgba(0,0,0,0.5)'}}
                            title={TROPHIES_DATA[t]?.desc}
                          >
                            {TROPHIES_DATA[t]?.emoji}
                          </div>
                        ))}
                      </div>
                    )}
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
      )}
    </>
  );
}
