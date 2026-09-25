import { menuPosition } from '../menuPosition';
import { accountInitials } from '../AccountImage';

it.each([280, 320, 390, 768, 1024, 1440])('clamps both menu alignments within width %s', (width) => {
  for (const align of ['start', 'end'] as const) {
    for (const x of [0, 200, width - 20]) {
      const position = menuPosition({ x, y: 44, width: 48, height: 48 }, { width, height: 800 }, 288, 176, 108, 34, align);
      expect(position.left).toBeGreaterThanOrEqual(8);
      expect(position.left + position.width).toBeLessThanOrEqual(width - 8);
      expect(position.top).toBeGreaterThanOrEqual(116);
      expect(position.top + Math.min(176, position.maxHeight)).toBeLessThanOrEqual(800 - 34 - 8);
    }
  }
});
it('bounds a tall menu in a short viewport while retaining the header and bottom safe area', () => {
  const position = menuPosition({ x: 260, y: 44, width: 48, height: 48 }, { width: 320, height: 230 }, 288, 220, 108, 34, 'end');
  expect(position.maxHeight).toBe(72); expect(position.top).toBe(116);
});
it('derives only known-name initials, never an invented A', () => {
  expect(accountInitials(undefined)).toBe(''); expect(accountInitials('  ')).toBe('');
  expect(accountInitials(' Glass Houses Collective ')).toBe('GH'); expect(accountInitials('Elsewhere')).toBe('E');
});
