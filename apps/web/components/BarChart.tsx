"use client";

import { useState } from "react";

/** Axis top for a maximum value (port of niceMax in assets/app.js). */
export function niceMax(v: number) {
  if (v <= 5) return 5;
  if (v <= 10) return 10;
  if (v <= 20) return 20;
  if (v <= 25) return 25;
  if (v <= 50) return 50;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

type Props = {
  values: number[];
  labels?: string[];
  /** bars before this index are drawn dimmed (e.g. the previous week) */
  highlightFrom?: number;
  compact?: boolean;
  unit?: string;
  className?: string;
  "aria-label"?: string;
};

/** Single-series bar chart with hover tooltip, inline SVG (port of renderBarChart in assets/app.js). */
export function BarChart({ values, labels = [], highlightFrom = 0, compact = false, unit = "", className, "aria-label": ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  if (values.length === 0) return <div className="chart" />;
  const W = 640, H = compact ? 130 : 220, padL = compact ? 26 : 34, padR = 10, padT = 14, padB = compact ? 22 : 26;
  const top = niceMax(Math.max(...values));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const band = plotW / values.length, bw = Math.min(24, band * 0.62), r = 4;
  const maxI = values.indexOf(Math.max(...values));
  const every = values.length > 16 ? 2 : 1;
  const barH = (v: number) => (v / top) * plotH;
  const tipFor = (i: number) => `${labels[i] ? labels[i] + ": " : ""}${values[i]}${unit ? " " + unit : ""}`;
  return (
    <div className={className ? `chart ${className}` : "chart"}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {[0, 1, 2, 3, 4].map((g) => {
          const y = padT + plotH - (g / 4) * plotH;
          return (
            <g key={g}>
              <line className="grid-line" x1={padL} x2={W - padR} y1={y} y2={y} />
              <text className="axis-text" x={padL - 6} y={y + 4} textAnchor="end">
                {Math.round((top * g) / 4)}
              </text>
            </g>
          );
        })}
        {values.map((v, i) => {
          const x = padL + i * band + (band - bw) / 2, h = barH(v), y0 = padT + plotH - h;
          const d =
            h > r
              ? `M${x},${y0 + r} a${r},${r} 0 0 1 ${r},-${r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h-${bw} z`
              : `M${x},${y0} h${bw} v${h} h-${bw} z`;
          return (
            <g key={i}>
              <path className={i < highlightFrom ? "bar dim" : "bar"} d={d} />
              {(i === maxI || i === values.length - 1) && (
                <text className="value-text" x={x + bw / 2} y={y0 - 5} textAnchor="middle">
                  {v}
                </text>
              )}
              {i % every === 0 && (
                <text className="axis-text" x={x + bw / 2} y={H - 8} textAnchor="middle">
                  {labels[i] ?? ""}
                </text>
              )}
              <rect className="hit" x={padL + i * band} y={padT} width={band} height={plotH} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {/* the svg fills .chart, so percentages of the viewBox position the tip without measuring */}
      <div
        className={hover === null ? "chart-tip" : "chart-tip show"}
        role="tooltip"
        style={hover === null ? undefined : { left: `${((padL + hover * band + band / 2) / W) * 100}%`, top: `${((padT + plotH - barH(values[hover])) / H) * 100}%` }}
      >
        {hover === null ? "" : tipFor(hover)}
      </div>
    </div>
  );
}
