import { useSyncExternalStore } from 'react';
import english from './en.json';
export type Locale = 'vi' | 'en';
const STORAGE_KEY = 'skyhoof.locale';
let locale: Locale = 'vi';
try {
  if (localStorage.getItem(STORAGE_KEY) === 'en') locale = 'en';
} catch {
  /* private browsing */
}
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useLocale() {
  return useSyncExternalStore(
    subscribe,
    () => locale,
    () => 'vi' as Locale,
  );
}
export function setLocale(next: Locale) {
  locale = next;
  document.documentElement.lang = next;
  document.title = next === 'en' ? 'Skyhoof — Enchanted Ludo' : 'Skyhoof — Cá ngựa 3D';
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* preference remains active in memory */
  }
  listeners.forEach((listener) => listener());
}
if (typeof document !== 'undefined') {
  document.documentElement.lang = locale;
  document.title = locale === 'en' ? 'Skyhoof — Enchanted Ludo' : 'Skyhoof — Cá ngựa 3D';
}
const dictionary: Record<string, string> = english;
/** Translate presentation only; saved game state and user-entered names stay intact. */
export function t<T>(value: T, language: Locale = locale): T {
  if (language === 'vi' || typeof value !== 'string') return value;
  const text = value.trim();
  let translated = dictionary[text];
  if (!translated) {
    const patterns: [RegExp, string][] = [
      [/^Xúc xắc (\d+)$/, 'Die $1'],
      [/^Lượt (\d+)$/, 'Turn $1'],
      [/^(.*?) tiến (\d+) bước\.$/, '$1 advances $2 steps.'],
      [/^(.*?) tung được (\d+)\.$/, '$1 rolls $2.'],
      [/^(.*?) đang suy nghĩ…$/, '$1 is thinking…'],
      [/^VẬN MAY · (\d+)$/, 'LUCK · $1'],
      [/^VẬN MỆNH · (\d+)$/, 'FATE · $1'],
      [/^(.*?) được tung thêm sau nước đi$/, '$1 gets a bonus roll after moving'],
      [/^(.*?) đẩy lùi (.*?)$/, '$1 captures $2'],
      [/^(.*?) · Quân (\d+) · (\d+) bước$/, '$1 · Piece $2 · $3 steps'],
      [/^(.*?) · Quân (\d+) đã về đích$/, '$1 · Piece $2 is home'],
      [/^(.*?) · Quân (\d+)$/, '$1 · Piece $2'],
      [/^Đá quân · Quân (\d+)$/, 'Capture · Piece $1'],
      [/^Về đích · Quân (\d+)$/, 'Home · Piece $1'],
      [/^Xuất quân (\d+)$/, 'Deploy piece $1'],
      [/^Đi quân (\d+) · (\d+) bước$/, 'Move piece $1 · $2 steps'],
      [/^(\d+) bước$/, '$1 steps'],
      [/^(.*?) đang chơi$/, '$1 is playing'],
      [/^(.*?) dùng Đổi vận: (\d+)\.$/, '$1 casts Reroll: $2.'],
      [/^(.*?) dùng Bẻ vận: (\d+) bước\.$/, '$1 shifts fate: $2 steps.'],
      [/^(.*?) tạo Kết giới cho quân (\d+)\.$/, '$1 wards piece $2.'],
      [/^(.*?) không có nước đi hợp lệ\.$/, '$1 has no legal moves.'],
      [/^(.*?) đi qua Cổng không gian\.$/, '$1 travels through a portal.'],
      [/^(.*?) đưa quân (\d+) về đích!$/, '$1 brings piece $2 home!'],
      [/^(.*?) đá quân đối thủ về chuồng!$/, '$1 sends a rival back to the stable!'],
      [/^(.*?) di chuyển quân (\d+)\.$/, '$1 moves piece $2.'],
      [/^(.*?) thắng cuộc đua!$/, '$1 wins the race!'],
      [/^Chọn quân (\d+)$/, 'Select piece $1'],
      [/^Quân (\d+) · Xuất quân$/, 'Piece $1 · Deploy'],
      [/^Quân (\d+) · (.*)$/, 'Piece $1 · $2'],
      [/^[Gg]óc (\d+)$/, 'Realm $1'],
      [
        /^(\d+) cơ chế mở rộng được bật. Luật sẽ khóa khi bắt đầu\.$/,
        '$1 optional rules enabled. Rules lock when the match begins.',
      ],
      [/^Ngựa (\d+)$/, 'Piece $1'],
      [/^(.*?) · (\d+) bước$/, '$1 · $2 steps'],
      [/^Máy (\d+)$/, 'Bot $1'],
    ];
    for (const [pattern, replacement] of patterns)
      if (pattern.test(text)) {
        translated = text.replace(pattern, replacement);
        break;
      }
  }
  if (!translated && text.endsWith(' · Tung xúc xắc để tiến quân')) {
    const faction = text.split(' · ')[0];
    translated = `${dictionary[faction] ?? faction} · Roll to advance`;
  }
  return (translated ? value.replace(text, translated) : value) as T;
}
export function LanguageSwitch() {
  const current = useLocale();
  return (
    <div className="language-switch" role="group" aria-label={t('Ngôn ngữ')}>
      {(['vi', 'en'] as const).map((language) => (
        <button
          key={language}
          type="button"
          aria-label={language === 'vi' ? 'Tiếng Việt' : 'English'}
          aria-pressed={current === language}
          onClick={() => setLocale(language)}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
