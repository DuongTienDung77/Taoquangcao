
import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl text-center flex flex-col items-center max-w-sm mx-4">
        <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{message}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Quá trình này có thể mất một chút thời gian, đặc biệt là đối với việc tạo video.</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
