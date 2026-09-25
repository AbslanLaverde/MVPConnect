export interface MenuRect { x: number; y: number; width: number; height: number }

export function menuPosition(anchor: MenuRect, viewport: { width: number; height: number },
  preferredWidth: number, menuHeight: number, headerBottom: number, bottomInset: number, align: 'start' | 'end') {
  const gutter = 8;
  const width = Math.min(preferredWidth, Math.max(0, viewport.width - gutter * 2));
  const maxHeight = Math.max(0, viewport.height - bottomInset - headerBottom - gutter * 2);
  const left = Math.min(Math.max(gutter, align === 'end' ? anchor.x + anchor.width - width : anchor.x),
    Math.max(gutter, viewport.width - width - gutter));
  const top = Math.max(headerBottom + gutter, Math.min(anchor.y + anchor.height + gutter,
    viewport.height - bottomInset - gutter - Math.min(menuHeight, maxHeight)));
  return { left, top, width, maxHeight };
}
