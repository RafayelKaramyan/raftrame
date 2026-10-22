import type { Frame } from './frame';
import { fontFamilies } from './svg';

export async function framePng(frame: Frame): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error(
      'This browser could not create an image. Your editable project can still be exported.',
    );
  for (const shape of frame.shapes) {
    ctx.save();
    ctx.globalAlpha = shape.alpha;
    ctx.fillStyle = shape.color;
    ctx.translate(shape.x, shape.y);
    if (shape.type === 'text') {
      ctx.font = `${shape.font === 'display' ? 700 : 500} ${shape.size}px "${fontFamilies[shape.font]}"`;
      ctx.textBaseline = 'top';
      ctx.textAlign = shape.align ?? 'left';
      ctx.fillText(shape.text, 0, 0);
    } else {
      ctx.beginPath();
      if (shape.type === 'rect') ctx.roundRect(0, 0, shape.width, shape.height, shape.radius ?? 0);
      if (shape.type === 'circle') ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
      if (shape.type === 'poly') {
        shape.points.forEach((_, i) => {
          if (i % 2 === 0) {
            if (i === 0) ctx.moveTo(shape.points[i]!, shape.points[i + 1]!);
            else ctx.lineTo(shape.points[i]!, shape.points[i + 1]!);
          }
        });
        ctx.closePath();
      }
      if (shape.type === 'circle' && shape.stroke) {
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.stroke;
        ctx.stroke();
      } else ctx.fill();
    }
    ctx.restore();
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('The image could not be exported. Try again.')),
      'image/png',
    ),
  );
}
