import { useState, useEffect } from 'react';
import { Puzzle, RefreshCw } from 'lucide-react';
import api from '../services/api';

const SERVERS = [
  { id: 'lobby', label: 'Lobby-1' },
  { id: 'game',  label: 'Lite-1'  },
];

export default function Plugins() {
  const [serverId, setServerId] = useState('lobby');
  const [plugins, setPlugins]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/plugins/${serverId}`);
      setPlugins(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось загрузить список плагинов');
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [serverId]);

  return (
    <div className="p-8 w-full animate-fade-in">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Плагины</h1>
          <p className="text-fg-3 text-xs mt-1">
            {loading ? 'Загрузка...' : `${plugins.length} плагинов на ${serverId}`}
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
        <div className="grid grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-14 bg-bg-1 border border-border-1 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && plugins.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {plugins.map((name, i) => (
            <div key={i} className="flex items-center gap-3 bg-bg-1 border border-border-1 rounded-lg px-4 py-3 hover:border-border-2 transition-colors animate-fade-in">
              <Puzzle size={14} className="text-grass flex-shrink-0" />
              <span className="text-fg-0 text-sm truncate">{name}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && plugins.length === 0 && (
        <div className="text-center py-16 text-fg-3">
          <Puzzle size={32} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">Нет плагинов или сервер недоступен</div>
        </div>
      )}
    </div>
  );
}
