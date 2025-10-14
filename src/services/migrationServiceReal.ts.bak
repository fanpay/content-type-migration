import { 
  MigrationConfig, 
  MigrationProgress, 
  FieldMapping, 
  ELEMENT_TYPE_COMPATIBILITY,
  ElementInfo,
  MigrationItem 
} from '../types';
import { KontentService, ElementTransformationService } from './kontentServiceReal';

export class MigrationServiceReal {
  
  /**
   * Advanced field compatibility validation considering constraints
   */
  static validateFieldCompatibility(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const baseCompatibility = ELEMENT_TYPE_COMPATIBILITY[sourceElement.type]?.includes(targetElement.type) || false;
    
    if (!baseCompatibility) {
      return {
        isCompatible: false,
        warnings: [`Incompatible types: ${sourceElement.type} cannot be converted to ${targetElement.type}`],
        canTransform: false
      };
    }

    // Same type - direct compatibility
    if (sourceElement.type === targetElement.type) {
      return this.validateSameTypeConstraints(sourceElement, targetElement);
    }

    // Different types but compatible - check transformation
    return this.validateTransformationConstraints(sourceElement, targetElement);
  }

  /**
   * Validate constraints for same element types
   */
  private static validateSameTypeConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const warnings: string[] = [];

    // Required field validation
    if (targetElement.isRequired && !sourceElement.isRequired) {
      warnings.push(`Target field '${targetElement.name}' is required but source is optional`);
    }

    // Type-specific validations
    switch (sourceElement.type) {
      case 'text':
        return this.validateTextConstraints(sourceElement, targetElement, warnings);
      case 'rich_text':
        return this.validateRichTextConstraints(sourceElement, targetElement, warnings);
      case 'multiple_choice':
        return this.validateMultipleChoiceConstraints(sourceElement, targetElement, warnings);
      case 'taxonomy':
        return this.validateTaxonomyConstraints(sourceElement, targetElement, warnings);
      case 'asset':
        return this.validateAssetConstraints(sourceElement, targetElement, warnings);
      case 'modular_content':
        return this.validateModularContentConstraints(sourceElement, targetElement, warnings);
      default:
        return { isCompatible: true, warnings, canTransform: true };
    }
  }

  /**
   * Validate transformation constraints between different types
   */
  private static validateTransformationConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const warnings: string[] = [];

    // Rich text to text transformation
    if (sourceElement.type === 'rich_text' && targetElement.type === 'text') {
      warnings.push('Rich text will be converted to plain text (HTML tags removed)');
      return { isCompatible: true, warnings, canTransform: true };
    }

    // Text to rich text transformation
    if (sourceElement.type === 'text' && targetElement.type === 'rich_text') {
      warnings.push('Text will be wrapped in paragraph tags');
      return { isCompatible: true, warnings, canTransform: true };
    }

    // Number to text transformation
    if (sourceElement.type === 'number' && targetElement.type === 'text') {
      warnings.push('Numbers will be converted to text strings');
      return { isCompatible: true, warnings, canTransform: true };
    }

    // Text to number transformation
    if (sourceElement.type === 'text' && targetElement.type === 'number') {
      warnings.push('Text must contain valid numeric values or will be null');
      return { isCompatible: true, warnings, canTransform: true };
    }

    // Taxonomy to multiple choice transformation
    if (sourceElement.type === 'taxonomy' && targetElement.type === 'multiple_choice') {
      warnings.push('Taxonomy terms must be manually mapped to multiple choice options');
      return { isCompatible: false, warnings, canTransform: false };
    }

    // URL slug transformations
    if (targetElement.type === 'url_slug') {
      warnings.push('Content will be converted to URL-friendly format');
      return { isCompatible: true, warnings, canTransform: true };
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Text field constraint validation
   */
  private static validateTextConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo, 
    warnings: string[]
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    // Check for text length constraints
    const sourceLength = (sourceElement.options as any)?.maximum_text_length;
    const targetLength = (targetElement.options as any)?.maximum_text_length;

    if (targetLength && sourceLength) {
      if (targetLength.value < sourceLength.value) {
        warnings.push(
          `Target field has shorter length limit (${targetLength.value} vs ${sourceLength.value})`
        );
      }
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Rich text constraint validation
   */
  private static validateRichTextConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo, 
    warnings: string[]
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    // Check allowed formatting differences
    const sourceOptions = sourceElement.options as any;
    const targetOptions = targetElement.options as any;

    if (sourceOptions?.allowed_blocks && targetOptions?.allowed_blocks) {
      const missingBlocks = sourceOptions.allowed_blocks.filter(
        (block: string) => !targetOptions.allowed_blocks.includes(block)
      );
      if (missingBlocks.length > 0) {
        warnings.push(`Target field doesn't support these blocks: ${missingBlocks.join(', ')}`);
      }
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Multiple choice constraint validation
   */
  private static validateMultipleChoiceConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo, 
    warnings: string[]
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const sourceOptions = sourceElement.options as any[];
    const targetOptions = targetElement.options as any[];

    if (sourceOptions && targetOptions) {
      const sourceCodenames = sourceOptions.map(opt => opt.codename);
      const targetCodenames = targetOptions.map(opt => opt.codename);
      
      const missingOptions = sourceCodenames.filter(
        codename => !targetCodenames.includes(codename)
      );

      if (missingOptions.length > 0) {
        warnings.push(`Target field is missing these options: ${missingOptions.join(', ')}`);
        return { isCompatible: false, warnings, canTransform: false };
      }
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Taxonomy constraint validation
   */
  private static validateTaxonomyConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo, 
    warnings: string[]
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const sourceGroup = (sourceElement.options as any[])?.[0];
    const targetGroup = (targetElement.options as any[])?.[0];

    if (sourceGroup?.id !== targetGroup?.id) {
      warnings.push('Different taxonomy groups - manual term mapping required');
      return { isCompatible: false, warnings, canTransform: false };
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Asset constraint validation
   */
  private static validateAssetConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo, 
    warnings: string[]
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const sourceOptions = sourceElement.options as any;
    const targetOptions = targetElement.options as any;

    // Check file type restrictions
    if (sourceOptions?.allowed_file_types && targetOptions?.allowed_file_types) {
      if (sourceOptions.allowed_file_types !== targetOptions.allowed_file_types) {
        warnings.push('Different file type restrictions may cause validation errors');
      }
    }

    // Check count limits
    if (sourceOptions?.asset_count_limit && targetOptions?.asset_count_limit) {
      const sourceMax = sourceOptions.asset_count_limit.value;
      const targetMax = targetOptions.asset_count_limit.value;
      
      if (targetMax < sourceMax) {
        warnings.push(`Target allows fewer assets (${targetMax} vs ${sourceMax})`);
      }
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Modular content constraint validation
   */
  private static validateModularContentConstraints(
    sourceElement: ElementInfo, 
    targetElement: ElementInfo, 
    warnings: string[]
  ): { isCompatible: boolean; warnings: string[]; canTransform: boolean } {
    const sourceTypes = sourceElement.options as any[];
    const targetTypes = targetElement.options as any[];

    if (sourceTypes && targetTypes) {
      const sourceCodenames = sourceTypes.map(type => type.codename);
      const targetCodenames = targetTypes.map(type => type.codename);
      
      const incompatibleTypes = sourceCodenames.filter(
        codename => !targetCodenames.includes(codename)
      );

      if (incompatibleTypes.length > 0) {
        warnings.push(`Target doesn't allow these content types: ${incompatibleTypes.join(', ')}`);
        return { isCompatible: false, warnings, canTransform: false };
      }
    }

    return { isCompatible: true, warnings, canTransform: true };
  }

  /**
   * Generate enhanced field mappings with validation
   */
  static generateEnhancedFieldMappings(
    sourceElements: ElementInfo[], 
    targetElements: ElementInfo[]
  ): FieldMapping[] {
    return sourceElements.map(sourceElement => {
      // Try exact codename match first
      let targetElement = targetElements.find(
        target => target.codename === sourceElement.codename
      );

      // Try name match if no codename match
      targetElement ??= targetElements.find(
        target => target.name.toLowerCase() === sourceElement.name.toLowerCase()
      );

      // Try fuzzy name matching
      targetElement ??= this.findBestMatch(sourceElement, targetElements);

      if (targetElement) {
        const validation = this.validateFieldCompatibility(sourceElement, targetElement);
        
        return {
          sourceField: sourceElement,
          targetField: targetElement,
          isCompatible: validation.isCompatible,
          transformationNeeded: sourceElement.type !== targetElement.type,
          warnings: validation.warnings,
          canTransform: validation.canTransform,
        };
      }

      return {
        sourceField: sourceElement,
        targetField: null,
        isCompatible: false,
        transformationNeeded: false,
        warnings: ['No matching field found'],
        canTransform: false,
      };
    });
  }

  /**
   * Find best matching field using fuzzy logic
   */
  private static findBestMatch(sourceElement: ElementInfo, targetElements: ElementInfo[]): ElementInfo | undefined {
    const sourceWords = sourceElement.name.toLowerCase().split(/\s+/);
    
    let bestMatch: ElementInfo | undefined = undefined;
    let bestScore = 0;

    for (const targetElement of targetElements) {
      const targetWords = targetElement.name.toLowerCase().split(/\s+/);
      
      // Calculate similarity score
      const commonWords = sourceWords.filter(word => 
        targetWords.some(targetWord => 
          targetWord.includes(word) || word.includes(targetWord)
        )
      );
      
      const score = commonWords.length / Math.max(sourceWords.length, targetWords.length);
      
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = targetElement;
      }
    }

    return bestMatch;
  }

  /**
   * Execute the actual migration with real API calls
   */
  static async executeMigration(
    config: MigrationConfig,
    selectedItems: MigrationItem[],
    kontentService: KontentService,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationProgress> {
    const progress: MigrationProgress = {
      total: selectedItems.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const validMappings = config.fieldMappings.filter(
      mapping => mapping.targetField && mapping.isCompatible
    );

    if (validMappings.length === 0) {
      throw new Error('No valid field mappings found');
    }

    for (const item of selectedItems) {
      try {
        await this.migrateContentItem(
          item,
          config,
          validMappings,
          kontentService
        );
        
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

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return progress;
  }

  /**
   * Migrate a single content item
   */
  private static async migrateContentItem(
    item: MigrationItem,
    config: MigrationConfig,
    fieldMappings: FieldMapping[],
    kontentService: KontentService
  ): Promise<void> {
    // 1. Get source item data
    const sourceData = await kontentService.getContentItemData(item.id, config.language);
    
    // 2. Create new item in target content type
    const newItem = await kontentService.createContentItem(
      `${item.name} (Migrated)`,
      config.targetContentType.codename
    );

    // 3. Transform and map field values
    const transformedElements = await this.transformElements(
      sourceData,
      fieldMappings
    );

    // 4. Upsert language variant with transformed data
    const languageId = sourceData.variant.language.id;
    if (!languageId) {
      throw new Error('Source item language ID is missing');
    }
    
    await kontentService.upsertLanguageVariant(
      newItem.id,
      languageId,
      transformedElements
    );
  }

  /**
   * Transform elements according to field mappings
   */
  private static async transformElements(
    sourceData: any,
    fieldMappings: FieldMapping[]
  ): Promise<any[]> {
    const transformedElements = [];

    for (const mapping of fieldMappings) {
      if (!mapping.targetField || !mapping.canTransform) {
        continue;
      }

      const sourceElement = sourceData.variant.elements.find(
        (element: any) => element.element.codename === mapping.sourceField.codename
      );

      if (sourceElement) {
        const transformedValue = ElementTransformationService.transformElementValue(
          sourceElement.value,
          mapping.sourceField.type,
          mapping.targetField.type
        );

        transformedElements.push({
          element: { codename: mapping.targetField.codename },
          value: transformedValue,
        });
      }
    }

    return transformedElements;
  }

  /**
   * Get detailed transformation hint with warnings
   */
  static getDetailedTransformationHint(mapping: FieldMapping): string {
    if (!mapping.targetField) {
      return 'No target field selected';
    }

    if (!mapping.isCompatible) {
      const warningText = mapping.warnings?.join('; ') || 'Incompatible types';
      return `❌ ${warningText}`;
    }

    if (mapping.transformationNeeded) {
      const warningText = mapping.warnings?.length 
        ? ` (${mapping.warnings.join('; ')})`
        : '';
      return `🔄 Transformation: ${mapping.sourceField.type} → ${mapping.targetField.type}${warningText}`;
    }

    return '✅ Direct mapping possible';
  }
}