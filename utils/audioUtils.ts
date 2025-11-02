

import { GoogleGenAI } from "@google/genai";
// Ensure the global Window interface augmentation from types.ts is picked up.
import {} from '../types';

// The `nextStartTime` variable acts as a cursor to track the end of the audio playback queue.
// Scheduling each new audio chunk to start at this time ensures smooth, gapless playback.
let nextStartTime = 0;
let outputAudioContext: AudioContext | null = null;
const sources = new Set<AudioBufferSourceNode>();

/**
 * Provides a singleton instance of AudioContext for audio output.
 * @returns The AudioContext instance.
 */
export function getOutputAudioContext(): AudioContext {
  if (!outputAudioContext) {
    // Fix: Use standard AudioContext directly as webkitAudioContext is deprecated.
    outputAudioContext = new window.AudioContext({ sampleRate: 24000 });
  }
  return outputAudioContext;
}

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 string to decode.
 * @returns The decoded Uint8Array.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 * @param data The Uint8Array containing raw PCM data.
 * @param ctx The AudioContext to use for decoding.
 * @param sampleRate The sample rate of the audio data.
 * @param numChannels The number of audio channels.
 * @returns A Promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Plays an audio buffer through the output AudioContext.
 * @param audioBuffer The AudioBuffer to play.
 * @param ctx The AudioContext to use.
 */
export function playAudioBuffer(audioBuffer: AudioBuffer, ctx: AudioContext): void {
  nextStartTime = Math.max(nextStartTime, ctx.currentTime);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination); // Connect directly to speakers

  source.addEventListener('ended', () => {
    sources.delete(source);
  });

  source.start(nextStartTime);
  nextStartTime = nextStartTime + audioBuffer.duration;
  sources.add(source);
}