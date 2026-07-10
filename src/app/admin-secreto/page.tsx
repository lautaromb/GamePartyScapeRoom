'use client';
import { useState, useEffect } from 'react';
import { premadeEvents } from '@/data/premadeEvents';

export default function AdminSecreto() {
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('codes'); 
  
  // Codes State
  const [code, setCode] = useState('');
  const [firstPoints, setFirstPoints] = useState('3');
  const [subPoints, setSubPoints] = useState('1');
  const [title, setTitle] = useState('');
  const [hint, setHint] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isMission, setIsMission] = useState(false);
  const [codesList, setCodesList] = useState<any[]>([]);

  // Events State
  const [eventsList, setEventsList] = useState<any[]>([]);
  
  const defaultEvState = {
    music: { q: '', correct: '', wrong: ['', '', ''] },
    movies: { q: '', correct: '', wrong: ['', '', ''] },
    sports: { q: '', correct: '', wrong: ['', '', ''] },
    general: { q: '', correct: '', wrong: ['', '', ''] }
  };
  
  const [ev, setEv] = useState<any>(JSON.parse(JSON.stringify(defaultEvState)));
  const [selectedPremadeId, setSelectedPremadeId] = useState('');

  const fetchCodes = async () => {
    const res = await fetch(`/api/codes?adminPassword=${password}`);
    if (res.ok) {
      const data = await res.json();
      setCodesList(data.codes);
    }
  };

  const fetchEvents = async () => {
    const res = await fetch(`/api/events/admin?adminPassword=${password}`);
    if (res.ok) {
      const data = await res.json();
      setEventsList(data.events);
    }
  };

  const handleLogin = () => {
    if (password === 'misterio90') {
      setAuth(true);
      fetchCodes();
      fetchEvents();
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleCreateCode = async () => {
    const res = await fetch('/api/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code, firstUserPoints: firstPoints, subsequentPoints: subPoints, 
        adminPassword: password, title: isMission ? title : '', 
        hint: isMission ? hint : '', imageUrl: isMission ? imageUrl : ''
      })
    });
    if (res.ok) {
      alert('Código creado');
      setCode(''); setTitle(''); setHint(''); setImageUrl('');
      fetchCodes();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleLoadPremade = (id: string) => {
    setSelectedPremadeId(id);
    const found = premadeEvents.find(e => e.id === id);
    if (found) {
      setEv(JSON.parse(JSON.stringify(found.questions)));
    }
  };

  const handleUpdateEv = (cat: string, field: string, value: string, wrongIdx?: number) => {
    const newEv = { ...ev };
    if (field === 'wrong' && wrongIdx !== undefined) {
      newEv[cat].wrong[wrongIdx] = value;
    } else {
      newEv[cat][field] = value;
    }
    setEv(newEv);
  };

  const handleCreateEvent = async () => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminPassword: password,
        questions: ev
      })
    });
    if (res.ok) {
      alert('Evento Creado');
      setEv(JSON.parse(JSON.stringify(defaultEvState)));
      setSelectedPremadeId('');
      fetchEvents();
    } else {
      alert('Error creando evento');
    }
  };

  const handleLaunchEvent = async (id: string) => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword: password, id, status: 'active' })
    });
    fetchEvents();
    
    // Automatizar el finalizado a los 45 segundos
    setTimeout(() => {
      handleFinishEvent(id);
    }, 45000);
  };

  const handleOpenWaitingRoom = async (id: string) => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword: password, id, status: 'waiting' })
    });
    fetchEvents();
    
    // Automatizar el lanzamiento a los 20 segundos
    setTimeout(() => {
      handleLaunchEvent(id);
    }, 20000);
  };

  const handleFinishEvent = async (id: string) => {
    const res = await fetch('/api/events/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword: password, eventId: id })
    });
    if (res.ok) {
      alert('Evento Finalizado y Puntos Repartidos Automáticamente');
      fetchEvents();
    }
  };

  const renderEventForm = (cat: string, label: string, color: string) => (
    <div style={{background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '15px', borderLeft: `4px solid ${color}`}}>
      <h4 style={{color, marginTop: 0}}>{label}</h4>
      <input type="text" placeholder="Pregunta" value={ev[cat].q} onChange={e => handleUpdateEv(cat, 'q', e.target.value)} className="input-spooky" style={{marginBottom: '10px'}}/>
      <input type="text" placeholder="Respuesta Correcta" value={ev[cat].correct} onChange={e => handleUpdateEv(cat, 'correct', e.target.value)} className="input-spooky" style={{borderColor: '#4ade80'}}/>
      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
        <input type="text" placeholder="Falsa 1" value={ev[cat].wrong[0]} onChange={e => handleUpdateEv(cat, 'wrong', e.target.value, 0)} className="input-spooky" style={{borderColor: '#ef4444', marginBottom: 0}}/>
        <input type="text" placeholder="Falsa 2" value={ev[cat].wrong[1]} onChange={e => handleUpdateEv(cat, 'wrong', e.target.value, 1)} className="input-spooky" style={{borderColor: '#ef4444', marginBottom: 0}}/>
        <input type="text" placeholder="Falsa 3" value={ev[cat].wrong[2]} onChange={e => handleUpdateEv(cat, 'wrong', e.target.value, 2)} className="input-spooky" style={{borderColor: '#ef4444', marginBottom: 0}}/>
      </div>
    </div>
  );

  if (!auth) {
    return (
      <main className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h1 style={{color: 'var(--accent-primary)', fontFamily: 'Rye', fontSize: '3rem', margin: '2rem 0'}}>Tablero Mágico</h1>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña..." className="input-spooky" />
        <button className="btn-slime btn-dark" onClick={handleLogin}>Ingresar</button>
      </main>
    );
  }

  return (
    <main className="container">
      <h1 className="spooky-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Tablero Mágico</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <button className="btn-slime btn-dark" style={{ flex: 1, opacity: activeTab === 'codes' ? 1 : 0.5 }} onClick={() => setActiveTab('codes')}>Misiones</button>
        <button className="btn-slime btn-dark" style={{ flex: 1, opacity: activeTab === 'events' ? 1 : 0.5 }} onClick={() => setActiveTab('events')}>Eventos</button>
      </div>

      {activeTab === 'events' && (
        <>
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{color: 'var(--accent-secondary)'}}>Crear Nuevo Evento (Múltiple Choice)</h3>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '5px'}}>Cargar Plantilla de los 90s (Opcional):</label>
              <select className="input-spooky" value={selectedPremadeId} onChange={e => handleLoadPremade(e.target.value)}>
                <option value="">-- Seleccionar un evento prearmado --</option>
                {premadeEvents.map(pe => <option key={pe.id} value={pe.id}>{pe.name}</option>)}
              </select>
            </div>

            <div style={{marginTop: '1rem'}}>
              {renderEventForm('music', '🎵 Música', '#3b82f6')}
              {renderEventForm('movies', '🎬 Cine/Series', '#eab308')}
              {renderEventForm('sports', '⚽ Deportes', '#22c55e')}
              {renderEventForm('general', '🌎 Conocimiento General', '#a855f7')}
            </div>
            
            <button className="btn-slime btn-dark" style={{marginTop: '1rem', width: '100%'}} onClick={handleCreateEvent}>Guardar Evento en Cola</button>
          </div>

          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{color: 'var(--accent-secondary)'}}>Eventos Creados</h3>
            <div style={{marginTop: '1rem'}}>
              {eventsList.map((e, idx) => (
                <div key={e.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '15px 0'}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <strong style={{color: '#fff', fontSize: '1.2rem'}}>Evento #{eventsList.length - idx}</strong>
                    <span style={{
                      background: e.status === 'active' ? '#ff6b6b' : e.status === 'finished' ? '#4CAF50' : 'var(--text-muted)',
                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', color: '#fff', textTransform: 'uppercase'
                    }}>{e.status}</span>
                  </div>
                  
                  {e.status === 'idle' && (
                    <button className="btn-slime" style={{padding: '0.5rem', fontSize: '0.9rem', width: '100%', background: '#3b82f6'}} onClick={() => handleOpenWaitingRoom(e.id)}>1. ABRIR SALA DE ESPERA (20s)</button>
                  )}
                  {e.status === 'waiting' && (
                    <button className="btn-slime" style={{padding: '0.5rem', fontSize: '0.9rem', width: '100%', background: '#ff6b6b'}} onClick={() => handleLaunchEvent(e.id)}>2. LANZAR TRIVIA AHORA</button>
                  )}
                  {e.status === 'active' && (
                    <button className="btn-slime" style={{padding: '0.5rem', fontSize: '0.9rem', width: '100%', background: 'var(--accent-secondary)'}} onClick={() => handleFinishEvent(e.id)}>FINALIZAR Y REPARTIR PUNTOS</button>
                  )}
                </div>
              ))}
              {eventsList.length === 0 && <p style={{color: 'var(--text-muted)'}}>No hay eventos creados.</p>}
            </div>
          </div>
        </>
      )}

      {activeTab === 'codes' && (
        <>
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{color: 'var(--accent-primary)'}}>Crear nuevo código / acertijo</h3>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Código secreto (ej. VASO NARANJA)" className="input-spooky" style={{ marginBottom: '10px', marginTop: '1rem' }} />
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', cursor: 'pointer'}}>
                <input type="checkbox" checked={isMission} onChange={e => setIsMission(e.target.checked)} style={{transform: 'scale(1.5)'}} />
                Convertir en Misión (Adivinanza)
              </label>
            </div>
            {isMission && (
              <div style={{background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px dashed var(--accent-primary)'}}>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la Misión" className="input-spooky" style={{ marginBottom: '10px' }} />
                <textarea value={hint} onChange={e => setHint(e.target.value)} placeholder="Escribe el acertijo aquí..." className="input-spooky" style={{ height: '80px', resize: 'none', marginBottom: '10px' }} />
                <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL de imagen opcional" className="input-spooky" style={{ marginBottom: 0 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
              <div><label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Puntos al 1ro:</label><input type="number" value={firstPoints} onChange={e => setFirstPoints(e.target.value)} className="input-spooky" style={{marginBottom: 0}}/></div>
              <div><label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Puntos al resto:</label><input type="number" value={subPoints} onChange={e => setSubPoints(e.target.value)} className="input-spooky" style={{marginBottom: 0}}/></div>
            </div>
            <button className="btn-slime btn-dark" onClick={handleCreateCode}>Invocar Código</button>
          </div>

          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{color: 'var(--accent-primary)'}}>Códigos Activos</h3>
            <div style={{marginTop: '1rem'}}>
              {codesList.map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '10px 0'}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <strong style={{color: 'var(--accent-primary)', fontSize: '1.2rem'}}>{c.code}</strong>
                    <span style={{background: 'var(--accent-secondary)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', color: '#fff'}}>1ro: {c.firstUserPoints} | 2do: {c.subsequentPoints}</span>
                  </div>
                  {c.hint && (
                    <div style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '5px', marginTop: '8px'}}>
                      <strong style={{color: '#fff', fontSize: '0.9rem'}}>{c.title}</strong>
                      <p style={{color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px'}}>{c.hint}</p>
                      {c.image_url && <a href={c.image_url} target="_blank" style={{color: 'var(--accent-primary)', fontSize: '0.8rem', display: 'block', marginTop: '4px'}}>📷 Ver Imagen</a>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
