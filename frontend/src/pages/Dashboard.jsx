import { useState, useEffect, useCallback } from 'react';
import { Users, Server, Activity, Wifi, Trash2 } from 'lucide-react';
import { useAuth } from '../App';
import api from '../services/api';
import { connectWS, disconnectWS, onMessage } from '../services/websocket';
import ServerCard from '../components/ServerCard';
import OnlineChart from '../components/OnlineChart';
import PlayerTable from '../components/PlayerTable';

function KPI({ label, value, unit, Icon, color = 'text-grass-bright' }) {
  return (
    <div className="bg-bg-1 border border-border-1 rounded-lg p-4 hover:border-border-2 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-fg-2 text-xs font-medium">{label}</span>
        <Icon size={15} className="text-fg-3" />
      </div>
      <div className={`text-2xl font-bold num ${color}`}>
        {value ?? '—'}
        {unit && <span className="text-fg-3 text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}

const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

export default function Dashboard() {
  const { user } = useAuth();
  const canClear = (ROLE_RANK[user?.role] || 0) >= ROLE_RANK.admin;
  const [servers, setServers]   = useState([]);
  const [history, setHistory]   = useState([]);
  const [players, setPlayers]   = useState([]);
  const [range, setRange]       = useState('24h');

  async function clearHistory() {
    if (!confirm('Очистить всю историю графика? Действие необратимо.')) return;
    try {
      await api.delete('/stats/history');
      setHistory([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  }

  async function loadAll() {
    const [srv, hist, ply] = await Promise.all([
      api.get('/servers'),
      api.get(`/stats/history?range=${range}`),
      api.get('/players?limit=50'),
    ]);
    setServers(srv.data);
    setHistory(hist.data);
    setPlayers(ply.data.players || ply.data);
  }

  useEffect(() => { loadAll(); }, [range]);

  useEffect(() => {
    connectWS();
    const off = onMessage(msg => {
      if (msg.type === 'tick') {
        setServers(msg.servers);
      }
      if (msg.type === 'player_join' || msg.type === 'player_leave') {
        api.get('/players?limit=50').then(r => setPlayers(r.data.players || r.data)).catch(() => {});
      }
    });
    return () => { off(); disconnectWS(); };
  }, []);

  const totalOnline = servers.find(s => s.id === 'velocity')?.players ?? 0;
  const onlineCount = servers.filter(s => s.online).length;
  const avgTPS = servers.filter(s => s.tps).reduce((a, s, _, arr) => a + s.tps / arr.length, 0);

  return (
    <div className="p-8 w-full animate-fade-in">
      <div className="mb-6">
        <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Дашборд</h1>
        <p className="text-fg-3 text-xs mt-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-grass inline-block animate-blink" />
          Live · обновляется каждые 30 секунд
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPI label="Всего онлайн"  value={totalOnline} Icon={Users}    color="text-grass-bright" />
        <KPI label="Серверов онлайн" value={`${onlineCount}/3`} Icon={Server} color="text-status-info" />
        <KPI label="Средний TPS" value={avgTPS ? avgTPS.toFixed(1) : '—'} Icon={Activity} color={avgTPS >= 18 ? 'text-grass-bright' : 'text-status-warn'} />
        <KPI label="Игроков в базе" value={players.length} Icon={Wifi} color="text-fg-0" />
      </div>

      {/* Graph */}
      <div className="bg-bg-1 border border-border-2 rounded-lg p-5 mb-6"
        style={{ background: 'linear-gradient(180deg, #0f1317, #151a20)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-fg-0 font-semibold text-sm">
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full bg-grass" />
                <div className="absolute inset-0 rounded-full bg-grass" style={{ animation: 'liveRing 1.8s ease-out infinite' }} />
              </div>
              Онлайн
              <span className="text-[10px] font-bold text-grass-bright tracking-widest">LIVE</span>
            </div>
            <div className="text-fg-3 text-xs mt-0.5">История подключений по серверам</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {['1h','6h','24h','7d'].map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors
                    ${range === r ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-3 hover:text-fg-1 border border-transparent'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {canClear && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border border-border-2 text-fg-3 hover:text-status-danger hover:border-status-danger/40 transition-colors"
                title="Очистить историю графика"
              >
                <Trash2 size={11} />
                Очистить
              </button>
            )}
          </div>
        </div>
        <OnlineChart data={history} />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 w-full">
        {/* Server list */}
        <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-1">
            <div>
              <div className="text-fg-0 font-semibold text-sm">Серверы</div>
              <div className="text-fg-3 text-xs mt-0.5">{onlineCount} из 3 онлайн</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-0">
            {servers.map(s => (
              <div key={s.id} className="p-4 border-b border-border-1 last:border-0">
                <ServerCard server={s} onAction={loadAll} />
              </div>
            ))}
          </div>
        </div>

        {/* Online players */}
        <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border-1">
            <div className="text-fg-0 font-semibold text-sm">Онлайн сейчас</div>
            <div className="text-fg-3 text-xs mt-0.5">{players.length} игроков</div>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <PlayerTable players={players} mode="online" onAction={loadAll} />
          </div>
        </div>
      </div>
    </div>
  );
}
