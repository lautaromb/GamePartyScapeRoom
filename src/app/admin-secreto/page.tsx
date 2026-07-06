'use client';
import { useState, useEffect } from 'react';

export default function AdminSecreto() {
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState(false);
  
  const [code, setCode] = useState('');
  const [firstPoints, setFirstPoints] = useState('3');
  const [subPoints, setSubPoints] = useState('1');
  const [title, setTitle] = useState('');
  const [hint, setHint] = useState('');
  const [isMission, setIsMission] = useState(false);
  
  const [codesList, setCodesList] = useState<any[]>([]);

  const fetchCodes = async () => {
    const res = await fetch(`/api/codes?adminPassword=${password}`);
    if (res.ok) {
      const data = await res.json();
      setCodesList(data.codes);
    }
  };

  const handleLogin = () => {
    if (password === 'misterio90') {
      setAuth(true);
      fetchCodes();
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleCreate = async () => {
    const res = await fetch('/api/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code, 
        firstUserPoints: firstPoints, 
        subsequentPoints: subPoints, 
        adminPassword: password,
        title: isMission ? title : '',
        hint: isMission ? hint : ''
      })
    });
    
    if (res.ok) {
      alert('Código creado');
      setCode('');
      setTitle('');
      setHint('');
      fetchCodes();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  if (!auth) {
    return (
      <main className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h1 style={{color: 'var(--accent-primary)', fontFamily: 'Rye', fontSize: '3rem', margin: '2rem 0'}}>Tablero Mágico</h1>
        <input 
          type="password" 
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña del Guardián..."
          className="input-spooky"
        />
        <button className="btn-slime btn-dark" onClick={handleLogin}>Ingresar</button>
      </main>
    );
  }

  return (
    <main className="container">
      <h1 className="spooky-title" style={{ fontSize: '2.5rem' }}>Tablero Mágico</h1>
      
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{color: 'var(--accent-primary)'}}>Crear nuevo código / acertijo</h3>
        
        <input 
          type="text" 
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Código secreto (ej. VASO NARANJA)"
          className="input-spooky"
          style={{ marginBottom: '10px', marginTop: '1rem' }}
        />
        
        <div style={{marginBottom: '1rem'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', cursor: 'pointer'}}>
            <input type="checkbox" checked={isMission} onChange={e => setIsMission(e.target.checked)} style={{transform: 'scale(1.5)'}} />
            Convertir en Misión (Adivinanza)
          </label>
        </div>

        {isMission && (
          <div style={{background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px dashed var(--accent-primary)'}}>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título de la Misión (ej. El misterio jugoso)"
              className="input-spooky"
              style={{ marginBottom: '10px', fontSize: '1rem' }}
            />
            <textarea
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Escribe el acertijo aquí..."
              className="input-spooky"
              style={{ fontSize: '0.9rem', height: '80px', resize: 'none', marginBottom: 0 }}
            />
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Puntos al 1ro:</label>
            <input type="number" value={firstPoints} onChange={e => setFirstPoints(e.target.value)} className="input-spooky" style={{marginBottom: 0}}/>
          </div>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Puntos al resto:</label>
            <input type="number" value={subPoints} onChange={e => setSubPoints(e.target.value)} className="input-spooky" style={{marginBottom: 0}}/>
          </div>
        </div>
        
        <button className="btn-slime btn-dark" onClick={handleCreate}>Invocar Código</button>
      </div>

      <div className="glass" style={{ padding: '1.5rem' }}>
        <h3 style={{color: 'var(--accent-primary)'}}>Base de Datos Activa</h3>
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
                </div>
              )}
            </div>
          ))}
          {codesList.length === 0 && <p style={{color: 'var(--text-muted)'}}>No hay códigos creados en la jungla.</p>}
        </div>
      </div>
    </main>
  );
}
