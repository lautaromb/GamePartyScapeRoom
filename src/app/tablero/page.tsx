'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scroll, ScanLine, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Tablero() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('misiones'); 
  const [users, setUsers] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      const resUsers = await fetch('/api/users');
      const dataUsers = await resUsers.json();
      setUsers(dataUsers.users);
      setWinner(dataUsers.winner);
      
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleSubmit = async (submitCode: string) => {
    if (!submitCode.trim()) return;
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
        fetchData();
      } else {
        setMsg({ text: data.error, type: 'error' });
      }
    } catch (e) {
      setMsg({ text: 'Error de conexión', type: 'error' });
    }
    setLoading(false);
  };

  if (!me) return <div style={{padding: '2rem', textAlign: 'center', color: 'var(--accent-primary)'}}>Adentrándose en la jungla...</div>;

  return (
    <>
      <main className="container">
        {winner && (
          <div style={{background: 'var(--accent-primary)', color: '#000', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 0 30px var(--accent-primary)', fontFamily: 'Macondo'}}>
            🥁 ¡JUMANJI! 🥁<br/><br/><span style={{fontSize:'1.2rem', fontFamily: 'Outfit'}}>{winner} ha escapado de la jungla primero.</span>
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
                <div key={m.id} className={`mission-card ${m.isFoundByMe ? 'completed' : ''}`} onClick={() => {
                  if(!m.isFoundByMe) {
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
                className="input-spooky"
              />
              <button className="btn-slime" onClick={() => handleSubmit(code)} disabled={loading}>
                {loading ? 'Verificando...' : 'VALIDAR CÓDIGO'}
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
