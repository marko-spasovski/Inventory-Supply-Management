// A QR code can encode a product so it can be added by scanning. The payload
// is a JSON object, e.g.:
//   {"t":"product","name":"Kladivo","sku":"KLA-001",
//    "description":"Jekleno kladivo","weight":0.7,"category":"Orodje"}
//
// `t:"product"` (or a name+sku pair) marks it as a create-product payload,
// distinguishing it from a plain SKU barcode used for lookup. `category` is a
// category NAME (optional) — the create form resolves it to a category id, or
// the user picks one if it doesn't match.
export interface ScannedProduct {
  name:         string;
  sku:          string;
  description?: string;
  weight?:      number;
  category?:    string;
}

export function parseProductPayload(raw: string): ScannedProduct | null {
  let obj: unknown;
  try {
    obj = JSON.parse(raw.trim());
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;

  const o = obj as Record<string, unknown>;
  const isProduct = o['t'] === 'product' || (typeof o['name'] === 'string' && typeof o['sku'] === 'string');
  if (!isProduct) return null;
  if (typeof o['name'] !== 'string' || typeof o['sku'] !== 'string') return null;

  const weightRaw = o['weight'];
  const weight =
    typeof weightRaw === 'number' ? weightRaw
    : typeof weightRaw === 'string' && weightRaw.trim() !== '' && !Number.isNaN(Number(weightRaw)) ? Number(weightRaw)
    : undefined;

  return {
    name:        o['name'],
    sku:         o['sku'],
    description: typeof o['description'] === 'string' ? o['description'] : undefined,
    weight,
    category:    typeof o['category'] === 'string' ? o['category'] : undefined,
  };
}
