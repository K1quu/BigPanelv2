import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';

export default function Login() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate('/'); }, [user]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/auth/login', form);
      setUser(r.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bg-0 grid place-items-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(90,196,77,0.07), transparent 60%)' }} />
        <div className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 70%)',
          }} />
      </div>

      {/* Card */}
      <div className="relative w-[400px] animate-fade-up" style={{ '--delay': '200ms' }}>
        {/* Green top border glow */}
        <div className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(90,196,77,0.25), transparent 40%)', padding: '1px', borderRadius: '20px' }}>
          <div className="w-full h-full rounded-xl bg-bg-2" />
        </div>

        <div className="relative bg-gradient-to-b from-bg-3/95 to-bg-2/95 rounded-xl p-10 border border-border-2"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-grass to-grass-dim flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(90,196,77,0.3)' }}>
              <span className="font-mono font-bold text-[#0a1a07] text-base">MC</span>
            </div>
            <div>
              <div className="text-fg-0 font-bold text-base">MC Panel</div>
              <div className="text-fg-3 text-[10px] font-mono uppercase tracking-widest">Admin Panel</div>
            </div>
          </div>

          <h1 className="text-fg-0 text-2xl font-semibold mb-1 tracking-tight">Вход</h1>
          <p className="text-fg-2 text-sm mb-7">Войдите в панель администратора</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-fg-2 font-medium uppercase tracking-wider">Логин</span>
              <div className={`flex items-center gap-3 bg-bg-1 border rounded-md px-4 h-11 transition-all
                ${form.username ? 'border-grass shadow-[0_0_0_3px_rgba(90,196,77,0.12)]' : 'border-border-2'}`}>
                <User size={15} className={form.username ? 'text-grass' : 'text-fg-3'} />
                <input
                  type="text"
                  autoFocus
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="flex-1 bg-transparent border-0 outline-none text-fg-0 text-sm"
                  placeholder="admin"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-fg-2 font-medium uppercase tracking-wider">Пароль</span>
              <div className={`flex items-center gap-3 bg-bg-1 border rounded-md px-4 h-11 transition-all
                ${form.password ? 'border-grass shadow-[0_0_0_3px_rgba(90,196,77,0.12)]' : 'border-border-2'}`}>
                <Lock size={15} className={form.password ? 'text-grass' : 'text-fg-3'} />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="flex-1 bg-transparent border-0 outline-none text-fg-0 text-sm"
                  placeholder="••••••"
                />
              </div>
            </label>

            {error && (
              <div className="bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm rounded-md px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 rounded-md font-semibold text-sm text-[#0a1a07] transition-all mt-1 disabled:opacity-70"
              style={{ background: 'linear-gradient(180deg, #6ed55e 0%, #4a9e3f 100%)', boxShadow: '0 0 0 1px rgba(126,224,112,0.3), 0 8px 20px rgba(90,196,77,0.2)' }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-[#0a1a07]/30 border-t-[#0a1a07] rounded-full animate-spin-me" />
                : <>Войти <ArrowRight size={15} /></>}
            </button>
          </form>

          <div className="flex items-center gap-2 mt-6 pt-5 border-t border-border-1">
            <div className="w-1.5 h-1.5 rounded-full bg-grass animate-blink" style={{ boxShadow: '0 0 6px rgba(90,196,77,0.5)' }} />
            <span className="text-[11px] text-fg-3 font-mono">MC Panel v2.0 · Система администрирования</span>
          </div>
        </div>
      </div>

      {/* Copyright footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-fg-4 select-none cursor-default leading-relaxed pointer-events-none"
           title="© ООО «Биг Девелопмент». Все права защищены. Несанкционированное копирование, распространение или модификация запрещены.">
        <div className="opacity-60">© ООО «Биг Девелопмент» · Все права защищены</div>
        <div className="opacity-40 mt-0.5">Несанкционированное распространение запрещено</div>
      </div>
    </div>
  );
}
