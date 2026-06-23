export type ShapeType = 'rect' | 'ellipse' | 'freehand';

// 'select' is a tool but not a shape — that's why they're separate types
export type Tool = 'select' | 'rect' | 'ellipse' | 'freehand' | 'eraser';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  points: number[];
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

// The camera: where we're looking and how zoomed in we are
export interface Camera {
  x: number;      // pan offset X in screen pixels
  y: number;      // pan offset Y in screen pixels
  scale: number;  // zoom level: 1 = 100%, 2 = 200%, 0.5 = 50%
}

// A normalized rectangle — always positive width/height
// Used for the marquee selection rect
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}