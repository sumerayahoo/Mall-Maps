import { PRODUCTS, poiById, type Product } from "./mall-data";

export type Match = {
  product: Product;
  storeName: string;
  floor: number;
  storeId: string;
  score: number;
};

export type SearchResult = {
  interpretation: string;
  matches: Match[];
  usedAi: boolean;
};

type Cue = { color?: string | undefined; category?: string | undefined; keywords: string[] };

const COLORS = [
  "pink","black","brown","beige","blue","white","red","green","yellow","purple","grey","gold",
];
const CATEGORIES = ["bag", "shoes", "clothing", "accessory"];

const CATEGORY_WORDS: Record<string, string[]> = {
  bag: ["bag", "handbag", "purse", "tote", "clutch", "backpack", "crossbody"],
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "heels", "boots"],
  clothing: ["dress", "shirt", "jacket", "clothes", "jeans"],
  accessory: ["watch", "scarf", "belt", "sunglasses"],
};

export function cuesFromText(text: string): Cue {
  const t = text.toLowerCase();
  const color = COLORS.find((c) => t.includes(c));
  const category = CATEGORIES.find((c) =>
    (CATEGORY_WORDS[c] ?? []).some((w) => t.includes(w)),
  );
  const keywords = t.split(/[^a-z]+/).filter((w) => w.length > 2);
  return { color, category, keywords };
}

export function rank(cue: Cue): Match[] {
  const scored = PRODUCTS.map((product) => {
    let score = 0;
    if (cue.color && product.color === cue.color) score += 50;
    if (cue.category && product.category === cue.category) score += 30;
    const hay = `${product.name} ${product.tags.join(" ")} ${product.color} ${product.category}`.toLowerCase();
    for (const k of cue.keywords) if (hay.includes(k)) score += 6;
    const store = poiById(product.storeId);
    return {
      product,
      storeId: product.storeId,
      storeName: store?.name ?? "Unknown store",
      floor: store?.floor ?? 1,
      score,
    };
  }).filter((m) => m.score > 0);

  // best matches first, then price from highest to lowest
  scored.sort((a, b) => b.score - a.score || b.product.price - a.product.price);
  const top = scored.slice(0, 8);
  top.sort((a, b) => b.product.price - a.product.price);
  return top;
}

export async function describeImage(imageDataUrl: string, note: string): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You identify shoppable products. Reply with a single short phrase: colour + item type + one style word. Example: 'pink quilted handbag'.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: note || "What product is this?" },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error("AI gateway request failed", e);
    return null;
  }
}