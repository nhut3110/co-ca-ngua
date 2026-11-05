import { describe, expect, it } from 'vitest';
import { t } from './i18n';
describe('presentation languages', () => {
  it('translates gameplay, setup and accessibility copy while keeping Vietnamese available', () => {
    expect(t('Tung xúc xắc', 'en')).toBe('Roll dice');
    expect(t('Độ khó của bot', 'en')).toBe('Bot difficulty');
    expect(t('Chạm để tung', 'en')).toBe('Tap to roll');
    expect(t('Tung xúc xắc', 'vi')).toBe('Tung xúc xắc');
  });
  it('keeps player names intact inside translated events and move previews', () => {
    expect(t('Nhựt tung được 6.', 'en')).toBe('Nhựt rolls 6.');
    expect(t('Nhựt đẩy lùi Mây', 'en')).toBe('Nhựt captures Mây');
    expect(t('Đi quân 2 · 4 bước', 'en')).toBe('Move piece 2 · 4 steps');
    expect(t('VẬN MỆNH · 3', 'en')).toBe('FATE · 3');
    expect(t('Nhựt tạo Kết giới cho quân 2.', 'en')).toBe('Nhựt wards piece 2.');
  });
  it('preserves whitespace and non-text values used in React presentation', () => {
    expect(t(' người ', 'en')).toBe(' players ');
    const value = { name: 'Nhựt' };
    expect(t(value, 'en')).toBe(value);
    expect(t(null, 'en')).toBeNull();
  });
});
