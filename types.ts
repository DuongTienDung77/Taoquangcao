
import { type BasePart } from '@google/genai';

/** Represents an inline data part for Gemini API. */
export interface ImagePart extends BasePart {
  inlineData: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
}

/** Represents a grounding chunk, typically containing a URI and title. */
export interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
  maps?: {
    uri: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        uri: string;
        title?: string;
        text?: string;
      }[];
    };
  };
}

/** Represents a preset prompt template. */
export interface PresetPrompt {
  name: string;
  prompt: string;
}

/** Represents supported image aspect ratios. */
export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

/** Represents supported image resolutions (conceptual, for prompt guidance). */
export type ImageResolution = '2K' | '4K' | '8K';

/** Represents the type of watermark. */
export type WatermarkType = 'text' | 'image';

/** Represents the position of the watermark. */
export type WatermarkPosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** Represents the options for a watermark. */
export interface WatermarkOptions {
  enabled: boolean;
  type: WatermarkType;
  text?: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  position: WatermarkPosition;
  opacity: number; // 0.0 to 1.0
}