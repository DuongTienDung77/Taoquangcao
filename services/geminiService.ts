import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { type ImagePart, type GroundingChunk, type VideoAspectRatio, type VideoResolution, type ImageAspectRatio, type ImageResolution, type VideoEnhancements, type WatermarkOptions, type WatermarkPosition } from '../types';
import { MAX_VIDEO_POLLING_ATTEMPTS, VIDEO_POLLING_INTERVAL_MS } from '../constants';
import { decode, decodeAudioData, getOutputAudioContext, playAudioBuffer } from '../utils/audioUtils';

/**
 * Module-level variable to store the currently effective API key.
 * This can be updated by App.tsx (e.g., from manual input) or defaults to process.env.API_KEY.
 */
let currentEffectiveApiKey: string | undefined = process.env.API_KEY;

/**
 * Sets the API key to be used by the Gemini service.
 * This allows App.tsx to update the key based on user input or localStorage.
 * @param key The new API key to use. If undefined, it will fallback to process.env.API_KEY if available.
 */
export function setEffectiveApiKey(key: string | undefined): void {
  currentEffectiveApiKey = key;
}

/**
 * Creates an image part object for the Gemini API.
 * @param base64Image The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns An ImagePart object.
 */
function createImagePart(base64Image: string, mimeType: string): ImagePart {
  return {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };
}

/**
 * Returns a new instance of GoogleGenAI client, ensuring the latest API key is used.
 * It will use the `currentEffectiveApiKey` which can be set via `setEffectiveApiKey`,
 * falling back to `process.env.API_KEY` if `currentEffectiveApiKey` is undefined.
 * @returns A Promise that resolves to a GoogleGenAI instance.
 */
async function getGeminiClient(): Promise<GoogleGenAI> {
    const apiKey = currentEffectiveApiKey || process.env.API_KEY; // Fallback to process.env.API_KEY
    if (!apiKey) {
      // Throw an error if no API key is available from any source
      throw new Error("API Key is not configured. Please enter a manual key or ensure process.env.API_KEY is set.");
    }
    return new GoogleGenAI({ apiKey });
}

/**
 * Extracts a descriptive prompt from an image for advertising purposes.
 * @param base64Image The base64 encoded image data of the product.
 * @param mimeType The MIME type of the product image.
 * @returns A promise that resolves to an object containing the extracted prompt text and any grounding URLs.
 */
export async function extractPromptFromImage(base64Image: string, mimeType: string): Promise<{ text: string; groundingUrls: GroundingChunk[] }> {
    const ai = await getGeminiClient();
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Good for multimodal understanding and text generation
            contents: {
                parts: [
                    createImagePart(base64Image, mimeType),
                    {
                        text: `Phân tích hình ảnh sản phẩm này. Mô tả sản phẩm, các tính năng chính, bao bì và các hiệu ứng hình ảnh đề xuất phù hợp cho một chiến dịch quảng cáo chất lượng cao. Tập trung vào các yếu tố như ánh sáng, nền, bố cục và cảm xúc. Tạo một gợi ý chi tiết, hấp dẫn (khoảng 200-300 từ) cho một AI tạo hình ảnh, hướng tới một hình ảnh trực quan thanh lịch và có tác động. Cân nhắc các xu hướng quảng cáo hiện tại cho các sản phẩm tương tự.`,
                    },
                ],
            },
            config: {
                tools: [{ googleSearch: {} }], // Use Google Search for current trends if needed
                responseMimeType: 'text/plain',
                maxOutputTokens: 500,
                thinkingConfig: { thinkingBudget: 100 },
            }
        });
        const text = response.text;
        const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text, groundingUrls };
    } catch (error: any) {
        console.error("Error extracting prompt from image:", error);
        throw new Error(`Failed to extract prompt: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Helper function to get a Vietnamese description for watermark position.
 * @param position The WatermarkPosition enum value.
 * @returns A string description of the position in Vietnamese.
 */
function getWatermarkPositionDescription(position: WatermarkPosition): string {
  switch (position) {
    case 'top-left': return 'góc trên bên trái';
    case 'top-center': return 'giữa trên';
    case 'top-right': return 'góc trên bên phải';
    case 'middle-left': return 'giữa bên trái';
    case 'center': return 'chính giữa';
    case 'middle-right': return 'giữa bên phải';
    case 'bottom-left': return 'góc dưới bên trái';
    case 'bottom-center': return 'giữa dưới';
    case 'bottom-right': return 'góc dưới bên phải';
    default: return 'chính giữa';
  }
}

/**
 * Generates an advertising image based on a product image, optional model image,
 * optional background image, and a text prompt.
 * @param productImageBase64 The base64 encoded image data of the product.
 * @param productImageMimeType The MIME type of the product image.
 * @param modelImageBase64 Optional: The base64 encoded image data of the model.
 * @param modelImageMimeType Optional: The MIME type of the model image.
 * @param backgroundImageBase64 Optional: The base64 encoded image data of the background.
 * @param backgroundImageMimeType Optional: The MIME type of the background image.
 * @param textPrompt The text prompt describing the desired advertising scene.
 * @param imageResolution The desired output image resolution (e.g., '2K', '4K').
 * @param imageAspectRatio The desired output image aspect ratio (e.g., '1:1', '16:9').
 * @param watermarkOptions Optional: Options for applying a watermark.
 * @returns A promise that resolves to an object containing the generated image URL and any grounding URLs.
 */
export async function generateProductImage(
    productImageBase64: string,
    productImageMimeType: string,
    modelImageBase64: string | null,
    modelImageMimeType: string | null,
    backgroundImageBase64: string | null, // New parameter for background image
    backgroundImageMimeType: string | null, // New parameter for background image
    textPrompt: string,
    imageResolution: ImageResolution,
    imageAspectRatio: ImageAspectRatio,
    watermarkOptions: WatermarkOptions
): Promise<{ imageUrl: string; groundingUrls: GroundingChunk[] }> {
    const ai = await getGeminiClient();
    try {
        // Initial content parts: always product image first
        const contentParts: (ImagePart | { text: string })[] = [
            createImagePart(productImageBase64, productImageMimeType), // Image 1: Product
        ];

        let promptInstructions: string[] = [];
        promptInstructions.push(`Tạo hình ảnh quảng cáo cho sản phẩm từ hình ảnh đầu tiên được cung cấp.`);
        promptInstructions.push(`Cảnh mô tả: ${textPrompt}.`);
        promptInstructions.push(`Đảm bảo hình ảnh có tỷ lệ khung hình ${imageAspectRatio} và chất lượng ${imageResolution}.`);

        // If model image is present, add it and instruct the AI
        if (modelImageBase64 && modelImageMimeType) {
            contentParts.push(createImagePart(modelImageBase64, modelImageMimeType)); // Image 2: Model
            promptInstructions.push(`Tích hợp người mẫu từ hình ảnh thứ hai vào cảnh. Hãy đảm bảo người mẫu tương tác với sản phẩm một cách tự nhiên theo mô tả.`);
        }

        // If background image is present, add it and instruct the AI
        if (backgroundImageBase64 && backgroundImageMimeType) {
            contentParts.push(createImagePart(backgroundImageBase64, backgroundImageMimeType)); // Image 3: Background
            promptInstructions.push(`Sử dụng hình ảnh thứ ba được cung cấp làm bối cảnh chính cho quảng cáo. Đặt sản phẩm và người mẫu (nếu có) vào bối cảnh này một cách tự nhiên và hài hòa.`);
        }

        // Handle watermark
        if (watermarkOptions.enabled) {
            const opacityPercent = Math.round(watermarkOptions.opacity * 100);
            const positionDesc = getWatermarkPositionDescription(watermarkOptions.position);

            if (watermarkOptions.type === 'text' && watermarkOptions.text) {
                promptInstructions.push(`Thêm một dấu watermark chữ "${watermarkOptions.text}" ở vị trí ${positionDesc} với độ trong suốt ${opacityPercent}%.`);
            } else if (watermarkOptions.type === 'image' && watermarkOptions.image) {
                contentParts.push(createImagePart(watermarkOptions.image.base64, watermarkOptions.image.mimeType)); // Image X: Watermark
                // The prompt needs to reference "hình ảnh cuối cùng được cung cấp" because its index might vary
                promptInstructions.push(`Vui lòng sử dụng hình ảnh cuối cùng được cung cấp làm dấu watermark, đặt nó ở vị trí ${positionDesc} với độ trong suốt ${opacityPercent}%. Hãy làm cho watermark trông chuyên nghiệp và hòa hợp với hình ảnh.`);
            }
        }

        // Combine all prompt instructions
        let finalPrompt = promptInstructions.join(' ');

        // Add the constructed prompt last.
        contentParts.push({ text: finalPrompt });

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Good for general image generation and editing with multimodal input
            contents: { parts: contentParts }, // Use the modified parts array
            config: {
                responseModalities: [Modality.IMAGE], // Must be an array with a single `Modality.IMAGE` element.
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!imagePart) {
            throw new Error("No image data received from Gemini API.");
        }
        const imageUrl = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { imageUrl, groundingUrls };

    } catch (error: any) {
        console.error("Error generating product image:", error);
        throw new Error(`Failed to generate image: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Generates an advertising video based on a text prompt, an optional starting image, and an optional ending image.
 * @param textPrompt The text prompt describing the desired video scene.
 * @param productImageBase64 The base64 encoded image data for the starting frame.
 * @param productImageMimeType The MIME type of the starting image.
 * @param endImageBase64 Optional: The base64 encoded image data for the ending frame.
 * @param endImageMimeType Optional: The MIME type of the ending image.
 * @param resolution The desired video resolution ('720p' or '1080p').
 * @param aspectRatio The desired video aspect ratio ('16:9' or '9:16').
 * @returns A promise that resolves to an object containing the generated video URL and any grounding URLs.
 */
export async function generateProductVideo(
    textPrompt: string,
    productImageBase64: string,
    productImageMimeType: string,
    endImageBase64: string | null,
    endImageMimeType: string | null,
    resolution: VideoResolution,
    aspectRatio: VideoAspectRatio
): Promise<{ videoUrl: string; groundingUrls: GroundingChunk[] }> {
    const ai = await getGeminiClient();
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-preview', // Changed to Veo 2.0 for quota saving
            prompt: textPrompt,
            image: createImagePart(productImageBase64, productImageMimeType), // Start frame
            config: {
                numberOfVideos: 1,
                resolution: resolution,
                aspectRatio: aspectRatio,
                ...(endImageBase64 && endImageMimeType ? { lastFrame: createImagePart(endImageBase64, endImageMimeType) } : {}),
            },
        });

        let attempts = 0;
        while (!operation.done && attempts < MAX_VIDEO_POLLING_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, VIDEO_POLLING_INTERVAL_MS));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            attempts++;
            // Veo models typically generate video without audio by default.
            if (operation.error) {
                throw new Error(`Video generation error during polling: ${operation.error.message}`);
            }
        }

        if (!operation.done || !operation.response?.generatedVideos?.[0]?.video?.uri) {
            throw new Error("Video generation timed out or failed to produce a valid URI.");
        }

        const downloadLink = operation.response.generatedVideos[0].video.uri;
        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
        const videoUrl = `${downloadLink}&key=${currentEffectiveApiKey || process.env.API_KEY}`; // Use currentEffectiveApiKey
        
        // As per documentation, generateVideos does not return grounding chunks directly.
        const groundingUrls: GroundingChunk[] = [];
        return { videoUrl, groundingUrls };

    } catch (error: any) {
        console.error("Error generating product video:", error);
        if (error.message && error.message.includes("Requested entity was not found.")) {
            // Specific error to reset key selection
            throw new Error("API key might be invalid or not selected. Please select your API key again for Veo models.");
        }
        throw new Error(`Failed to generate video: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Generates suggestions for background music, subtitles, and a voice-over script for a video.
 * @param videoPrompt The original text prompt used to generate the video.
 * @returns A promise that resolves to an object containing video enhancements.
 */
export async function generateVideoEnhancements(videoPrompt: string): Promise<VideoEnhancements> {
    const ai = await getGeminiClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Using flash for quicker response
        contents: `Dựa trên gợi ý video sau: "${videoPrompt}", hãy đề xuất âm nhạc nền, phụ đề và kịch bản thuyết minh (voice-over) phù hợp cho một quảng cáo sản phẩm. Định dạng đầu ra dưới dạng JSON với các trường: "suggestedMusic", "subtitles" (mảng các chuỗi), và "voiceOverScript".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedMusic: { type: Type.STRING, description: 'Kiểu hoặc tâm trạng âm nhạc nền phù hợp.' },
              subtitles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Mảng các dòng phụ đề phù hợp với nội dung video.'
              },
              voiceOverScript: { type: Type.STRING, description: 'Kịch bản thuyết minh chi tiết cho video.' },
            },
            required: ['suggestedMusic', 'subtitles', 'voiceOverScript'],
            propertyOrdering: ['suggestedMusic', 'subtitles', 'voiceOverScript'],
          },
        },
      });
  
      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr) as VideoEnhancements;
    } catch (error: any) {
      console.error("Error generating video enhancements:", error);
      throw new Error(`Failed to generate video enhancements: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Generates speech from a given text and plays it.
 * @param text The text to convert to speech.
 */
export async function generateSpeechFromText(text: string): Promise<void> {
    const ai = await getGeminiClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // Using 'Kore' as an example, can be customized
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            const ctx = getOutputAudioContext();
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1,
            );
            playAudioBuffer(audioBuffer, ctx);
        } else {
            throw new Error("No audio data received from TTS API.");
        }
    } catch (error: any) {
        console.error("Error generating speech:", error);
        throw new Error(`Failed to generate speech: ${error.message || 'Unknown error'}`);
    }
}