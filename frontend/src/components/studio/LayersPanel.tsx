import React, { useState } from 'react';
import { 
  EyeIcon, 
  EyeOffIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon
} from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape';
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
}

interface LayersPanelProps {
  layers: Layer[];
  selectedLayer: string | null;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerBlendModeChange: (layerId: string, blendMode: string) => void;
  onLayerReorder: (dragIndex: number, dropIndex: number) => void;
  onLayerRename: (layerId: string, newName: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerDelete,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  onLayerReorder,
  onLayerRename
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);

  const blendModes = [
    'normal', 'multiply', 'screen', 'overlay', 'soft-light', 
    'hard-light', 'color-dodge', 'color-burn', 'darken', 
    'lighten', 'difference', 'exclusion'
  ];

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'text':
        return '📝';
      case 'shape':
        return '🔷';
      default:
        return '📄';
    }
  };

  const handleNameEdit = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleNameSave = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerRename(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleNameCancel = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleDragStart = (index: number) => {
    setDraggedLayerIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedLayerIndex !== null && draggedLayerIndex !== dropIndex) {
      onLayerReorder(draggedLayerIndex, dropIndex);
    }
    setDraggedLayerIndex(null);
  };

  const moveLayerUp = (index: number) => {
    if (index > 0) {
      onLayerReorder(index, index - 1);
    }
  };

  const moveLayerDown = (index: number) => {
    if (index < layers.length - 1) {
      onLayerReorder(index, index + 1);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Layers</h3>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No layers yet. Add some content to get started!
          </div>
        ) : (
          <div className="p-2">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`mb-2 border rounded-lg transition-all ${
                  selectedLayer === layer.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${draggedLayerIndex === index ? 'opacity-50' : ''}`}
                onClick={() => onLayerSelect(layer.id)}
              >
                {/* Layer Header */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{getLayerIcon(layer.type)}</span>
                      
                      {editingLayerId === layer.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleNameSave}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleNameSave();
                            if (e.key === 'Escape') handleNameCancel();
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary-500"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="flex-1 text-sm font-medium text-gray-800 truncate cursor-pointer"
                          onDoubleClick={() => handleNameEdit(layer)}
                        >
                          {layer.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder buttons */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayerUp(index);
                        }}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ChevronUpIcon size={14} />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayerDown(index);
                        }}
                        disabled={index === layers.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ChevronDownIcon size={14} />
                      </button>

                      {/* Visibility toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerToggleVisibility(layer.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={layer.visible ? "Hide Layer" : "Show Layer"}
                      >
                        {layer.visible ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                      </button>

                      {/* Lock toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerToggleLock(layer.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                      >
                        {layer.locked ? <LockClosedIcon size={16} /> : <LockOpenIcon size={16} />}
                      </button>

                      {/* Delete layer */}
                      {!layer.locked && layer.id !== 'base-image' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerDelete(layer.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete Layer"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Layer Controls - Only show for selected layer */}
                  {selectedLayer === layer.id && (
                    <div className="mt-3 space-y-3">
                      {/* Opacity Control */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Opacity: {Math.round(layer.opacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={layer.opacity}
                          onChange={(e) => onLayerOpacityChange(layer.id, parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Blend Mode */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Blend Mode
                        </label>
                        <select
                          value={layer.blendMode}
                          onChange={(e) => onLayerBlendModeChange(layer.id, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-primary-500"
                        >
                          {blendModes.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Layer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          {layers.length} layer{layers.length !== 1 ? 's' : ''} • 
          {layers.filter(l => l.visible).length} visible • 
          {layers.filter(l => l.locked).length} locked
        </div>
      </div>
    </div>
  );
};

export default LayersPanel;