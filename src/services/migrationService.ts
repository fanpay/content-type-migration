import { MigrationConfig, MigrationProgress, FieldMapping, ELEMENT_TYPE_COMPATIBILITY } from '../types';

export class MigrationService {
  static validateFieldCompatibility(sourceType: string, targetType: string): boolean {
    const compatibleTypes = ELEMENT_TYPE_COMPATIBILITY[sourceType];
    return compatibleTypes ? compatibleTypes.includes(targetType) : false;
  }

  static generateFieldMappings(sourceElements: any[], targetElements: any[]): FieldMapping[] {
    return sourceElements.map(sourceElement => {
      // Try exact codename match first
      let targetElement = targetElements.find(
        target => target.codename === sourceElement.codename
      );

      // If no exact match, try name match
      if (!targetElement) {
        targetElement = targetElements.find(
          target => target.name.toLowerCase() === sourceElement.name.toLowerCase()
        );
      }

      if (targetElement) {
        const isCompatible = this.validateFieldCompatibility(
          sourceElement.type,
          targetElement.type
        );

        return {
          sourceField: sourceElement,
          targetField: targetElement,
          isCompatible,
          transformationNeeded: sourceElement.type !== targetElement.type,
          canTransform: isCompatible, // Para backward compatibility
        };
      }

      return {
        sourceField: sourceElement,
        targetField: null,
        isCompatible: false,
        transformationNeeded: false,
        canTransform: false,
      };
    });
  }

  static async executeMigration(
    config: MigrationConfig,
    selectedItems: any[],
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationProgress> {
    const progress: MigrationProgress = {
      total: selectedItems.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Simulate migration process for now
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      
      try {
        // Here you would implement the actual migration logic
        // 1. Fetch the source item content
        // 2. Transform the content according to field mappings
        // 3. Create new item in target content type
        // 4. Optionally delete the source item
        
        await this.simulateItemMigration(item, config);
        progress.successful++;
      } catch (error) {
        progress.failed++;
        progress.errors.push({
          itemId: item.id,
          itemName: item.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        });
      }
      
      progress.processed++;
      
      if (onProgress) {
        onProgress({ ...progress });
      }
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return progress;
  }

  private static async simulateItemMigration(item: any, _config: MigrationConfig): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error(`Failed to migrate item: ${item.name}`);
    }
  }

  static getFieldTransformationHint(mapping: FieldMapping): string {
    if (!mapping.targetField) {
      return 'No target field selected';
    }

    if (!mapping.isCompatible) {
      return `Incompatible types: ${mapping.sourceField.type} → ${mapping.targetField.type}`;
    }

    if (mapping.transformationNeeded) {
      return `Transformation needed: ${mapping.sourceField.type} → ${mapping.targetField.type}`;
    }

    return 'Direct mapping possible';
  }
}