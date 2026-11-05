import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameAudio,
  AUDIO_KEY,
  readAudioPreferences,
  type AudioPreferences,
  type SoundCue,
} from './GameAudio';
export function useGameAudio(blocked: boolean) {
  const [preferences, setPreferences] = useState(readAudioPreferences);
  const engine = useRef<GameAudio | null>(null);
  // Create in the effect so StrictMode's setup/cleanup replay never leaves a closed engine.
  useEffect(() => {
    const audio = new GameAudio(readAudioPreferences());
    engine.current = audio;
    const unlock = () => {
      void audio.unlock();
    };
    const click = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('button');
      if (
        button &&
        !button.disabled &&
        !button.matches('#roll-dice, #confirm-move, .horse-actions button, .spell-actions button')
      )
        audio.play('ui');
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('click', click);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', click);
      audio.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.setBlocked(blocked);
  }, [blocked]);
  useEffect(() => {
    engine.current?.update(preferences);
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(preferences));
    } catch {
      /* Optional persistence. */
    }
  }, [preferences]);
  const play = useCallback((cue: SoundCue) => engine.current?.play(cue), []);
  const update = useCallback((patch: Partial<AudioPreferences>) => {
    void engine.current?.unlock();
    setPreferences((p) => ({ ...p, ...patch }));
  }, []);
  const status = useCallback(() => engine.current?.status(), []);
  return { preferences, update, play, status };
}
