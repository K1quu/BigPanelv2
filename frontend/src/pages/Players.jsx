import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import api from '../services/api';
import { connectWS, disconnectWS, onMessage } from '../services/websocket';
import PlayerTable from '../components/PlayerTable';

export default function Players() {
  const [tab, setTab]         = useState('online');
  const [online, setOnline]   = useState([]);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [history, setHistory] = useState([]);
  const [search, setSearch]   = useState('');
  const [server, setServer]   = useState('');
  const [loading, setLoading] = useState(false);

  async function loadOnline() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (server) params.set('server', server);
    params.set('limit', '300');
    const r = await api.get(`/players?${params}`);
    setOnline(r.data.players || r.data);   // backward-compat
    setOnlineTotal(r.data.total ?? (r.data.length || 0));
  }

  async function loadHistory() {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const r = await api.get(`/players/history${q}`);
    setHistory(r.data);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === 'online') loadOnline();
    else loadHistory();
  }, [tab, server]);

  useEffect(() => {
    if (tab !== 'online') return;
    connectWS();
    const off = onMessage(msg => {
      if (msg.type === 'tick') loadOnline();
    });
    return () => { off(); disconnectWS(); };
  }, [tab, search, server]);

  // Debounced search for online tab
  useEffect(() => {
    if (tab !== 'online') return;
    const t = setTimeout(() => loadOnline(), 250);
    return () => clearTimeout(t);
  }, [search]);

  function onSearchSubmit(e) {
    e.preventDefault();
    if (tab === 'history') loadHistory();
    else loadOnline();
  }

  return (
    <div className="p-8 w-full animate-fade-in">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Игроки</h1>
          <p className="text-fg-3 text-xs mt-1">
            {tab === 'online'
              ? `${onlineTotal.toLocaleString('ru-RU')} онлайн`
              : 'История сессий'}
          </p>
        </div>

        <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-bg-2 border border-border-2 rounded-md px-3 h-9 focus-within:border-grass focus-within:shadow-[0_0_0_3px_rgba(90,196,77,0.12)] transition-all">
            <Search size={13} className="text-fg-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по нику..."
              className="bg-transparent border-0 outline-none text-fg-0 text-sm w-56"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="text-fg-3 hover:text-fg-0 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          {tab === 'online' && (
            <select value={server} onChange={e => setServer(e.target.value)}
              className="h-9 px-3 bg-bg-2 border border-border-2 rounded-md text-fg-0 text-xs outline-none focus:border-grass">
              <option value="">Все серверы</option>
              <option value="lobby">Lobby-1</option>
              <option value="game">Lite-1</option>
            </select>
          )}
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[['online','Онлайн'],['history','История']].map(([k,label]) => (
          <button
            key={k}
            onClick={() => { setTab(k); setSearch(''); }}
            className={`px-4 py-2 text-sm rounded-md transition-colors
              ${tab === k ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-2 hover:text-fg-0 border border-transparent hover:bg-bg-hover'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
        {tab === 'online'
          ? <PlayerTable players={online} mode="online" onAction={loadOnline} />
          : loading
            ? <div className="py-10 text-center text-fg-3 text-sm">Загрузка...</div>
            : <PlayerTable players={history} mode="history" />
        }
        {tab === 'online' && onlineTotal > online.length && (
          <div className="py-3 px-4 text-center text-fg-3 text-xs border-t border-border-1">
            Показано {online.length} из {onlineTotal.toLocaleString('ru-RU')}. Уточните поиск чтобы увидеть других.
          </div>
        )}
      </div>
    </div>
  );
}
