import { Application, Container, Graphics, Text } from 'pixi.js';
import { fontFamilies } from './svg';
import type { Frame } from './frame';

export async function createRenderer(host: HTMLElement, width: number, height: number) {
  const app = new Application();
  await app.init({
    width: 1920,
    height: 1080,
    backgroundAlpha: 0,
    autoStart: false,
    antialias: true,
    resolution: 1,
    preference: ['webgl'],
    preserveDrawingBuffer: true,
  });
  const canvas = app.canvas;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  app.renderer.resize(Math.min(width * 2, 1920), Math.min(height * 2, 1080));
  const layer = new Container();
  app.stage.addChild(layer);
  const nodes = new Map<string, { node: Text | Graphics; signature: string }>();
  const draw = (frame: Frame) => {
    const visible = new Set<string>();
    for (const shape of frame.shapes) {
      visible.add(shape.id);
      const signature =
        shape.type === 'text'
          ? [shape.text, shape.color, shape.size, shape.font, shape.align].join('|')
          : JSON.stringify({ ...shape, x: 0, y: 0, alpha: 1 });
      let entry = nodes.get(shape.id);
      if (!entry || entry.node instanceof Text !== (shape.type === 'text')) {
        if (entry) {
          layer.removeChild(entry.node);
          entry.node.destroy();
        }
        const node =
          shape.type === 'text'
            ? new Text({
                text: '',
                style: {
                  fontFamily: fontFamilies[shape.font],
                  fontWeight: shape.font === 'display' ? '700' : '500',
                },
              })
            : new Graphics();
        layer.addChild(node);
        entry = { node, signature: '' };
        nodes.set(shape.id, entry);
      }
      const node = entry.node;
      node.position.set(shape.x, shape.y);
      node.alpha = shape.alpha;
      if (signature !== entry.signature) {
        if (node instanceof Text && shape.type === 'text') {
          node.text = shape.text;
          node.style.fontFamily = fontFamilies[shape.font];
          node.style.fontSize = shape.size;
          node.style.fill = shape.color;
          node.anchor.set(shape.align === 'center' ? 0.5 : shape.align === 'right' ? 1 : 0, 0);
        } else if (node instanceof Graphics) {
          node.clear();
          if (shape.type === 'rect')
            node.roundRect(0, 0, shape.width, shape.height, shape.radius ?? 0).fill(shape.color);
          if (shape.type === 'circle') {
            node.circle(0, 0, shape.radius);
            if (shape.stroke) node.stroke({ width: shape.stroke, color: shape.color });
            else node.fill(shape.color);
          }
          if (shape.type === 'poly') node.poly(shape.points).fill(shape.color);
        }
        entry.signature = signature;
      }
      node.visible = true;
      // Match scene-graph order after a scene change while retaining text/geometry objects.
      layer.setChildIndex(node, layer.children.length - 1);
    }
    for (const [id, entry] of nodes) if (!visible.has(id)) entry.node.visible = false;
    layer.scale.set(app.renderer.width / 1920, app.renderer.height / 1080);
    app.renderer.render(app.stage);
  };
  return {
    draw,
    destroy: () => {
      app.destroy(true, { children: true, texture: true, textureSource: true });
    },
    canvas,
  };
}
