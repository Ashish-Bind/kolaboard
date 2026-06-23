import { useCallback, useEffect, useRef, useState } from 'react';
import { type Shape } from './types';
import { renderShapes } from './renderer';
import type { Tool } from './types';
import Toolbar from './Toolbar';

// A quick helper to generate unique IDs without a library
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_STYLE = {
    strokeColor: '#3b82f6',
  fillColor: '#eff6ff',
  strokeWidth: 2,
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);

  // Current tool selected in the toolbar
  const [tool, setTool] = useState<Tool>('rect')

  // Preview shape shown while the user is mid-drag (not saved yet)
  const [preview, setPreview] = useState<Shape | null>(null)

  // --- Drawing state stored in refs, NOT state ---
  // Why refs and not state? These values change on every mousemove (60fps).
  // Putting them in state would trigger 60 React re-renders per second.
  // Refs update silently; we only call setPreview/setShapes when we have
  // something meaningful to show.
  const isDrawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const currentTool = useRef<Tool>('rect'); // mirror of tool state for use inside event handlers
  const livePoints = useRef<number[]>([]);  // accumulates freehand points

  // Re-render the canvas every time shapes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderShapes(ctx, shapes, canvas.width, canvas.height);
  }, [shapes]);

  // keep the ref in sync with the tool state
  useEffect(()=>{
    currentTool.current = tool;
  },[tool])

  // helper: get canvas-relative coordinates from a mouse event
  // Essential because the canvas element might not start at (0,0) on the page
  const getPos = (e: MouseEvent) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }
  }

  // Re-render whenever shapes or preview changes
    useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')
    if(!ctx) return;
    renderShapes(ctx, shapes, canvas.width, canvas.height, preview);
    },[shapes, preview])

  // resize canvas to fill window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // After resize we need to re-render — trigger via a shapes copy
      setShapes(s => [...s]);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent)=>{
    // Only respond to left-click (button 0)
    if (e.button !== 0) return;

    const pos = getPos(e);
    isDrawing.current = true;
    startPoint.current = pos;

    if (currentTool.current === 'freehand') {
      // Freehand: initialise the points array with the starting point
      livePoints.current = [pos.x, pos.y];
    }
  },[])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawing.current) return;

    const pos = getPos(e);
    const start = startPoint.current;
    const t = currentTool.current;

    if (t === 'freehand') {
      // Append current position to the live points array
      livePoints.current = [...livePoints.current, pos.x, pos.y];

      // Show the growing stroke as a preview
      setPreview({
        id: '__preview__',
        type: 'freehand',
        x: 0, y: 0, width: 0, height: 0,
        points: livePoints.current,
        ...DEFAULT_STYLE,
        fillColor: 'transparent', // freehand has no fill
      });
    } else {
      // Rect / ellipse: build preview from start → current mouse position
      setPreview({
        id: '__preview__',
        type: t,
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        width: Math.abs(pos.x - start.x),
        height: Math.abs(pos.y - start.y),
        points: [],
        ...DEFAULT_STYLE,
      });
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const pos = getPos(e);
    const start = startPoint.current;
    const t = currentTool.current;

    // Don't save a shape that's too tiny — likely an accidental click
    const tooSmall =
      t !== 'freehand' &&
      Math.abs(pos.x - start.x) < 4 &&
      Math.abs(pos.y - start.y) < 4;

    if (!tooSmall) {
      const newShape: Shape =
        t === 'freehand'
          ? {
              id: uid(),
              type: 'freehand',
              x: 0, y: 0, width: 0, height: 0,
              points: livePoints.current,
              ...DEFAULT_STYLE,
              fillColor: 'transparent',
            }
          : {
              id: uid(),
              type: t,
              x: Math.min(start.x, pos.x),
              y: Math.min(start.y, pos.y),
              width: Math.abs(pos.x - start.x),
              height: Math.abs(pos.y - start.y),
              points: [],
              ...DEFAULT_STYLE,
            };

      // Add the finalized shape to the saved array
      setShapes(prev => [...prev, newShape]);
    }

    // Always clear the preview regardless
    setPreview(null);
    livePoints.current = [];
  }, []);

  // Attach mouse listeners directly to the canvas element
  // (not as React props) so we get MouseEvent, not SyntheticEvent
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Toolbar activeTool={tool} onToolChange={setTool} />
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'crosshair' }}
      />
    </div>
  );
}