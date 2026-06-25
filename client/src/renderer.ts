import type { Shape, Camera } from './types';

export function renderShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  width: number,
  height: number,
  camera: Camera,
  previewShape?: Shape | null,
  selectedId?: string | null,
) {
  ctx.clearRect(0, 0, width, height);

  // Apply camera transform — every draw call below is now in world space
  ctx.save();
  ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

  const all = previewShape ? [...shapes, previewShape] : shapes;

  for (const shape of all) {
    ctx.save();
    ctx.strokeStyle = shape.strokeColor;
    ctx.fillStyle = shape.fillColor;
    ctx.lineWidth = shape.strokeWidth;

    if (shape.type === 'rect') {
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
      ctx.fill();
      ctx.stroke();
    }

    if (shape.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        Math.abs(shape.width / 2),
        Math.abs(shape.height / 2),
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }

    if (shape.type === 'freehand' && shape.points.length >= 4) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(shape.points[0], shape.points[1]);
      for (let i = 2; i < shape.points.length; i += 2) {
        ctx.lineTo(shape.points[i], shape.points[i + 1]);
      }
      ctx.stroke();
    }

    // Draw selection highlight around the selected shape
    if (shape.id === selectedId) {
      const PAD = 6;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / camera.scale; // keep highlight 2px visually regardless of zoom
      ctx.setLineDash([6 / camera.scale, 3 / camera.scale]);
      ctx.strokeRect(
        shape.x - PAD,
        shape.y - PAD,
        shape.width + PAD * 2,
        shape.height + PAD * 2,
      );
      ctx.setLineDash([]);

      // Corner handles
      const H = 8 / camera.scale;
      const corners = [
        [shape.x - PAD,              shape.y - PAD],
        [shape.x + shape.width + PAD, shape.y - PAD],
        [shape.x - PAD,              shape.y + shape.height + PAD],
        [shape.x + shape.width + PAD, shape.y + shape.height + PAD],
      ];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5 / camera.scale;
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.rect(cx - H / 2, cy - H / 2, H, H);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Reset transform so anything drawn after this (like UI overlays) is in screen space
  ctx.restore();
}