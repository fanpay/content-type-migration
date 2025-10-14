import { 
  DeliveryClient,
} from '@kontent-ai/delivery-sdk';
import { getKontentConfig } from '../config/appConfig';

export interface MigrationItem {
  id: string;
  name: string;
  codename: string;
  type: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface CreatedItemInfo {
  originalCodename: string;
  originalName: string;
  originalType: string;
  newCodename: string;
  newName: string;
  newType: string;
  newId: string;
  wasAutoMigrated: boolean; // true if created during recursive linked item migration
  alreadyExisted: boolean;  // true if the item already existed and was skipped
}

export class KontentServiceFixed {
  private managementClient: any;
  private deliveryClient: DeliveryClient | null = null;
  private createdItemsRegistry: CreatedItemInfo[] = []; // Registry of all items created during migration
  private initializationPromise: Promise<void>;

  constructor() {
    // Initialize both clients asynchronously with config from SDK or .env
    this.initializationPromise = this.initializeClients();
  }

  private async initializeClients() {
    try {
      // Get configuration from SDK or .env
      const config = await getKontentConfig();

      // Initialize Management Client
      const { ManagementClient } = await import('@kontent-ai/management-sdk');
      this.managementClient = new ManagementClient({
        environmentId: config.environmentId,
        apiKey: config.managementApiKey,
      });

      // Initialize Delivery Client
      this.deliveryClient = new DeliveryClient({
        environmentId: config.environmentId,
        previewApiKey: config.previewApiKey,
        defaultQueryConfig: {
          usePreviewMode: true,
        },
      });
    } catch (error) {
      console.error('Failed to initialize Kontent.ai clients:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    await this.initializationPromise;
    if (!this.managementClient || !this.deliveryClient) {
      throw new Error('Kontent.ai clients not initialized');
    }
  }

  /**
   * Get all content types
   */
  async getContentTypes(): Promise<any[]> {
    await this.ensureInitialized();
    try {
      const types = await this.managementClient.listContentTypes().toAllPromise();
      return types.data.items.map((type: any) => ({
        id: type.id,
        codename: type.codename,
        name: type.name,
        elements: type.elements.map((el: any) => ({
          id: el.id,
          codename: el.codename,
          name: el.name,
          type: el.type,
          is_required: el.is_required || false,
        })),
      }));
    } catch (error) {
      console.error('Failed to fetch content types:', error);
      throw error;
    }
  }

  /**
   * Get all content items of a specific type
   */
  async getContentItems(contentTypeCodename: string, language: string = 'default'): Promise<any[]> {
    await this.ensureInitialized();
    
    try {
      const items = await this.deliveryClient!
        .items()
        .type(contentTypeCodename)
        .languageParameter(language)
        .toPromise();
      
      return items.data.items.map((item: any) => ({
        id: item.system.id,
        codename: item.system.codename,
        name: item.system.name,
        type: item.system.type,
        lastModified: item.system.lastModified ? new Date(item.system.lastModified) : new Date(),
      }));
    } catch (error) {
      console.error('Failed to fetch content items:', error);
      throw error;
    }
  }

  /**
   * Complete migration function: creates new content item and language variant with field data
   */
  async migrateContentItem(
    sourceItem: MigrationItem,
    fieldMappings: FieldMapping[],
    sourceContentType: any,
    targetContentType: any,
    sourceLanguage: string = 'en',
    logger?: (level: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => void
  ): Promise<{ success: boolean; newItem?: any; newVariant?: any; createdItems?: CreatedItemInfo[]; error?: string }> {
    await this.ensureInitialized();
    try {
      // Reset the registry for this migration
      this.createdItemsRegistry = [];
      
      const log = (level: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => {
        if (logger) {
          logger(level, message, details);
        }
        // Also keep console.log for debugging
        console.log(message, details || '');
      };
      
      log('info', `🔄 Starting migration for item: ${sourceItem.name}`);

      // Step 1: Get source content with complete data using Delivery API
      log('info', '  → Step 1: Fetching source item data...');
      const sourceItemData = await this.deliveryClient!
        .item(sourceItem.codename)
        .depthParameter(1)
        .languageParameter(sourceLanguage)
        .toPromise();

      if (!sourceItemData.data.item) {
        throw new Error('Source item not found');
      }

      log('info', `  → Found ${Object.keys(sourceItemData.data.item.elements).length} source elements`);

      // Step 2: Get target content type structure
      log('info', '  → Step 2: Fetching target content type structure...');
      const targetTypeData = await this.managementClient
        .viewContentType()
        .byTypeCodename(targetContentType.codename)
        .toPromise();

      log('info', `  → Found ${targetTypeData.data.elements.length} target elements`);

      // Step 2.1: Use default language ID (most projects use this)
      // For now, use the standard default language ID to avoid API complexity
      const languageId = '00000000-0000-0000-0000-000000000000';
      log('info', `  → Using language: ${sourceLanguage}`);

      // Step 3: Create new content item in target content type
      log('info', '  → Step 3: Creating new content item...');
      const newItem = await this.managementClient
        .addContentItem()
        .withData({
          name: `[MIGRATED] ${sourceItem.name}`,
          type: {
            codename: targetContentType.codename,
          },
        })
        .toPromise();

      log('success', `  ✅ New content item created`, `ID: ${newItem.data.id}`);

      // Register the main migrated item
      this.createdItemsRegistry.push({
        originalCodename: sourceItem.codename,
        originalName: sourceItem.name,
        originalType: sourceContentType.codename,
        newCodename: newItem.data.codename,
        newName: newItem.data.name,
        newType: targetContentType.codename,
        newId: newItem.data.id,
        wasAutoMigrated: false, // This is the main item, not auto-migrated
        alreadyExisted: false,  // This is a new item
      });

      // Step 4: Build elements for language variant based on field mappings
      log('info', '  → Step 4: Building field mappings...');
      const elements: any[] = [];
      
      for (const mapping of fieldMappings) {
        if (mapping.targetField && mapping.sourceField) {
          const sourceElement = sourceItemData.data.item.elements[mapping.sourceField];
          const targetElementDef = targetTypeData.data.elements.find((e: any) => e.codename === mapping.targetField);
          
          log('info', `    • Mapping: ${mapping.sourceField} → ${mapping.targetField}`, 
            `Source exists: ${!!sourceElement}, Target exists: ${!!targetElementDef}`);
          
          if (sourceElement && targetElementDef) {
            const elementData = this.transformFieldValue(sourceElement, targetElementDef, mapping.targetField);
            if (elementData) {
              log('success', `      ✅ Mapped successfully`);
              elements.push(elementData);
            } else {
              log('warning', `      ⚠️ No data created for mapping`);
            }
          } else {
            log('warning', `      ⚠️ Skipping - missing source or target element`);
          }
        }
      }

      // Step 4.5: Add default values for required elements that weren't mapped (except guidelines)
      log('info', '  → Step 4.5: Adding default values for unmapped fields...');
      for (const targetElement of targetTypeData.data.elements) {
        const isMapped = elements.some(el => el.element.codename === targetElement.codename);
        
        // Skip guidelines fields - they are specific to each content type
        if (targetElement.type === 'guidelines') {
          continue;
        }
        
        // Always add unmapped elements with default values to avoid API errors
        if (!isMapped) {
          log('info', `    • Adding default for: ${targetElement.codename} (${targetElement.type})`);
          
          const defaultElementData = this.getDefaultElementValue(targetElement);
          if (defaultElementData) {
            elements.push(defaultElementData);
          }
        }
      }

      // Step 5: Create language variant with field data using direct approach 
      log('info', `  → Step 5: Creating language variant with ${elements.length} elements...`);
      
      // Prepare elements in the correct format expected by the API
      const elementsData = elements.map(elementData => {
        const { element, value, type } = elementData;
        
        // Return the element in the format expected by the API
        switch (type) {
          case 'text':
          case 'rich_text':
          case 'guidelines':
          case 'url_slug':
            return {
              element: { codename: element.codename },
              value: value || ''
            };
            
          case 'number':
            return {
              element: { codename: element.codename },
              value: value || 0
            };
            
          case 'modular_content': {
            // Convert array of {codename: string} to array of codename references
            let linkedItemsValue: any[] = [];
            if (Array.isArray(value)) {
              linkedItemsValue = value.map((item: any) => {
                if (typeof item === 'string') {
                  return { codename: item };
                } else if (item?.codename) {
                  return { codename: item.codename };
                }
                return null;
              }).filter(Boolean);
            }
            
            return {
              element: { codename: element.codename },
              value: linkedItemsValue
            };
          }
            
          case 'date_time':
            return {
              element: { codename: element.codename },
              value: value || null
            };
            
          default:
            return {
              element: { codename: element.codename },
              value: String(value || '')
            };
        }
      });
      
      // Pre-process linked items for migration if needed
      let processedElements = [...elementsData];
      
      const linkedElement = elementsData.find(e => e.element.codename === 'parent_page_type_tag');
      if (linkedElement && Array.isArray(linkedElement.value) && linkedElement.value.length > 0) {
        log('info', '    • Pre-processing linked items for migration...');
        
        const linkedReferences = [];
        for (const item of linkedElement.value) {
          const codename = item.codename || item;
          log('info', `      • Processing linked item: ${codename}`);
          
          // Check if this linked item should also be migrated
          const migratedCodename = await this.handleLinkedItemMigration(
            codename,
            sourceContentType,
            targetContentType
          );
          
          linkedReferences.push({ codename: migratedCodename });
        }
        
        // Update the element data with migrated references
        const updatedLinkedElement = {
          ...linkedElement,
          value: linkedReferences
        };
        
        // Replace the element in the array
        processedElements = processedElements.map(el => 
          el.element.codename === 'parent_page_type_tag' ? updatedLinkedElement : el
        );
        
        log('success', `    ✅ Updated ${linkedReferences.length} linked references`);
      }
      
      const newVariant = await this.managementClient
        .upsertLanguageVariant()
        .byItemId(newItem.data.id)
        .byLanguageId(languageId)
        .withData((builder: any) => {
          const elements = [];
          
          // Add name element
          const nameElement = processedElements.find(e => e.element.codename === 'name');
          if (nameElement) {
            elements.push(builder.textElement({
              element: { codename: 'name' },
              value: nameElement.value || ''
            }));
          }
          
          // Add linked items element if it has values
          const processedLinkedElement = processedElements.find(e => e.element.codename === 'parent_page_type_tag');
          if (processedLinkedElement && Array.isArray(processedLinkedElement.value) && processedLinkedElement.value.length > 0) {
            elements.push(builder.linkedItemsElement({
              element: { codename: 'parent_page_type_tag' },
              value: processedLinkedElement.value
            }));
          }
          
          // Return in the format expected by the API: {elements: [...]}
          return {
            elements: elements
          };
        })
        .toPromise();

      log('success', `✅ Migration completed successfully for: ${sourceItem.name}`);

      // Log the summary of created items
      const summary = this.getCreatedItemsSummary();
      if (summary) {
        log('info', 'Migration summary:', summary);
      }

      return {
        success: true,
        newItem: newItem.data,
        newVariant: newVariant.data,
        createdItems: this.createdItemsRegistry, // Include all created items
      };

    } catch (error: any) {
      if (logger) {
        logger('error', `Migration failed for ${sourceItem.name}`, error.message);
      }
      console.error('❌ Migration failed for', sourceItem.name, ':', error);
      console.error('❌ Error details:', {
        message: error.message,
        validationErrors: error.validationErrors,
        requestData: error.requestData
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Transform field value based on target field type
   */
  private transformFieldValue(sourceElement: any, targetElementDef: any, targetFieldCodename: string): any | null {
    const elementData: any = {
      element: { codename: targetFieldCodename },
      type: targetElementDef.type
    };

    // Handle field transformation based on target field type
    switch (targetElementDef.type) {
      case 'text':
      case 'rich_text':
      case 'url_slug':
        elementData.value = sourceElement.value || '';
        break;
        
      case 'number':
        elementData.value = typeof sourceElement.value === 'number' ? sourceElement.value : 0;
        break;
        
      case 'modular_content':
        // Handle modular content references - map codenames to reference objects
        if (Array.isArray(sourceElement.value)) {
          elementData.value = sourceElement.value.map((codename: string) => ({ codename }));
        } else {
          elementData.value = [];
        }
        console.log(`🔗 Modular content mapped:`, elementData.value);
        break;
        
      case 'date_time':
        elementData.value = sourceElement.value || null;
        break;
        
      case 'asset':
      case 'multiple_choice':
      case 'taxonomy':
        elementData.value = Array.isArray(sourceElement.value) ? sourceElement.value : [];
        break;
        
      default:
        console.warn(`⚠️ Unsupported field type: ${targetElementDef.type}, skipping field`);
        return null;
    }

    return elementData;
  }

  /**
   * Get default element value for required fields
   */
  private getDefaultElementValue(targetElement: any): any | null {
    // Skip guidelines - they are content type specific
    if (targetElement.type === 'guidelines') {
      console.log(`⏭️ Skipping guidelines element: ${targetElement.codename}`);
      return null;
    }

    const elementData: any = {
      element: { codename: targetElement.codename },
      type: targetElement.type
    };

    // Provide default values based on element type
    switch (targetElement.type) {
      case 'text':
      case 'rich_text':
      case 'url_slug':
        elementData.value = '';
        break;
        
      case 'number':
        elementData.value = 0;
        break;
        
      case 'modular_content':
      case 'asset':
      case 'multiple_choice':
      case 'taxonomy':
        elementData.value = [];
        break;
        
      case 'date_time':
        elementData.value = null;
        break;
        
      default:
        console.warn(`⚠️ No default value available for type: ${targetElement.type}`);
        return null;
    }

    return elementData;
  }

  /**
   * Handle migration of linked items that should also be migrated to new content types
   */
  async handleLinkedItemMigration(
    referencedCodename: string,
    sourceContentType: any,
    targetContentType: any
  ): Promise<string> {
    await this.ensureInitialized();
    try {
      // Step 1: Get the referenced item details
      console.log(`🔍 Checking if ${referencedCodename} needs migration...`);
      
      const referencedItem = await this.deliveryClient!
        .item(referencedCodename)
        .toPromise();

      // Step 2: Check if the referenced item is of the same type that we're migrating
      if (referencedItem.data.item.system.type === sourceContentType.codename) {
        console.log(`🎯 Referenced item ${referencedCodename} is of type ${sourceContentType.codename}, needs migration!`);
        
        // Step 3: Automatically migrate the referenced item
        console.log(`🚀 Auto-migrating linked item "${referencedCodename}" from "${sourceContentType.codename}" to "${targetContentType.codename}"`);
        
        // Generate a shorter, cleaner codename for the migrated item
        const migratedCodename = `${referencedCodename}_migrated`;
        
        try {
          // Step 4: Check if migrated version already exists
          console.log(`🔍 Checking if ${migratedCodename} already exists...`);
          const existingItem = await this.deliveryClient!.item(migratedCodename).toPromise();
          console.log(`✅ Migrated version already exists: ${migratedCodename}`);
          
          // Register that this item already existed
          this.createdItemsRegistry.push({
            originalCodename: referencedCodename,
            originalName: referencedItem.data.item.system.name,
            originalType: sourceContentType.codename,
            newCodename: migratedCodename,
            newName: existingItem.data.item.system.name,
            newType: targetContentType.codename,
            newId: existingItem.data.item.system.id,
            wasAutoMigrated: true,
            alreadyExisted: true, // ← Item already existed, skipped creation
          });
          
          return migratedCodename;
        } catch (notFoundError: unknown) {
          // Migrated version doesn't exist, create it
          console.log(`🔨 Creating new migrated item: ${migratedCodename}`, notFoundError instanceof Error ? notFoundError.message : 'Item not found');
          
          // Step 5: Create the new migrated content item
          const newMigratedItem = await this.managementClient
            .addContentItem()
            .withData({
              name: `${referencedItem.data.item.system.name}`,
              codename: migratedCodename,
              type: {
                codename: targetContentType.codename,
              },
            })
            .toPromise();

          console.log(`✅ Created migrated item: ${newMigratedItem.data.id}`);
          
          // Step 6: Create language variant with migrated field data
          const languageId = '00000000-0000-0000-0000-000000000000';
          
          console.log(`🔧 Creating language variant for migrated item...`);
          
          // Pre-process parent references recursively BEFORE creating the variant
          let parentReferences: any[] = [];
          const originalParentField = referencedItem.data.item.elements.parent_tag;
          if (originalParentField && Array.isArray(originalParentField.value) && originalParentField.value.length > 0) {
            console.log(`🔗 Processing parent references for ${migratedCodename}:`, originalParentField.value);
            
            // Recursively migrate parent references
            for (const parentCodename of originalParentField.value) {
              console.log(`🔄 Recursively migrating parent: ${parentCodename}`);
              const migratedParentCodename = await this.handleLinkedItemMigration(
                parentCodename,
                sourceContentType,
                targetContentType
              );
              parentReferences.push({ codename: migratedParentCodename });
            }
            
            console.log(`✅ Migrated parent references:`, parentReferences);
          }
          
          const migratedVariant = await this.managementClient
            .upsertLanguageVariant()
            .byItemId(newMigratedItem.data.id)
            .byLanguageId(languageId)
            .withData((builder: any) => {
              const elements = [];
              
              // Copy the name from original item
              const originalName = referencedItem.data.item.elements.name?.value || referencedItem.data.item.system.name;
              elements.push(builder.textElement({
                element: { codename: 'name' },
                value: originalName
              }));
              
              // Add parent references if they exist
              if (parentReferences.length > 0) {
                elements.push(builder.linkedItemsElement({
                  element: { codename: 'parent_page_type_tag' },
                  value: parentReferences
                }));
              }
              
              return { elements: elements };
            })
            .toPromise();
          
          console.log(`✅ Created language variant for migrated item: ${migratedVariant.data.item.id}`);
          
          // Register this auto-migrated item
          this.createdItemsRegistry.push({
            originalCodename: referencedCodename,
            originalName: referencedItem.data.item.system.name,
            originalType: sourceContentType.codename,
            newCodename: migratedCodename,
            newName: newMigratedItem.data.name,
            newType: targetContentType.codename,
            newId: newMigratedItem.data.id,
            wasAutoMigrated: true, // This item was auto-migrated during recursive linked item migration
            alreadyExisted: false, // ← This is a newly created item
          });
          
          return migratedCodename;
        }
      } else {
        console.log(`⏭️ Referenced item ${referencedCodename} is of different type, no migration needed`);
        return referencedCodename;
      }
    } catch (error) {
      console.error(`❌ Error handling linked item migration for ${referencedCodename}:`, error);
      // Fall back to original codename if there's an error
      return referencedCodename;
    }
  }

  /**
   * Get a formatted summary of all items created during the last migration
   */
  getCreatedItemsSummary(): string {
    if (this.createdItemsRegistry.length === 0) {
      return '📋 No items were created during migration.';
    }

    const mainItems = this.createdItemsRegistry.filter(item => !item.wasAutoMigrated);
    const autoMigratedItems = this.createdItemsRegistry.filter(item => item.wasAutoMigrated);
    const newItems = this.createdItemsRegistry.filter(item => !item.alreadyExisted);
    const existingItems = this.createdItemsRegistry.filter(item => item.alreadyExisted);

    let summary = '\n📋 ========== MIGRATION SUMMARY ==========\n\n';
    summary += `✅ Total items processed: ${this.createdItemsRegistry.length}\n`;
    summary += `   └─ Main items: ${mainItems.length}\n`;
    summary += `   └─ Auto-migrated linked items: ${autoMigratedItems.length}\n`;
    summary += `   └─ New items created: ${newItems.length}\n`;
    summary += `   └─ Items already existed (skipped): ${existingItems.length}\n\n`;

    if (mainItems.length > 0) {
      summary += '🎯 MAIN ITEMS MIGRATED:\n';
      mainItems.forEach((item, index) => {
        summary += `\n${index + 1}. "${item.originalName}"${item.alreadyExisted ? ' ⚠️ ALREADY EXISTED' : ''}\n`;
        summary += `   Original: [${item.originalType}] ${item.originalCodename}\n`;
        summary += `   New:      [${item.newType}] ${item.newCodename}\n`;
        summary += `   ID:       ${item.newId}\n`;
        if (item.alreadyExisted) {
          summary += `   Status:   ⚠️ Skipped (already migrated)\n`;
        }
      });
    }

    if (autoMigratedItems.length > 0) {
      summary += '\n\n🔗 AUTO-MIGRATED LINKED ITEMS:\n';
      autoMigratedItems.forEach((item, index) => {
        summary += `\n${index + 1}. "${item.originalName}"${item.alreadyExisted ? ' ⚠️ ALREADY EXISTED' : ''}\n`;
        summary += `   Original: [${item.originalType}] ${item.originalCodename}\n`;
        summary += `   New:      [${item.newType}] ${item.newCodename}\n`;
        summary += `   ID:       ${item.newId}\n`;
        if (item.alreadyExisted) {
          summary += `   Status:   ⚠️ Skipped (already migrated)\n`;
        }
      });
    }

    summary += '\n========================================\n';
    return summary;
  }

  /**
   * Clear the created items registry
   */
  clearCreatedItemsRegistry(): void {
    this.createdItemsRegistry = [];
  }

  /**
   * Update a modular content field reference in a language variant
   * @param itemCodename - Codename of the item to update
   * @param fieldCodename - Codename of the field to update
   * @param oldReference - Old item codename to replace
   * @param newReference - New item codename to use
   * @param languageCodename - Language variant to update
   */
  async updateItemReference(
    itemCodename: string,
    fieldCodename: string,
    oldReference: string,
    newReference: string,
    languageCodename: string = 'en'
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    try {
      console.log(`🔄 Updating reference in ${itemCodename}.${fieldCodename}: ${oldReference} → ${newReference}`);

      // Step 1: Get the item to find its content type
      const item = await this.managementClient
        .viewContentItem()
        .byItemCodename(itemCodename)
        .toPromise();

      if (!item.data) {
        throw new Error(`Item ${itemCodename} not found`);
      }

      console.log(`📦 Item data structure:`, JSON.stringify(item.data, null, 2));
      
      // The Management API returns type as { id: "..." }, not codename
      const contentTypeId = item.data.type?.id;
      
      if (!contentTypeId) {
        throw new Error(`Content type ID not found for item ${itemCodename}`);
      }
      
      console.log(`📦 Content type ID: ${contentTypeId}`);

      // Step 2: Get the content type using ID to map field codenames to IDs
      const contentType = await this.managementClient
        .viewContentType()
        .byTypeId(contentTypeId)  // Use ID instead of codename
        .toPromise();

      if (!contentType.data) {
        throw new Error(`Content type with ID ${contentTypeId} not found`);
      }

      // Step 3: Find the field ID from the content type
      const typeElement = contentType.data.elements.find((el: any) => el.codename === fieldCodename);

      if (!typeElement) {
        throw new Error(`Field ${fieldCodename} not found in content type ${contentType.data.codename}`);
      }

      const fieldId = typeElement.id;
      console.log(`� Field ID for ${fieldCodename}: ${fieldId}`);

      // Step 4: Get current language variant
      const variant = await this.managementClient
        .viewLanguageVariant()
        .byItemCodename(itemCodename)
        .byLanguageCodename(languageCodename)
        .toPromise();

      if (!variant.data) {
        throw new Error(`Language variant not found for ${itemCodename} in ${languageCodename}`);
      }

      // Step 5: Find the field in the variant using the ID
      const currentElements = variant.data.elements || [];
      const fieldElement = currentElements.find((el: any) => el.element.id === fieldId);

      if (!fieldElement) {
        throw new Error(`Field element with ID ${fieldId} not found in variant`);
      }

      // Step 6: Get the ID of the old item (by codename)
      let oldItemId: string;
      try {
        const oldItem = await this.managementClient
          .viewContentItem()
          .byItemCodename(oldReference)
          .toPromise();
        oldItemId = oldItem.data.id;
        console.log(`🔍 Old item ${oldReference} has ID: ${oldItemId}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`Could not find old item ${oldReference}: ${errorMsg}`);
      }

      // Step 7: Update the value - replace old reference ID with new one
      let updatedValue = fieldElement.value;
      
      if (Array.isArray(fieldElement.value)) {
        // For modular_content fields (array of reference objects with IDs)
        updatedValue = fieldElement.value.map((ref: any) => {
          // The value might be an object with id, or just a string
          const refId = typeof ref === 'object' && ref.id ? ref.id : ref;
          
          if (refId === oldItemId) {
            return { id: newReference };  // newReference is already an ID
          }
          return typeof ref === 'object' ? ref : { id: ref };
        });
      } else {
        console.warn(`Field ${fieldCodename} is not an array, cannot update reference`);
        return { success: false, error: 'Field is not a modular content type' };
      }

      console.log(`  Original value:`, fieldElement.value);
      console.log(`  Updated value:`, updatedValue);

      // Step 8: Check if the item is published, if so create a new version first
      try {
        // Try to create a new version (this will fail if already in draft)
        await this.managementClient
          .createNewVersionOfLanguageVariant()
          .byItemCodename(itemCodename)
          .byLanguageCodename(languageCodename)
          .toPromise();
        console.log(`📝 Created new draft version of ${itemCodename}`);
      } catch (err) {
        // Item is already in draft state, or error creating version
        const errMsg = err instanceof Error ? err.message : 'Unknown';
        console.log(`ℹ️  Item already in draft state or error creating version: ${errMsg}, continuing...`);
      }

      // Step 9: Update the language variant - ONLY send the element we're updating
      // The Management API allows partial updates, we don't need to send all elements
      await this.managementClient
        .upsertLanguageVariant()
        .byItemCodename(itemCodename)
        .byLanguageCodename(languageCodename)
        .withData(() => ({
          elements: [
            {
              element: {
                id: fieldId
              },
              value: updatedValue
            }
          ]
        }))
        .toPromise();

      console.log(`✅ Successfully updated reference in ${itemCodename} (item is now in draft state)`);
      
      return { 
        success: true 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to update reference:`, errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Update multiple references in an item (batch update for the same item)
   * @param itemCodename - Codename of the item to update
   * @param updates - Array of { fieldCodename, oldReference, newReference }
   * @param languageCodename - Language variant to update
   */
  async updateMultipleReferences(
    itemCodename: string,
    updates: Array<{ fieldCodename: string; oldReference: string; newReference: string }>,
    languageCodename: string = 'en'
  ): Promise<{ success: boolean; updatedFields: number; error?: string }> {
    try {
      console.log(`🔄 Updating ${updates.length} references in ${itemCodename}`);

      // Step 1: Get current language variant
      const variant = await this.managementClient
        .viewLanguageVariant()
        .byItemCodename(itemCodename)
        .byLanguageCodename(languageCodename)
        .toPromise();

      if (!variant.data) {
        throw new Error(`Language variant not found for ${itemCodename} in ${languageCodename}`);
      }

      // Step 2: Prepare updated elements
      const currentElements = variant.data.elements || [];
      let updatedCount = 0;

      const elementsToUpdate = currentElements.map((el: any) => {
        // Find if this field needs to be updated
        const update = updates.find(u => u.fieldCodename === el.element.codename);
        
        if (update && Array.isArray(el.value)) {
          updatedCount++;
          const updatedValue = el.value.map((codename: string) => 
            codename === update.oldReference ? update.newReference : codename
          );
          
          console.log(`  ${el.element.codename}: ${update.oldReference} → ${update.newReference}`);
          
          return {
            element: {
              codename: el.element.codename
            },
            value: updatedValue
          };
        }
        
        return el;
      });

      // Step 3: Update the language variant
      await this.managementClient
        .upsertLanguageVariant()
        .byItemCodename(itemCodename)
        .byLanguageCodename(languageCodename)
        .withData(() => ({
          elements: elementsToUpdate
        }))
        .toPromise();

      console.log(`✅ Successfully updated ${updatedCount} fields in ${itemCodename}`);
      
      return { 
        success: true,
        updatedFields: updatedCount
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to update references:`, errorMessage);
      return { 
        success: false,
        updatedFields: 0,
        error: errorMessage 
      };
    }
  }
}

// Export singleton instance
export const kontentServiceFixed = new KontentServiceFixed();