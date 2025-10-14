import { useState } from 'react';

interface CreatedItemInfo {
  originalCodename: string;
  originalName: string;
  originalType: string;
  newCodename: string;
  newName: string;
  newType: string;
  newId: string;
  wasAutoMigrated: boolean;
  alreadyExisted: boolean; // Nueva propiedad para items que ya existían
}

interface MigrationResult {
  sourceItem: any;
  status: 'success' | 'error';
  newItemId: string | null;
  message: string;
  timestamp: Date;
  createdItems?: CreatedItemInfo[]; // Nueva propiedad para items creados
}

interface MigrationResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: MigrationResult[];
  onStartNew: () => void;
}

export function MigrationResultsModal({
  isOpen,
  onClose,
  results,
  onStartNew,
}: Readonly<MigrationResultsModalProps>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Migration Results</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{results.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={`${result.sourceItem.id}_${index}`}
                className={`border rounded-lg p-4 ${
                  result.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      result.status === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {result.status === 'success' ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{result.sourceItem.name}</div>
                      <div className="text-sm text-gray-600">{result.sourceItem.codename}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpanded(result.sourceItem.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedItems.has(result.sourceItem.id) ? '▼' : '▶'}
                  </button>
                </div>

                {expandedItems.has(result.sourceItem.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm space-y-2">
                      <div><strong>Status:</strong> {result.status}</div>
                      <div><strong>Message:</strong> {result.message}</div>
                      {result.newItemId && (
                        <div><strong>New Item ID:</strong> {result.newItemId}</div>
                      )}
                      <div><strong>Completed:</strong> {result.timestamp.toLocaleString()}</div>
                      
                      {/* Show created items summary */}
                      {result.createdItems && result.createdItems.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-300">
                          <div className="font-semibold text-gray-700 mb-2">
                            📋 Items Created ({result.createdItems.length} total)
                          </div>
                          
                          {/* Main items */}
                          {result.createdItems.filter(item => !item.wasAutoMigrated).length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-blue-700 mb-1">
                                🎯 Main Item:
                              </div>
                              {result.createdItems
                                .filter(item => !item.wasAutoMigrated)
                                .map((item) => (
                                  <div key={item.newId} className={`ml-3 mb-2 p-2 rounded border ${
                                    item.alreadyExisted 
                                      ? 'bg-yellow-50 border-yellow-300' 
                                      : 'bg-blue-50 border-blue-200'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      {item.alreadyExisted && (
                                        <span className="text-yellow-600 text-xs font-semibold">⚠️ ALREADY EXISTED</span>
                                      )}
                                      <div className="font-medium text-sm">{item.newName}</div>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      <div>Original: [{item.originalType}] {item.originalCodename}</div>
                                      <div>New: [{item.newType}] {item.newCodename}</div>
                                      <div className="text-gray-500">ID: {item.newId}</div>
                                      {item.alreadyExisted && (
                                        <div className="text-yellow-600 font-medium mt-1">
                                          Status: Skipped (already migrated)
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          
                          {/* Auto-migrated items */}
                          {result.createdItems.filter(item => item.wasAutoMigrated).length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-green-700 mb-1">
                                🔗 Auto-Migrated Linked Items ({result.createdItems.filter(item => item.wasAutoMigrated).length}):
                              </div>
                              {result.createdItems
                                .filter(item => item.wasAutoMigrated)
                                .map((item) => (
                                  <div key={item.newId} className={`ml-3 mb-2 p-2 rounded border ${
                                    item.alreadyExisted 
                                      ? 'bg-yellow-50 border-yellow-300' 
                                      : 'bg-green-50 border-green-200'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      {item.alreadyExisted && (
                                        <span className="text-yellow-600 text-xs font-semibold">⚠️ ALREADY EXISTED</span>
                                      )}
                                      <div className="font-medium text-sm">{item.newName}</div>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      <div>Original: [{item.originalType}] {item.originalCodename}</div>
                                      <div>New: [{item.newType}] {item.newCodename}</div>
                                      <div className="text-gray-500">ID: {item.newId}</div>
                                      {item.alreadyExisted && (
                                        <div className="text-yellow-600 font-medium mt-1">
                                          Status: Skipped (already migrated)
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onStartNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start New Migration
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}