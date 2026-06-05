import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';
import { connectWS, disconnectWS, onMessage } from '../services/websocket';
import PlayerTable from '../components/PlayerTable';

export default function Players() {
  const [tab, setTab]         = useState('online');
  const [online, setOnline]   = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);

  async function loadOnline() {
    const r = await api.get('/players');
    setOnline(r.data);
  }

  async function loadHistory() {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const r = await api.get(`/players/history${q}`);
    setHistory(r.data);
    setLoading(false);
  }

  useEffect(() => {
    loadOnline();
    connectWS();
    const off = onMessage(msg => {
      if (msg.type === 'player_join' || msg.type === 'player_leave') loadOnline();
    });
    return () => { off(); disconnectWS(); };
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  function onSearch(e) {
    e.preventDefault();
    loadHistory();
  }

  return (
    <div className="p-8 w-full animate-fade-in">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-fg-0 text-xl font-semibold tracking-tight">Игроки</h1>
          <p className="text-fg-3 text-xs mt-1">
            {tab === 'online' ? `${online.length} онлайн` : 'История сессий'}
          </p>
        </div>

        {tab === 'history' && (
          <form onSubmit={onSearch} className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-bg-2 border border-border-2 rounded-md px-3 h-9 focus-within:border-grass focus-within:shadow-[0_0_0_3px_rgba(90,196,77,0.12)] transition-all">
              <Search size={13} className="text-fg-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по нику..."
                className="bg-transparent border-0 outline-none text-fg-0 text-sm w-48"
              />
            </div>
            <button type="submit" className="h-9 px-4 text-xs font-medium bg-bg-3 border border-border-2 rounded-md text-fg-1 hover:text-fg-0 hover:border-border-3 transition-colors">
              Найти
            </button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[['online','Онлайн'],['history','История']].map(([k,label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
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
      </div>
    </div>
  );
}
