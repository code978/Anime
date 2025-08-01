import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';

import ImageCanvas from '../components/studio/ImageCanvas';
import LayersPanel from '../components/studio/LayersPanel';
import PropertiesPanel from '../components/studio/PropertiesPanel';
import LoadingSpinner from '../components/ui/LoadingSpinner';

import { galleryAPI } from '../services/api';

interface Layer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape';
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
}

interface ObjectProperties {
  id: string;
  type: 'text' | 'shape' | 'image';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
}

const StudioPage: React.FC = () => {
  const { outputId } = useParams<{ outputId: string }>();
  const navigate = useNavigate();
  
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [selectedObjectProperties, setSelectedObjectProperties] = useState<ObjectProperties | null>(null);
  const [canvasRef, setCanvasRef] = useState<any>(null);

  // Fetch the original generated output
  const { data: output, isLoading, error } = useQuery(
    ['output', outputId],
    () => galleryAPI.getOutput(outputId!),
    {
      enabled: !!outputId,
      onError: (error: any) => {
        toast.error('Failed to load image');
        navigate('/gallery');
      }
    }
  );

  // Save edited image mutation
  const saveImageMutation = useMutation(
    (imageData: string) => galleryAPI.saveEditedImage(outputId!, imageData),
    {
      onSuccess: () => {
        toast.success('Image saved successfully!');
      },
      onError: (error: any) => {
        toast.error('Failed to save image');
      }
    }
  );

  const handleSaveImage = (dataUrl: string) => {
    saveImageMutation.mutate(dataUrl);
  };

  const handleLayersChange = (newLayers: Layer[]) => {
    setLayers(newLayers);
  };

  const handleLayerSelect = (layerId: string) => {
    setSelectedLayer(layerId);
    
    // Get object properties from canvas
    if (canvasRef) {
      const objects = canvasRef.getObjects();
      const selectedObj = objects.find((obj: any) => obj.id === layerId);
      
      if (selectedObj) {
        const properties: ObjectProperties = {
          id: selectedObj.id,
          type: selectedObj.type,
          fill: selectedObj.fill,
          stroke: selectedObj.stroke,
          strokeWidth: selectedObj.strokeWidth,
          fontSize: selectedObj.fontSize,
          fontFamily: selectedObj.fontFamily,
          fontWeight: selectedObj.fontWeight,
          textAlign: selectedObj.textAlign,
          left: selectedObj.left,
          top: selectedObj.top,
          width: selectedObj.width,
          height: selectedObj.height,
          angle: selectedObj.angle,
          scaleX: selectedObj.scaleX,
          scaleY: selectedObj.scaleY,
          opacity: selectedObj.opacity,
        };
        setSelectedObjectProperties(properties);
      }
    }
  };

  const handleLayerToggleVisibility = (layerId: string) => {
    if (!canvasRef) return;

    const objects = canvasRef.getObjects();
    const obj = objects.find((o: any) => o.id === layerId);
    
    if (obj) {
      obj.set('visible', !obj.visible);
      canvasRef.renderAll();
      
      setLayers(prev => prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible }
          : layer
      ));
    }
  };

  const handleLayerToggleLock = (layerId: string) => {
    if (!canvasRef) return;

    const objects = canvasRef.getObjects();
    const obj = objects.find((o: any) => o.id === layerId);
    
    if (obj) {
      const locked = !obj.selectable;
      obj.set({
        selectable: !locked,
        evented: !locked,
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation: locked,
        lockScalingX: locked,
        lockScalingY: locked,
      });
      
      canvasRef.renderAll();
      
      setLayers(prev => prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, locked }
          : layer
      ));
    }
  };

  const handleLayerDelete = (layerId: string) => {
    if (!canvasRef) return;

    const objects = canvasRef.getObjects();
    const obj = objects.find((o: any) => o.id === layerId);
    
    if (obj) {
      canvasRef.remove(obj);
      canvasRef.renderAll();
      
      setLayers(prev => prev.filter(layer => layer.id !== layerId));
      
      if (selectedLayer === layerId) {
        setSelectedLayer(null);
        setSelectedObjectProperties(null);
      }
    }
  };

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    if (!canvasRef) return;

    const objects = canvasRef.getObjects();
    const obj = objects.find((o: any) => o.id === layerId);
    
    if (obj) {
      obj.set('opacity', opacity);
      canvasRef.renderAll();
      
      setLayers(prev => prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, opacity }
          : layer
      ));
    }
  };

  const handleLayerBlendModeChange = (layerId: string, blendMode: string) => {
    if (!canvasRef) return;

    const objects = canvasRef.getObjects();
    const obj = objects.find((o: any) => o.id === layerId);
    
    if (obj) {
      obj.set('globalCompositeOperation', blendMode);
      canvasRef.renderAll();
      
      setLayers(prev => prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, blendMode }
          : layer
      ));
    }
  };

  const handleLayerReorder = (dragIndex: number, dropIndex: number) => {
    if (!canvasRef) return;

    const newLayers = [...layers];
    const [removed] = newLayers.splice(dragIndex, 1);
    newLayers.splice(dropIndex, 0, removed);
    
    setLayers(newLayers);
    
    // Reorder objects in canvas
    const objects = canvasRef.getObjects();
    const draggedObj = objects[dragIndex];
    
    if (dropIndex > dragIndex) {
      canvasRef.bringForward(draggedObj, true);
    } else {
      canvasRef.sendBackwards(draggedObj, true);
    }
    
    canvasRef.renderAll();
  };

  const handleLayerRename = (layerId: string, newName: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, name: newName }
        : layer
    ));
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (!canvasRef || !selectedLayer) return;

    const objects = canvasRef.getObjects();
    const obj = objects.find((o: any) => o.id === selectedLayer);
    
    if (obj) {
      obj.set(property, value);
      canvasRef.renderAll();
      
      // Update local properties state
      setSelectedObjectProperties(prev => prev ? {
        ...prev,
        [property]: value
      } : null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !output) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Image Not Found</h2>
          <p className="text-gray-600 mb-8">The image you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate('/gallery')}
            className="btn-primary"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Image Studio</h1>
            <p className="text-gray-600">Edit and enhance your generated image</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/gallery')}
              className="btn-outline"
            >
              Back to Gallery
            </button>
            
            <button
              onClick={() => handleSaveImage('')}
              disabled={saveImageMutation.isLoading}
              className="btn-primary"
            >
              {saveImageMutation.isLoading ? 'Saving...' : 'Save & Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Studio Interface */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          <ImageCanvas
            imageUrl={output.data.filePath}
            width={800}
            height={600}
            onSave={handleSaveImage}
            onLayersChange={handleLayersChange}
          />
        </div>

        {/* Right Sidebar */}
        <div className="flex">
          {/* Layers Panel */}
          <LayersPanel
            layers={layers}
            selectedLayer={selectedLayer}
            onLayerSelect={handleLayerSelect}
            onLayerToggleVisibility={handleLayerToggleVisibility}
            onLayerToggleLock={handleLayerToggleLock}
            onLayerDelete={handleLayerDelete}
            onLayerOpacityChange={handleLayerOpacityChange}
            onLayerBlendModeChange={handleLayerBlendModeChange}
            onLayerReorder={handleLayerReorder}
            onLayerRename={handleLayerRename}
          />

          {/* Properties Panel */}
          <PropertiesPanel
            selectedObject={selectedObjectProperties}
            onPropertyChange={handlePropertyChange}
          />
        </div>
      </div>
    </div>
  );
};

export default StudioPage;