import { useState, useEffect } from 'react';

interface DraftItem {
  id: string;
  name: string;
  codename: string;
  type: string;
  language: string;
}

interface BatchPublisherProps {
  draftItems: DraftItem[];
  selectedLanguage: string;
  onPublish: (items: DraftItem[], batchSize: number) => Promise<{ published: number; failed: number; errors: string[] }>;
  onBack: () => void;
  onComplete: () => void;
}

export function BatchPublisher({
  draftItems,
  selectedLanguage,
  onPublish,
  onBack,
  onComplete
}: Readonly<BatchPublisherProps>) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [publishedItems, setPublishedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [batchSize, setBatchSize] = useState(5);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  // Filter items based on search term
  const filteredItems = searchTerm.trim() 
    ? draftItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.codename.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase().trim())
      )
    : draftItems;

  // Select all items by default
  useEffect(() => {
    setSelectedItems(new Set(draftItems.map(item => item.id)));
  }, [draftItems]);

  const handleSelectAll = () => {
    const allFilteredSelected = filteredItems.every(item => selectedItems.has(item.id));
    
    if (allFilteredSelected) {
      // Deselect all filtered items
      const newSelected = new Set(selectedItems);
      filteredItems.forEach(item => newSelected.delete(item.id));
      setSelectedItems(newSelected);
    } else {
      // Select all filtered items
      const newSelected = new Set(selectedItems);
      filteredItems.forEach(item => newSelected.add(item.id));
      setSelectedItems(newSelected);
    }
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handlePublish = async () => {
    const itemsToPublish = draftItems.filter(item => selectedItems.has(item.id));
    
    if (itemsToPublish.length === 0) {
      alert('Please select at least one item to publish');
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);
    setPublishedCount(0);
    setErrorCount(0);
    
    const batches = Math.ceil(itemsToPublish.length / batchSize);
    setTotalBatches(batches);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, itemsToPublish.length);
      const batch = itemsToPublish.slice(start, end);
      
      setCurrentBatch(i + 1);
      
      try {
        const result = await onPublish(batch, batchSize);
        
        // Mark successfully published items
        if (result.published > 0) {
          setPublishedItems(prev => {
            const newSet = new Set(prev);
            batch.forEach(item => newSet.add(item.id));
            return newSet;
          });
          setPublishedCount(prev => prev + result.published);
        }
        
        if (result.failed > 0) {
          setErrorCount(prev => prev + result.failed);
        }
      } catch (error) {
        console.error(`Error publishing batch ${i + 1}:`, error);
        setErrorCount(prev => prev + batch.length);
      }
      
      const progress = ((i + 1) / batches) * 100;
      setPublishProgress(progress);
      
      // Wait between batches to avoid overwhelming webhooks
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsPublishing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Publish Draft Items</h2>
          <p className="mt-1 text-sm text-gray-600">
            {searchTerm ? `${filteredItems.length} of ${draftItems.length}` : draftItems.length} items available.
            Select which items to publish and configure batch size to control webhook load.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          disabled={isPublishing}
        >
          ← Back
        </button>
      </div>

      {/* Batch Configuration */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-3">Batch Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Items per Batch
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPublishing}
            />
            <p className="mt-1 text-xs text-blue-700">
              Smaller batches = less webhook load, but slower publishing
            </p>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-sm text-blue-800 space-y-1">
              <div>Selected items: <strong>{selectedItems.size}</strong></div>
              <div>Estimated batches: <strong>{Math.ceil(selectedItems.size / batchSize)}</strong></div>
              <div>Estimated time: <strong>~{Math.ceil(selectedItems.size / batchSize) * 2} seconds</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Search/Filter */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by name, codename, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isPublishing}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            disabled={isPublishing}
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress */}
      {isPublishing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">
              Publishing batch {currentBatch} of {totalBatches}...
            </span>
            <span className="text-sm text-green-700">{Math.round(publishProgress)}%</span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2.5">
            <div
              className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${publishProgress}%` }}
            ></div>
          </div>
          <div className="mt-2 text-sm text-green-700">
            Published: {publishedCount} | Errors: {errorCount}
          </div>
        </div>
      )}

      {/* Items Selection */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filteredItems.length > 0 && filteredItems.every(item => selectedItems.has(item.id))}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isPublishing || filteredItems.length === 0}
            />
            <span className="text-sm font-medium text-gray-900">
              Select All ({searchTerm ? `${filteredItems.length} of ${draftItems.length}` : draftItems.length} items)
            </span>
          </label>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {searchTerm ? 'No items match your search' : 'No items available'}
            </div>
          ) : (
            filteredItems.map(item => {
              const isPublished = publishedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 flex items-center space-x-3 ${
                    isPublished ? 'bg-green-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleToggleItem(item.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isPublishing || isPublished}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.codename} • {item.type}
                    </div>
                  </div>
                  {isPublished ? (
                    <div className="flex items-center space-x-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      <span>✓</span>
                      <span>Published</span>
                    </div>
                  ) : (
                    <div className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                      Draft
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          disabled={isPublishing}
        >
          Skip Publishing
        </button>
        
        <button
          onClick={handlePublish}
          disabled={selectedItems.size === 0 || isPublishing}
          className={`px-8 py-3 rounded-lg font-medium ${
            isPublishing || selectedItems.size === 0
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isPublishing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Publishing...
            </>
          ) : (
            `Publish ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
}
