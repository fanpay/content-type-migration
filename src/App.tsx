import { useState, useCallback } from 'react';
import { ContentTypeSelector } from './components/ContentTypeSelector';
import { FieldMappingEditor } from './components/FieldMappingEditor';
import { ContentItemList } from './components/ContentItemList';
import { ConnectionStatus } from './components/ConnectionStatus';
import { DryRunPreview } from './components/DryRunPreview';
import { DebugPanel } from './components/DebugPanel';
import { MigrationResultsModal } from './components/MigrationResultsModal';
import { useContentTypes } from './hooks/useKontentData';
import { useMigration } from './hooks/useMigration';
import { ContentTypeInfo } from './types';
import { kontentServiceFixed } from './services/kontentServiceFixed';

export default function App() {
  const [step, setStep] = useState(1);
  const [sourceContentType, setSourceContentType] = useState<ContentTypeInfo | undefined>();
  const [targetContentType, setTargetContentType] = useState<ContentTypeInfo | undefined>();
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showDryRun, setShowDryRun] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const { contentTypes, isLoading: typesLoading, error: typesError } = useContentTypes();
  const { 
    migrationConfig, 
    initializeMigration, 
    updateFieldMapping, 
    resetMigration 
  } = useMigration();

  const handleSourceTypeSelect = (contentType: ContentTypeInfo) => {
    setSourceContentType(contentType);
    if (targetContentType) {
      initializeMigration(contentType, targetContentType);
      setStep(2);
    }
  };

  const handleTargetTypeSelect = (contentType: ContentTypeInfo) => {
    setTargetContentType(contentType);
    if (sourceContentType) {
      initializeMigration(sourceContentType, contentType);
      setStep(2);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSourceContentType(undefined);
    setTargetContentType(undefined);
    setSelectedItems([]);
    resetMigration();
  };

  const handleNextToItemSelection = () => {
    console.log('🚀 Navigating to step 3 - Item Selection');
    setStep(3);
  };

  const handleItemsSelected = useCallback((items: any[]) => {
    console.log('📝 Items selected:', items.length, 'items');
    setSelectedItems(items);
    // Don't automatically advance to step 4
  }, []);

  const handleContinueToExecution = () => {
    console.log('🎯 Continuing to execution with', selectedItems.length, 'items');
    setStep(4);
  };

  const handleExecuteMigration = async () => {
    if (!migrationConfig) return;

    try {
      setMigrationInProgress(true);
      console.log('🚀 Starting migration...');
      
      const results = [];
      
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        console.log(`📝 Migrating item ${i + 1}/${selectedItems.length}: ${item.name}`);
        
        try {
          // Transform field mappings to the expected format
          const mappings = migrationConfig.fieldMappings
            .filter(mapping => mapping.targetField)
            .map(mapping => ({
              sourceField: mapping.sourceField.codename,
              targetField: mapping.targetField!.codename,
            }));

          // Call the real migration function
          const migrationResult = await kontentServiceFixed.migrateContentItem(
            item,
            mappings,
            migrationConfig.sourceContentType,
            migrationConfig.targetContentType,
            selectedLanguage
          );
          
          if (migrationResult.success) {
            results.push({
              sourceItem: item,
              status: 'success',
              newItemId: migrationResult.newItem?.id || 'unknown',
              message: `Successfully migrated "${item.name}" from ${migrationConfig.sourceContentType.name} to ${migrationConfig.targetContentType.name}`,
              timestamp: new Date(),
            });
          } else {
            results.push({
              sourceItem: item,
              status: 'error',
              newItemId: null,
              message: `Failed to migrate "${item.name}": ${migrationResult.error}`,
              timestamp: new Date(),
            });
          }
          
        } catch (itemError) {
          console.error(`❌ Failed to migrate item ${item.name}:`, itemError);
          results.push({
            sourceItem: item,
            status: 'error',
            newItemId: null,
            message: `Failed to migrate "${item.name}": ${itemError instanceof Error ? itemError.message : 'Unknown error'}`,
            timestamp: new Date(),
          });
        }
      }
      
      setMigrationResults(results);
      setShowResults(true);
      console.log('✅ Migration completed!', results);
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      alert(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMigrationInProgress(false);
    }
  };

  const handleBackToMapping = () => {
    setStep(2);
  };

  const handleBackToItemSelection = () => {
    setStep(3);
  };

  const renderStepIndicator = () => {
    console.log('📍 Current step:', step, { sourceContentType: sourceContentType?.name, targetContentType: targetContentType?.name });
    return (
    <div className="flex items-center space-x-4 mb-8">
      <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <span>Select Content Types</span>
      </div>
      
      <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
        <span>Map Fields</span>
      </div>
      
      <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          3
        </div>
        <span>Select Items</span>
      </div>
      
      <div className={`w-8 h-0.5 ${step >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          4
        </div>
        <span>Execute Migration</span>
      </div>
    </div>
    );
  };

  if (typesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Content Types</h2>
            <p className="text-gray-600 mb-4">{typesError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Content Type Migration</h1>
          <p className="mt-2 text-gray-600">
            Migrate content items from one content type to another with field mapping
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ConnectionStatus />
        
        {renderStepIndicator()}

        {step === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ContentTypeSelector
              contentTypes={contentTypes}
              selectedSourceType={sourceContentType}
              selectedTargetType={targetContentType}
              onSourceTypeSelect={handleSourceTypeSelect}
              onTargetTypeSelect={handleTargetTypeSelect}
              isLoading={typesLoading}
            />
          </div>
        )}

        {step === 2 && migrationConfig && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Field Mapping Configuration</h2>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ← Back to Selection
                </button>
              </div>
              
              <FieldMappingEditor
                fieldMappings={migrationConfig.fieldMappings}
                targetFields={migrationConfig.targetContentType.elements}
                onMappingChange={updateFieldMapping}
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleNextToItemSelection}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={!migrationConfig.fieldMappings.some(m => m.targetField)}
              >
                Continue to Item Selection →
              </button>
              
              {/* Debug button - remove in production */}
              <button
                onClick={() => {
                  console.log('🧪 DEBUG: Force navigation to step 3');
                  setStep(3);
                }}
                className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium text-sm"
                title="Debug: Force go to step 3"
              >
                🧪 Skip to Step 3
              </button>
            </div>
          </div>
        )}

        {step === 3 && sourceContentType && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900">Select Content Items to Migrate</h2>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="language-select" className="text-sm font-medium text-gray-700">
                      Language:
                    </label>
                    <select
                      id="language-select"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English (en)</option>
                      <option value="de">German (de)</option>
                      <option value="es">Spanish (es)</option>
                      <option value="zh">Chinese (zh)</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleBackToMapping}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ← Back to Field Mapping
                </button>
              </div>
              
              <ContentItemList
                contentTypeCodename={sourceContentType.codename}
                language={selectedLanguage}
                onItemsSelected={handleItemsSelected}
              />
              
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleContinueToExecution}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  disabled={selectedItems.length === 0}
                >
                  Continue to Migration ({selectedItems.length} items) →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Execute Migration</h2>
              <button
                onClick={handleBackToItemSelection}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                ← Back to Item Selection
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Migration Summary</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <div>Source: {sourceContentType?.name}</div>
                <div>Target: {targetContentType?.name}</div>
                <div>Items to migrate: {selectedItems.length}</div>
                <div>Mapped fields: {migrationConfig?.fieldMappings.filter(m => m.targetField).length}</div>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Ready to migrate {selectedItems.length} content item{selectedItems.length !== 1 ? 's' : ''} 
              from "{sourceContentType?.name}" to "{targetContentType?.name}".
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Start Over
              </button>
              <button
                onClick={() => setShowDryRun(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={selectedItems.length === 0}
              >
                Preview Migration
              </button>
              <button
                onClick={handleExecuteMigration}
                className={`px-8 py-3 rounded-lg font-medium ${
                  migrationInProgress 
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={selectedItems.length === 0 || migrationInProgress}
              >
                {migrationInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Migrating...
                  </>
                ) : (
                  `Execute Migration (${selectedItems.length} items)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dry Run Preview Modal */}
      {showDryRun && migrationConfig && (
        <DryRunPreview
          migrationConfig={migrationConfig}
          selectedItems={selectedItems}
          onClose={() => setShowDryRun(false)}
          onConfirmMigration={() => {
            setShowDryRun(false);
            void handleExecuteMigration();
          }}
        />
      )}
      
      {/* Migration Results Modal */}
      <MigrationResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        results={migrationResults}
        onStartNew={() => {
          setShowResults(false);
          handleReset();
        }}
      />

      {/* Debug Panel */}
      <DebugPanel 
        currentStep={step}
        sourceContentType={sourceContentType?.name}
        targetContentType={targetContentType?.name}
      />
    </div>
  );
}