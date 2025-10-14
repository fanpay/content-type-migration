import { useState } from 'react';
import { getConfigurationStatus } from '../config/kontent';

interface DebugPanelProps {
  currentStep?: number;
  sourceContentType?: string;
  targetContentType?: string;
}

export function DebugPanel({ currentStep, sourceContentType, targetContentType }: Readonly<DebugPanelProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const config = getConfigurationStatus();

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white px-3 py-2 rounded-full text-sm hover:bg-gray-700"
        >
          🐛 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">Debug Information</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        {/* Current Step Info */}
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="font-medium text-blue-900">Current State:</div>
          <div className="text-blue-700">Step: {currentStep || 'Unknown'}</div>
          {sourceContentType && <div className="text-blue-700">Source: {sourceContentType}</div>}
          {targetContentType && <div className="text-blue-700">Target: {targetContentType}</div>}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <span className="font-medium">Project ID:</span>
          <span className={config.hasProjectId ? 'text-green-600' : 'text-red-600'}>
            {config.hasProjectId ? '✓' : '✗'} {config.projectId?.substring(0, 8)}...
          </span>
          
          <span className="font-medium">Management API:</span>
          <span className={config.hasApiKey ? 'text-green-600' : 'text-red-600'}>
            {config.hasApiKey ? '✓' : '✗'} {config.apiKeyLength} chars
          </span>
          
          <span className="font-medium">Preview API:</span>
          <span className={config.hasPreviewKey ? 'text-green-600' : 'text-red-600'}>
            {config.hasPreviewKey ? '✓' : '✗'} {config.previewKeyLength} chars
          </span>
          
          <span className="font-medium">Valid Config:</span>
          <span className={config.isValid ? 'text-green-600' : 'text-red-600'}>
            {config.isValid ? '✅ Ready' : '❌ Invalid'}
          </span>
        </div>
        
        {!config.isValid && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <strong>Note:</strong> Invalid configuration detected. Check your .env file and ensure all Kontent.ai credentials are properly set.
          </div>
        )}
      </div>
    </div>
  );
}