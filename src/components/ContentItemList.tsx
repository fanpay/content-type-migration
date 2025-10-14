
import { useState, useEffect, useMemo } from 'react';
import { MigrationItem } from '../types';
import { useContentItems } from '../hooks/useKontentData';

interface ContentItemListProps {
  contentTypeCodename: string;
  language?: string;
  onItemsSelected: (items: MigrationItem[]) => void;
}

export function ContentItemList({
  contentTypeCodename,
  language = 'en',
  onItemsSelected,
}: Readonly<ContentItemListProps>) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { items, isLoading, error } = useContentItems(contentTypeCodename, language);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerSearchTerm) ||
      item.codename.toLowerCase().includes(lowerSearchTerm)
    );
  }, [items, searchTerm]);

  const selectedCount = selectedItems.size;
  const allSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.filter(item => selectedItems.has(item.id)).length;

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    const newSelected = selected 
      ? new Set(filteredItems.map(item => item.id))
      : new Set();
    setSelectedItems(newSelected);
  };

  // Update parent component when selection changes
  useEffect(() => {
    const selected = items.filter(item => selectedItems.has(item.id));
    onItemsSelected(selected);
  }, [selectedItems, items, onItemsSelected]);

  // Reset search and selection when language changes
  useEffect(() => {
    setSearchTerm('');
    setSelectedItems(new Set());
  }, [language]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={`loading-skeleton-${i}`} className="flex items-center space-x-3 p-3 bg-gray-100 rounded">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded flex-1"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600 mb-4">Error loading content items: {error}</p>
        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <p><strong>Debug info:</strong></p>
          <p>Content Type: {contentTypeCodename}</p>
          <p>Language: {language}</p>
          <p className="mt-2">Check the Debug Panel (bottom right) for configuration details.</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-gray-600 mb-4">No content items found for this content type.</p>
        <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
          <p><strong>This could mean:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-left">
            <li>No content items exist for "{contentTypeCodename}" in language "{language}"</li>
            <li>The Kontent.ai API configuration is incorrect</li>
            <li>The content type codename doesn't match exactly</li>
          </ul>
          <p className="mt-3">Check the Debug Panel (bottom right) for more info.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search content items by name or codename..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Content Items ({items.length}
          {searchTerm && filteredItems.length !== items.length && 
            <span className="text-gray-500"> • {filteredItems.length} filtered</span>
          })
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {selectedCount} of {filteredItems.length} selected
          </span>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Select All</span>
          </label>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredItems.length === 0 && searchTerm ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p>No items found matching "{searchTerm}"</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center space-x-3 p-4 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => handleItemToggle(item.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {item.codename}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {item.lastModified.toLocaleDateString()}
            </div>
          </div>
          ))
        )}
      </div>

      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-blue-800">
              <strong>{selectedCount}</strong> content item{selectedCount !== 1 ? 's' : ''} selected for migration.
            </p>
            <button
              onClick={() => {
                const selected = items.filter(item => selectedItems.has(item.id));
                onItemsSelected(selected);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Continue with {selectedCount} item{selectedCount !== 1 ? 's' : ''} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}