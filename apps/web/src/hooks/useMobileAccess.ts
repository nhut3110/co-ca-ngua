import { useEffect, useState } from 'react';

export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function deviceState() {
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)) ||
    (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 900);
  const installed =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { mobile, installed, portrait: innerHeight > innerWidth };
}

export function useMobileAccess() {
  const [device, setDevice] = useState(deviceState);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const update = () => setDevice(deviceState());
    const standalone = matchMedia('(display-mode: standalone)');
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => {
      setPrompt(null);
      setHint('Đã cài đặt ứng dụng Skyhoof.');
      update();
    };
    window.addEventListener('resize', update);
    window.addEventListener('pageshow', update);
    standalone.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('pageshow', update);
      standalone.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const install = async () => {
    if (!prompt || installing) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setHint(
        choice.outcome === 'accepted'
          ? 'Đã cài đặt Skyhoof vào màn hình chính.'
          : 'Bạn có thể cài lại từ menu trình duyệt bất cứ lúc nào.',
      );
    } catch {
      setHint('Mở menu trình duyệt và chọn Thêm vào màn hình chính.');
    } finally {
      setPrompt(null);
      setInstalling(false);
    }
  };

  return {
    ...device,
    // Playable immediately on all mobile & desktop orientations without blocking
    blocked: false,
    canInstall: !!prompt,
    installing,
    hint,
    install,
  };
}
