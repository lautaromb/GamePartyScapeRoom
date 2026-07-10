'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AVATARS = ['🦁', '🐘', '🦏', '🐒', '🐅', '🐊', '🐍', '🦜', '🍌', '🍍', '🥥', '🌴', '🌺', '🥝'];

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🐒');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      router.push('/tablero');
    }
  }, [router]);

  const handleLogin = async () => {
    if (!nickname.trim()) return alert('Ingresa un nombre de explorador');
    setLoading(true);
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar })
      });
      const data = await res.json();
      
      localStorage.setItem('userId', data.id);
      localStorage.setItem('nickname', data.nickname);
      localStorage.setItem('avatar', data.avatar);
      
      router.push('/tablero');
    } catch (e) {
      alert('Error de conexión');
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1 className="spooky-title">mis 30 - Lautaro</h1>
      
      <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          Para sobrevivir a la jungla, debes identificarte...
        </p>
        
        <input 
          type="text" 
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nombre de explorador..."
          className="input-spooky"
          maxLength={15}
        />
        
        <p style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Elige tu espíritu (Animal o Fruta)</p>
        <div className="avatar-selector">
          {AVATARS.map(a => (
            <div 
              key={a}
              className={`avatar-option ${avatar === a ? 'selected' : ''}`}
              onClick={() => setAvatar(a)}
            >
              {a}
            </div>
          ))}
        </div>
        
        <button className="btn-slime" onClick={handleLogin} disabled={loading}>
          {loading ? 'Adentrándose...' : 'ENTRAR AL JUEGO'}
        </button>
      </div>
    </main>
  );
}
