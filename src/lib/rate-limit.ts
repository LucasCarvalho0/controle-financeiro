// Limitador simples em memória. LIMITAÇÃO: em ambiente serverless (Vercel) cada instância tem
// seu próprio contador; para produção use Upstash Redis / tabela no banco.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max = 5, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return true; }
  h.count += 1;
  return h.count <= max;
}
