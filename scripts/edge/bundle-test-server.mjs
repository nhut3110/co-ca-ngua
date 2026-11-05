import { createServer } from 'node:http';
import { Readable } from 'node:stream';
const rows = new Map();
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname !== 'edge-storage.test') return realFetch(input, init);
  const method = init.method ?? 'GET';
  if (method === 'POST') {
    const row = JSON.parse(init.body);
    if (rows.has(row.code)) return new Response(null, { status: 409 });
    rows.set(row.code, row);
    return new Response(null, { status: 201 });
  }
  const code = url.searchParams.get('code')?.slice(3);
  const row = rows.get(code);
  if (method === 'GET') return Response.json(row ? [{ data: structuredClone(row.data) }] : []);
  if (method === 'PATCH') {
    const expected = Number(url.searchParams.get('version')?.slice(3));
    if (!row || row.version !== expected) return Response.json([]);
    Object.assign(row, JSON.parse(init.body));
    return Response.json([{ data: row.data }]);
  }
  throw new Error('Unexpected storage request');
};
globalThis.Deno = {
  env: {
    get: (key) =>
      ({ SUPABASE_URL: 'https://edge-storage.test', SUPABASE_SERVICE_ROLE_KEY: 'test-only' })[key],
  },
  serve: (handler) => {
    createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const request = new Request(`http://127.0.0.1:3109${req.url}`, {
        method: req.method,
        headers: req.headers,
        ...(body.length ? { body } : {}),
      });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(res);
      else res.end();
    }).listen(3109, '127.0.0.1', () => console.log('edge test ready'));
  },
};
await import('../../supabase/functions/rooms/index.ts');
