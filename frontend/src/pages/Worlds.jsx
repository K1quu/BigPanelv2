import { useState, useEffect } from 'react';
import { Globe, RefreshCw, HardDrive, Flame, CircleDashed } from 'lucide-react';
import api from '../services/api';

const SERVERS = [
  { id: 'lobby', label: 'Lobby-1' },
  { id: 'game',  label: 'Lite-1'  },
];

const DIM_META = {
  overworld: { Icon: Globe,         color: 'text-grass-bright',  bg: 'bg-grass/10',          label: 'Overworld' },
  nether:    { Icon: Flame,         color: 'text-status-danger', bg: 'bg-status-danger/10',  label: 'Nether'    },
  end:       { Icon: CircleDashed,  color: 'text-status-info',   bg: 'bg-status-info/10',    label: 'The End'   },
};

function fmtSize(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}

export default function Worlds() {
  const [serverId, setServerId] = useState('game');
  const [worlds, setWorlds]     = useState([]);
  const [source, setSource]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/worlds/${serverId}`);
      setWorlds(r.data.worlds || []);
      setSource(r.data.source || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось загрузить миры');
      setWorlds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [serverId]);

  const totalSize = worlds.reduce((a, w) => a + w.sizeMb, 0);

  return (
    <div className="p-4 md:p-8 w-full animate-fade-in">
      <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Миры</h1>
          <p className="text-fg-3 text-xs mt-1">
            {loading
              ? 'Загрузка...'
              : `${worlds.length} миров · ${fmtSize(totalSize)} на диске`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 h-9 px-4 text-xs font-medium bg-bg-2 border border-border-2 rounded-md text-fg-1 hover:text-fg-0 hover:border-border-3 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin-me' : ''} />
          Обновить
        </button>
      </div>

      {/* Server tabs */}
      <div className="flex gap-1 mb-5">
        {SERVERS.map(s => (
          <button
            key={s.id}
            onClick={() => setServerId(s.id)}
            className={`px-4 py-2 text-sm rounded-md transition-colors
              ${serverId === s.id ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-2 hover:text-fg-0 border border-transparent hover:bg-bg-hover'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-bg-1 border border-border-1 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && worlds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {worlds.map((w, i) => {
            const meta = DIM_META[w.dim] || DIM_META.overworld;
            const Icon = meta.Icon;
            const pct = Math.min(100, (w.sizeMb / Math.max(totalSize, 1)) * 100);
            return (
              <div key={i}
                className="bg-bg-1 border border-border-1 rounded-lg p-4 hover:border-border-2 transition-colors animate-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-fg-0 font-semibold text-sm truncate">{w.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${meta.color}`}>{meta.label}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-fg-2 text-xs">
                    <HardDrive size={11} />
                    Размер
                  </div>
                  <span className="text-fg-0 text-sm font-semibold num">{fmtSize(w.sizeMb)}</span>
                </div>
                <div className="h-1 bg-bg-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4a9e3f, #7ee070)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && worlds.length === 0 && (
        <div className="text-center py-16 text-fg-3">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">Миры не найдены</div>
        </div>
      )}
    </div>
  );
}
