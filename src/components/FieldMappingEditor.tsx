
import { FieldMapping, ElementInfo, ELEMENT_TYPE_LABELS } from '../types';
import { MigrationServiceReal } from '../services/migrationServiceReal';

interface FieldMappingEditorProps {
  fieldMappings: FieldMapping[];
  targetFields: ElementInfo[];
  onMappingChange: (sourceFieldId: string, targetFieldId: string | null) => void;
}

export function FieldMappingEditor({
  fieldMappings,
  targetFields,
  onMappingChange,
}: FieldMappingEditorProps) {
  const getCompatibilityIcon = (mapping: FieldMapping) => {
    if (!mapping.targetField) {
      return <span className="text-gray-400">○</span>;
    }
    
    if (mapping.isCompatible) {
      return <span className="text-green-500">✓</span>;
    } else {
      return <span className="text-red-500">✗</span>;
    }
  };

  const getCompatibilityColor = (mapping: FieldMapping) => {
    if (!mapping.targetField) return 'bg-gray-50';
    if (mapping.isCompatible) return 'bg-green-50';
    return 'bg-red-50';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>
          <p className="text-sm text-gray-600 mt-1">
            Map source fields to target fields. Compatible mappings are marked with ✓
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fieldMappings.map((mapping) => (
                <tr key={mapping.sourceField.id} className={getCompatibilityColor(mapping)}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {mapping.sourceField.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mapping.sourceField.codename}
                        </div>
                      </div>
                      {mapping.sourceField.isRequired && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {ELEMENT_TYPE_LABELS[mapping.sourceField.type] || mapping.sourceField.type}
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={mapping.targetField?.id || ''}
                      onChange={(e) => onMappingChange(mapping.sourceField.id, e.target.value || null)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">No mapping</option>
                      {targetFields.map((field) => {
                        const validation = MigrationServiceReal.validateFieldCompatibility(
                          mapping.sourceField,
                          field
                        );
                        const isCompatible = validation.isCompatible;
                        return (
                          <option key={field.id} value={field.id}>
                            {field.name} ({ELEMENT_TYPE_LABELS[field.type] || field.type})
                            {isCompatible ? ' ✓' : ' ⚠️'}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {getCompatibilityIcon(mapping)}
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {MigrationServiceReal.getDetailedTransformationHint(mapping)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Mapping Summary</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>Total fields: {fieldMappings.length}</div>
          <div>Mapped fields: {fieldMappings.filter(m => m.targetField).length}</div>
          <div>Compatible mappings: {fieldMappings.filter(m => m.isCompatible).length}</div>
          <div>Transformation needed: {fieldMappings.filter(m => m.transformationNeeded).length}</div>
        </div>
      </div>
    </div>
  );
}