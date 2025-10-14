import { useState } from 'react';
import { MigrationConfig, MigrationItem } from '../types';


interface DryRunPreviewProps {
  migrationConfig: MigrationConfig;
  selectedItems: MigrationItem[];
  onClose: () => void;
  onConfirmMigration: () => void;
}

interface DryRunResult {
  itemName: string;
  transformedFields: Array<{
    sourceField: string;
    sourceValue: any;
    targetField: string;
    transformedValue: any;
    transformationType: string;
  }>;
  warnings: string[];
}

export function DryRunPreview({
  migrationConfig,
  selectedItems,
  onClose,
  onConfirmMigration
}: Readonly<DryRunPreviewProps>) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<DryRunResult[]>([]);
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());

  const runDryRun = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const results: DryRunResult[] = selectedItems.map(item => {
        const transformedFields: DryRunResult['transformedFields'] = [];
        const warnings: string[] = [];

        // Analyze each field mapping
        migrationConfig.fieldMappings
          .filter(mapping => mapping.targetField && mapping.isCompatible)
          .forEach(mapping => {
            const mockSourceValue = generateMockValue(mapping.sourceField.type, item.name);
            const transformedValue = simulateTransformation(
              mockSourceValue, 
              mapping.sourceField.type, 
              mapping.targetField!.type
            );

            transformedFields.push({
              sourceField: mapping.sourceField.name,
              sourceValue: mockSourceValue,
              targetField: mapping.targetField!.name,
              transformedValue,
              transformationType: mapping.transformationNeeded 
                ? `${mapping.sourceField.type} → ${mapping.targetField!.type}`
                : 'direct'
            });

            // Add warnings if needed
            if (mapping.warnings && mapping.warnings.length > 0) {
              warnings.push(...mapping.warnings.map(w => `${mapping.sourceField.name}: ${w}`));
            }
          });

        return {
          itemName: item.name,
          transformedFields,
          warnings
        };
      });

      setDryRunResults(results);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleDetails = (itemName: string) => {
    const newShowDetails = new Set(showDetails);
    if (newShowDetails.has(itemName)) {
      newShowDetails.delete(itemName);
    } else {
      newShowDetails.add(itemName);
    }
    setShowDetails(newShowDetails);
  };

  // Helper functions
  const generateMockValue = (fieldType: string, itemName: string): any => {
    switch (fieldType) {
      case 'text':
        return `${itemName} - Sample text content`;
      case 'rich_text':
        return `<p><strong>${itemName}</strong></p><p>Rich text content with formatting.</p>`;
      case 'number':
        return Math.floor(Math.random() * 1000) + 1;
      case 'date_time':
        return new Date().toISOString();
      case 'url_slug':
        return itemName.toLowerCase().replace(/\s+/g, '-');
      case 'multiple_choice':
        return ['option_1', 'option_2'];
      case 'asset':
        return [{ name: 'sample-image.jpg', type: 'image/jpeg' }];
      default:
        return `Sample ${fieldType} value`;
    }
  };

  const simulateTransformation = (value: any, sourceType: string, targetType: string): any => {
    if (sourceType === targetType) return value;
    
    // Simulate transformations
    if (sourceType === 'rich_text' && targetType === 'text') {
      return value.replace(/<[^>]*>/g, '').trim();
    }
    if (sourceType === 'text' && targetType === 'rich_text') {
      return `<p>${value}</p>`;
    }
    if (targetType === 'url_slug') {
      return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(?:^-+|-+$)/g, '');
    }
    
    return value;
  };

  const totalWarnings = dryRunResults.reduce((acc, result) => acc + result.warnings.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Dry Run Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Preview what will happen during migration without making any changes
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!dryRunResults.length ? (
            <div className="text-center py-8">
              {isAnalyzing ? (
                <div className="space-y-4">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600">Analyzing migration impact...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-4xl">🔍</div>
                  <p className="text-gray-600">Click "Run Analysis" to preview the migration</p>
                  <button
                    onClick={runDryRun}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Run Analysis
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Migration Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-blue-800 font-medium">{selectedItems.length}</div>
                    <div className="text-blue-600">Items to migrate</div>
                  </div>
                  <div>
                    <div className="text-blue-800 font-medium">
                      {migrationConfig.fieldMappings.filter(m => m.targetField).length}
                    </div>
                    <div className="text-blue-600">Fields mapped</div>
                  </div>
                  <div>
                    <div className="text-blue-800 font-medium">
                      {migrationConfig.fieldMappings.filter(m => m.transformationNeeded).length}
                    </div>
                    <div className="text-blue-600">Transformations</div>
                  </div>
                  <div>
                    <div className={`font-medium ${totalWarnings > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                      {totalWarnings}
                    </div>
                    <div className={totalWarnings > 0 ? 'text-yellow-600' : 'text-green-600'}>Warnings</div>
                  </div>
                </div>
              </div>

              {/* Items Preview */}
              <div className="space-y-3">
                {dryRunResults.map((result) => (
                  <div key={result.itemName} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleDetails(result.itemName)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{result.itemName}</div>
                        <div className="text-sm text-gray-500">
                          {result.transformedFields.length} fields • {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transform ${showDetails.has(result.itemName) ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showDetails.has(result.itemName) && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        {result.warnings.length > 0 && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="font-medium text-yellow-800 mb-2">Warnings:</div>
                            <ul className="text-sm text-yellow-700 space-y-1">
                              {result.warnings.map((warning, i) => (
                                <li key={i}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="space-y-3">
                          {result.transformedFields.map((field, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-sm text-gray-900">
                                  {field.sourceField} → {field.targetField}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  field.transformationType === 'direct' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {field.transformationType}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <div className="text-gray-600 font-medium">Source:</div>
                                  <div className="text-gray-800 font-mono text-xs bg-white p-2 rounded border">
                                    {JSON.stringify(field.sourceValue, null, 2)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600 font-medium">Target:</div>
                                  <div className="text-gray-800 font-mono text-xs bg-white p-2 rounded border">
                                    {JSON.stringify(field.transformedValue, null, 2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {dryRunResults.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {totalWarnings > 0 ? (
                  <span className="text-yellow-600">⚠️ Review warnings before proceeding</span>
                ) : (
                  <span className="text-green-600">✅ Ready to migrate</span>
                )}
              </div>
              <div className="space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmMigration}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Proceed with Migration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}