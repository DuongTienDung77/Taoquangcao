
import React from 'react';
import Button from './Button';

interface ApiKeyWarningProps {
  onSelectApiKey: () => void;
}

const ApiKeyWarning: React.FC<ApiKeyWarningProps> = ({ onSelectApiKey }) => {
  return (
    <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded relative mb-6">
      <strong className="font-bold">Lưu ý!</strong>
      <span className="block sm:inline ml-2">Các mô hình tạo video yêu cầu khóa API đã chọn.</span>
      <p className="text-sm mt-2">
        Vui lòng chọn khóa API của bạn bằng nút bên dưới. Đảm bảo dự án của bạn đã được cấu hình thanh toán để sử dụng các mô hình Veo.
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="ml-1 underline text-blue-700 dark:text-blue-300"
        >
          Tìm hiểu thêm về thanh toán.
        </a>
      </p>
      <div className="mt-4">
        <Button onClick={onSelectApiKey} variant="primary">
          Chọn Khóa API
        </Button>
      </div>
    </div>
  );
};

export default ApiKeyWarning;
