import { useState } from 'react';
import { Wifi, WifiOff, Zap, RotateCw, Power, Play } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';

const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

function tpsColor(tps) {
  if (tps === null || tps === undefined) return 'text-fg-3';
  if (tps >= 18) return 'text-grass-bright';
  if (tps >= 12) return 'text-status-warn';
  return 'text-status-danger';
}

export default function ServerCard({ server, onAction }) {
  const { user } = useAuth();
  const { id, name, type, online, players, maxPlayers, version, tps, motd } = server;
  const fill = maxPlayers ? Math.round((players / maxPlayers) * 100) : 0;
  const canControl = (ROLE_RANK[user?.role] || 0) >= ROLE_RANK.admin && type !== 'proxy';
  const [busy, setBusy] = useState(null);

  async function act(action) {
    if (busy) return;
    if (action === 'stop' && !confirm(`Выключить сервер ${name}?`)) return;
    setBusy(action);
    try {
      await api.post(`/servers/${id}/${action}`);
      onAction?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setTimeout(() => setBusy(null), 1500);
    }
  }

  return (
    <div className="bg-bg-1 border border-border-1 rounded-lg p-5 hover:border-border-2 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold font-mono
            ${type === 'proxy' ? 'bg-[rgba(79,179,255,0.15)] text-status-info' : 'bg-[rgba(90,196,77,0.15)] text-grass-bright'}`}>
            {name[0]}
          </div>
          <div>
            <div className="text-fg-0 font-semibold text-sm">{name}</div>
            {version && <div className="text-fg-3 text-[10px] font-mono mt-0.5">{version}</div>}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${online ? 'text-grass' : 'text-status-danger'}`}>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? 'Online' : 'Offline'}
        </div>
      </div>

      {motd && <div className="text-fg-3 text-xs mb-3 truncate">{motd}</div>}

      <div className="flex items-center justify-between mb-2">
        <span className="text-fg-2 text-xs">Игроки</span>
        <span className="text-fg-0 text-sm font-semibold num">
          {players}<span className="text-fg-3 font-normal">/{maxPlayers || '—'}</span>
        </span>
      </div>
      <div className="h-1 bg-bg-3 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${fill}%`, background: 'linear-gradient(90deg, #4a9e3f, #7ee070)' }}
        />
      </div>

      <div className="flex items-center justify-between">
        {type !== 'proxy' && tps !== null && tps !== undefined ? (
          <div className="flex items-center gap-1.5">
            <Zap size={12} className={tpsColor(tps)} />
            <span className="text-fg-2 text-xs">TPS:</span>
            <span className={`text-xs font-semibold num ${tpsColor(tps)}`}>{tps.toFixed(1)}</span>
          </div>
        ) : <div />}

        {canControl && (
          <div className="flex items-center gap-1.5">
            {online ? (
              <>
                <button
                  onClick={() => act('restart')}
                  disabled={!!busy}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-bg-2 border border-border-2 text-fg-1 hover:text-status-info hover:border-status-info/40 disabled:opacity-50 transition-colors"
                  title="Перезапустить"
                >
                  <RotateCw size={11} className={busy === 'restart' ? 'animate-spin-me' : ''} />
                  Рестарт
                </button>
                <button
                  onClick={() => act('stop')}
                  disabled={!!busy}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-bg-2 border border-border-2 text-fg-1 hover:text-status-danger hover:border-status-danger/40 disabled:opacity-50 transition-colors"
                  title="Выключить"
                >
                  <Power size={11} />
                  Стоп
                </button>
              </>
            ) : (
              <button
                onClick={() => act('start')}
                disabled={!!busy}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded text-[#0a1a07] disabled:opacity-50 transition-colors"
                style={{ background: 'linear-gradient(180deg,#6ed55e,#4a9e3f)' }}
                title="Запустить"
              >
                <Play size={11} fill="currentColor" />
                Запуск
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
