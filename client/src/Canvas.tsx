import { useEffect, useRef, useState, useCallback } from 'react';
import type { Shape, Tool, Camera } from './types';
import { renderShapes } from './renderer';
import Toolbar from './Toolbar';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_STYLE = {
  strokeColor: '#3b82f6',
  fillColor: '#eff6ff',
  strokeWidth: 2,
};

const DEFAULT_CAMERA: Camera = {
  x: 0,
  y: 0,
  scale: 1,
};

// Convert a screen-space mouse position to world space
// This is the most important utility in the whole app
function screenToWorld(sx: number, sy: number, camera: Camera) {
  return {
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale,
  };
}

// Hit test: is world point (px, py) inside this shape?
// Returns true for rects and ellipses. Freehand uses bounding box for simplicity.
function hitTest(shape: Shape, px: number, py: number): boolean {
  const { x, y, width, height } = shape;
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

// Find the topmost shape under a world-space point
// Iterate in reverse so shapes drawn later (on top) win
function findShapeAt(shapes: Shape[], px: number, py: number): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (hitTest(shapes[i], px, py)) return shapes[i];
  }
  return null;
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [preview, setPreview] = useState<Shape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);

  // ─── Refs for hot-path values ─────────────────────────────────────────────
  // These change every mousemove frame — keeping them in refs avoids
  // triggering React re-renders on every mouse event

  const isDrawing = useRef(false);      // currently drawing a new shape
  const isPanning = useRef(false);      // currently panning with space+drag
  const isDragging = useRef(false);     // currently dragging a selected shape
  const spaceHeld = useRef(false);      // is spacebar currently pressed

  const startScreen = useRef({ x: 0, y: 0 });  // mousedown position in screen space
  const startWorld = useRef({ x: 0, y: 0 });   // mousedown position in world space
  const dragStartShape = useRef({ x: 0, y: 0 }); // shape position when drag began
  const panStart = useRef({ x: 0, y: 0 });     // camera position when pan began

  const livePoints = useRef<number[]>([]);

  // Mirrors of state values for use inside event handler closures
  // (closures capture the value at creation time, so stale state is a common bug)
  const currentTool = useRef<Tool>('select');
  const currentCamera = useRef<Camera>(DEFAULT_CAMERA);
  const currentShapes = useRef<Shape[]>([]);
  const currentSelectedId = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { currentTool.current = tool; }, [tool]);
  useEffect(() => { currentCamera.current = camera; }, [camera]);
  useEffect(() => { currentShapes.current = shapes; }, [shapes]);
  useEffect(() => { currentSelectedId.current = selectedId; }, [selectedId]);

  // ─── Cursor style ─────────────────────────────────────────────────────────
  // Update canvas cursor based on mode
  const updateCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isPanning.current || spaceHeld.current) {
      canvas.style.cursor = isPanning.current ? 'grabbing' : 'grab';
    } else if (currentTool.current === 'select') {
      canvas.style.cursor = 'default';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, []);

  // ─── Re-render whenever anything visual changes ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderShapes(ctx, shapes, canvas.width, canvas.height, camera, preview, selectedId);
  }, [shapes, preview, selectedId, camera]);

  // ─── Resize handler ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setShapes(s => [...s]); // trigger re-render
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ─── Keyboard handlers (space for pan mode) ───────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceHeld.current = true;
        updateCursor();
      }
      // Escape deselects
      if (e.code === 'Escape') {
        setSelectedId(null);
      }
      // Delete/Backspace removes selected shape
      if ((e.code === 'Delete' || e.code === 'Backspace') && currentSelectedId.current) {
        setShapes(prev => prev.filter(s => s.id !== currentSelectedId.current));
        setSelectedId(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false;
        updateCursor();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [updateCursor]);

  // ─── Scroll to zoom ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const cam = currentCamera.current;

      // Zoom speed — smaller = slower zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newScale = Math.min(10, Math.max(0.05, cam.scale * zoomFactor));

      // The key zoom-to-cursor math:
      // Find where the cursor is in world space BEFORE the scale change
      const worldX = (e.clientX - cam.x) / cam.scale;
      const worldY = (e.clientY - cam.y) / cam.scale;

      // Compute new camera offset so that world point stays under cursor
      const newX = e.clientX - worldX * newScale;
      const newY = e.clientY - worldY * newScale;

      setCamera({ x: newX, y: newY, scale: newScale });
    };

    // { passive: false } is required to call preventDefault() on wheel events
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;

    const cam = currentCamera.current;
    const screen = { x: e.clientX, y: e.clientY };
    const world = screenToWorld(screen.x, screen.y, cam);

    startScreen.current = screen;
    startWorld.current = world;

    // Space held = pan mode, regardless of active tool
    if (spaceHeld.current) {
      isPanning.current = true;
      panStart.current = { x: cam.x, y: cam.y };
      updateCursor();
      return;
    }

    // Select tool: try to pick a shape, or start a drag
    if (currentTool.current === 'select') {
      const hit = findShapeAt(currentShapes.current, world.x, world.y);
      if (hit) {
        setSelectedId(hit.id);
        isDragging.current = true;
        dragStartShape.current = { x: hit.x, y: hit.y };
      } else {
        // Clicked empty space — deselect
        setSelectedId(null);
      }
      return;
    }

    // Drawing tool
    isDrawing.current = true;
    if (currentTool.current === 'freehand') {
      livePoints.current = [world.x, world.y];
    }
  }, [updateCursor]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cam = currentCamera.current;
    const screen = { x: e.clientX, y: e.clientY };
    const world = screenToWorld(screen.x, screen.y, cam);

    // Panning: offset the camera by how far the mouse has moved in screen space
    if (isPanning.current) {
      const dx = screen.x - startScreen.current.x;
      const dy = screen.y - startScreen.current.y;
      setCamera({
        ...cam,
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
      return;
    }

    // Dragging a selected shape
    if (isDragging.current && currentSelectedId.current) {
      // Delta in world space — this is important!
      // If you compute delta in screen space and apply it to world coords,
      // the shape will move at the wrong speed when zoomed in/out
      const dx = world.x - startWorld.current.x;
      const dy = world.y - startWorld.current.y;
      setShapes(prev =>
        prev.map(s =>
          s.id === currentSelectedId.current
            ? { ...s, x: dragStartShape.current.x + dx, y: dragStartShape.current.y + dy }
            : s
        )
      );
      return;
    }

    // Drawing preview
    if (!isDrawing.current) return;

    const start = startWorld.current;
    const t = currentTool.current;

    if (t === 'freehand') {
      livePoints.current = [...livePoints.current, world.x, world.y];
      setPreview({
        id: '__preview__',
        type: 'freehand',
        x: 0, y: 0, width: 0, height: 0,
        points: livePoints.current,
        ...DEFAULT_STYLE,
        fillColor: 'transparent',
      });
    } else {
      setPreview({
        id: '__preview__',
        type: t,
        x: Math.min(start.x, world.x),
        y: Math.min(start.y, world.y),
        width: Math.abs(world.x - start.x),
        height: Math.abs(world.y - start.y),
        points: [],
        ...DEFAULT_STYLE,
      });
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const cam = currentCamera.current;
    const screen = { x: e.clientX, y: e.clientY };
    const world = screenToWorld(screen.x, screen.y, cam);

    // End pan
    if (isPanning.current) {
      isPanning.current = false;
      updateCursor();
      return;
    }

    // End drag
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    // End drawing
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const start = startWorld.current;
    const t = currentTool.current;

    const tooSmall =
      t !== 'freehand' &&
      Math.abs(world.x - start.x) < 4 &&
      Math.abs(world.y - start.y) < 4;

    if (!tooSmall) {
      const newShape: Shape =
        t === 'freehand'
          ? {
            id: uid(), type: 'freehand',
            x: 0, y: 0, width: 0, height: 0,
            points: livePoints.current,
            ...DEFAULT_STYLE,
            fillColor: 'transparent',
          }
          : {
            id: uid(), type: t,
            x: Math.min(start.x, world.x),
            y: Math.min(start.y, world.y),
            width: Math.abs(world.x - start.x),
            height: Math.abs(world.y - start.y),
            points: [],
            ...DEFAULT_STYLE,
          };

      setShapes(prev => [...prev, newShape]);
      // Auto-select the shape you just drew
      setSelectedId(newShape.id);
    }

    setPreview(null);
    livePoints.current = [];
  }, [updateCursor]);

  // Attach mouse listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <div className="relative h-screen w-screen">
      <Toolbar
        activeTool={tool}
        onToolChange={(t) => {
          setTool(t);
          setSelectedId(null);
        }}
      />

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 rounded-xl border border-gray-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-md backdrop-blur-md select-none">
        {Math.round(camera.scale * 100)}%
      </div>

      <canvas
        ref={canvasRef}
        className="block h-full w-full"
      />
    </div>
  );
}