"use client";

import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

/** Positions of the repeated watermark labels for a host of w×h pixels (port of renderWatermarks in assets/app.js). */
export function watermarkGrid(w: number, h: number) {
  const out: { x: number; y: number }[] = [];
  for (let y = 30, row = 0; y < h + 60; y += 96, row++) for (let x = row % 2 ? -160 : -20; x < w + 200; x += 340) out.push({ x, y });
  return out;
}

/** Diagonal repeating watermark "<text> · <time>" over its .wm-host parent; relaid on resize and every minute. */
export function Watermark({ text, light = false }: { text: string; light?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<{ x: number; y: number }[]>([]);
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const layout = () => {
      setCells(watermarkGrid(host.offsetWidth, host.offsetHeight));
      setStamp(format(new Date(), "yyyy-MM-dd HH:mm"));
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(host);
    const timer = setInterval(layout, 60_000);
    return () => {
      ro.disconnect();
      clearInterval(timer);
    };
  }, []);
  const label = `${text} · ${stamp}`;
  return (
    <div ref={ref} className="wm" aria-hidden="true">
      {cells.map((c, i) => (
        <span key={i} style={{ left: c.x, top: c.y, color: light ? "rgba(255,255,255,.22)" : undefined }}>
          {label}
        </span>
      ))}
    </div>
  );
}
