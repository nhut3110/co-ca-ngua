import { RoomService } from '../../apps/api/src/rooms/room-service.js';
import type { RoomStore } from '../../apps/api/src/rooms/room-store.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'content-type, x-room-token, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};
export function createHandler(store: RoomStore) {
  const rooms = new RoomService(store);
  // Best effort per isolate only; this is not a distributed rate limiter.
  const windows = new Map<string, { count: number; reset: number }>();
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const path = new URL(req.url).pathname;
      const match = path.match(
        /\/rooms(?:\/([A-Za-z2-9]{6})(?:\/(join|leave|start|actions))?)?\/?$/,
      );
      if (!match) return Response.json({ message: 'Not Found' }, { status: 404, headers: cors });
      if (req.method === 'POST' && (!match[1] || match[2] === 'join')) {
        const now = Date.now();
        if (windows.size > 5000) {
          for (const [key, value] of windows) if (value.reset <= now) windows.delete(key);
          if (windows.size > 5000)
            return Response.json({ message: 'Quá nhiều yêu cầu.' }, { status: 429, headers: cors });
        }
        const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
        let window = windows.get(ip);
        if (!window || window.reset <= now) {
          window = { count: 0, reset: now + 60_000 };
          windows.set(ip, window);
        }
        if (++window.count > 30)
          return Response.json({ message: 'Quá nhiều yêu cầu.' }, { status: 429, headers: cors });
      }
      let body: any = {};
      if (req.method === 'POST' && (match[2] === 'join' || match[2] === 'actions' || !match[1])) {
        const text = await req.text();
        if (text.length > 16384)
          return Response.json({ message: 'Request too large' }, { status: 413, headers: cors });
        try {
          body = JSON.parse(text);
        } catch {
          return Response.json({ message: 'Invalid JSON' }, { status: 400, headers: cors });
        }
      }
      const code = match[1]?.toUpperCase();
      const token = req.headers.get('x-room-token') ?? '';
      let result: unknown;
      if (!code && req.method === 'POST')
        result = await rooms.create(body?.config, body?.name, body?.botCount);
      else if (code && !match[2] && req.method === 'GET')
        result = await rooms.snapshot(code, token);
      else if (code && req.method === 'POST' && match[2] === 'join')
        result = await rooms.join(code, body?.name);
      else if (code && req.method === 'POST' && match[2] === 'leave')
        result = await rooms.leaveWaiting(code, token);
      else if (code && req.method === 'POST' && match[2] === 'start')
        result = await rooms.start(code, token);
      else if (code && req.method === 'POST' && match[2] === 'actions')
        result = await rooms.action(code, token, body?.version, body?.action);
      else return Response.json({ message: 'Not Found' }, { status: 404, headers: cors });
      return Response.json(result, { status: req.method === 'POST' ? 201 : 200, headers: cors });
    } catch (error) {
      const status =
        typeof (error as any)?.getStatus === 'function' ? (error as any).getStatus() : 500;
      return Response.json(
        { message: status === 500 ? 'Lỗi máy chủ.' : (error as Error).message },
        { status, headers: cors },
      );
    }
  };
}
