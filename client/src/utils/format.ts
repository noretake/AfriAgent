export const usd = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(2)}%`);

export const qty = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 8 }));

export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "—");

export const shortId = (id: string) => id.slice(0, 8);
