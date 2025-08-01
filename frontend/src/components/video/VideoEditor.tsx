import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipBackIcon, 
  SkipForwardIcon,
  VolumeIcon,
  Volume2Icon,
  VolumeXIcon,
  SettingsIcon,
  DownloadIcon,
  SlidersIcon
} from 'lucide-react';
import ReactPlayer from 'react-player';

interface VideoEditorProps {
  videoUrl: string;
  onSave: (editedVideoUrl: string) => void;
  onAddAudio: (audioTrackId: string) => void;
}

interface AudioTrack {
  id: string;
  name: string;
  duration: number;
  genre: string;
  preview_url?: string;
}

interface VideoEffects {
  brightness: number;
  contrast: number;
  saturation: number;
  speed: number;
  volume: number;
}

const VideoEditor: React.FC<VideoEditorProps> = ({
  videoUrl,
  onSave,
  onAddAudio
}) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEffects, setShowEffects] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  
  const [effects, setEffects] = useState<VideoEffects>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    speed: 1,
    volume: 100
  });

  const [availableAudioTracks] = useState<AudioTrack[]>([
    { id: '1', name: 'Upbeat Pop', duration: 120, genre: 'Pop' },
    { id: '2', name: 'Ambient Chill', duration: 180, genre: 'Ambient' },
    { id: '3', name: 'Epic Adventure', duration: 200, genre: 'Epic' },
    { id: '4', name: 'Kawaii Dreams', duration: 150, genre: 'Kawaii' },
    { id: '5', name: 'Action Beat', duration: 90, genre: 'Action' }
  ]);

  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string | null>(null);

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    playerRef.current?.seekTo(newTime, 'seconds');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    setMuted(!muted);
  };

  const handleEffectChange = (effect: keyof VideoEffects, value: number) => {
    setEffects(prev => ({
      ...prev,
      [effect]: value
    }));
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoStyle = (): React.CSSProperties => {
    return {
      filter: `brightness(${effects.brightness}%) contrast(${effects.contrast}%) saturate(${effects.saturation}%)`,
    };
  };

  const handleSave = () => {
    // In a real implementation, this would apply effects and save the video
    onSave(videoUrl);
  };

  const handleAddAudio = (audioTrackId: string) => {
    setSelectedAudioTrack(audioTrackId);
    onAddAudio(audioTrackId);
    setShowAudioPanel(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative bg-black aspect-video">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          playing={playing}
          volume={muted ? 0 : volume}
          playbackRate={effects.speed}
          onDuration={handleDuration}
          onProgress={handleProgress}
          style={getVideoStyle()}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload'
              }
            }
          }}
        />
        
        {/* Overlay Controls */}
        {showControls && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all duration-200"
            >
              {playing ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
            </button>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="p-4 bg-gray-900 text-white">
        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => playerRef.current?.seekTo(currentTime - 10, 'seconds')}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <SkipBackIcon size={20} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-2 hover:bg-gray-700 rounded"
            >
              {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </button>
            
            <button
              onClick={() => playerRef.current?.seekTo(currentTime + 10, 'seconds')}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <SkipForwardIcon size={20} />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button onClick={handleMuteToggle} className="p-2 hover:bg-gray-700 rounded">
                {muted ? <VolumeXIcon size={20} /> : 
                 volume > 0.5 ? <Volume2Icon size={20} /> : <VolumeIcon size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAudioPanel(!showAudioPanel)}
              className={`p-2 rounded ${showAudioPanel ? 'bg-primary-600' : 'hover:bg-gray-700'}`}
              title="Add Background Music"
            >
              🎵
            </button>
            
            <button
              onClick={() => setShowEffects(!showEffects)}
              className={`p-2 rounded ${showEffects ? 'bg-primary-600' : 'hover:bg-gray-700'}`}
              title="Video Effects"
            >
              <SlidersIcon size={20} />
            </button>
            
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 hover:bg-gray-700 rounded"
              title="Settings"
            >
              <SettingsIcon size={20} />
            </button>
            
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded text-white"
            >
              <DownloadIcon size={16} className="inline mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Effects Panel */}
      {showEffects && (
        <div className="p-4 bg-gray-100 border-t">
          <h3 className="text-lg font-semibold mb-4">Video Effects</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brightness: {effects.brightness}%
              </label>
              <input
                type="range"
                min={50}
                max={150}
                value={effects.brightness}
                onChange={(e) => handleEffectChange('brightness', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contrast: {effects.contrast}%
              </label>
              <input
                type="range"
                min={50}
                max={150}
                value={effects.contrast}
                onChange={(e) => handleEffectChange('contrast', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saturation: {effects.saturation}%
              </label>
              <input
                type="range"
                min={0}
                max={200}
                value={effects.saturation}
                onChange={(e) => handleEffectChange('saturation', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speed: {effects.speed}x
              </label>
              <input
                type="range"
                min={0.25}
                max={2}
                step={0.25}
                value={effects.speed}
                onChange={(e) => handleEffectChange('speed', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setEffects({
                brightness: 100,
                contrast: 100,
                saturation: 100,
                speed: 1,
                volume: 100
              })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Reset Effects
            </button>
          </div>
        </div>
      )}

      {/* Audio Panel */}
      {showAudioPanel && (
        <div className="p-4 bg-gray-100 border-t">
          <h3 className="text-lg font-semibold mb-4">Background Music</h3>
          <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
            {availableAudioTracks.map((track) => (
              <div
                key={track.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAudioTrack === track.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleAddAudio(track.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{track.name}</h4>
                    <p className="text-sm text-gray-600">
                      {track.genre} • {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {track.preview_url && (
                      <button
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Preview"
                      >
                        <PlayIcon size={16} />
                      </button>
                    )}
                    {selectedAudioTrack === track.id && (
                      <span className="text-primary-600 text-sm">✓ Selected</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setSelectedAudioTrack(null)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={!selectedAudioTrack}
            >
              Remove Audio
            </button>
            <button
              onClick={() => setShowAudioPanel(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEditor;