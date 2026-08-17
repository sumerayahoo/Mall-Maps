import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Crosshair } from "lucide-react";
import {
  ESCALATOR,
  MAP_H,
  MAP_W,
  POIS,
  XS,
  YS,
  type Poi,
} from "@/lib/mall-data";
import type { PathPoint } from "@/lib/mall-nav";

type View = { x: number; y: number; k: number };

const FILL: Record<string, string> = {
  shop: "var(--shop)",
  food: "var(--food)",
  washroom: "var(--washroom)",
  funcity: "var(--funcity)",
  service: "var(--shop)",
  entrance: "var(--entrance)",
  escalator: "var(--escalator)",
};

type Props = {
  floor: number;
  route: PathPoint[] | null;
  user: { x: number; y: number; floor: number; heading: number };
  destination: Poi | null;
  onSelect: (poi: Poi) => void;
  onRecenter: () => void;
};

export function MallMap({ floor, route, user, destination, onSelect, onRecenter }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.min(3, Math.max(0.6, v.k * factor));
      const r = k / v.k;
      return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r };
    });
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-dy * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const units = POIS.filter((p) => p.floor === floor);
  const line = route?.filter((p) => p.floor === floor) ?? [];

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-map-bg touch-none"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setView((v) => ({
          ...v,
          x: drag.current!.ox + (e.clientX - drag.current!.x),
          y: drag.current!.oy + (e.clientY - drag.current!.y),
        }));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* floor plate */}
          <rect
            x="40"
            y="8"
            width={MAP_W - 80}
            height={MAP_H - 40}
            rx="26"
            fill="var(--map-bg)"
            stroke="var(--border)"
          />

          {/* corridors */}
          {YS.map((y) => (
            <rect key={`h${y}`} x="80" y={y - 26} width={MAP_W - 160} height="52" rx="26" fill="var(--corridor)" />
          ))}
          {XS.map((x) => (
            <rect key={`v${x}`} x={x - 26} y="94" width="52" height={YS[YS.length - 1]! - 94 + 26} rx="26" fill="var(--corridor)" />
          ))}
          {floor === 1 && <rect x="454" y="560" width="52" height="150" rx="26" fill="var(--corridor)" />}

          {/* units */}
          {units.map((p) => {
            const active = destination?.id === p.id;
            return (
              <g key={p.id} onClick={() => onSelect(p)} className="cursor-pointer">
                <rect
                  x={p.rect.x}
                  y={p.rect.y}
                  width={p.rect.w}
                  height={p.rect.h}
                  rx="12"
                  fill={FILL[p.category] ?? "var(--shop)"}
                  stroke={active ? "var(--route)" : "var(--border)"}
                  strokeWidth={active ? 3 : 1}
                />
                <text
                  x={p.x}
                  y={p.rect.y + p.rect.h / 2 + 4}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                  fontSize="15"
                  fontWeight={active ? 700 : 600}
                  fill="var(--foreground)"
                >
                  {p.name.length > 20 ? `${p.name.slice(0, 19)}…` : p.name}
                </text>
              </g>
            );
          })}

          {/* route */}
          {line.length > 1 && (
            <>
              <polyline
                points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--route-soft)"
                strokeWidth="22"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--route)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* escalator */}
          <g>
            <rect
              x={ESCALATOR.x - 42}
              y={ESCALATOR.y - 22}
              width="84"
              height="44"
              rx="10"
              fill="var(--escalator)"
              stroke="var(--border)"
            />
            <text x={ESCALATOR.x} y={ESCALATOR.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">
              Escalator
            </text>
          </g>

          {/* destination pin */}
          {destination && destination.floor === floor && (
            <g transform={`translate(${destination.x} ${destination.y})`}>
              <path
                d="M0 6 C -16 -10 -22 -18 -22 -28 A22 22 0 1 1 22 -28 C22 -18 16 -10 0 6 Z"
                fill="var(--route)"
              />
              <circle cx="0" cy="-28" r="8" fill="var(--corridor)" />
            </g>
          )}

          {/* user arrow */}
          {user.floor === floor && (
            <g transform={`translate(${user.x} ${user.y}) rotate(${user.heading})`}>
              <circle r="26" fill="var(--route)" opacity="0.16" />
              <circle r="15" fill="var(--corridor)" />
              <path d="M0 -13 L10 11 L0 5 L-10 11 Z" fill="var(--route)" />
            </g>
          )}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <MapBtn onClick={() => zoomAt(0, 0, 1.25)} label="Zoom in">
          <Plus className="size-4" />
        </MapBtn>
        <MapBtn onClick={() => zoomAt(0, 0, 0.8)} label="Zoom out">
          <Minus className="size-4" />
        </MapBtn>
        <MapBtn
          onClick={() => {
            setView({ x: 0, y: 0, k: 1 });
            onRecenter();
          }}
          label="Recenter"
        >
          <Crosshair className="size-4" />
        </MapBtn>
      </div>
    </div>
  );
}

function MapBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="map-shadow grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}