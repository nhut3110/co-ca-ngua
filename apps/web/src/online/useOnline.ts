import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction } from '@skyhoof/game-core';
import { getRoom, leaveWaitingRoom, sendAction, type Room, type Session } from './api';
const key = 'skyhoof.online.session.v1';
export function useOnline() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as Session | null;
    } catch {
      return null;
    }
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const roomRef = useRef(room);
  roomRef.current = room;
  const accept = useCallback((r: Room) => {
    if (sessionRef.current?.code !== r.code) return;
    setRoom((old) => (!old || r.version >= old.version ? r : old));
    setError('');
  }, []);
  const begin = useCallback((s: Session, r: Room) => {
    sessionStorage.setItem(key, JSON.stringify(s));
    sessionRef.current = s;
    setSession(s);
    setRoom(r);
    setError('');
  }, []);
  const leave = useCallback(async () => {
    const s = sessionRef.current,
      r = roomRef.current;
    if (s && r?.status === 'waiting') {
      try {
        await leaveWaitingRoom(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể rời phòng');
        return false;
      }
    }
    sessionStorage.removeItem(key);
    sessionRef.current = null;
    setSession(null);
    setRoom(null);
    setError('');
    return true;
  }, []);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const r = await getRoom(session);
        if (!cancelled) accept(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không thể kết nối');
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const id = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, accept]);
  const dispatch = useCallback(
    async (action: GameAction) => {
      const s = sessionRef.current,
        r = roomRef.current;
      if (!s || !r || sending) return;
      setSending(true);
      try {
        accept(await sendAction(s, r.version, action));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể thực hiện');
        try {
          accept(await getRoom(s));
        } catch {
          /* next poll retries */
        }
      } finally {
        setSending(false);
      }
    },
    [sending, accept],
  );
  return { session, room, error, sending, begin, leave, accept, dispatch };
}
