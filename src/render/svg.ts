import type { Shape, Frame } from './frame';
export const fontFamilies = {
  display: 'Barlow Condensed',
  sans: 'Manrope Variable',
  mono: 'IBM Plex Mono',
};
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export function shapeMarkup(shape: Shape): string {
  const a = `fill="${escape(shape.color)}" opacity="${shape.alpha}"`;
  if (shape.type === 'text')
    return `<text x="${shape.x}" y="${shape.y}" dominant-baseline="text-before-edge" text-anchor="${shape.align === 'center' ? 'middle' : shape.align === 'right' ? 'end' : 'start'}" font-family="${fontFamilies[shape.font]}" font-size="${shape.size}" font-weight="${shape.font === 'display' ? 700 : 500}" ${a}>${escape(shape.text)}</text>`;
  if (shape.type === 'rect')
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.radius ?? 0}" ${a}/>`;
  if (shape.type === 'circle')
    return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" ${shape.stroke ? `fill="none" stroke="${escape(shape.color)}" stroke-width="${shape.stroke}" opacity="${shape.alpha}"` : a}/>`;
  return `<polygon points="${shape.points.join(' ')}" transform="translate(${shape.x} ${shape.y})" ${a}/>`;
}
export function frameToSvg(frame: Frame): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" role="img" aria-label="${escape(frame.title)}">${frame.shapes.map(shapeMarkup).join('')}</svg>`;
}
