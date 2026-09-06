import { HTTPException } from 'hono/http-exception';
import { purchaseDateSchema, currencies, type Rate } from '../shared/reimbursement';

export async function historicalRate(db: D1Database, currency: string, date: string, fetcher: typeof fetch = fetch): Promise<Rate> {
  purchaseDateSchema.parse(date);
  if (currency === 'EUR') return { currency, requestedDate: date, rateDate: date, rate: 1, source: 'EUR (no conversion)' };
  if (!currencies.some(c => c.code === currency)) throw new HTTPException(422, { message: 'Unsupported purchase currency.' });
  const key = `${currency}:${date}`;
  const cached = await db.prepare('SELECT rate, rate_date, source FROM rate_cache WHERE key = ?').bind(key).first<{ rate: number; rate_date: string; source: string }>();
  if (cached) return { currency, requestedDate: date, rateDate: cached.rate_date, rate: cached.rate, source: cached.source };
  try {
    const response = await fetcher(`https://api.frankfurter.dev/v2/rate/${currency}/EUR?date=${date}&providers=ECB`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Unavailable rate');
    const data = await response.json() as { date: string; rate: number; base: string; quote: string };
    const distance = new Date(date).getTime() - new Date(data.date).getTime();
    if (data.base !== currency || data.quote !== 'EUR' || !Number.isFinite(data.rate) || data.rate <= 0 || !Number.isFinite(distance) || distance < 0 || distance > 7 * 86400000) throw new Error('Invalid historical rate');
    const source = 'European Central Bank via Frankfurter';
    // Current-day rates can still change; only cache past purchase dates.
    if (date < new Date().toISOString().slice(0, 10)) await db.prepare('INSERT OR IGNORE INTO rate_cache (key, rate, rate_date, source) VALUES (?, ?, ?, ?)').bind(key, data.rate, data.date, source).run();
    return { currency, requestedDate: date, rateDate: data.date, rate: data.rate, source };
  } catch {
    throw new HTTPException(503, { message: `No historical ${currency}/EUR rate is available for ${date}. Please retry later; no current rate has been substituted.` });
  }
}
