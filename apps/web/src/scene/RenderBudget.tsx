import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
/** Idle water/glow updates at 12fps on handhelds and 24fps on desktop; actions and camera gestures render at display rate.
 * Shadow maps are cached at rest instead of redrawing every tree each frame. */
export function RenderBudget({
  active,
  eventId,
  duration = 0,
  paused,
  handheld = false,
}: {
  active: boolean;
  eventId?: number;
  duration?: number;
  paused?: boolean;
  handheld?: boolean;
}) {
  const { gl, invalidate } = useThree();
  const action = useRef({ id: eventId, remaining: 0 });
  if (action.current.id !== eventId) action.current = { id: eventId, remaining: duration + 0.3 };
  useEffect(() => {
    const baseline = new URLSearchParams(location.search).get('renderProfile') === 'baseline';
    const auto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = baseline;
    gl.shadowMap.needsUpdate = true;
    const timer = setInterval(
      () => {
        if (!paused && !document.hidden) invalidate();
      },
      1000 / (baseline ? 60 : handheld ? 12 : 24),
    );
    invalidate();
    return () => {
      clearInterval(timer);
      gl.shadowMap.autoUpdate = auto;
    };
  }, [gl, invalidate, paused, handheld]);
  useFrame((_, dt) => {
    if (!paused && active && action.current.remaining > 0) {
      action.current.remaining -= Math.min(dt, 0.1);
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }
  });
  return null;
}
