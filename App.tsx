import React, { useState, useEffect, useCallback } from 'react';
import { fileToBase64 } from './utils/imageUtils';
import { extractPromptFromImage, generateProductImage, generateProductVideo, generateVideoEnhancements, generateSpeechFromText, setEffectiveApiKey } from './services/geminiService';
import Button from './components/Button';
import ImageUploadCard from './components/ImageUploadCard';
import LoadingOverlay from './components/LoadingOverlay';
import OutputDisplay from './components/OutputDisplay';
import ApiKeyWarning from './components/ApiKeyWarning';
import { PRESET_PROMPTS, IMAGE_RESOLUTION_PRESETS } from './constants';
import { type GroundingChunk, type VideoAspectRatio, type VideoResolution, type AIStudio, type ImageAspectRatio, type ImageResolution, type VideoEnhancements, type WatermarkOptions, type WatermarkType, type WatermarkPosition } from './types';

const App: React.FC = () => {
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageBase64, setProductImageBase64] = useState<string | null>(null);
  const [productImageMimeType, setProductImageMimeType] = useState<string | null>(null);

  const [modelImageFile, setModelImageFile] = useState<File | null>(null); // New state for model image
  const [modelImageBase64, setModelImageBase64] = useState<string | null>(null); // New state for model image
  const [modelImageMimeType, setModelImageMimeType] = useState<string | null>(null); // New state for model image

  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null); // New state for background image
  const [backgroundImageBase64, setBackgroundImageBase64] = useState<string | null>(null); // New state for background image
  const [backgroundImageMimeType, setBackgroundImageMimeType] = useState<string | null>(null); // New state for background image

  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(null);
  const [referenceImageMimeType, setReferenceImageMimeType] = useState<string | null>(null);

  const [textPrompt, setTextPrompt] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const [generatedOutputUrl, setGeneratedOutputUrl] = useState<string | null>(null);
  const [outputMediaType, setOutputMediaType] = useState<'image' | 'video' | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<GroundingChunk[] | null>(null);
  const [videoEnhancements, setVideoEnhancements] = useState<VideoEnhancements | null>(null); // New state for video enhancements

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Renamed from isVeoApiKeySelected to be more precise about platform-managed keys
  const [hasPlatformApiKeySelected, setHasPlatformApiKeySelected] = useState<boolean>(false); 

  const [videoResolution, setVideoResolution] = useState<VideoResolution>('720p');
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>('16:9');

  const [imageResolution, setImageResolution] = useState<ImageResolution>('2K');
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');

  // Watermark states
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [watermarkText, setWatermarkText] = useState<string>('Bản quyền sản phẩm');
  const [watermarkImageFile, setWatermarkImageFile] = useState<File | null>(null);
  const [watermarkImageBase64, setWatermarkImageBase64] = useState<string | null>(null);
  const [watermarkImageMimeType, setWatermarkImageMimeType] = useState<string | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.5); // Stored as 0.0-1.0

  // Manual API Key Management states
  const [manualApiKeyInput, setManualApiKeyInput] = useState<string>('');
  const [hasManualApiKeyStored, setHasManualApiKeyStored] = useState<boolean>(false);

  // Determine if *any* API key is effectively available (manual or environment variable) for general operations
  const isAnyApiKeyEffectivelyAvailable = useCallback(() => {
    return hasManualApiKeyStored || !!process.env.API_KEY;
  }, [hasManualApiKeyStored]);


  const checkPlatformApiKeyStatus = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasPlatformApiKeySelected(hasKey);
      } catch (e) {
        console.error("Error checking platform API key status:", e);
        setHasPlatformApiKeySelected(false);
        setError("Không thể kiểm tra trạng thái khóa API của nền tảng. Vui lòng làm mới và thử lại.");
      }
    } else {
      console.warn("window.aistudio is not available. API key selection for Veo models may not function.");
      // If aistudio is not available, we assume platform-specific key selection is not possible
      // and thus Veo models that explicitly require it might not work.
      setHasPlatformApiKeySelected(false); 
    }
  }, []);

  useEffect(() => {
    // Load manual API key from localStorage on mount
    const storedKey = localStorage.getItem('manualApiKey');
    if (storedKey) {
      setManualApiKeyInput(storedKey); // Set input field to stored value
      setHasManualApiKeyStored(true);
      setEffectiveApiKey(storedKey); // Update the service with the manual key
    } else {
      // If no manual key, ensure service uses process.env.API_KEY
      setEffectiveApiKey(process.env.API_KEY);
    }

    checkPlatformApiKeyStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const handleProductImageChange = useCallback(async (file: File | null) => {
    setProductImageFile(file);
    if (file) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setProductImageBase64(base64);
        setProductImageMimeType(mimeType);

        // Auto-detect aspect ratio and suggest resolution based on input image
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          const ratio = width / height;

          if (ratio > 0.9 && ratio < 1.1) { // Close to 1:1
            setImageAspectRatio('1:1');
          } else if (ratio >= 1.5) { // Wider, consider 16:9
            setImageAspectRatio('16:9');
          } else if (ratio > 1.1) { // Wider than 1:1 but not 16:9, suggest 4:3
            setImageAspectRatio('4:3');
          } else if (ratio < 0.6) { // Taller, consider 9:16
            setImageAspectRatio('9:16');
          } else if (ratio < 0.9) { // Taller than 1:1 but not 9:16, suggest 3:4
            setImageAspectRatio('3:4');
          } else {
            setImageAspectRatio('1:1'); // Default fallback
          }
          setImageResolution('2K'); // Default resolution suggestion
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          console.error("Could not load image to determine dimensions.");
          setImageAspectRatio('1:1'); // Default on error
          setImageResolution('2K'); // Default on error
          URL.revokeObjectURL(img.src);
        };

      } catch (e) {
        setError("Không thể xử lý hình ảnh sản phẩm.");
        setProductImageBase64(null);
        setProductImageMimeType(null);
      }
    } else {
      setProductImageBase64(null);
      setProductImageMimeType(null);
      setImageAspectRatio('1:1'); // Reset to default
      setImageResolution('2K'); // Reset to default
    }
    setGeneratedOutputUrl(null);
    setGroundingUrls(null);
    setVideoEnhancements(null); // Clear video enhancements
  }, []);

  const handleModelImageChange = useCallback(async (file: File | null) => { // New handler for model image
    setModelImageFile(file);
    if (file) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setModelImageBase64(base64);
        setModelImageMimeType(mimeType);
      } catch (e) {
        setError("Không thể xử lý hình ảnh người mẫu.");
        setModelImageBase64(null);
        setModelImageMimeType(null);
      }
    } else {
      setModelImageBase64(null);
      setModelImageMimeType(null);
    }
  }, []);

  const handleBackgroundImageChange = useCallback(async (file: File | null) => { // Handler for background image
    setBackgroundImageFile(file);
    if (file) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setBackgroundImageBase64(base64);
        setBackgroundImageMimeType(mimeType);
      } catch (e) {
        setError("Không thể xử lý hình ảnh bối cảnh.");
        setBackgroundImageBase64(null);
        setBackgroundImageMimeType(null);
      }
    } else {
      setBackgroundImageBase64(null);
      setBackgroundImageMimeType(null);
    }
  }, []);

  const handleReferenceImageChange = useCallback(async (file: File | null) => {
    setReferenceImageFile(file);
    if (file) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setReferenceImageBase64(base64);
        setReferenceImageMimeType(mimeType);
      } catch (e) {
        setError("Không thể xử lý hình ảnh tham chiếu.");
        setReferenceImageBase64(null);
        setReferenceImageMimeType(null);
      }
    } else {
      setReferenceImageBase64(null);
      setReferenceImageMimeType(null);
    }
  }, []);

  const handleWatermarkImageChange = useCallback(async (file: File | null) => {
    setWatermarkImageFile(file);
    if (file) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setWatermarkImageBase64(base64);
        setWatermarkImageMimeType(mimeType);
      } catch (e) {
        setError("Không thể xử lý hình ảnh watermark.");
        setWatermarkImageBase64(null);
        setWatermarkImageMimeType(null);
      }
    } else {
      setWatermarkImageBase64(null);
      setWatermarkImageMimeType(null);
    }
  }, []);

  const handleTextPromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextPrompt(e.target.value);
  }, []);

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);
    const selected = PRESET_PROMPTS.find(p => p.name === presetName);
    if (selected) {
      setTextPrompt(selected.prompt);
    } else {
      setTextPrompt('');
    }
  }, []);

  const clearOutput = useCallback(() => {
    setGeneratedOutputUrl(null);
    setOutputMediaType(null);
    setGroundingUrls(null);
    setVideoEnhancements(null); // Clear video enhancements
    setError(null);
  }, []);

  const handleExtractPrompt = useCallback(async (isProductImage: boolean) => {
    clearOutput();
    setError(null);
    let imageBase64: string | null = null;
    let mimeType: string | null = null;

    if (!isAnyApiKeyEffectivelyAvailable()) {
      setError('Không có khóa API. Vui lòng nhập khóa thủ công hoặc đảm bảo process.env.API_KEY được đặt.');
      return;
    }

    if (isProductImage && productImageBase64 && productImageMimeType) {
      imageBase64 = productImageBase64;
      mimeType = productImageMimeType;
      setLoadingMessage('Đang phân tích hình ảnh sản phẩm và tạo gợi ý...');
    } else if (!isProductImage && referenceImageBase64 && referenceImageMimeType) {
      imageBase64 = referenceImageBase64;
      mimeType = referenceImageMimeType;
      setLoadingMessage('Đang phân tích hình ảnh tham chiếu và trích xuất gợi ý...');
    } else {
      setError(`Vui lòng tải lên hình ảnh ${isProductImage ? 'sản phẩm' : 'tham chiếu'} trước.`);
      return;
    }

    setIsLoading(true);
    try {
      // Ensure imageBase64 and mimeType are not null before passing to extractPromptFromImage
      if (imageBase64 && mimeType) {
        const { text, groundingUrls: newGroundingUrls } = await extractPromptFromImage(imageBase64, mimeType);
        setTextPrompt(text);
        setGroundingUrls(newGroundingUrls);
      } else {
        setError('Dữ liệu hình ảnh bị thiếu.');
      }
    } catch (e: any) {
      setError(e.message || 'Không thể trích xuất gợi ý.');
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [clearOutput, productImageBase64, productImageMimeType, referenceImageBase64, referenceImageMimeType, isAnyApiKeyEffectivelyAvailable]);

  const handleGenerateImage = useCallback(async () => {
    clearOutput();
    setError(null);

    if (!isAnyApiKeyEffectivelyAvailable()) {
      setError('Không có khóa API. Vui lòng nhập khóa thủ công hoặc đảm bảo process.env.API_KEY được đặt.');
      return;
    }

    if (!productImageBase64 || !productImageMimeType) {
      setError('Vui lòng tải lên hình ảnh sản phẩm trước.');
      return;
    }
    if (!textPrompt.trim()) {
      setError('Vui lòng nhập gợi ý hoặc trích xuất từ hình ảnh.');
      return;
    }

    // Construct watermark options
    const watermarkOptions: WatermarkOptions = {
      enabled: watermarkEnabled,
      type: watermarkType,
      position: watermarkPosition,
      opacity: watermarkOpacity,
    };

    if (watermarkEnabled) {
      if (watermarkType === 'text') {
        watermarkOptions.text = watermarkText;
      } else if (watermarkType === 'image') {
        if (!watermarkImageBase64 || !watermarkImageMimeType) {
          setError('Vui lòng tải lên hình ảnh watermark hoặc chọn loại "Chữ".');
          return;
        }
        watermarkOptions.image = {
          base64: watermarkImageBase64,
          mimeType: watermarkImageMimeType,
        };
      }
    }


    setLoadingMessage('Đang tạo hình ảnh quảng cáo...');
    setIsLoading(true);
    try {
      const { imageUrl, groundingUrls: newGroundingUrls } = await generateProductImage(
        productImageBase64,
        productImageMimeType,
        modelImageBase64,
        modelImageMimeType,
        backgroundImageBase64, // Pass background image Base64
        backgroundImageMimeType, // Pass background image MimeType
        textPrompt,
        imageResolution,
        imageAspectRatio,
        watermarkOptions // Pass watermark options
      );
      setGeneratedOutputUrl(imageUrl);
      setOutputMediaType('image');
      setGroundingUrls(newGroundingUrls);
    } catch (e: any) {
      setError(e.message || 'Không thể tạo hình ảnh.');
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [
    clearOutput,
    productImageBase64,
    productImageMimeType,
    modelImageBase64,
    modelImageMimeType,
    backgroundImageBase64, // Dependency for background image
    backgroundImageMimeType, // Dependency for background image
    textPrompt,
    imageResolution,
    imageAspectRatio,
    watermarkEnabled,
    watermarkType,
    watermarkText,
    watermarkImageBase64,
    watermarkImageMimeType,
    watermarkPosition,
    watermarkOpacity,
    isAnyApiKeyEffectivelyAvailable
  ]);

  const handleSelectPlatformApiKey = useCallback(async () => {
    setError(null);
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setHasPlatformApiKeySelected(true); // Assume success as per instructions
        setEffectiveApiKey(process.env.API_KEY); // Re-align service API key with potentially new platform key
        setError(null); // Clear previous API key errors
      } catch (e) {
        console.error("Error opening API key selection:", e);
        setError("Không thể mở hộp thoại chọn khóa API.");
        setHasPlatformApiKeySelected(false);
      }
    } else {
      setError("Tiện ích chọn khóa API không khả dụng. Vui lòng đảm bảo bạn đang ở trong môi trường chính xác.");
    }
  }, []);

  const handlePlayVoiceOver = useCallback(async (script: string) => {
    setError(null);
    if (!isAnyApiKeyEffectivelyAvailable()) {
      setError('Không có khóa API. Vui lòng nhập khóa thủ công hoặc đảm bảo process.env.API_KEY được đặt.');
      return;
    }
    setLoadingMessage('Đang tạo và phát thuyết minh...');
    setIsLoading(true);
    try {
      await generateSpeechFromText(script);
    } catch (e: any) {
      setError(e.message || 'Không thể tạo và phát thuyết minh.');
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [isAnyApiKeyEffectivelyAvailable]);

  const handleGenerateVideo = useCallback(async () => {
    clearOutput();
    setError(null);

    // Veo models have specific API key requirements via platform selection
    if (!hasPlatformApiKeySelected) {
      setError('Các mô hình tạo video yêu cầu khóa API đã chọn qua nền tảng. Vui lòng chọn một khóa.');
      return;
    }

    if (!productImageBase64 || !productImageMimeType) {
      setError('Vui lòng tải lên hình ảnh sản phẩm cho khung hình bắt đầu video.');
      return;
    }
    if (!textPrompt.trim()) {
      setError('Vui lòng nhập gợi ý cho video hoặc trích xuất một gợi ý.');
      return;
    }

    setLoadingMessage('Đang tạo video quảng cáo (quá trình này có thể mất vài phút)...');
    setIsLoading(true);
    try {
      const { videoUrl, groundingUrls: newGroundingUrls } = await generateProductVideo(
        textPrompt,
        productImageBase64,
        productImageMimeType,
        referenceImageBase64, // Use reference image as end frame if available
        referenceImageMimeType,
        videoResolution,
        videoAspectRatio
      );
      setGeneratedOutputUrl(videoUrl);
      setOutputMediaType('video');
      setGroundingUrls(newGroundingUrls);

      // After video is generated, get enhancements
      setLoadingMessage('Đang đề xuất âm nhạc, phụ đề và kịch bản thuyết minh...');
      const enhancements = await generateVideoEnhancements(textPrompt);
      setVideoEnhancements(enhancements);

    } catch (e: any) {
      if (e.message && e.message.includes("Requested entity was not found.")) {
        setHasPlatformApiKeySelected(false); // Reset key status if invalid
      }
      setError(e.message || 'Không thể tạo video.');
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [
    clearOutput,
    hasPlatformApiKeySelected,
    productImageBase64,
    productImageMimeType,
    textPrompt,
    referenceImageBase64,
    referenceImageMimeType,
    videoResolution,
    videoAspectRatio
  ]);

  const handleSaveManualApiKey = useCallback(() => {
    if (manualApiKeyInput.trim()) {
      localStorage.setItem('manualApiKey', manualApiKeyInput.trim());
      setHasManualApiKeyStored(true);
      setEffectiveApiKey(manualApiKeyInput.trim());
      setError(null);
      alert('Khóa API đã được lưu và kích hoạt!');
    } else {
      setError('Vui lòng nhập khóa API.');
    }
  }, [manualApiKeyInput]);

  const handleClearManualApiKey = useCallback(() => {
    localStorage.removeItem('manualApiKey');
    setHasManualApiKeyStored(false);
    setManualApiKeyInput(''); // Clear input field
    setEffectiveApiKey(process.env.API_KEY); // Reset to environment variable
    setError(null);
    checkPlatformApiKeyStatus(); // Re-check platform status after clearing manual key
    alert('Khóa API thủ công đã bị xóa. Bây giờ ứng dụng sẽ sử dụng khóa API từ biến môi trường hoặc yêu cầu chọn khóa cho Veo.');
  }, [checkPlatformApiKeyStatus]);


  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      <header className="w-full max-w-5xl text-center py-8 mb-8">
        <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-2">AI Tạo Quảng Cáo Sản Phẩm</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Tận dụng AI để tạo hình ảnh và video quảng cáo ấn tượng cho sản phẩm của bạn.
        </p>
      </header>

      <main className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 flex flex-col gap-8">
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative">
            <strong className="font-bold">Lỗi!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* API Key Management Section */}
        <div className="flex flex-col gap-4 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">1. Quản lý Khóa API</h2>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Bạn có thể nhập khóa API Gemini của mình thủ công để sử dụng. Khóa này sẽ được ưu tiên hơn biến môi trường `process.env.API_KEY`.
            Đối với các mô hình Veo, bạn vẫn cần chọn khóa API của nền tảng (nếu có yêu cầu cụ thể).
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password" // Use type="password" for sensitive info
              value={manualApiKeyInput}
              onChange={(e) => setManualApiKeyInput(e.target.value)}
              className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              placeholder={hasManualApiKeyStored ? "Khóa API đã lưu (không hiển thị)" : "Nhập khóa API của bạn"}
              disabled={isLoading}
            />
            <Button onClick={handleSaveManualApiKey} disabled={isLoading || !manualApiKeyInput.trim()} variant="primary">
              Lưu khóa API
            </Button>
            <Button onClick={handleClearManualApiKey} disabled={isLoading || !hasManualApiKeyStored} variant="secondary">
              Xóa khóa API thủ công
            </Button>
          </div>
          {hasManualApiKeyStored && (
            <p className="text-sm text-green-600 dark:text-green-400">
              &#10003; Khóa API thủ công đang được sử dụng.
            </p>
          )}
          {!hasManualApiKeyStored && !!process.env.API_KEY && (
             <p className="text-sm text-blue-600 dark:text-blue-400">
              &#10003; Đang sử dụng khóa API từ biến môi trường.
             </p>
          )}
          {!hasManualApiKeyStored && !process.env.API_KEY && (
            <p className="text-sm text-red-600 dark:text-red-400">
              &#9888; Không có khóa API nào được thiết lập (thủ công hoặc biến môi trường). Vui lòng nhập khóa API.
            </p>
          )}
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Changed to 3 columns for model image */}
          <ImageUploadCard
            label="2. Tải lên hình ảnh sản phẩm của bạn"
            imageFile={productImageFile}
            onImageChange={handleProductImageChange}
            isLoading={isLoading}
            buttonLabel="Chọn ảnh sản phẩm"
          />
          <ImageUploadCard
            label="3. Tải lên hình ảnh người mẫu (Tùy chọn)" // New card for model image
            imageFile={modelImageFile}
            onImageChange={handleModelImageChange}
            isLoading={isLoading}
            buttonLabel="Chọn ảnh người mẫu"
          />
          <ImageUploadCard
            label="4. Tải lên hình ảnh bối cảnh (Tùy chọn)" // New card for background image
            imageFile={backgroundImageFile}
            onImageChange={handleBackgroundImageChange}
            isLoading={isLoading}
            buttonLabel="Chọn ảnh bối cảnh"
          />
        </div>

        {/* Existing Reference Image Card (shifted to 5th) */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <ImageUploadCard
            label="5. Tải lên hình ảnh tham chiếu (Tùy chọn)"
            imageFile={referenceImageFile}
            onImageChange={handleReferenceImageChange}
            isLoading={isLoading}
            buttonLabel="Chọn ảnh tham chiếu"
          />
        </div>

        <div className="flex flex-col gap-4">
          <label htmlFor="preset-prompts" className="block text-xl font-semibold text-gray-800 dark:text-gray-100">
            6. Chọn gợi ý có sẵn hoặc tự viết
          </label>
          <select
            id="preset-prompts"
            value={selectedPreset}
            onChange={handlePresetChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">-- Chọn một gợi ý có sẵn --</option>
            {PRESET_PROMPTS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
          <textarea
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg h-32 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-y"
            placeholder="Mô tả cảnh quảng cáo mong muốn của bạn (ví dụ: 'Một chai nước hoa thanh lịch trên nền rừng dưới ánh trăng, với ánh sáng huyền ảo và sương mù nhẹ nhàng.')"
            value={textPrompt}
            onChange={handleTextPromptChange}
            disabled={isLoading}
          ></textarea>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => handleExtractPrompt(true)}
              disabled={isLoading || !productImageBase64 || !isAnyApiKeyEffectivelyAvailable()}
              variant="secondary"
            >
              Trích xuất gợi ý từ ảnh sản phẩm
            </Button>
            <Button
              onClick={() => handleExtractPrompt(false)}
              disabled={isLoading || !referenceImageBase64 || !isAnyApiKeyEffectivelyAvailable()}
              variant="secondary"
            >
              Trích xuất gợi ý từ ảnh tham chiếu
            </Button>
          </div>
        </div>

        {/* Watermark Settings Section */}
        <div className="flex flex-col gap-4 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <input
              type="checkbox"
              id="enable-watermark"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="enable-watermark" className="cursor-pointer">7. Cài đặt Watermark (Chỉ dành cho hình ảnh)</label>
          </h2>

          {watermarkEnabled && (
            <div className="flex flex-col gap-4 pl-6 border-l border-gray-300 dark:border-gray-600">
              {/* Watermark Type */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="text-gray-800 dark:text-gray-100 whitespace-nowrap mr-2">Loại Watermark:</label>
                <div className="flex gap-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="watermark-type-text"
                      name="watermark-type"
                      value="text"
                      checked={watermarkType === 'text'}
                      onChange={() => setWatermarkType('text')}
                      disabled={isLoading}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="watermark-type-text" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Chữ</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="watermark-type-image"
                      name="watermark-type"
                      value="image"
                      checked={watermarkType === 'image'}
                      onChange={() => setWatermarkType('image')}
                      disabled={isLoading}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="watermark-type-image" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Hình ảnh</label>
                  </div>
                </div>
              </div>

              {/* Watermark Content (Text or Image) */}
              {watermarkType === 'text' && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="watermark-text" className="text-gray-800 dark:text-gray-100">Văn bản Watermark:</label>
                  <input
                    type="text"
                    id="watermark-text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    disabled={isLoading}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập văn bản watermark của bạn"
                  />
                </div>
              )}
              {watermarkType === 'image' && (
                <ImageUploadCard
                  label="Tải lên hình ảnh Watermark"
                  imageFile={watermarkImageFile}
                  onImageChange={handleWatermarkImageChange}
                  isLoading={isLoading}
                  className="!p-0 !bg-transparent !shadow-none !border-none" // Override default card styling
                  buttonLabel="Chọn ảnh watermark"
                />
              )}

              {/* Watermark Position */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label htmlFor="watermark-position" className="text-gray-800 dark:text-gray-100 whitespace-nowrap mr-2">Vị trí:</label>
                <select
                  id="watermark-position"
                  value={watermarkPosition}
                  onChange={(e) => setWatermarkPosition(e.target.value as WatermarkPosition)}
                  disabled={isLoading}
                  className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full"
                >
                  <option value="top-left">Góc trên bên trái</option>
                  <option value="top-center">Giữa trên</option>
                  <option value="top-right">Góc trên bên phải</option>
                  <option value="middle-left">Giữa bên trái</option>
                  <option value="center">Chính giữa</option>
                  <option value="middle-right">Giữa bên phải</option>
                  <option value="bottom-left">Góc dưới bên trái</option>
                  <option value="bottom-center">Giữa dưới</option>
                  <option value="bottom-right">Góc dưới bên phải</option>
                </select>
              </div>

              {/* Watermark Opacity */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label htmlFor="watermark-opacity" className="text-gray-800 dark:text-gray-100 whitespace-nowrap mr-2">Độ trong suốt: {Math.round(watermarkOpacity * 100)}%</label>
                <input
                  type="range"
                  id="watermark-opacity"
                  min="0"
                  max="1"
                  step="0.01"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
            </div>
          )}
        </div>


        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">8. Tạo quảng cáo của bạn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Generation Section */}
            <div className="flex flex-col gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tạo hình ảnh</h3>
              <div className="flex items-center space-x-4">
                <label htmlFor="image-aspect-ratio" className="text-gray-800 dark:text-gray-100 whitespace-nowrap">Tỷ lệ khung hình:</label>
                <select
                  id="image-aspect-ratio"
                  value={imageAspectRatio}
                  onChange={(e) => setImageAspectRatio(e.target.value as ImageAspectRatio)}
                  className="p-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                  disabled={isLoading}
                >
                  <option value="1:1">1:1 (vuông)</option>
                  <option value="3:4">3:4 (dọc chân dung)</option>
                  <option value="4:3">4:3 (truyền thống)</option>
                  <option value="9:16">9:16 (dọc video)</option>
                  <option value="16:9">16:9 (ngang rộng)</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label htmlFor="image-resolution" className="text-gray-800 dark:text-gray-100 whitespace-nowrap">Độ phân giải:</label>
                <select
                  id="image-resolution"
                  value={imageResolution}
                  onChange={(e) => setImageResolution(e.target.value as ImageResolution)}
                  className="p-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                  disabled={isLoading}
                >
                  <option value="2K">2K ({IMAGE_RESOLUTION_PRESETS[imageAspectRatio]['2K']})</option>
                  <option value="4K">4K ({IMAGE_RESOLUTION_PRESETS[imageAspectRatio]['4K']})</option>
                  <option value="8K">8K ({IMAGE_RESOLUTION_PRESETS[imageAspectRatio]['8K']})</option>
                </select>
              </div>
              <Button
                onClick={handleGenerateImage}
                disabled={
                  isLoading || 
                  !productImageBase64 || 
                  !textPrompt.trim() ||
                  (watermarkEnabled && watermarkType === 'image' && (!watermarkImageBase64 || !watermarkImageMimeType)) ||
                  !isAnyApiKeyEffectivelyAvailable()
                }
                fullWidth
              >
                Tạo quảng cáo hình ảnh
              </Button>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                * Lưu ý: Mô hình AI sẽ cố gắng tạo hình ảnh theo tỷ lệ và độ phân giải đã chọn, nhưng không đảm bảo chính xác pixel.
              </p>
            </div>

            {/* Video Generation Section */}
            <div className="flex flex-col gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tạo video</h3>
              {!hasPlatformApiKeySelected && <ApiKeyWarning onSelectApiKey={handleSelectPlatformApiKey} />}
              <div className="flex items-center space-x-4">
                <label htmlFor="video-resolution" className="text-gray-800 dark:text-gray-100 whitespace-nowrap">Độ phân giải:</label>
                <select
                  id="video-resolution"
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value as VideoResolution)}
                  className="p-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                  disabled={isLoading}
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label htmlFor="video-aspect-ratio" className="text-gray-800 dark:text-gray-100 whitespace-nowrap">Tỷ lệ khung hình:</label>
                <select
                  id="video-aspect-ratio"
                  value={videoAspectRatio}
                  onChange={(e) => setVideoAspectRatio(e.target.value as VideoAspectRatio)}
                  className="p-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                  disabled={isLoading}
                >
                  <option value="16:9">16:9 (ngang)</option>
                  <option value="9:16">9:16 (dọc)</option>
                </select>
              </div>
              <Button
                onClick={handleGenerateVideo}
                disabled={isLoading || !productImageBase64 || !textPrompt.trim() || !hasPlatformApiKeySelected}
                fullWidth
              >
                Tạo quảng cáo video
              </Button>
            </div>
          </div>
        </div>

        <OutputDisplay
          outputUrl={generatedOutputUrl}
          mediaType={outputMediaType}
          groundingUrls={groundingUrls}
          videoEnhancements={videoEnhancements} // Pass video enhancements
          onPlayVoiceOver={handlePlayVoiceOver} // Pass play function
          onClearOutput={clearOutput}
        />
      </main>
    </div>
  );
};

export default App;