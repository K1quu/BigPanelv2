import { useRef, useState, useLayoutEffect } from 'react';

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

export default function MiniChart({ data = [], color = '#5ac44d', label, suffix = '', min, max, height = 120 }) {
  const wrapRef = useRef(null);
  const [W, setW] = useState(400);
  const H = height;
  const PL = 30, PR = 8, PT = 8, PB = 18;

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
  const yMin = min !== undefined ? min : Math.min(...values, Infinity);
  const yMax = max !== undefined ? max : Math.max(...values, -Infinity);
  const yRange = Math.max(0.001, yMax - yMin);

  const N = data.length;
  const points = data.map((p, i) => ({
    x: PL + (i / Math.max(1, N - 1)) * innerW,
    y: PT + innerH - ((p.v - yMin) / yRange) * innerH,
    v: p.v,
    t: p.t,
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length > 1
    ? linePath + ` L ${points[points.length - 1].x} ${PT + innerH} L ${points[0].x} ${PT + innerH} Z`
    : '';

  const lastVal = values.length ? values[values.length - 1] : null;
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div className="bg-bg-1 border border-border-1 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-fg-2 text-xs font-medium">{label}</span>
        <span className="text-fg-0 font-semibold text-sm num">
          {lastVal !== null ? lastVal.toFixed(1) : '—'}
          {suffix && <span className="text-fg-3 text-xs font-normal ml-0.5">{suffix}</span>}
        </span>
      </div>
      <div ref={wrapRef} className="relative w-full" style={{ height: H }}>
        {N >= 2 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
            <defs>
              <linearGradient id={`mini-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((v, i) => {
              const y = PT + innerH - ((v - yMin) / yRange) * innerH;
              return (
                <g key={i}>
                  <line x1={PL} x2={W - PR} y1={y} y2={y}
                    stroke="#1e252d" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '2 4'} />
                  <text x={PL - 4} y={y + 3} fill="#5a636d" fontSize="9"
                    textAnchor="end" fontFamily="JetBrains Mono, monospace">
                    {v >= 100 ? v.toFixed(0) : v.toFixed(1)}
                  </text>
                </g>
              );
            })}
            {areaPath && <path d={areaPath} fill={`url(#mini-${label})`} />}
            {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />}
            {points.length > 0 && (
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y}
                r="3" fill={color} stroke="#0a0d10" strokeWidth="1.5" />
            )}
          </svg>
        )}
        {N < 2 && (
          <div className="flex items-center justify-center h-full text-fg-3 text-xs">
            Накопление данных...
          </div>
        )}
      </div>
    </div>
  );
}
