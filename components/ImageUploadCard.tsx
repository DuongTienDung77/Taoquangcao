import React from 'react';
import Button from './Button';

interface ImageUploadCardProps {
  label: string;
  imageFile: File | null;
  onImageChange: (file: File | null) => void;
  isLoading: boolean;
  className?: string;
  buttonLabel?: string;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  label,
  imageFile,
  onImageChange,
  isLoading,
  className,
  buttonLabel = 'Tải ảnh lên'
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImageChange(event.target.files[0]);
    } else {
      onImageChange(null);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearImage = () => {
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

  React.useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl); // Clean up object URL when component unmounts or image changes
      }
    };
  }, [imageUrl]);

  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{label}</h3>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        disabled={isLoading}
      />
      {imageUrl ? (
        <div className="relative w-full mb-4 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-700 max-h-[24rem]">
          <img src={imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearImage}
            className="absolute top-2 right-2 p-1 text-red-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
            aria-label="Xóa hình ảnh"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      ) : (
        <div className="w-full h-[12rem] mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>Chưa có hình ảnh nào được chọn</p>
        </div>
      )}
      <Button onClick={handleButtonClick} disabled={isLoading} fullWidth>
        {buttonLabel}
      </Button>
    </div>
  );
};

export default ImageUploadCard;