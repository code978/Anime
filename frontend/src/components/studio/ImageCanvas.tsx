import React, { useRef, useEffect, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { 
  ZoomInIcon, 
  ZoomOutIcon, 
  RotateClockwiseIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon,
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

interface ImageCanvasProps {
  imageUrl?: string;
  width: number;
  height: number;
  onSave: (dataUrl: string) => void;
  onLayersChange: (layers: Layer[]) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  width,
  height,
  onSave,
  onLayersChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: 'white',
        preserveObjectStacking: true,
      });

      // Enable high DPI support
      const ratio = window.devicePixelRatio || 1;
      fabricCanvas.setDimensions({
        width: width * ratio,
        height: height * ratio
      }, {
        cssOnly: false
      });
      fabricCanvas.setZoom(ratio);

      setCanvas(fabricCanvas);

      // Add event listeners
      fabricCanvas.on('selection:created', (e) => {
        if (e.selected && e.selected[0]) {
          setSelectedLayer(e.selected[0].get('id') as string);
        }
      });

      fabricCanvas.on('selection:cleared', () => {
        setSelectedLayer(null);
      });

      fabricCanvas.on('object:modified', saveState);
      fabricCanvas.on('object:added', saveState);
      fabricCanvas.on('object:removed', saveState);

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [width, height]);

  // Load initial image
  useEffect(() => {
    if (canvas && imageUrl) {
      fabric.Image.fromURL(imageUrl, (img) => {
        img.set({
          id: 'base-image',
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
        });

        // Scale image to fit canvas
        const scale = Math.min(width / img.width!, height / img.height!);
        img.scale(scale);
        img.centerH();
        img.centerV();

        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();

        // Add base layer
        const baseLayer: Layer = {
          id: 'base-image',
          name: 'Base Image',
          type: 'image',
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          locked: true,
        };
        setLayers([baseLayer]);
        onLayersChange([baseLayer]);
      });
    }
  }, [canvas, imageUrl, width, height, onLayersChange]);

  // Save canvas state for undo/redo
  const saveState = useCallback(() => {
    if (!canvas) return;

    const currentState = JSON.stringify(canvas.toJSON(['id']));
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(currentState);
    
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [canvas, history, historyStep]);

  // Undo function
  const undo = () => {
    if (historyStep > 0) {
      const previousState = history[historyStep - 1];
      canvas?.loadFromJSON(previousState, () => {
        canvas.renderAll();
        setHistoryStep(historyStep - 1);
      });
    }
  };

  // Redo function
  const redo = () => {
    if (historyStep < history.length - 1) {
      const nextState = history[historyStep + 1];
      canvas?.loadFromJSON(nextState, () => {
        canvas.renderAll();
        setHistoryStep(historyStep + 1);
      });
    }
  };

  // Zoom functions
  const zoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5);
    setZoom(newZoom);
    canvas?.setZoom(newZoom);
    canvas?.renderAll();
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    canvas?.setZoom(newZoom);
    canvas?.renderAll();
  };

  const resetZoom = () => {
    setZoom(1);
    canvas?.setZoom(1);
    canvas?.renderAll();
  };

  // Add text layer
  const addTextLayer = () => {
    if (!canvas) return;

    const text = new fabric.IText('Sample Text', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000',
      id: `text-${Date.now()}`,
    });

    canvas.add(text);
    canvas.setActiveObject(text);

    const newLayer: Layer = {
      id: text.get('id') as string,
      name: `Text Layer ${layers.length}`,
      type: 'text',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
    };

    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    onLayersChange(updatedLayers);
  };

  // Add shape layer
  const addShapeLayer = (shapeType: 'rectangle' | 'circle' | 'triangle') => {
    if (!canvas) return;

    let shape: fabric.Object;

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 60,
          fill: '#ff6b6b',
          id: `rect-${Date.now()}`,
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: '#4ecdc4',
          id: `circle-${Date.now()}`,
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: '#45b7d1',
          id: `triangle-${Date.now()}`,
        });
        break;
      default:
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);

    const newLayer: Layer = {
      id: shape.get('id') as string,
      name: `${shapeType} Layer ${layers.length}`,
      type: 'shape',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
    };

    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    onLayersChange(updatedLayers);
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        const objId = obj.get('id') as string;
        canvas.remove(obj);
        
        // Remove from layers
        const updatedLayers = layers.filter(layer => layer.id !== objId);
        setLayers(updatedLayers);
        onLayersChange(updatedLayers);
      });
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  // Save canvas as image
  const saveCanvas = () => {
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2, // Higher resolution
    });

    onSave(dataUrl);
  };

  // Apply filters
  const applyFilter = (filterType: string) => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') return;

    const img = activeObject as fabric.Image;
    
    switch (filterType) {
      case 'grayscale':
        img.filters = [new fabric.Image.filters.Grayscale()];
        break;
      case 'sepia':
        img.filters = [new fabric.Image.filters.Sepia()];
        break;
      case 'brightness':
        img.filters = [new fabric.Image.filters.Brightness({ brightness: 0.2 })];
        break;
      case 'contrast':
        img.filters = [new fabric.Image.filters.Contrast({ contrast: 0.2 })];
        break;
      case 'blur':
        img.filters = [new fabric.Image.filters.Blur({ blur: 0.1 })];
        break;
      default:
        img.filters = [];
    }

    img.applyFilters();
    canvas.renderAll();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 bg-gray-100 border-b">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Zoom Out"
          >
            <ZoomOutIcon size={18} />
          </button>
          
          <button
            onClick={resetZoom}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          
          <button
            onClick={zoomIn}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Zoom In"
          >
            <ZoomInIcon size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* History Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <UndoIcon size={18} />
          </button>
          
          <button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <RedoIcon size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Add Elements */}
        <div className="flex items-center gap-1">
          <button
            onClick={addTextLayer}
            className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            Add Text
          </button>
          
          <div className="relative group">
            <button className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded">
              Add Shape
            </button>
            <div className="absolute top-full left-0 mt-1 w-32 bg-white shadow-lg rounded-md border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => addShapeLayer('rectangle')}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Rectangle
              </button>
              <button
                onClick={() => addShapeLayer('circle')}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Circle
              </button>
              <button
                onClick={() => addShapeLayer('triangle')}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Triangle
              </button>
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Filters */}
        <div className="relative group">
          <button className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded">
            Filters
          </button>
          <div className="absolute top-full left-0 mt-1 w-32 bg-white shadow-lg rounded-md border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => applyFilter('none')}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              None
            </button>
            <button
              onClick={() => applyFilter('grayscale')}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Grayscale
            </button>
            <button
              onClick={() => applyFilter('sepia')}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Sepia
            </button>
            <button
              onClick={() => applyFilter('brightness')}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Brightness
            </button>
            <button
              onClick={() => applyFilter('contrast')}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Contrast
            </button>
            <button
              onClick={() => applyFilter('blur')}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Blur
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={deleteSelected}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete Selected"
          >
            <TrashIcon size={18} />
          </button>
          
          <button
            onClick={saveCanvas}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            <SaveIcon size={18} />
            Save
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 shadow-lg bg-white"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageCanvas;