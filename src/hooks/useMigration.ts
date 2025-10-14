import { useState, useCallback } from 'react';
import { 
  MigrationConfig, 
  MigrationProgress, 
  ContentTypeInfo,
  MigrationItem 
} from '../types';
import { MigrationService } from '../services/migrationService';
import { MigrationServiceReal } from '../services/migrationServiceReal';

export interface UseMigrationResult {
  migrationConfig: MigrationConfig | null;
  progress: MigrationProgress | null;
  isRunning: boolean;
  initializeMigration: (sourceType: ContentTypeInfo, targetType: ContentTypeInfo) => void;
  updateFieldMapping: (sourceFieldId: string, targetFieldId: string | null) => void;
  executeMigration: (selectedItems: MigrationItem[]) => Promise<void>;
  resetMigration: () => void;
}

export function useMigration(): UseMigrationResult {
  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const initializeMigration = useCallback((sourceType: ContentTypeInfo, targetType: ContentTypeInfo) => {
    const fieldMappings = MigrationServiceReal.generateEnhancedFieldMappings(
      sourceType.elements,
      targetType.elements
    );

    setMigrationConfig({
      sourceContentType: sourceType,
      targetContentType: targetType,
      fieldMappings,
      language: 'default', // Default language for now
    });

    // Reset progress when initializing new migration
    setProgress(null);
  }, []);

  const updateFieldMapping = useCallback((sourceFieldId: string, targetFieldId: string | null) => {
    if (!migrationConfig) return;

    const updatedMappings = migrationConfig.fieldMappings.map(mapping => {
      if (mapping.sourceField.id === sourceFieldId) {
        const targetField = targetFieldId 
          ? migrationConfig.targetContentType.elements.find(el => el.id === targetFieldId) || null
          : null;

        const validation = targetField 
          ? MigrationServiceReal.validateFieldCompatibility(mapping.sourceField, targetField)
          : { isCompatible: false, warnings: ['No target field selected'], canTransform: false };

        return {
          ...mapping,
          targetField,
          isCompatible: validation.isCompatible,
          warnings: validation.warnings,
          canTransform: validation.canTransform,
          transformationNeeded: targetField 
            ? mapping.sourceField.type !== targetField.type
            : false,
        };
      }
      return mapping;
    });

    setMigrationConfig({
      ...migrationConfig,
      fieldMappings: updatedMappings,
    });
  }, [migrationConfig]);

  const executeMigration = useCallback(async (selectedItems: MigrationItem[]) => {
    if (!migrationConfig || selectedItems.length === 0) return;

    setIsRunning(true);
    setProgress({
      total: selectedItems.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    });

    try {
      const finalProgress = await MigrationService.executeMigration(
        migrationConfig,
        selectedItems,
        setProgress
      );
      
      setProgress(finalProgress);
    } catch (error) {
      console.error('Migration failed:', error);
      setProgress(prev => prev ? {
        ...prev,
        errors: [...prev.errors, {
          itemId: 'general',
          itemName: 'Migration Process',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }],
      } : null);
    } finally {
      setIsRunning(false);
    }
  }, [migrationConfig]);

  const resetMigration = useCallback(() => {
    setMigrationConfig(null);
    setProgress(null);
    setIsRunning(false);
  }, []);

  return {
    migrationConfig,
    progress,
    isRunning,
    initializeMigration,
    updateFieldMapping,
    executeMigration,
    resetMigration,
  };
}