import { type Shape } from "./types";

export function renderShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  width: number,
  height: number,
  previewShape?: Shape | null 
) {
  // clear the whole canvas before every frame
  ctx.clearRect(0, 0, width, height);

  const all = previewShape ? [...shapes, previewShape] : shapes

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
        shape.x + shape.width / 2,   // center x
        shape.y + shape.height / 2,  // center y
        Math.abs(shape.width / 2),   // radius x
        Math.abs(shape.height / 2),  // radius y
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }

    if (shape.type === 'freehand' && shape.points.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(shape.points[0], shape.points[1]);
      for (let i = 2; i < shape.points.length; i += 2) {
        ctx.lineTo(shape.points[i], shape.points[i + 1]);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}