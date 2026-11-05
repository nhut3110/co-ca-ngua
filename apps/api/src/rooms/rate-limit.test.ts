import { expect, it } from 'vitest';
import { roomRateLimiter } from './rate-limit';
it('limits repeated room joins while allowing other operations', () => {
  const middleware = roomRateLimiter();
  let allowed = 0,
    blocked = 0;
  const res = {
    status: (status: number) => ({
      json: () => {
        expect(status).toBe(429);
        blocked++;
      },
    }),
  };
  const next = () => {
    allowed++;
  };
  for (let i = 0; i < 31; i++)
    middleware({ method: 'POST', path: '/rooms/ABC234/join', ip: 'one' }, res, next);
  expect(allowed).toBe(30);
  expect(blocked).toBe(1);
  middleware({ method: 'POST', path: '/rooms/ABC234/join', ip: 'two' }, res, next);
  middleware({ method: 'GET', path: '/rooms/ABC234', ip: 'one' }, res, next);
  expect(allowed).toBe(32);
});
