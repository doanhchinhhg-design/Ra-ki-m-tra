
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-lg font-medium text-gray-600">AI đang biên soạn đề...</p>
        <p className="text-sm text-gray-500">Quá trình này có thể mất một vài giây.</p>
    </div>
  );
};
