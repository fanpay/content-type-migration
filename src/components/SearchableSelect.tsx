import { useState, useRef, useEffect } from 'react';
import { ContentTypeInfo } from '../types';

interface SearchableSelectProps {
  contentTypes: ContentTypeInfo[];
  selectedType?: ContentTypeInfo;
  onTypeSelect: (contentType: ContentTypeInfo) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
}

export function SearchableSelect({
  contentTypes,
  selectedType,
  onTypeSelect,
  placeholder,
  label,
  disabled = false
}: Readonly<SearchableSelectProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter content types based on search term
  const filteredTypes = contentTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.codename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredTypes[highlightedIndex]) {
          onTypeSelect(filteredTypes[highlightedIndex]);
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleTypeSelect = (type: ContentTypeInfo) => {
    onTypeSelect(type);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (filteredTypes.length > 0) {
      setHighlightedIndex(0);
    }
  };

  const displayValue = selectedType ? selectedType.name : '';

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredTypes.length === 0 ? (
            <div className="p-3 text-gray-500 text-center">
              No content types found matching "{searchTerm}"
            </div>
          ) : (
            <>
              <div className="p-2 text-xs text-gray-500 bg-gray-50 border-b">
                {filteredTypes.length} content type{filteredTypes.length !== 1 ? 's' : ''} found
              </div>
              {filteredTypes.map((type, index) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className={`w-full text-left p-3 border-b border-gray-100 last:border-b-0 ${
                    index === highlightedIndex 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'hover:bg-gray-50'
                  } ${
                    selectedType?.id === type.id 
                      ? 'bg-blue-100 text-blue-900 font-medium' 
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {type.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {type.codename} • {type.elements.length} field{type.elements.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {selectedType?.id === type.id && (
                      <div className="text-blue-600 ml-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}