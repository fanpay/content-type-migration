import { 
  createDeliveryClient,
  DeliveryClient,
} from '@kontent-ai/delivery-sdk';

import {
  createManagementClient,
  ManagementClient,
  ContentTypeModels,
} from '@kontent-ai/management-sdk';

import { 
  KontentConfig, 
  ContentTypeInfo, 
  ElementInfo,
  MigrationItem
} from '../types';

export class KontentService {
  private readonly deliveryClient: DeliveryClient;
  private readonly managementClient: ManagementClient;

  constructor(config: KontentConfig) {
    // Initialize Delivery SDK for reading content items
    this.deliveryClient = createDeliveryClient({
      environmentId: config.projectId,
      previewApiKey: config.previewApiKey,
      defaultQueryConfig: {
        usePreviewMode: !!config.previewApiKey,
      },
    });

    // Initialize Management SDK for content types and creating items
    this.managementClient = createManagementClient({
      environmentId: config.projectId,
      apiKey: config.managementApiKey || '',
    });
  }

  /**
   * Get all content types from the environment
   */
  async getContentTypes(): Promise<ContentTypeInfo[]> {
    try {
      const allContentTypes: ContentTypeInfo[] = [];
      let continuationToken: string | null = null;
      
      do {
        let query = this.managementClient.listContentTypes();
        
        if (continuationToken) {
          query = query.xContinuationToken(continuationToken);
        }
        
        const response = await query.toPromise();
        
        const contentTypes = response.data.items.map(contentType => 
          this.mapContentTypeToInfo(contentType)
        );
        
        allContentTypes.push(...contentTypes);
        continuationToken = response.data.pagination.continuationToken;
        
      } while (continuationToken);
      
      return allContentTypes;
    } catch (error) {
      console.error('Error fetching content types:', error);
      throw new Error(`Failed to fetch content types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific content type by codename
   */
  async getContentType(codename: string): Promise<ContentTypeInfo> {
    try {
      const response = await this.managementClient
        .viewContentType()
        .byTypeCodename(codename)
        .toPromise();
      
      return this.mapContentTypeToInfo(response.data);
    } catch (error) {
      console.error(`Error fetching content type ${codename}:`, error);
      throw new Error(`Failed to fetch content type: ${codename}`);
    }
  }

  /**
   * Get content items for a specific content type and language
   * Uses Delivery API with proper language filtering
   */
  async getContentItems(
    contentTypeCodename: string, 
    languageCodename: string = 'en'
  ): Promise<MigrationItem[]> {
    try {
      console.log('🌐 Kontent API - Fetching items:', { contentTypeCodename, languageCodename });
      
      // Get items using Delivery API with language parameter
      const response = await this.deliveryClient
        .items()
        .type(contentTypeCodename)
        .languageParameter(languageCodename)
        .toPromise();

      console.log('🔍 Delivery API returned', response.data.items.length, 'items');

      // Filter out items that don't actually have content in the specified language
      const validItems: MigrationItem[] = [];
      
      for (const item of response.data.items) {
        // Check if the item has the expected language
        const itemLanguage = item.system.language;
        console.log(`Item ${item.system.name}: expected=${languageCodename}, actual=${itemLanguage}`);
        
        // Only include items that are actually in the requested language
        if (itemLanguage === languageCodename) {
          validItems.push({
            id: item.system.id,
            name: item.system.name,
            codename: item.system.codename,
            lastModified: new Date(item.system.lastModified),
            selected: false,
          });
        }
      }

      console.log('✅ Found', validItems.length, 'items actually in', languageCodename, 'language');
      return validItems;
      
    } catch (error) {
      console.error(`Error fetching content items for ${contentTypeCodename}:`, error);
      throw new Error(`Failed to fetch content items for: ${contentTypeCodename}`);
    }
  }

  /**
   * Get available languages in the environment
   */
  async getLanguages() {
    try {
      const response = await this.managementClient
        .listLanguages()
        .toPromise();
      
      return response.data.items;
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw new Error('Failed to fetch languages');
    }
  }

  /**
   * Get a specific content item with all its data
   */
  async getContentItemData(itemId: string, languageCodename: string = 'default') {
    try {
      // Get item from delivery API for published content
      const deliveryResponse = await this.deliveryClient
        .item(itemId)
        .languageParameter(languageCodename)
        .toPromise();

      // Get language variant from management API for draft content and metadata
      const variantResponse = await this.managementClient
        .viewLanguageVariant()
        .byItemId(itemId)
        .byLanguageCodename(languageCodename)
        .toPromise();

      return {
        item: deliveryResponse.data.item,
        variant: variantResponse.data,
      };
    } catch (error) {
      console.error(`Error fetching content item data for ${itemId}:`, error);
      throw new Error(`Failed to fetch content item data: ${itemId}`);
    }
  }

  /**
   * Create a new content item in the target content type
   */
  async createContentItem(name: string, targetContentTypeCodename: string) {
    try {
      const response = await this.managementClient
        .addContentItem()
        .withData({
          name,
          type: {
            codename: targetContentTypeCodename,
          },
        })
        .toPromise();

      return response.data;
    } catch (error) {
      console.error(`Error creating content item:`, error);
      throw new Error(`Failed to create content item: ${name}`);
    }
  }

  /**
   * Upsert language variant with transformed data
   */
  async upsertLanguageVariant(
    itemId: string, 
    languageId: string, 
    elements: any[]
  ) {
    try {
      const response = await this.managementClient
        .upsertLanguageVariant()
        .byItemId(itemId)
        .byLanguageId(languageId)
        .withData((_builder) => ({
          elements,
        }))
        .toPromise();

      return response.data;
    } catch (error) {
      console.error(`Error upserting language variant:`, error);
      throw new Error(`Failed to upsert language variant for item: ${itemId}`);
    }
  }

  /**
   * Helper: Map Kontent.ai content type to our internal structure
   */
  private mapContentTypeToInfo(contentType: ContentTypeModels.ContentType): ContentTypeInfo {
    return {
      id: contentType.id || '',
      name: contentType.name || '',
      codename: contentType.codename || '',
      elements: contentType.elements?.map(element => this.mapElementToInfo(element)) || [],
    };
  }

  /**
   * Helper: Map Kontent.ai element to our internal structure
   */
  private mapElementToInfo(element: any): ElementInfo {
    return {
      id: element.id || '',
      name: element.name || '',
      codename: element.codename || '',
      type: element.type || '',
      guidelines: element.guidelines,
      isRequired: element.is_required || false,
      options: this.getElementOptions(element),
    };
  }

  /**
   * Helper: Extract options from different element types
   */
  private getElementOptions(element: any): any[] | undefined {
    switch (element.type) {
      case 'multiple_choice':
        return element.options || [];
      case 'taxonomy':
        return element.taxonomy_group ? [element.taxonomy_group] : [];
      case 'asset':
        return element.allowed_file_types ? [{ allowed_file_types: element.allowed_file_types }] : [];
      case 'modular_content':
        return element.allowed_content_types || [];
      default:
        return undefined;
    }
  }

  /**
   * Complete migration function: creates new content item and language variant
   */
  async migrateContentItem(
    sourceItem: MigrationItem,
    fieldMappings: any[],
    targetContentType: any,
    sourceLanguage: string = 'en'
  ): Promise<{ success: boolean; newItem?: any; newVariant?: any; error?: string }> {
    try {
      console.log(`🔄 Starting migration for item: ${sourceItem.name}`);

      // Step 1: Get source content with all its data
      const sourceItemData = await this.getContentItemData(sourceItem.id, sourceLanguage);
      console.log('📥 Source item data retrieved:', sourceItemData);

      // Step 2: Create new content item in target content type
      const newItem = await this.managementClient
        .addContentItem()
        .withData({
          name: `${sourceItem.name} (Migrated)`,
          type: {
            codename: targetContentType.codename,
          },
        })
        .toPromise();

      console.log('✅ New content item created:', newItem.data.id);

      // Step 3: Transform source data according to field mappings
      const transformedElements: any = {};
      
      for (const mapping of fieldMappings) {
        if (mapping.targetField && mapping.sourceField) {
          const sourceValue = sourceItemData.variant?.elements?.[mapping.sourceField];
          if (sourceValue !== undefined) {
            // Transform value based on field types - for now, just copy the value
            transformedElements[mapping.targetField] = {
              value: sourceValue.value
            };
            console.log(`🔄 Mapped ${mapping.sourceField} -> ${mapping.targetField}:`, sourceValue.value);
          }
        }
      }

      // Step 4: Create language variant with transformed data using the builder pattern
      console.log('📝 Creating language variant with field data...');
      
      const newVariant = await this.managementClient
        .upsertLanguageVariant()
        .byItemId(newItem.data.id)
        .byLanguageCodename(sourceLanguage)
        .withData((builder) => {
          // Apply field mappings
          for (const mapping of fieldMappings) {
            if (mapping.targetField && mapping.sourceField) {
              const sourceElement = sourceItemData.variant?.elements?.[mapping.sourceField];
              if (sourceElement) {
                console.log(`� Mapping field ${mapping.sourceField} -> ${mapping.targetField}`, sourceElement);
                
                // Handle different field types
                switch (sourceElement.type) {
                  case 'text':
                    builder.textElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || '',
                    });
                    break;
                    
                  case 'rich_text':
                    builder.richTextElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || '',
                    });
                    break;
                    
                  case 'number':
                    builder.numberElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || 0,
                    });
                    break;
                    
                  case 'modular_content':
                    builder.modularContentElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || [],
                    });
                    break;
                    
                  case 'date_time':
                    if (sourceElement.value) {
                      builder.dateTimeElement({
                        element: { codename: mapping.targetField },
                        value: sourceElement.value,
                      });
                    }
                    break;
                    
                  case 'asset':
                    builder.assetElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || [],
                    });
                    break;
                    
                  case 'multiple_choice':
                    builder.multipleChoiceElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || [],
                    });
                    break;
                    
                  case 'taxonomy':
                    builder.taxonomyElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || [],
                    });
                    break;
                    
                  case 'url_slug':
                    builder.urlSlugElement({
                      element: { codename: mapping.targetField },
                      value: sourceElement.value || '',
                    });
                    break;
                    
                  default:
                    console.warn(`⚠️ Unsupported field type: ${sourceElement.type}, skipping field ${mapping.sourceField}`);
                }
              }
            }
          }
        })
        .toPromise();

      console.log('✅ Language variant created with complete field data');

      return {
        success: true,
        newItem: newItem.data,
        newVariant: newVariant.data,
      };

    } catch (error) {
      console.error(`❌ Migration failed for ${sourceItem.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Utility functions for element type compatibility and transformation
 */
export class ElementTransformationService {
  
  /**
   * Transform element value from source type to target type
   */
  static transformElementValue(
    sourceValue: any, 
    sourceType: string, 
    targetType: string
  ): any {
    // Direct compatibility - no transformation needed
    if (sourceType === targetType) {
      return sourceValue;
    }

    // Text-based transformations
    if (targetType === 'text') {
      return this.transformToText(sourceValue, sourceType);
    }

    // Rich text transformations
    if (targetType === 'rich_text') {
      return this.transformToRichText(sourceValue, sourceType);
    }

    // Number transformations
    if (targetType === 'number') {
      return this.transformToNumber(sourceValue, sourceType);
    }

    // Date transformations
    if (targetType === 'date_time') {
      return this.transformToDateTime(sourceValue, sourceType);
    }

    // Multiple choice transformations
    if (targetType === 'multiple_choice') {
      return this.transformToMultipleChoice(sourceValue, sourceType);
    }

    // URL slug transformations
    if (targetType === 'url_slug') {
      return this.transformToUrlSlug(sourceValue, sourceType);
    }

    // If no transformation is available, return null or empty value
    console.warn(`No transformation available from ${sourceType} to ${targetType}`);
    return null;
  }

  private static transformToText(value: any, sourceType: string): string {
    if (!value) return '';

    switch (sourceType) {
      case 'rich_text':
        // Strip HTML tags for basic text conversion
        return value.replace(/<[^>]*>/g, '').trim();
      case 'number':
        return value.toString();
      case 'date_time':
        return new Date(value).toISOString();
      case 'url_slug':
        return value;
      case 'multiple_choice':
        return Array.isArray(value) 
          ? value.map((item: any) => item.name || item.codename).join(', ')
          : value?.name || value?.codename || '';
      case 'taxonomy':
        return Array.isArray(value)
          ? value.map((term: any) => term.name || term.codename).join(', ')
          : value?.name || value?.codename || '';
      default:
        return String(value);
    }
  }

  private static transformToRichText(value: any, sourceType: string): string {
    if (!value) return '<p></p>';

    switch (sourceType) {
      case 'text':
        return `<p>${value}</p>`;
      case 'number':
        return `<p>${value}</p>`;
      case 'url_slug':
        return `<p>${value}</p>`;
      default:
        return `<p>${String(value)}</p>`;
    }
  }

  private static transformToNumber(value: any, sourceType: string): number | null {
    if (!value) return null;

    switch (sourceType) {
      case 'text': {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      case 'rich_text': {
        const textValue = value.replace(/<[^>]*>/g, '').trim();
        const numberParsed = parseFloat(textValue);
        return isNaN(numberParsed) ? null : numberParsed;
      }
      default: {
        const numericValue = Number(value);
        return isNaN(numericValue) ? null : numericValue;
      }
    }
  }

  private static transformToDateTime(value: any, sourceType: string): string | null {
    if (!value) return null;

    switch (sourceType) {
      case 'text': {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      case 'number':
        // Assume timestamp
        return new Date(value).toISOString();
      default:
        return new Date(value).toISOString();
    }
  }

  private static transformToMultipleChoice(_value: any, _sourceType: string): any[] {
    // This would need to be mapped to actual multiple choice options
    // For now, return empty array as it requires specific option mapping
    console.warn('Multiple choice transformation requires manual option mapping');
    return [];
  }

  private static transformToUrlSlug(value: any, sourceType: string): string {
    if (!value) return '';

    const text = this.transformToText(value, sourceType);
    
    // Convert to URL-friendly slug
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(?:^-+|-+$)/gu, '')
      .substring(0, 50); // Limit length
  }
}