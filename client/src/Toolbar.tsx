import type { Tool } from './types';

interface Props {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rect', label: 'Rectangle', icon: '⬜' },
  { id: 'ellipse', label: 'Ellipse', icon: '⭕' },
  { id: 'freehand', label: 'Pen', icon: '✏️' },
];

export default function Toolbar({ activeTool, onToolChange }: Props) {
  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md select-none">
      {tools.map((tool) => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(tool.id)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
            activeTool === tool.id
              ? 'border border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
              : 'border border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className="text-base">{tool.icon}</span>
          {tool.label}
        </button>
      ))}

      <div className="mx-1 h-6 w-px bg-gray-200" />

      <div className="flex items-center gap-2 px-2 text-xs text-gray-500">
        <span>Scroll: zoom</span>
        <span>•</span>
        <span>Space + drag: pan</span>
      </div>
    </div>
  );
}