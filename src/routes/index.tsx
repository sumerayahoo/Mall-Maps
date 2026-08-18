import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Camera,
  CornerDownLeft,
  CornerDownRight,
  Footprints,
  Loader2,
  MapPin,
  Navigation,
  Pause,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { MallMap } from "@/components/mall/MallMap";
import { FLOORS, POIS, nodeId, poiById, type Poi } from "@/lib/mall-data";
import {
  buildRoute,
  nearestNode,
  positionAt,
  routeLength,
  type Route as NavRoute,
} from "@/lib/mall-nav";
import { visualSearch } from "@/lib/visual-search.functions";
import type { SearchResult } from "@/lib/visual-search.server";
import splash from "@/assets/mall-maps-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mall Maps — Indoor Navigation for 3 Floors" },
      {
        name: "description",
        content:
          "Mall Maps is an indoor navigation prototype: search any shop, food court, washroom or FunCity across 3 floors and get live turn-by-turn directions.",
      },
      { property: "og:title", content: "Mall Maps — Indoor Navigation" },
      {
        property: "og:description",
        content:
          "Search a shop or snap a photo of a product and Mall Maps walks you there, floor by floor.",
      },
    ],
  }),
  component: Index,
});

const START = { x: 480, y: 700, floor: 1, heading: 0 };
const START_NODE = nodeId(1, 480, 700);

const CATEGORY_LABEL: Record<string, string> = {
  shop: "Shop",
  food: "Food",
  washroom: "Washroom",
  funcity: "FunCity",
  service: "Service",
  entrance: "Entrance",
};

function Index() {
  const [floor, setFloor] = useState(1);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState(START);
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [travelled, setTravelled] = useState(0);
  const [walking, setWalking] = useState(false);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [lensOpen, setLensOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return POIS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)) ||
        CATEGORY_LABEL[p.category]?.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const startRoute = useCallback(
    (poi: Poi) => {
      const from = nearestNode(user.x, user.y, user.floor) || START_NODE;
      const r = buildRoute(from, poi) ?? buildRoute(START_NODE, poi);
      if (!r) return;
      setRoute(r);
      setSelected(poi);
      setTravelled(0);
      setWalking(true);
      setQuery("");
      setLensOpen(false);
      setFloor(r.points[0]!.floor);
    },
    [user],
  );

  // simulated walking, like a live GPS arrow
  const total = route ? routeLength(route.points) : 0;
  useEffect(() => {
    if (!walking || !route) return;
    const id = window.setInterval(() => {
      setTravelled((t) => {
        const next = t + 14;
        if (next >= total) {
          setWalking(false);
          return total;
        }
        return next;
      });
    }, 60);
    return () => window.clearInterval(id);
  }, [walking, route, total]);

  useEffect(() => {
    if (!route) return;
    const p = positionAt(route.points, travelled);
    setUser({ x: p.x, y: p.y, floor: p.floor, heading: p.heading });
    setFloor(p.floor);
  }, [travelled, route]);

  const stepIndex = useMemo(() => {
    if (!route) return 0;
    const idx = positionAt(route.points, travelled).index;
    let s = 0;
    route.steps.forEach((st, i) => {
      if (st.at <= idx) s = i;
    });
    return s;
  }, [route, travelled]);

  const arrived = route ? travelled >= total - 0.5 : false;
  const remaining = route ? Math.max(0, Math.round((total - travelled) * 0.1)) : 0;

  const endRoute = () => {
    setRoute(null);
    setSelected(null);
    setWalking(false);
    setTravelled(0);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-map-bg font-sans">
      <MallMap
        floor={floor}
        route={route?.points ?? null}
        user={user}
        destination={selected}
        onSelect={(p) => setSelected(p)}
        onRecenter={() => setFloor(user.floor)}
      />

      {/* Search bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto w-full max-w-md">
          <div className="map-shadow flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shops, food, washrooms…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button aria-label="Clear" onClick={() => setQuery("")}>
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
            <button
              aria-label="Search by photo"
              onClick={() => setLensOpen(true)}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
            >
              <Camera className="size-4" />
            </button>
          </div>

          {results.length > 0 && (
            <div className="map-shadow mt-2 overflow-hidden rounded-2xl border border-border bg-card">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => startRoute(p)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-accent"
                >
                  <MapPin className="size-4 text-primary" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {CATEGORY_LABEL[p.category]} · Floor {p.floor}
                    </span>
                  </span>
                  <Navigation className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Brand + floor switcher */}
      <div className="absolute right-3 top-20 z-10 flex flex-col items-end gap-3 sm:right-4 sm:top-24">
        <div className="map-shadow rounded-2xl border border-border bg-card px-3 py-2">
          <h1 className="text-sm font-bold tracking-tight">Mall Maps</h1>
          <p className="text-[11px] text-muted-foreground">Indoor navigation</p>
        </div>
        <div className="map-shadow flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          {[...FLOORS].reverse().map((f) => (
            <button
              key={f.id}
              onClick={() => setFloor(f.id)}
              className={`size-10 text-sm font-semibold transition-colors ${
                floor === f.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
              title={f.name}
            >
              {f.short}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation banner */}
      {route && (
        <div className="pointer-events-none absolute left-3 top-20 z-10 w-[min(22rem,calc(100%-1.5rem))] sm:left-4 sm:top-24">
          <div className="pointer-events-auto rounded-2xl bg-primary px-4 py-3 text-primary-foreground map-shadow">
            <div className="flex items-center gap-3">
              <StepIcon icon={arrived ? "arrive" : route.steps[stepIndex]!.icon} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {arrived ? `You have arrived at ${route.destination.name}` : route.steps[stepIndex]!.text}
                </p>
                <p className="truncate text-xs opacity-80">
                  {arrived ? `Floor ${route.destination.floor}` : route.steps[stepIndex]!.detail}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet: place card or directions */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4">
        <div
          className={`pointer-events-auto w-full max-w-md ${route ? "mr-auto" : "mx-auto"}`}
        >
          {route ? (
            <div className="map-shadow max-h-[46vh] overflow-y-auto rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">
                    {remaining} m · {route.minutes} min
                  </p>
                  <p className="text-xs text-muted-foreground">
                    to {route.destination.name} · Floor {route.destination.floor}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWalking((w) => !w)}
                    className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-label={walking ? "Pause walking" : "Start walking"}
                  >
                    {walking ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <button
                    onClick={endRoute}
                    className="grid size-10 place-items-center rounded-full border border-border"
                    aria-label="End navigation"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <ol className="mt-4 space-y-1">
                {route.steps.map((s, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-3 rounded-xl px-2 py-2 text-sm ${
                      i === stepIndex && !arrived ? "bg-accent font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    <StepIcon icon={s.icon} tone="muted" />
                    <span>
                      <span className="block text-foreground">{s.text}</span>
                      <span className="block text-xs text-muted-foreground">{s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : selected ? (
            <div className="map-shadow rounded-3xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABEL[selected.category]} · Floor {selected.floor}
                  </p>
                </div>
                <button aria-label="Close" onClick={() => setSelected(null)}>
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>
              <button
                onClick={() => startRoute(selected)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                <Navigation className="size-4" /> Directions
              </button>
            </div>
          ) : (
            <div className="map-shadow flex items-center gap-3 rounded-full border border-border bg-card px-4 py-3">
              <Footprints className="size-4 text-primary" />
              <p className="text-xs text-muted-foreground">
                You are at the <span className="font-semibold text-foreground">Main Entrance</span>.
                Search a place or tap the camera to find a product.
              </p>
            </div>
          )}
        </div>
      </div>

      {lensOpen && <LensPanel onClose={() => setLensOpen(false)} onNavigate={startRoute} />}
      <Splash />
    </main>
  );
}

function Splash() {
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("mm-splash-shown")) {
      setDone(true);
      return;
    }
    sessionStorage.setItem("mm-splash-shown", "1");
    const a = window.setTimeout(() => setFading(true), 2200);
    const b = window.setTimeout(() => setDone(true), 3200);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background transition-all duration-1000 ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transform: fading ? "translateY(-12px)" : "translateY(0)",
      }}
    >
      <img
        src={splash.url}
        alt="Mall Maps"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

function StepIcon({ icon, tone }: { icon: string; tone?: "muted" }) {
  const cls = `size-4 ${tone ? "mt-0.5 text-primary" : ""}`;
  if (icon === "left") return <CornerDownLeft className={cls} />;
  if (icon === "right") return <CornerDownRight className={cls} />;
  if (icon === "up" || icon === "down") return <ArrowUp className={`${cls} ${icon === "down" ? "rotate-180" : ""}`} />;
  if (icon === "arrive") return <MapPin className={cls} />;
  if (icon === "start") return <Footprints className={cls} />;
  return <ArrowUp className={cls} />;
}

function LensPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (p: Poi) => void }) {
  const search = useServerFn(visualSearch);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (image?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await search({
        data: { ...(text.trim() ? { query: text.trim() } : {}), ...(image ? { image } : {}) },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setPreview(url);
      void run(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-foreground/30 p-3 sm:items-center">
      <div className="map-shadow flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-sm font-bold">Find a product</p>
          </div>
          <button aria-label="Close" onClick={onClose}>
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void run(preview ?? undefined)}
              placeholder="e.g. pink bag"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none"
            />
            <button
              onClick={() => void run(preview ?? undefined)}
              className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Search
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background py-6 text-sm font-medium"
          >
            <Camera className="size-4 text-primary" />
            {preview ? "Take or upload another photo" : "Take a photo or upload an image"}
          </button>

          {preview && (
            <img src={preview} alt="Your product photo" className="h-32 w-full rounded-2xl object-cover" />
          )}

          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Looking through store inventory…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && !loading && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Matches for “{result.interpretation}” · highest price first
              </p>
              {result.matches.length === 0 && (
                <p className="text-sm text-muted-foreground">No similar products in this mall.</p>
              )}
              {result.matches.map((m) => {
                const store = poiById(m.storeId);
                return (
                  <button
                    key={m.product.id}
                    onClick={() => store && onNavigate(store)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3 text-left hover:bg-accent"
                  >
                    <span
                      className="size-10 shrink-0 rounded-xl border border-border"
                      style={{ backgroundColor: m.product.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.product.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.storeName} · Floor {m.floor}
                      </span>
                    </span>
                    <span className="text-sm font-bold">
                      ₹{m.product.price.toLocaleString("en-IN")}
                    </span>
                    <Navigation className="size-4 text-primary" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
