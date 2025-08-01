import React, { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import { 
  TypeIcon, 
  PaletteIcon, 
  SettingsIcon,
  RefreshCwIcon
} from 'lucide-react';

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

interface PropertiesPanelProps {
  selectedObject: ObjectProperties | null;
  onPropertyChange: (property: string, value: any) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  onPropertyChange
}) => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'style' | 'transform' | 'effects'>('style');

  const fontFamilies = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Courier New', 'Lucida Console',
    'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic'
  ];

  const fontWeights = [
    { value: 'normal', label: 'Normal' },
    { value: 'bold', label: 'Bold' },
    { value: '100', label: 'Thin' },
    { value: '300', label: 'Light' },
    { value: '500', label: 'Medium' },
    { value: '700', label: 'Bold' },
    { value: '900', label: 'Black' }
  ];

  const textAlignments = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' }
  ];

  if (!selectedObject) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <SettingsIcon size={48} className="mx-auto mb-3 opacity-50" />
            <p>Select an object to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const handleColorChange = (property: string, color: any) => {
    onPropertyChange(property, color.hex);
  };

  const ColorPickerField = ({ 
    label, 
    property, 
    value 
  }: { 
    label: string; 
    property: string; 
    value: string; 
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => setShowColorPicker(showColorPicker === property ? null : property)}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onPropertyChange(property, e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      {showColorPicker === property && (
        <div className="absolute z-50 mt-2">
          <div
            className="fixed inset-0"
            onClick={() => setShowColorPicker(null)}
          />
          <ChromePicker
            color={value}
            onChange={(color) => handleColorChange(property, color)}
          />
        </div>
      )}
    </div>
  );

  const NumberField = ({ 
    label, 
    property, 
    value, 
    min, 
    max, 
    step = 1,
    unit = ''
  }: { 
    label: string; 
    property: string; 
    value: number; 
    min?: number; 
    max?: number; 
    step?: number;
    unit?: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {unit && `(${unit})`}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onPropertyChange(property, parseFloat(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );

  const SelectField = ({ 
    label, 
    property, 
    value, 
    options 
  }: { 
    label: string; 
    property: string; 
    value: string; 
    options: { value: string; label: string; }[];
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onPropertyChange(property, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Properties</h3>
        <p className="text-sm text-gray-600 mt-1">
          {selectedObject.type.charAt(0).toUpperCase() + selectedObject.type.slice(1)} Layer
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'style'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <PaletteIcon size={16} className="inline mr-2" />
          Style
        </button>
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'transform'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <RefreshCwIcon size={16} className="inline mr-2" />
          Transform
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'effects'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <SettingsIcon size={16} className="inline mr-2" />
          Effects
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'style' && (
          <div className="space-y-6">
            {/* Fill Color */}
            {selectedObject.fill !== undefined && (
              <ColorPickerField
                label="Fill Color"
                property="fill"
                value={selectedObject.fill}
              />
            )}

            {/* Stroke */}
            {selectedObject.stroke !== undefined && (
              <>
                <ColorPickerField
                  label="Stroke Color"
                  property="stroke"
                  value={selectedObject.stroke}
                />
                <NumberField
                  label="Stroke Width"
                  property="strokeWidth"
                  value={selectedObject.strokeWidth || 0}
                  min={0}
                  max={20}
                  unit="px"
                />
              </>
            )}

            {/* Text Properties */}
            {selectedObject.type === 'text' && (
              <>
                <NumberField
                  label="Font Size"
                  property="fontSize"
                  value={selectedObject.fontSize || 16}
                  min={8}
                  max={200}
                  unit="px"
                />
                
                <SelectField
                  label="Font Family"
                  property="fontFamily"
                  value={selectedObject.fontFamily || 'Arial'}
                  options={fontFamilies.map(font => ({ value: font, label: font }))}
                />
                
                <SelectField
                  label="Font Weight"
                  property="fontWeight"
                  value={selectedObject.fontWeight || 'normal'}
                  options={fontWeights}
                />
                
                <SelectField
                  label="Text Align"
                  property="textAlign"
                  value={selectedObject.textAlign || 'left'}
                  options={textAlignments}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'transform' && (
          <div className="space-y-6">
            {/* Position */}
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="X Position"
                property="left"
                value={selectedObject.left || 0}
                unit="px"
              />
              <NumberField
                label="Y Position"
                property="top"
                value={selectedObject.top || 0}
                unit="px"
              />
            </div>

            {/* Size */}
            {selectedObject.width !== undefined && selectedObject.height !== undefined && (
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="Width"
                  property="width"
                  value={selectedObject.width}
                  min={1}
                  unit="px"
                />
                <NumberField
                  label="Height"
                  property="height"
                  value={selectedObject.height}
                  min={1}
                  unit="px"
                />
              </div>
            )}

            {/* Scale */}
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Scale X"
                property="scaleX"
                value={selectedObject.scaleX || 1}
                min={0.1}
                max={10}
                step={0.1}
              />
              <NumberField
                label="Scale Y"
                property="scaleY"
                value={selectedObject.scaleY || 1}
                min={0.1}
                max={10}
                step={0.1}
              />
            </div>

            {/* Rotation */}
            <NumberField
              label="Rotation"
              property="angle"
              value={selectedObject.angle || 0}
              min={-360}
              max={360}
              unit="degrees"
            />
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-6">
            {/* Opacity */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Opacity: {Math.round((selectedObject.opacity || 1) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedObject.opacity || 1}
                onChange={(e) => onPropertyChange('opacity', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Shadow Effects */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Shadow</h4>
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="Shadow X"
                  property="shadowOffsetX"
                  value={0}
                  min={-50}
                  max={50}
                  unit="px"
                />
                <NumberField
                  label="Shadow Y"
                  property="shadowOffsetY"
                  value={0}
                  min={-50}
                  max={50}
                  unit="px"
                />
              </div>
              <NumberField
                label="Shadow Blur"
                property="shadowBlur"
                value={0}
                min={0}
                max={50}
                unit="px"
              />
              <ColorPickerField
                label="Shadow Color"
                property="shadowColor"
                value="#000000"
              />
            </div>

            {/* Border Radius (for shapes) */}
            {selectedObject.type === 'shape' && (
              <NumberField
                label="Border Radius"
                property="rx"
                value={0}
                min={0}
                max={50}
                unit="px"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;