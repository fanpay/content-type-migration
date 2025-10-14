
import { ContentTypeInfo } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface ContentTypeSelectorProps {
  contentTypes: ContentTypeInfo[];
  selectedSourceType?: ContentTypeInfo;
  selectedTargetType?: ContentTypeInfo;
  onSourceTypeSelect: (contentType: ContentTypeInfo) => void;
  onTargetTypeSelect: (contentType: ContentTypeInfo) => void;
  isLoading?: boolean;
}

export function ContentTypeSelector({
  contentTypes,
  selectedSourceType,
  selectedTargetType,
  onSourceTypeSelect,
  onTargetTypeSelect,
  isLoading,
}: Readonly<ContentTypeSelectorProps>) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchableSelect
        contentTypes={contentTypes}
        selectedType={selectedSourceType}
        onTypeSelect={onSourceTypeSelect}
        placeholder="Search for source content type..."
        label="Source Content Type"
        disabled={isLoading}
      />

      <SearchableSelect
        contentTypes={contentTypes.filter(ct => ct.id !== selectedSourceType?.id)}
        selectedType={selectedTargetType}
        onTypeSelect={onTargetTypeSelect}
        placeholder="Search for target content type..."
        label="Target Content Type"
        disabled={isLoading || !selectedSourceType}
      />

      {selectedSourceType && selectedTargetType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Migration Preview</h3>
          <div className="text-sm text-blue-800">
            <div>From: <strong>{selectedSourceType.name}</strong> ({selectedSourceType.elements.length} fields)</div>
            <div>To: <strong>{selectedTargetType.name}</strong> ({selectedTargetType.elements.length} fields)</div>
          </div>
        </div>
      )}
    </div>
  );
}