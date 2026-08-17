export const XS = [120, 300, 480, 660, 840];
export const YS = [120, 340, 560];
export const MAP_W = 960;
export const MAP_H = 760;
/** map units -> meters */
export const UNIT_M = 0.1;

export type Category =
  | "shop"
  | "food"
  | "washroom"
  | "funcity"
  | "escalator"
  | "entrance"
  | "service";

export type Poi = {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  floor: number;
  /** label / destination point */
  x: number;
  y: number;
  rect: { x: number; y: number; w: number; h: number };
  /** corridor node the unit's door opens onto */
  node: string;
};

export type Floor = { id: number; name: string; short: string };

export const FLOORS: Floor[] = [
  { id: 1, name: "Floor 1 — Ground", short: "1" },
  { id: 2, name: "Floor 2 — Fashion & Food Court", short: "2" },
  { id: 3, name: "Floor 3 — FunCity & Dining", short: "3" },
];

export const nodeId = (floor: number, x: number, y: number) => `f${floor}:${x},${y}`;

type Band = "top" | "mid" | "low" | "bottom";

const BANDS: Record<Band, { y: number; h: number; doorY: number }> = {
  top: { y: 24, h: 92, doorY: 120 },
  mid: { y: 156, h: 148, doorY: 340 },
  low: { y: 380, h: 148, doorY: 340 },
  bottom: { y: 568, h: 92, doorY: 560 },
};

const nearestX = (cx: number): number =>
  XS.reduce<number>((a, b) => (Math.abs(b - cx) < Math.abs(a - cx) ? b : a), 120);

function unit(
  floor: number,
  id: string,
  name: string,
  category: Category,
  cx: number,
  band: Band,
  tags: string[] = [],
  w = 168,
): Poi {
  const b = BANDS[band]!;
  const doorSide = band === "top" || band === "low" ? "bottom" : "top";
  return {
    id,
    name,
    category,
    tags,
    floor,
    x: cx,
    y: b.y + b.h / 2,
    rect: { x: cx - w / 2, y: b.y, w, h: b.h },
    node: nodeId(floor, nearestX(cx), b.doorY),
  };
  void doorSide;
}

export const POIS: Poi[] = [
  // ---------------- Ground floor ----------------
  unit(1, "g-entrance", "Main Entrance", "entrance", 480, "bottom", ["entrance", "door"]),
  unit(1, "g-zara", "Zara", "shop", 120, "top", ["fashion", "clothes", "bags", "women"]),
  unit(1, "g-hm", "H&M", "shop", 300, "top", ["fashion", "clothes", "bags"]),
  unit(1, "g-bagbar", "The Bag Bar", "shop", 480, "top", ["bags", "handbag", "purse", "leather"]),
  unit(1, "g-nike", "Nike", "shop", 660, "top", ["sports", "shoes", "sneakers"]),
  unit(1, "g-sephora", "Sephora", "shop", 840, "top", ["beauty", "makeup", "perfume"]),
  unit(1, "g-wc-a", "Washrooms West", "washroom", 120, "mid", ["toilet", "restroom", "wc"]),
  unit(1, "g-charles", "Charles & Keith", "shop", 300, "mid", ["bags", "handbag", "shoes", "women"]),
  unit(1, "g-info", "Information Desk", "service", 480, "mid", ["help", "info", "lost and found"]),
  unit(1, "g-pandora", "Pandora", "shop", 660, "mid", ["jewellery", "gifts"]),
  unit(1, "g-pharmacy", "City Pharmacy", "service", 840, "mid", ["pharmacy", "medicine"]),
  unit(1, "g-supermarket", "FreshMart Supermarket", "shop", 210, "low", ["grocery", "food", "supermarket"], 348),
  unit(1, "g-cafe", "Bean & Brew Cafe", "food", 480, "low", ["coffee", "cafe", "snacks"]),
  unit(1, "g-apple", "Apple Store", "shop", 660, "low", ["electronics", "phone", "laptop"]),
  unit(1, "g-wc-b", "Washrooms East", "washroom", 840, "low", ["toilet", "restroom", "wc"]),
  unit(1, "g-bookshop", "Page Turner Books", "shop", 210, "bottom", ["books", "stationery"]),
  unit(1, "g-flowers", "Bloom Florist", "shop", 750, "bottom", ["flowers", "gifts"]),

  // ---------------- First floor ----------------
  unit(2, "f1-mango", "Mango", "shop", 120, "top", ["fashion", "clothes", "bags", "women"]),
  unit(2, "f1-aldo", "Aldo", "shop", 300, "top", ["bags", "shoes", "handbag"]),
  unit(2, "f1-lc", "Lulu Couture", "shop", 480, "top", ["fashion", "bags", "party", "women"]),
  unit(2, "f1-adidas", "Adidas", "shop", 660, "top", ["sports", "shoes", "bags", "backpack"]),
  unit(2, "f1-samsung", "Samsung Experience", "shop", 840, "top", ["electronics", "phone"]),
  unit(2, "f1-wc-a", "Washrooms West", "washroom", 120, "mid", ["toilet", "restroom", "wc"]),
  unit(2, "f1-uniqlo", "Uniqlo", "shop", 300, "mid", ["fashion", "clothes", "basics"]),
  unit(2, "f1-kidsworld", "Kids World", "shop", 480, "mid", ["kids", "toys", "children", "bags"]),
  unit(2, "f1-swatch", "Swatch", "shop", 660, "mid", ["watches", "gifts"]),
  unit(2, "f1-wc-b", "Washrooms East", "washroom", 840, "mid", ["toilet", "restroom", "wc"]),
  unit(2, "f1-homecentre", "Home Centre", "shop", 210, "low", ["home", "furniture", "decor"], 348),
  unit(2, "f1-decathlon", "Decathlon", "shop", 660, "low", ["sports", "outdoor", "backpack", "bags"], 348),
  unit(2, "f1-foodcourt", "Skyline Food Court", "food", 480, "bottom", ["food court", "restaurants", "eat"], 620),

  // ---------------- Second floor ----------------
  unit(3, "f2-funcity", "FunCity Arcade", "funcity", 210, "top", ["games", "arcade", "kids", "rides"], 348),
  unit(3, "f2-bowling", "Strike Bowling", "funcity", 570, "top", ["bowling", "games", "fun"], 348),
  unit(3, "f2-cinema", "Galaxy Cinemas", "funcity", 810, "top", ["movies", "cinema", "film"]),
  unit(3, "f2-wc-a", "Washrooms West", "washroom", 120, "mid", ["toilet", "restroom", "wc"]),
  unit(3, "f2-vr", "VR Zone", "funcity", 300, "mid", ["virtual reality", "games", "fun"]),
  unit(3, "f2-kidscare", "Baby Care Room", "service", 480, "mid", ["baby", "nursing", "family"]),
  unit(3, "f2-trampoline", "Sky Jump Trampoline", "funcity", 660, "mid", ["trampoline", "kids", "fun"]),
  unit(3, "f2-wc-b", "Washrooms East", "washroom", 840, "mid", ["toilet", "restroom", "wc"]),
  unit(3, "f2-burger", "Burger Yard", "food", 120, "low", ["burger", "fast food"]),
  unit(3, "f2-sushi", "Sushi Bay", "food", 300, "low", ["sushi", "japanese"]),
  unit(3, "f2-biryani", "Biryani House", "food", 480, "low", ["biryani", "indian", "desi"]),
  unit(3, "f2-pizza", "Pizza Piazza", "food", 660, "low", ["pizza", "italian"]),
  unit(3, "f2-dessert", "Sweet Spot Desserts", "food", 840, "low", ["dessert", "ice cream", "cake"]),
  unit(3, "f2-terrace", "Terrace Food Court", "food", 480, "bottom", ["food court", "seating", "eat"], 620),
];

/** Vertical transport, present on every floor at the same spot */
export const ESCALATOR = { x: 480, y: 340 };
export const ENTRANCE_NODE = nodeId(1, 480, 700);

export const poiById = (id: string) => POIS.find((p) => p.id === id);

// ---------------- Product catalog (for AI visual search) ----------------
export type Product = {
  id: string;
  name: string;
  color: string;
  category: string;
  price: number;
  storeId: string;
  tags: string[];
};

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Quilted Chain Shoulder Bag", color: "pink", category: "bag", price: 489, storeId: "g-bagbar", tags: ["handbag", "chain", "quilted", "evening"] },
  { id: "p2", name: "Blush Leather Tote", color: "pink", category: "bag", price: 415, storeId: "g-charles", tags: ["tote", "leather", "work"] },
  { id: "p3", name: "Rose Mini Crossbody", color: "pink", category: "bag", price: 349, storeId: "f1-aldo", tags: ["crossbody", "mini", "party"] },
  { id: "p4", name: "Fuchsia Party Clutch", color: "pink", category: "bag", price: 299, storeId: "f1-lc", tags: ["clutch", "party", "satin"] },
  { id: "p5", name: "Pink Canvas Backpack", color: "pink", category: "bag", price: 229, storeId: "f1-adidas", tags: ["backpack", "sports", "canvas"] },
  { id: "p6", name: "Pastel Pink Shopper", color: "pink", category: "bag", price: 189, storeId: "g-hm", tags: ["shopper", "tote", "casual"] },
  { id: "p7", name: "Bubblegum Kids Bag", color: "pink", category: "bag", price: 89, storeId: "f1-kidsworld", tags: ["kids", "cute", "school"] },
  { id: "p8", name: "Structured Black Tote", color: "black", category: "bag", price: 520, storeId: "g-zara", tags: ["tote", "office", "leather"] },
  { id: "p9", name: "Tan Saddle Bag", color: "brown", category: "bag", price: 375, storeId: "g-charles", tags: ["saddle", "leather"] },
  { id: "p10", name: "Beige Hobo Bag", color: "beige", category: "bag", price: 265, storeId: "f1-mango", tags: ["hobo", "slouchy"] },
  { id: "p11", name: "Pink Running Sneakers", color: "pink", category: "shoes", price: 310, storeId: "g-nike", tags: ["sneakers", "running"] },
  { id: "p12", name: "Rose Gold Heels", color: "pink", category: "shoes", price: 275, storeId: "f1-aldo", tags: ["heels", "party"] },
  { id: "p13", name: "Pink Hiking Daypack", color: "pink", category: "bag", price: 159, storeId: "f1-decathlon", tags: ["backpack", "outdoor", "hiking"] },
  { id: "p14", name: "Pink Silk Scarf", color: "pink", category: "accessory", price: 120, storeId: "g-zara", tags: ["scarf", "silk"] },
  { id: "p15", name: "Blue Denim Jacket", color: "blue", category: "clothing", price: 210, storeId: "f1-uniqlo", tags: ["denim", "jacket"] },
  { id: "p16", name: "White Sneakers", color: "white", category: "shoes", price: 240, storeId: "g-nike", tags: ["sneakers", "casual"] },
  { id: "p17", name: "Pink Smartwatch Band", color: "pink", category: "accessory", price: 95, storeId: "g-apple", tags: ["watch", "band", "tech"] },
  { id: "p18", name: "Coral Beach Bag", color: "pink", category: "bag", price: 145, storeId: "g-hm", tags: ["beach", "straw", "summer"] },
];