import os
import numpy as np
import librosa
import soundfile as sf
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
import asyncio
import logging
from pydub import AudioSegment
from pydub.generators import Sine, Square, Sawtooth, Triangle
import random
import json

from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class AudioService:
    def __init__(self):
        self.sample_rate = 44100
        self.output_dir = Path(settings.OUTPUT_DIR)
        self.audio_dir = Path("audio")
        self.audio_dir.mkdir(exist_ok=True)
        
        # Musical scales and progressions
        self.scales = {
            "major": [0, 2, 4, 5, 7, 9, 11],
            "minor": [0, 2, 3, 5, 7, 8, 10],
            "pentatonic": [0, 2, 4, 7, 9],
            "japanese": [0, 1, 5, 7, 8],  # Hirajoshi scale
            "anime": [0, 2, 3, 7, 9],  # Custom anime-like scale
        }
        
        self.chord_progressions = {
            "pop": ["I", "V", "vi", "IV"],
            "anime": ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
            "emotional": ["vi", "IV", "I", "V"],
            "upbeat": ["I", "IV", "V", "V"],
            "mysterious": ["i", "bVII", "bVI", "bVII"]
        }

    async def generate_background_music(
        self,
        style: str = "anime",
        duration: float = 30.0,
        tempo: int = 120,
        key: str = "C",
        mood: str = "happy"
    ) -> str:
        """Generate background music for anime videos"""
        
        try:
            logger.info(f"Generating {style} music for {duration}s at {tempo} BPM")
            
            # Generate melody and harmony
            melody = await self._generate_melody(style, duration, tempo, key, mood)
            harmony = await self._generate_harmony(style, duration, tempo, key)
            rhythm = await self._generate_rhythm(style, duration, tempo)
            
            # Mix the components
            mixed_audio = self._mix_audio_components(melody, harmony, rhythm)
            
            # Apply effects based on mood
            processed_audio = await self._apply_audio_effects(mixed_audio, mood)
            
            # Save the generated audio
            output_path = self.audio_dir / f"generated_{np.random.randint(1000, 9999)}.wav"
            sf.write(str(output_path), processed_audio, self.sample_rate)
            
            logger.info(f"Generated music saved: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to generate background music: {e}")
            raise

    async def _generate_melody(
        self,
        style: str,
        duration: float,
        tempo: int,
        key: str,
        mood: str
    ) -> np.ndarray:
        """Generate melody line"""
        
        # Calculate parameters
        samples = int(duration * self.sample_rate)
        beat_duration = 60.0 / tempo
        note_duration = beat_duration / 2  # Eighth notes
        
        # Get scale notes
        scale = self.scales.get(style, self.scales["major"])
        base_freq = self._note_to_frequency(key + "4")
        
        # Generate note sequence
        melody_notes = []
        current_time = 0
        
        while current_time < duration:
            # Choose note from scale
            if mood == "happy":
                note_choices = scale[:5]  # Higher notes
                octave_mod = random.choice([0, 1])
            elif mood == "sad":
                note_choices = scale[2:]  # Lower notes
                octave_mod = random.choice([-1, 0])
            else:
                note_choices = scale
                octave_mod = random.choice([-1, 0, 1])
            
            note_index = random.choice(note_choices)
            freq = base_freq * (2 ** (note_index / 12)) * (2 ** octave_mod)
            
            # Note duration with some variation
            note_len = note_duration * random.uniform(0.5, 2.0)
            melody_notes.append((freq, note_len))
            current_time += note_len
        
        # Generate audio from notes
        melody_audio = np.zeros(samples)
        sample_pos = 0
        
        for freq, note_len in melody_notes:
            note_samples = int(note_len * self.sample_rate)
            if sample_pos + note_samples > samples:
                note_samples = samples - sample_pos
            
            # Generate note with envelope
            t = np.linspace(0, note_len, note_samples)
            note_wave = np.sin(2 * np.pi * freq * t)
            
            # ADSR envelope
            envelope = self._create_adsr_envelope(note_samples, 0.1, 0.2, 0.6, 0.3)
            note_wave *= envelope
            
            melody_audio[sample_pos:sample_pos + note_samples] = note_wave
            sample_pos += note_samples
            
            if sample_pos >= samples:
                break
        
        return melody_audio * 0.3  # Reduce volume

    async def _generate_harmony(
        self,
        style: str,
        duration: float,
        tempo: int,
        key: str
    ) -> np.ndarray:
        """Generate harmony/chord progression"""
        
        samples = int(duration * self.sample_rate)
        chord_duration = 60.0 / tempo * 4  # Whole notes
        
        # Get chord progression
        progression = self.chord_progressions.get(style, self.chord_progressions["pop"])
        base_freq = self._note_to_frequency(key + "3")  # Lower octave for bass
        
        harmony_audio = np.zeros(samples)
        current_time = 0
        chord_index = 0
        
        while current_time < duration:
            # Get current chord
            chord_symbol = progression[chord_index % len(progression)]
            chord_freqs = self._get_chord_frequencies(chord_symbol, base_freq)
            
            # Generate chord
            chord_samples = int(min(chord_duration, duration - current_time) * self.sample_rate)
            t = np.linspace(0, chord_samples / self.sample_rate, chord_samples)
            
            chord_wave = np.zeros(chord_samples)
            for freq in chord_freqs:
                chord_wave += np.sin(2 * np.pi * freq * t) / len(chord_freqs)
            
            # Add to harmony
            start_sample = int(current_time * self.sample_rate)
            end_sample = start_sample + chord_samples
            if end_sample > samples:
                chord_samples = samples - start_sample
                chord_wave = chord_wave[:chord_samples]
            
            harmony_audio[start_sample:start_sample + chord_samples] = chord_wave
            
            current_time += chord_duration
            chord_index += 1
        
        return harmony_audio * 0.2  # Reduce volume

    async def _generate_rhythm(
        self,
        style: str,
        duration: float,
        tempo: int
    ) -> np.ndarray:
        """Generate rhythm track"""
        
        samples = int(duration * self.sample_rate)
        beat_duration = 60.0 / tempo
        
        rhythm_audio = np.zeros(samples)
        current_time = 0
        
        # Simple drum pattern
        kick_pattern = [1, 0, 0, 0, 1, 0, 0, 0]  # Kick on 1 and 5
        snare_pattern = [0, 0, 1, 0, 0, 0, 1, 0]  # Snare on 3 and 7
        hihat_pattern = [1, 1, 1, 1, 1, 1, 1, 1]  # Hi-hat on every beat
        
        beat_index = 0
        
        while current_time < duration:
            # Generate drum sounds
            beat_samples = int(beat_duration / 2 * self.sample_rate)  # Eighth note
            
            drum_wave = np.zeros(beat_samples)
            
            # Kick drum (low frequency)
            if kick_pattern[beat_index % len(kick_pattern)]:
                t = np.linspace(0, beat_duration / 2, beat_samples)
                kick = np.sin(2 * np.pi * 60 * t) * np.exp(-t * 20)
                drum_wave += kick * 0.8
            
            # Snare drum (noise burst)
            if snare_pattern[beat_index % len(snare_pattern)]:
                snare = np.random.normal(0, 0.1, beat_samples) * np.exp(-np.linspace(0, 5, beat_samples))
                drum_wave += snare * 0.5
            
            # Hi-hat (high frequency)
            if hihat_pattern[beat_index % len(hihat_pattern)]:
                t = np.linspace(0, beat_duration / 2, beat_samples)
                hihat = np.random.normal(0, 0.05, beat_samples) * np.exp(-t * 30)
                drum_wave += hihat * 0.3
            
            # Add to rhythm track
            start_sample = int(current_time * self.sample_rate)
            end_sample = start_sample + beat_samples
            if end_sample > samples:
                beat_samples = samples - start_sample
                drum_wave = drum_wave[:beat_samples]
            
            rhythm_audio[start_sample:start_sample + beat_samples] = drum_wave
            
            current_time += beat_duration / 2
            beat_index += 1
        
        return rhythm_audio * 0.4

    def _mix_audio_components(
        self,
        melody: np.ndarray,
        harmony: np.ndarray,
        rhythm: np.ndarray
    ) -> np.ndarray:
        """Mix melody, harmony, and rhythm components"""
        
        # Ensure all components have the same length
        min_length = min(len(melody), len(harmony), len(rhythm))
        mixed = (
            melody[:min_length] +
            harmony[:min_length] +
            rhythm[:min_length]
        )
        
        # Normalize to prevent clipping
        max_amplitude = np.max(np.abs(mixed))
        if max_amplitude > 0.95:
            mixed = mixed / max_amplitude * 0.95
        
        return mixed

    async def _apply_audio_effects(
        self,
        audio: np.ndarray,
        mood: str
    ) -> np.ndarray:
        """Apply audio effects based on mood"""
        
        processed = audio.copy()
        
        if mood == "mysterious":
            # Add reverb effect
            processed = self._add_reverb(processed, 0.3, 0.5)
            # Add low-pass filter
            processed = self._low_pass_filter(processed, 8000)
        
        elif mood == "upbeat":
            # Add compression
            processed = self._compress_audio(processed, 0.7)
            # Slight high-frequency boost
            processed = self._high_pass_filter(processed, 100)
        
        elif mood == "peaceful":
            # Soft low-pass filter
            processed = self._low_pass_filter(processed, 6000)
            # Add gentle reverb
            processed = self._add_reverb(processed, 0.2, 0.3)
        
        elif mood == "sad":
            # Lower the overall pitch slightly
            processed = self._pitch_shift(processed, -0.5)
            # Add reverb for spaciousness
            processed = self._add_reverb(processed, 0.4, 0.6)
        
        return processed

    def _create_adsr_envelope(
        self,
        length: int,
        attack: float,
        decay: float,
        sustain: float,
        release: float
    ) -> np.ndarray:
        """Create ADSR envelope for notes"""
        
        envelope = np.ones(length)
        attack_samples = int(attack * length)
        decay_samples = int(decay * length)
        release_samples = int(release * length)
        
        # Attack
        if attack_samples > 0:
            envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
        
        # Decay
        if decay_samples > 0:
            decay_start = attack_samples
            decay_end = attack_samples + decay_samples
            envelope[decay_start:decay_end] = np.linspace(1, sustain, decay_samples)
        
        # Sustain (already set to sustain level)
        sustain_start = attack_samples + decay_samples
        sustain_end = length - release_samples
        if sustain_end > sustain_start:
            envelope[sustain_start:sustain_end] = sustain
        
        # Release
        if release_samples > 0:
            release_start = length - release_samples
            envelope[release_start:] = np.linspace(sustain, 0, release_samples)
        
        return envelope

    def _note_to_frequency(self, note: str) -> float:
        """Convert note name to frequency"""
        
        notes = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        }
        
        # Parse note (e.g., "C4", "F#3")
        if len(note) > 1 and note[1] in ['#', 'b']:
            note_name = note[:2]
            octave = int(note[2:])
        else:
            note_name = note[0]
            octave = int(note[1:])
        
        # Calculate frequency
        semitones_from_a4 = (octave - 4) * 12 + notes[note_name] - 9
        frequency = 440.0 * (2 ** (semitones_from_a4 / 12))
        
        return frequency

    def _get_chord_frequencies(self, chord_symbol: str, base_freq: float) -> List[float]:
        """Get frequencies for a chord"""
        
        # Major triad intervals
        major_intervals = [0, 4, 7]  # Root, major third, perfect fifth
        minor_intervals = [0, 3, 7]  # Root, minor third, perfect fifth
        
        if chord_symbol.startswith('i') or 'min' in chord_symbol.lower():
            intervals = minor_intervals
        else:
            intervals = major_intervals
        
        # Roman numeral to semitone mapping
        roman_to_semitones = {
            'I': 0, 'i': 0, 'II': 2, 'ii': 2, 'III': 4, 'iii': 4,
            'IV': 5, 'iv': 5, 'V': 7, 'v': 7, 'VI': 9, 'vi': 9,
            'VII': 11, 'vii': 11, 'bVII': 10, 'bVI': 8
        }
        
        root_offset = roman_to_semitones.get(chord_symbol, 0)
        root_freq = base_freq * (2 ** (root_offset / 12))
        
        chord_freqs = []
        for interval in intervals:
            freq = root_freq * (2 ** (interval / 12))
            chord_freqs.append(freq)
        
        return chord_freqs

    def _add_reverb(self, audio: np.ndarray, decay: float, wet: float) -> np.ndarray:
        """Add simple reverb effect"""
        
        # Simple delay-based reverb
        delay_samples = int(0.05 * self.sample_rate)  # 50ms delay
        reverb_audio = audio.copy()
        
        for i in range(5):  # Multiple delays for reverb effect
            delay = delay_samples * (i + 1)
            if delay < len(audio):
                delayed = np.zeros_like(audio)
                delayed[delay:] = audio[:-delay] * (decay ** (i + 1))
                reverb_audio += delayed
        
        # Mix dry and wet signals
        return audio * (1 - wet) + reverb_audio * wet

    def _low_pass_filter(self, audio: np.ndarray, cutoff_freq: float) -> np.ndarray:
        """Apply simple low-pass filter"""
        
        # Simple RC low-pass filter approximation
        alpha = cutoff_freq / (cutoff_freq + self.sample_rate / (2 * np.pi))
        filtered = np.zeros_like(audio)
        filtered[0] = audio[0]
        
        for i in range(1, len(audio)):
            filtered[i] = alpha * audio[i] + (1 - alpha) * filtered[i - 1]
        
        return filtered

    def _high_pass_filter(self, audio: np.ndarray, cutoff_freq: float) -> np.ndarray:
        """Apply simple high-pass filter"""
        
        # High-pass is original minus low-pass
        low_passed = self._low_pass_filter(audio, cutoff_freq)
        return audio - low_passed * 0.5  # Gentle high-pass effect

    def _compress_audio(self, audio: np.ndarray, ratio: float) -> np.ndarray:
        """Apply simple compression"""
        
        threshold = 0.5
        compressed = audio.copy()
        
        # Apply compression to samples above threshold
        mask = np.abs(compressed) > threshold
        compressed[mask] = np.sign(compressed[mask]) * (
            threshold + (np.abs(compressed[mask]) - threshold) / ratio
        )
        
        return compressed

    def _pitch_shift(self, audio: np.ndarray, semitones: float) -> np.ndarray:
        """Simple pitch shifting using resampling"""
        
        shift_factor = 2 ** (semitones / 12)
        
        # Resample audio
        new_length = int(len(audio) / shift_factor)
        indices = np.linspace(0, len(audio) - 1, new_length)
        shifted = np.interp(indices, np.arange(len(audio)), audio)
        
        # Pad or trim to original length
        if len(shifted) < len(audio):
            padded = np.zeros_like(audio)
            padded[:len(shifted)] = shifted
            return padded
        else:
            return shifted[:len(audio)]

    async def create_sound_effects(
        self,
        effect_type: str,
        duration: float = 1.0,
        **params
    ) -> str:
        """Generate sound effects for anime videos"""
        
        try:
            samples = int(duration * self.sample_rate)
            t = np.linspace(0, duration, samples)
            
            if effect_type == "whoosh":
                # Wind/whoosh effect
                frequency = np.linspace(800, 200, samples)
                audio = np.random.normal(0, 0.1, samples) * np.sin(2 * np.pi * frequency * t)
                audio *= np.exp(-t * 2)  # Fade out
            
            elif effect_type == "sparkle":
                # Magical sparkle effect
                audio = np.zeros(samples)
                for _ in range(20):  # Multiple sparkles
                    start = random.randint(0, samples - 1000)
                    sparkle_duration = random.uniform(0.05, 0.2)
                    sparkle_samples = int(sparkle_duration * self.sample_rate)
                    freq = random.uniform(2000, 8000)
                    
                    sparkle_t = np.linspace(0, sparkle_duration, sparkle_samples)
                    sparkle = np.sin(2 * np.pi * freq * sparkle_t) * np.exp(-sparkle_t * 10)
                    
                    end = min(start + sparkle_samples, samples)
                    audio[start:end] += sparkle[:end-start] * 0.3
            
            elif effect_type == "impact":
                # Impact/hit effect
                frequency = np.linspace(100, 50, samples)
                audio = np.sin(2 * np.pi * frequency * t) * np.exp(-t * 8)
                # Add noise component
                audio += np.random.normal(0, 0.2, samples) * np.exp(-t * 15)
            
            else:
                # Default sine wave
                freq = params.get('frequency', 440)
                audio = np.sin(2 * np.pi * freq * t) * np.exp(-t * 2)
            
            # Normalize
            audio = audio / np.max(np.abs(audio)) * 0.8
            
            # Save effect
            output_path = self.audio_dir / f"effect_{effect_type}_{np.random.randint(1000, 9999)}.wav"
            sf.write(str(output_path), audio, self.sample_rate)
            
            logger.info(f"Sound effect created: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to create sound effect: {e}")
            raise