import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';

const ROLE_LABEL = { superadmin: 'Супер-админ', admin: 'Администратор', moderator: 'Модератор' };
const ROLE_COLOR = {
  superadmin: 'text-status-warn bg-status-warn/10 border-status-warn/20',
  admin:      'text-status-info bg-status-info/10 border-status-info/20',
  moderator:  'text-fg-2 bg-bg-3 border-border-2',
};

const ACTION_LABEL = {
  login:            { label: 'Вход',                color: 'text-grass-bright bg-grass/10' },
  logout:           { label: 'Выход',               color: 'text-fg-2 bg-bg-3' },
  login_failed:    { label: 'Неудачный вход',      color: 'text-status-warn bg-status-warn/10' },
  password_changed: { label: 'Смена пароля',        color: 'text-status-info bg-status-info/10' },
  user_created:     { label: 'Создан пользователь', color: 'text-grass-bright bg-grass/10' },
  user_deleted:     { label: 'Удалён пользователь', color: 'text-status-danger bg-status-danger/10' },
  server_start:     { label: 'Запуск сервера',      color: 'text-grass-bright bg-grass/10' },
  server_stop:      { label: 'Остановка сервера',   color: 'text-status-danger bg-status-danger/10' },
  server_restart:   { label: 'Рестарт сервера',     color: 'text-status-info bg-status-info/10' },
  console_command:  { label: 'RCON команда',        color: 'text-fg-0 bg-bg-3' },
  player_kick:      { label: 'Кик игрока',          color: 'text-status-warn bg-status-warn/10' },
  player_ban:       { label: 'Бан игрока',          color: 'text-status-danger bg-status-danger/10' },
};

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers]     = useState([]);
  const [logs, setLogs]       = useState([]);
  const [audit, setAudit]     = useState([]);
  const [tab, setTab]         = useState('users');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ username: '', password: '', role: 'moderator' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-fg-1 font-semibold">Только для супер-администратора</div>
        </div>
      </div>
    );
  }

  async function loadUsers() {
    const r = await api.get('/users');
    setUsers(r.data);
  }

  async function loadLogs() {
    const r = await api.get('/console/log?limit=100');
    setLogs(r.data);
  }

  async function loadAudit() {
    const q = auditFilter ? `?action=${encodeURIComponent(auditFilter)}` : '';
    const r = await api.get(`/audit${q}`);
    setAudit(r.data);
  }

  useEffect(() => {
    loadUsers();
    loadLogs();
    loadAudit();
  }, []);

  useEffect(() => { if (tab === 'audit') loadAudit(); }, [auditFilter, tab]);

  async function createUser(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/users', form);
      setForm({ username: '', password: '', role: 'moderator' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    if (!confirm('Удалить пользователя?')) return;
    await api.delete(`/users/${id}`);
    loadUsers();
  }

  function fmtDate(ts) {
    return new Date(ts * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="p-4 md:p-8 w-full animate-fade-in">
      <div className="mb-6">
        <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Пользователи</h1>
        <p className="text-fg-3 text-xs mt-1">Управление доступом к панели</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {[['users','Пользователи'],['audit','Аудит'],['logs','RCON команды']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm rounded-md transition-colors
              ${tab===k ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-2 hover:text-fg-0 border border-transparent hover:bg-bg-hover'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-2 h-9 px-4 text-xs font-medium rounded-md text-[#0a1a07] transition-all"
              style={{ background: 'linear-gradient(180deg,#6ed55e,#4a9e3f)', boxShadow: '0 0 0 1px rgba(126,224,112,0.3)' }}>
              <UserPlus size={13} /> Добавить
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="bg-bg-1 border border-border-2 rounded-lg p-5 mb-4 animate-fade-in">
              <div className="text-fg-0 font-medium text-sm mb-4">Новый пользователь</div>
              <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-fg-2 uppercase tracking-wider">Логин</span>
                  <input value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))}
                    className="h-9 px-3 bg-bg-2 border border-border-2 rounded-md text-fg-0 text-sm outline-none focus:border-grass"
                    placeholder="username" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-fg-2 uppercase tracking-wider">Пароль</span>
                  <input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
                    className="h-9 px-3 bg-bg-2 border border-border-2 rounded-md text-fg-0 text-sm outline-none focus:border-grass"
                    placeholder="минимум 6 символов" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-fg-2 uppercase tracking-wider">Роль</span>
                  <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}
                    className="h-9 px-3 bg-bg-2 border border-border-2 rounded-md text-fg-0 text-sm outline-none focus:border-grass">
                    <option value="moderator">Модератор</option>
                    <option value="admin">Администратор</option>
                    <option value="superadmin">Супер-админ</option>
                  </select>
                </div>
                <button type="submit" disabled={loading}
                  className="h-9 px-4 text-xs font-semibold rounded-md text-[#0a1a07] disabled:opacity-60"
                  style={{ background: 'linear-gradient(180deg,#6ed55e,#4a9e3f)' }}>
                  {loading ? '...' : 'Создать'}
                </button>
                {error && <div className="col-span-4 text-status-danger text-xs">{error}</div>}
              </form>
            </div>
          )}

          <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-1 text-[10px] uppercase text-fg-3 tracking-wider">
                  <th className="text-left py-3 px-5 font-medium">Логин</th>
                  <th className="text-left py-3 px-5 font-medium">Роль</th>
                  <th className="py-3 px-5" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border-1 last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-grass-dim to-[#2d5f27] flex items-center justify-center text-white text-xs font-bold">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="text-fg-0 font-medium">{u.username}</span>
                        {u.id === user.id && <span className="text-[10px] text-grass">вы</span>}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${ROLE_COLOR[u.role]}`}>
                        <Shield size={10} />
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      {u.id !== user.id && (
                        <button onClick={() => deleteUser(u.id)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-bg-2 border border-border-2 text-fg-3 hover:text-status-danger hover:border-status-danger/40 transition-colors ml-auto">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <>
          <div className="flex flex-wrap gap-1 mb-4">
            <button onClick={() => setAuditFilter('')}
              className={`px-3 py-1.5 text-[11px] rounded transition-colors ${!auditFilter ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-2 hover:text-fg-0 border border-transparent hover:bg-bg-hover'}`}>
              Все
            </button>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setAuditFilter(k)}
                className={`px-3 py-1.5 text-[11px] rounded transition-colors ${auditFilter === k ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-2 hover:text-fg-0 border border-transparent hover:bg-bg-hover'}`}>
                {v.label}
              </button>
            ))}
          </div>

          <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-1 text-[10px] uppercase text-fg-3 tracking-wider">
                  <th className="text-left py-3 px-5 font-medium">Время</th>
                  <th className="text-left py-3 px-5 font-medium">Пользователь</th>
                  <th className="text-left py-3 px-5 font-medium">Действие</th>
                  <th className="text-left py-3 px-5 font-medium">Цель</th>
                  <th className="text-left py-3 px-5 font-medium">Детали</th>
                  <th className="text-left py-3 px-5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-fg-3">Нет записей</td></tr>
                )}
                {audit.map(a => {
                  const meta = ACTION_LABEL[a.action] || { label: a.action, color: 'text-fg-2 bg-bg-3' };
                  let details = null;
                  try { details = a.details ? JSON.parse(a.details) : null; } catch {}
                  return (
                    <tr key={a.id} className="border-b border-border-1 last:border-0 hover:bg-bg-hover transition-colors">
                      <td className="py-3 px-5 text-fg-3 font-mono text-xs num whitespace-nowrap">{fmtDate(a.timestamp)}</td>
                      <td className="py-3 px-5 text-fg-1 text-xs font-medium">{a.username || '—'}</td>
                      <td className="py-3 px-5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-fg-2 text-xs font-mono">{a.target || '—'}</td>
                      <td className="py-3 px-5 text-fg-3 text-[11px] font-mono max-w-[280px] truncate" title={a.details}>
                        {details
                          ? Object.entries(details).map(([k,v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ')
                          : '—'}
                      </td>
                      <td className="py-3 px-5 text-fg-3 font-mono text-[11px]">{a.ip || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'logs' && (
        <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-1 text-[10px] uppercase text-fg-3 tracking-wider">
                <th className="text-left py-3 px-5 font-medium">Время</th>
                <th className="text-left py-3 px-5 font-medium">Админ</th>
                <th className="text-left py-3 px-5 font-medium">Сервер</th>
                <th className="text-left py-3 px-5 font-medium">Команда</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-fg-3">Лог пуст</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.id} className="border-b border-border-1 last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="py-3 px-5 text-fg-3 font-mono text-xs num whitespace-nowrap">{fmtDate(l.timestamp)}</td>
                  <td className="py-3 px-5 text-fg-1 text-xs">{l.admin_user}</td>
                  <td className="py-3 px-5"><span className="text-[11px] font-mono bg-bg-3 text-fg-2 px-2 py-0.5 rounded">{l.server_id}</span></td>
                  <td className="py-3 px-5 text-grass-bright font-mono text-xs">{l.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
