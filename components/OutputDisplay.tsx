
import React, { useState } from 'react';
import { type GroundingChunk } from '../types';
import Button from './Button';

interface OutputDisplayProps {
  outputUrl: string | null;
  mediaType: 'image' | null;
  groundingUrls: GroundingChunk[] | null;
  onClearOutput: () => void;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ outputUrl, mediaType, groundingUrls, onClearOutput }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  if (!outputUrl) {
    return null;
  }

  const hasGrounding = groundingUrls && groundingUrls.length > 0;

  const handleImageClick = (url: string) => {
    setModalImageUrl(url);
    setShowImageModal(true);
  };

  const handleCloseModal = () => {
    setShowImageModal(false);
    setModalImageUrl(null);
  };

  return (
    <div className="flex flex-col items-center w-full p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Kết quả được tạo</h2>
      
      <div className={`relative w-full max-w-3xl bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-6 flex items-center justify-center h-auto`}>
        {mediaType === 'image' && (
          <img 
            src={outputUrl} 
            alt="Kết quả được tạo" 
            className="max-w-full max-h-[32rem] object-contain cursor-pointer" 
            onClick={() => handleImageClick(outputUrl)}
          />
        )}
      </div>

      <div className="flex space-x-4 mb-6">
        {mediaType === 'image' && (
          <a href={outputUrl} download="quang_cao_hinh_anh.png">
            <Button variant="primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Tải ảnh xuống
            </Button>
          </a>
        )}
      </div>

      {hasGrounding && (
        <div className="w-full max-w-3xl mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Nguồn thông tin tham khảo:</h3>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
            {groundingUrls?.map((chunk, index) => {
              const url = chunk.web?.uri || chunk.maps?.uri;
              const title = chunk.web?.title || chunk.maps?.title;
              if (url) {
                return (
                  <li key={index} className="mb-1">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      {title || url}
                    </a>
                    {chunk.maps?.placeAnswerSources?.reviewSnippets && chunk.maps.placeAnswerSources.reviewSnippets.length > 0 && (
                      <ul className="list-disc list-inside ml-4 text-sm text-gray-500 dark:text-gray-400">
                        {chunk.maps.placeAnswerSources.reviewSnippets.map((review, rIndex) => (
                          <li key={`${index}-review-${rIndex}`}>
                            <a href={review.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {review.title || `Đoạn đánh giá ${rIndex + 1}`}
                            </a>
                            {review.text && ` - "${review.text}"`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      )}

      <button
        onClick={onClearOutput}
        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
      >
        Xóa kết quả
      </button>

      {/* Image Modal */}
      {showImageModal && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm"
          onClick={handleCloseModal} // Close on overlay click
          aria-modal="true"
          role="dialog"
          aria-label="Xem trước hình ảnh lớn"
        >
          <div className="relative p-4 max-w-screen-lg max-h-screen" onClick={(e) => e.stopPropagation()}>
            <img src={modalImageUrl} alt="Xem trước hình ảnh lớn" className="max-h-[90vh] max-w-[90vw] object-contain" />
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white text-3xl p-2 rounded-full bg-gray-800 bg-opacity-70 hover:bg-opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Đóng xem trước"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputDisplay;