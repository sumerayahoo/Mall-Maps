import { ESCALATOR, UNIT_M, XS, YS, nodeId, type Poi } from "./mall-data";

export type GraphNode = { id: string; floor: number; x: number; y: number };
export type Edge = { to: string; cost: number; kind: "walk" | "escalator" };

export const NODES = new Map<string, GraphNode>();
export const ADJ = new Map<string, Edge[]>();

function addNode(floor: number, x: number, y: number) {
  const id = nodeId(floor, x, y);
  NODES.set(id, { id, floor, x, y });
  if (!ADJ.has(id)) ADJ.set(id, []);
  return id;
}

function link(a: string, b: string, kind: Edge["kind"] = "walk", cost?: number) {
  const na = NODES.get(a)!;
  const nb = NODES.get(b)!;
  const c = cost ?? Math.hypot(na.x - nb.x, na.y - nb.y);
  ADJ.get(a)!.push({ to: b, cost: c, kind });
  ADJ.get(b)!.push({ to: a, cost: c, kind });
}

for (const floor of [1, 2, 3]) {
  for (const x of XS) for (const y of YS) addNode(floor, x, y);
  for (const y of YS)
    for (let i = 0; i < XS.length - 1; i++)
      link(nodeId(floor, XS[i]!, y), nodeId(floor, XS[i + 1]!, y));
  for (const x of XS)
    for (let i = 0; i < YS.length - 1; i++)
      link(nodeId(floor, x, YS[i]!), nodeId(floor, x, YS[i + 1]!));
}
addNode(1, 480, 700);
link(nodeId(1, 480, 700), nodeId(1, 480, 560));

// escalators between floors
for (const floor of [1, 2]) {
  link(
    nodeId(floor, ESCALATOR.x, ESCALATOR.y),
    nodeId(floor + 1, ESCALATOR.x, ESCALATOR.y),
    "escalator",
    260,
  );
}

export type PathPoint = { x: number; y: number; floor: number; escalator?: boolean };

function dijkstra(start: string, goal: string): string[] {
  const dist = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) if (!visited.has(id) && d < best) ((best = d), (cur = id));
    if (!cur) break;
    if (cur === goal) break;
    visited.add(cur);
    for (const e of ADJ.get(cur) ?? []) {
      const nd = best + e.cost;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, cur);
      }
    }
  }
  if (!dist.has(goal)) return [];
  const out: string[] = [goal];
  let c = goal;
  while (prev.has(c)) {
    c = prev.get(c)!;
    out.unshift(c);
  }
  return out;
}

export type Step = {
  text: string;
  detail: string;
  icon: "start" | "straight" | "left" | "right" | "up" | "down" | "arrive";
  /** index in the route point list where this step begins */
  at: number;
  floor: number;
};

export type Route = {
  points: PathPoint[];
  steps: Step[];
  distanceM: number;
  minutes: number;
  destination: Poi;
};

const meters = (u: number) => Math.max(1, Math.round(u * UNIT_M));

export function buildRoute(fromNode: string, dest: Poi): Route | null {
  const ids = dijkstra(fromNode, dest.node);
  if (!ids.length) return null;

  const points: PathPoint[] = ids.map((id) => {
    const n = NODES.get(id)!;
    return { x: n.x, y: n.y, floor: n.floor };
  });
  // mark escalator transitions
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.floor !== points[i - 1]!.floor) points[i]!.escalator = true;
  }
  // final leg into the unit
  const last = points[points.length - 1]!;
  if (last.x !== dest.x || last.y !== dest.y)
    points.push({ x: dest.x, y: dest.y, floor: dest.floor });

  // ---- turn-by-turn ----
  const steps: Step[] = [];
  let distanceU = 0;
  steps.push({
    text: "Start at your location",
    detail: "Head towards the highlighted route",
    icon: "start",
    at: 0,
    floor: points[0]!.floor,
  });

  let segStart = 0;
  let prevHeading: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;

    if (b.floor !== a.floor) {
      const up = b.floor > a.floor;
      const walked = segLen(points, segStart, i - 1);
      if (walked > 0)
        steps.push({
          text: `Continue for ${meters(walked)} m`,
          detail: "Towards the central atrium",
          icon: "straight",
          at: segStart,
          floor: a.floor,
        });
      steps.push({
        text: `Take the escalator ${up ? "up" : "down"} to Floor ${b.floor}`,
        detail: "Central atrium escalators",
        icon: up ? "up" : "down",
        at: i,
        floor: b.floor,
      });
      segStart = i;
      prevHeading = null;
      continue;
    }

    const heading = Math.atan2(b.y - a.y, b.x - a.x);
    distanceU += Math.hypot(b.x - a.x, b.y - a.y);

    if (prevHeading !== null && Math.abs(angleDiff(heading, prevHeading)) > 0.3) {
      const turn = angleDiff(heading, prevHeading) > 0 ? "right" : "left";
      const walked = segLen(points, segStart, i - 1);
      steps.push({
        text: `Walk ${meters(walked)} m, then turn ${turn}`,
        detail: nearbyHint(points[i - 1]!),
        icon: turn,
        at: segStart,
        floor: a.floor,
      });
      segStart = i - 1;
    }
    prevHeading = heading;
  }

  const tailU = segLen(points, segStart, points.length - 1);
  if (tailU > 0)
    steps.push({
      text: `Continue for ${meters(tailU)} m`,
      detail: `${dest.name} will be on your side`,
      icon: "straight",
      at: segStart,
      floor: dest.floor,
    });

  steps.push({
    text: `Arrive at ${dest.name}`,
    detail: `Floor ${dest.floor}`,
    icon: "arrive",
    at: points.length - 1,
    floor: dest.floor,
  });

  const totalU = segLen(points, 0, points.length - 1);
  const escalatorCount = points.filter((p) => p.escalator).length;
  const distanceM = meters(totalU);
  const minutes = Math.max(1, Math.round(distanceM / 55 + escalatorCount * 0.6));

  return { points, steps, distanceM, minutes, destination: dest };
}

function segLen(pts: PathPoint[], from: number, to: number) {
  let s = 0;
  for (let i = from + 1; i <= to; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (a.floor !== b.floor) continue;
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function nearbyHint(p: PathPoint) {
  if (p.x === ESCALATOR.x && p.y === ESCALATOR.y) return "At the central atrium";
  if (p.y === YS[0]) return "Along the north corridor";
  if (p.y === YS[YS.length - 1]) return "Along the south corridor";
  return "At the corridor junction";
}

/** total length of the route polyline, used for progress animation */
export function nearestNode(x: number, y: number, floor: number): string {
  let best = "";
  let bd = Infinity;
  for (const n of NODES.values()) {
    if (n.floor !== floor) continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bd) {
      bd = d;
      best = n.id;
    }
  }
  return best;
}

export function routeLength(points: PathPoint[]) {
  return segLen(points, 0, points.length - 1);
}

/** position + heading at a given travelled distance along the route */
export function positionAt(points: PathPoint[], travelled: number) {
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.floor !== b.floor) continue;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + len >= travelled) {
      const t = len === 0 ? 0 : (travelled - acc) / len;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        floor: a.floor,
        heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90,
        index: i,
      };
    }
    acc += len;
  }
  const last = points[points.length - 1]!;
  return { x: last.x, y: last.y, floor: last.floor, heading: 0, index: points.length - 1 };
}