import { useState } from 'react';
import { UserX, Shield } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';

const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

function fmtDuration(joinedAt) {
  const secs = Math.floor(Date.now() / 1000) - joinedAt;
  if (secs < 60) return `${secs}с`;
  if (secs < 3600) return `${Math.floor(secs / 60)}м`;
  return `${Math.floor(secs / 3600)}ч ${Math.floor((secs % 3600) / 60)}м`;
}

function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function PlayerTable({ players, mode = 'online', onAction }) {
  const { user } = useAuth();
  const canModerate = (ROLE_RANK[user?.role] || 0) >= ROLE_RANK.admin;
  const [busy, setBusy] = useState(null);

  async function doAction(action, username, server_id) {
    setBusy(`${action}-${username}`);
    try {
      await api.post(`/players/${action}`, { username, server_id });
      onAction?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setBusy(null);
    }
  }

  if (!players.length) {
    return <div className="py-10 text-center text-fg-3 text-sm">Нет данных</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-1 text-[10px] uppercase text-fg-3 tracking-wider">
          <th className="text-left py-3 px-4 font-medium">Игрок</th>
          <th className="text-left py-3 px-4 font-medium">Сервер</th>
          <th className="text-left py-3 px-4 font-medium">
            {mode === 'online' ? 'В сети' : 'Вход'}
          </th>
          {mode === 'history' && <th className="text-left py-3 px-4 font-medium">Выход</th>}
          {canModerate && mode === 'online' && <th className="py-3 px-4" />}
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr key={i} className="border-b border-border-1 hover:bg-bg-hover transition-colors">
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <img
                  src={`https://minotar.net/avatar/${p.username}/24`}
                  alt={p.username}
                  className="w-6 h-6 rounded-sm"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <span className="text-fg-0 font-medium">{p.username}</span>
              </div>
            </td>
            <td className="py-3 px-4">
              <span className="text-[11px] font-mono bg-bg-3 text-fg-2 px-2 py-0.5 rounded">
                {p.server_id}
              </span>
            </td>
            <td className="py-3 px-4 text-fg-2 font-mono text-xs num">
              {mode === 'online' ? fmtDuration(p.joined_at) : fmtDate(p.joined_at)}
            </td>
            {mode === 'history' && (
              <td className="py-3 px-4 text-fg-2 font-mono text-xs num">
                {p.left_at ? fmtDate(p.left_at) : <span className="text-grass text-[10px]">онлайн</span>}
              </td>
            )}
            {canModerate && mode === 'online' && (
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => doAction('kick', p.username, p.server_id)}
                    disabled={busy === `kick-${p.username}`}
                    className="w-7 h-7 flex items-center justify-center rounded bg-bg-2 border border-border-2 text-fg-2 hover:text-status-warn hover:border-status-warn/40 transition-colors"
                    title="Кик"
                  >
                    <UserX size={13} />
                  </button>
                  <button
                    onClick={() => doAction('ban', p.username, p.server_id)}
                    disabled={busy === `ban-${p.username}`}
                    className="w-7 h-7 flex items-center justify-center rounded bg-bg-2 border border-border-2 text-fg-2 hover:text-status-danger hover:border-status-danger/40 transition-colors"
                    title="Бан"
                  >
                    <Shield size={13} />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
