import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RotateCw, Power, Play } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';
import { connectWS, disconnectWS, onMessage } from '../services/websocket';
import OnlineChart from '../components/OnlineChart';

const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

function Metric({ label, value, color = 'text-fg-0' }) {
  return (
    <div className="bg-bg-2 rounded-md px-4 py-3">
      <div className="text-fg-3 text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold num ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

function ServerDetail({ server, onAction }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(null);
  const canControl = (ROLE_RANK[user?.role] || 0) >= ROLE_RANK.admin && server.type !== 'proxy';

  useEffect(() => {
    api.get(`/stats/history?range=6h&server=${server.id}`)
      .then(r => setHistory(r.data))
      .catch(() => {});
  }, [server.id]);

  async function act(action) {
    if (busy) return;
    if (action === 'stop' && !confirm(`Выключить сервер ${server.name}?`)) return;
    setBusy(action);
    try {
      await api.post(`/servers/${server.id}/${action}`);
      onAction?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setTimeout(() => setBusy(null), 1500);
    }
  }

  const tpsCls = !server.tps ? 'text-fg-3' : server.tps >= 18 ? 'text-grass-bright' : server.tps >= 12 ? 'text-status-warn' : 'text-status-danger';

  return (
    <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border-1 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold font-mono
            ${server.type === 'proxy' ? 'bg-[rgba(79,179,255,0.15)] text-status-info' : 'bg-[rgba(90,196,77,0.15)] text-grass-bright'}`}>
            {server.name[0]}
          </div>
          <div>
            <div className="text-fg-0 font-semibold">{server.name}</div>
            <div className="text-fg-3 text-xs font-mono mt-0.5">{server.version || 'Нет данных'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canControl && (
            <div className="flex items-center gap-1.5">
              {server.online ? (
                <>
                  <button onClick={() => act('restart')} disabled={!!busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-bg-2 border border-border-2 text-fg-1 hover:text-status-info hover:border-status-info/40 disabled:opacity-50 transition-colors">
                    <RotateCw size={12} className={busy === 'restart' ? 'animate-spin-me' : ''} />
                    Рестарт
                  </button>
                  <button onClick={() => act('stop')} disabled={!!busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-bg-2 border border-border-2 text-fg-1 hover:text-status-danger hover:border-status-danger/40 disabled:opacity-50 transition-colors">
                    <Power size={12} />
                    Выключить
                  </button>
                </>
              ) : (
                <button onClick={() => act('start')} disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-[#0a1a07] disabled:opacity-50 transition-colors"
                  style={{ background: 'linear-gradient(180deg,#6ed55e,#4a9e3f)' }}>
                  <Play size={12} fill="currentColor" />
                  Включить
                </button>
              )}
            </div>
          )}
          <div className={`flex items-center gap-2 text-sm font-medium ${server.online ? 'text-grass' : 'text-status-danger'}`}>
            {server.online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {server.online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {server.motd && (
          <div className="text-fg-2 text-sm mb-4 px-3 py-2 bg-bg-2 rounded-md font-mono text-xs border border-border-1">
            {server.motd}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <Metric label="Игроки" value={`${server.players}/${server.maxPlayers || '—'}`} color="text-fg-0" />
          {server.type !== 'proxy' && (
            <Metric label="TPS" value={server.tps?.toFixed(1)} color={tpsCls} />
          )}
          <Metric label="Тип" value={server.type === 'proxy' ? 'Proxy' : 'Paper'} color="text-status-info" />
        </div>

        {history.length > 0 && (
          <div>
            <div className="text-fg-2 text-xs font-medium mb-3">История онлайна (6ч)</div>
            <OnlineChart data={history} servers={[server.id]} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Servers() {
  const [servers, setServers] = useState([]);

  async function load() {
    const r = await api.get('/servers');
    setServers(r.data);
  }

  useEffect(() => {
    load();
    connectWS();
    const off = onMessage(msg => {
      if (msg.type === 'tick') setServers(msg.servers);
    });
    return () => { off(); disconnectWS(); };
  }, []);

  return (
    <div className="p-4 md:p-8 w-full animate-fade-in">
      <div className="mb-6">
        <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Серверы</h1>
        <p className="text-fg-3 text-xs mt-1">Статус и метрики всех серверов кластера</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {servers.map(s => <ServerDetail key={s.id} server={s} onAction={load} />)}
      </div>
    </div>
  );
}
