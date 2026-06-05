import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const SERVER_COLORS = {
  velocity: '#4fb3ff',
  lobby:    '#5ac44d',
  game:     '#f5b544',
};

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-3 border border-border-2 rounded-md px-3 py-2 text-xs shadow-xl">
      <div className="text-fg-3 mb-1">{formatTime(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-fg-1 capitalize">{p.dataKey}:</span>
          <span className="text-fg-0 font-semibold num">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function OnlineChart({ data, servers = ['velocity', 'lobby', 'game'] }) {
  // Transform: [{server_id, player_count, timestamp}] → [{ts, velocity, lobby, game}]
  const byTs = {};
  for (const row of data) {
    if (!byTs[row.timestamp]) byTs[row.timestamp] = { timestamp: row.timestamp };
    byTs[row.timestamp][row.server_id] = row.player_count;
  }
  const chartData = Object.values(byTs).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e252d" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatTime}
          tick={{ fill: '#5a636d', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={{ stroke: '#1e252d' }}
          minTickGap={60}
        />
        <YAxis
          tick={{ fill: '#5a636d', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#8a939d', paddingTop: 8 }}
        />
        {servers.map(id => (
          <Line
            key={id}
            type="monotone"
            dataKey={id}
            stroke={SERVER_COLORS[id]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
