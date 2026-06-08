import { useRef, useState, useLayoutEffect, useId } from 'react';

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) * 0.15;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
    const cp2x = p2.x - (p3.x - p1.x) * 0.15;
    const cp2y = p2.y - (p3.y - p1.y) * 0.15;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function MiniChart({ data = [], color = '#5ac44d', label, suffix = '', min, max, height = 140 }) {
  const wrapRef = useRef(null);
  const [W, setW] = useState(400);
  const [hover, setHover] = useState(null);
  const H = height;
  const PL = 36, PR = 12, PT = 12, PB = 22;
  const uid = useId().replace(/:/g, '');

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(es => {
      const cw = es[0].contentRect.width;
      if (cw > 50) setW(Math.round(cw));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const values = data.map(p => p.v);
  const yMin = min !== undefined ? min : (values.length ? Math.min(...values) : 0);
  const yMax = max !== undefined ? max : (values.length ? Math.max(...values) : 1);
  const yRange = Math.max(0.001, yMax - yMin);

  const N = data.length;
  const points = data.map((p, i) => ({
    x: PL + (i / Math.max(1, N - 1)) * innerW,
    y: PT + innerH - ((p.v - yMin) / yRange) * innerH,
    v: p.v, t: p.t,
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length > 1
    ? linePath + ` L ${points[points.length - 1].x} ${PT + innerH} L ${points[0].x} ${PT + innerH} Z`
    : '';

  const lastVal = values.length ? values[values.length - 1] : null;
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const xLabels = N > 1
    ? [0, Math.floor(N * 0.5), N - 1].map(i => ({
        x: PL + (i / (N - 1)) * innerW,
        label: fmtTime(data[i].t),
      }))
    : [];

  function onMove(e) {
    if (N < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * W;
    if (rx < PL || rx > W - PR) { setHover(null); return; }
    const i = Math.min(N - 1, Math.max(0, Math.round(((rx - PL) / innerW) * (N - 1))));
    setHover(points[i]);
  }

  return (
    <div
      className="rounded-lg p-4 border border-border-2 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0f1317, #151a20)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top glow overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 50% 40% at 50% 0%, ${color}15, transparent 70%)` }} />

      <div className="flex items-baseline justify-between mb-3 relative">
        <span className="text-fg-2 text-xs font-medium">{label}</span>
        <span className="text-fg-0 font-semibold text-base num">
          {lastVal !== null ? lastVal.toFixed(1) : '—'}
          {suffix && <span className="text-fg-3 text-xs font-normal ml-0.5">{suffix}</span>}
        </span>
      </div>

      <div ref={wrapRef} className="relative w-full" style={{ height: H }}>
        {N >= 2 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block"
               onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={`mc-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
                <stop offset="60%"  stopColor={color} stopOpacity="0.08" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
              <filter id={`mc-glow-${uid}`} x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grid */}
            {yTicks.map((v, i) => {
              const y = PT + innerH - ((v - yMin) / yRange) * innerH;
              return (
                <g key={i}>
                  <line x1={PL} x2={W - PR} y1={y} y2={y}
                    stroke="#1e252d" strokeWidth="1"
                    strokeDasharray={i === 0 ? '0' : '2 5'} />
                  <text x={PL - 6} y={y + 3} fill="#5a636d" fontSize="9"
                    textAnchor="end" fontFamily="JetBrains Mono, monospace">
                    {v >= 100 ? v.toFixed(0) : v.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {xLabels.map((l, i) => (
              <text key={i} x={l.x} y={H - 6} fill="#5a636d" fontSize="9"
                textAnchor="middle" fontFamily="JetBrains Mono, monospace">{l.label}</text>
            ))}

            {/* Area + line */}
            <path d={areaPath} fill={`url(#mc-area-${uid})`}
              style={{ transition: 'd 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"
              filter={`url(#mc-glow-${uid})`}
              style={{ transition: 'd 1.2s cubic-bezier(0.22,1,0.36,1)' }} />

            {/* Live pulsing dot */}
            {points.length > 0 && (() => {
              const last = points[points.length - 1];
              return (
                <g>
                  <circle cx={last.x} cy={last.y} r="6" fill={color} opacity="0.15">
                    <animate attributeName="r" values="4;9;4" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={last.x} cy={last.y} r="3" fill={color}
                    stroke="#0a0d10" strokeWidth="1.5"
                    style={{ transition: 'cx 1.2s, cy 1.2s' }} />
                </g>
              );
            })()}

            {/* Hover crosshair */}
            {hover && (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={hover.x} x2={hover.x} y1={PT} y2={PT + innerH}
                  stroke={color} strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
                <circle cx={hover.x} cy={hover.y} r="4" fill={color}
                  stroke="#0a0d10" strokeWidth="1.5" />
              </g>
            )}
          </svg>
        )}
        {N < 2 && (
          <div className="flex items-center justify-center h-full text-fg-3 text-xs">
            Накопление данных...
          </div>
        )}

        {hover && (
          <div className="absolute pointer-events-none bg-bg-3 border border-border-2 rounded-md px-2.5 py-1.5 text-xs shadow-xl"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top:  `${(hover.y / H) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 8px))',
              whiteSpace: 'nowrap',
            }}>
            <div className="text-fg-0 font-semibold num">
              {hover.v.toFixed(1)}{suffix}
            </div>
            <div className="text-fg-3 text-[10px] font-mono mt-0.5">{fmtTime(hover.t)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
