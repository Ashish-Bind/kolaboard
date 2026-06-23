import { type Tool } from "./types";

interface Props {
    activeTool: Tool
    onToolChange: (tool: Tool) => void
}

const tools: { id: Tool, label: string, icon: string }[] = [
    { id: 'rect', label: 'Rectangle', icon: '⬜' },
    { id: 'ellipse', label: 'Ellipse', icon: '⭕' },
    { id: 'freehand', label: 'Pen', icon: '✏️' },
]

export default function Toolbar ({activeTool, onToolChange}: Props){
    return(
        <div style={{
      position: 'absolute',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8,
      background: '#ffffff',
      border: '0.5px solid #e0e0e0',
      borderRadius: 12,
      padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      zIndex: 10,
    }}>
      {tools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(tool.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            background: activeTool === tool.id ? '#eff6ff' : 'transparent',
            color: activeTool === tool.id ? '#1d4ed8' : '#555',
            outline: activeTool === tool.id
              ? '1.5px solid #93c5fd'
              : '1px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 16 }}>{tool.icon}</span>
          {tool.label}
        </button>
      ))}
    </div>
    )
}