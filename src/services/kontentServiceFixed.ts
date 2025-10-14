import { 
  DeliveryClient,
} from '@kontent-ai/delivery-sdk';

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

export class KontentServiceFixed {
  private managementClient: any;
  private deliveryClient: DeliveryClient;

  constructor() {
    const projectId = import.meta.env.VITE_KONTENT_PROJECT_ID;
    const managementApiKey = import.meta.env.VITE_KONTENT_MANAGEMENT_API_KEY;
    const previewApiKey = import.meta.env.VITE_KONTENT_PREVIEW_API_KEY;

    if (!projectId || !managementApiKey || !previewApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Management Client (dynamic import to handle ES modules)
    this.initializeManagementClient(projectId, managementApiKey);

    // Initialize Delivery Client
    this.deliveryClient = new DeliveryClient({
      environmentId: projectId,
      previewApiKey,
      defaultQueryConfig: {
        usePreviewMode: true,
      },
    });
  }

  private async initializeManagementClient(projectId: string, managementApiKey: string) {
    try {
      const { ManagementClient } = await import('@kontent-ai/management-sdk');
      this.managementClient = new ManagementClient({
        environmentId: projectId,
        apiKey: managementApiKey,
      });
    } catch (error) {
      console.error('Failed to initialize Management Client:', error);
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
    sourceLanguage: string = 'en'
  ): Promise<{ success: boolean; newItem?: any; newVariant?: any; error?: string }> {
    try {
      console.log(`🔄 Starting migration for item: ${sourceItem.name}`);

      // Step 1: Get source content with complete data using Delivery API
      const sourceItemData = await this.deliveryClient
        .item(sourceItem.codename)
        .depthParameter(1)
        .languageParameter(sourceLanguage)
        .toPromise();

      if (!sourceItemData.data.item) {
        throw new Error('Source item not found');
      }

      console.log('📥 Source item elements:', Object.keys(sourceItemData.data.item.elements));

      // Step 2: Get target content type structure
      const targetTypeData = await this.managementClient
        .viewContentType()
        .byTypeCodename(targetContentType.codename)
        .toPromise();

      console.log('🎯 Target type elements:', targetTypeData.data.elements.map((e: any) => e.codename));

      // Step 2.1: Use default language ID (most projects use this)
      // For now, use the standard default language ID to avoid API complexity
      const languageId = '00000000-0000-0000-0000-000000000000';
      console.log('🌐 Using default language ID:', languageId, 'for source language:', sourceLanguage);

      // Step 3: Create new content item in target content type
      const newItem = await this.managementClient
        .addContentItem()
        .withData({
          name: `[MIGRATED] ${sourceItem.name}`,
          type: {
            codename: targetContentType.codename,
          },
        })
        .toPromise();

      console.log('✅ New content item created:', newItem.data.id);

      // Step 4: Build elements for language variant based on field mappings
      const elements: any[] = [];
      
      for (const mapping of fieldMappings) {
        if (mapping.targetField && mapping.sourceField) {
          const sourceElement = sourceItemData.data.item.elements[mapping.sourceField];
          const targetElementDef = targetTypeData.data.elements.find((e: any) => e.codename === mapping.targetField);
          
          console.log(`🔍 Checking mapping: ${mapping.sourceField} -> ${mapping.targetField}`);
          console.log(`🔍 Source element exists:`, !!sourceElement);
          console.log(`🔍 Target element exists:`, !!targetElementDef);
          
          if (sourceElement) {
            console.log(`🔍 Source element value:`, sourceElement.value);
            console.log(`🔍 Source element type:`, typeof sourceElement.value);
          }
          
          if (sourceElement && targetElementDef) {
            console.log(`🔄 Mapping ${mapping.sourceField} -> ${mapping.targetField}:`, sourceElement.value);
            
            const elementData = this.transformFieldValue(sourceElement, targetElementDef, mapping.targetField);
            if (elementData) {
              console.log(`✅ Element data created:`, elementData);
              elements.push(elementData);
            } else {
              console.log(`❌ No element data created for mapping`);
            }
          } else {
            console.log(`⚠️ Skipping mapping due to missing source or target element`);
          }
        }
      }

      // Step 4.5: Add default values for required elements that weren't mapped (except guidelines)
      for (const targetElement of targetTypeData.data.elements) {
        const isMapped = elements.some(el => el.element.codename === targetElement.codename);
        
        console.log(`🔍 Checking element: ${targetElement.codename}, required: ${targetElement.is_required}, mapped: ${isMapped}, type: ${targetElement.type}`);
        
        // Skip guidelines fields - they are specific to each content type
        if (targetElement.type === 'guidelines') {
          console.log(`⏭️ Skipping guidelines field: ${targetElement.codename}`);
          continue;
        }
        
        // Always add unmapped elements with default values to avoid API errors
        if (!isMapped) {
          console.log(`➕ Adding default value for unmapped field: ${targetElement.codename} (${targetElement.type})`);
          
          const defaultElementData = this.getDefaultElementValue(targetElement);
          if (defaultElementData) {
            elements.push(defaultElementData);
          }
        }
      }

      // Step 5: Create language variant with field data using direct approach 
      console.log('📝 Creating language variant with elements:', elements.length, 'elements');
      console.log('📋 Elements to create:', elements);
      
      // Prepare elements in the correct format expected by the API
      const elementsData = elements.map(elementData => {
        const { element, value, type } = elementData;
        console.log(`📝 Preparing element: ${element.codename} (${type}) with value:`, value);
        
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
            
            console.log('🔗 Processed linked items for API:', linkedItemsValue);
            
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
      
      console.log('🏗️ Final elements data for API:', JSON.stringify(elementsData, null, 2));
      
      // Use the correct format based on official documentation
      console.log('🔧 Creating language variant with proper format...');
      
      // Pre-process linked items for migration if needed
      let processedElements = [...elementsData];
      
      const linkedElement = elementsData.find(e => e.element.codename === 'parent_page_type_tag');
      if (linkedElement && Array.isArray(linkedElement.value) && linkedElement.value.length > 0) {
        console.log('🔗 Pre-processing linked items for migration...');
        
        const linkedReferences = [];
        for (const item of linkedElement.value) {
          const codename = item.codename || item;
          console.log('🔗 Processing linked item:', codename);
          
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
        
        console.log('🔗 Updated linked references:', linkedReferences);
      }
      
      const newVariant = await this.managementClient
        .upsertLanguageVariant()
        .byItemId(newItem.data.id)
        .byLanguageId(languageId)
        .withData((builder: any) => {
          console.log('🏗️ Building elements with correct format...');
          
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
            console.log('🔗 Adding processed linked items element:', processedLinkedElement.value);
            
            elements.push(builder.linkedItemsElement({
              element: { codename: 'parent_page_type_tag' },
              value: processedLinkedElement.value
            }));
          }
          
          console.log('✅ Final elements built:', elements.length);
          
          // Return in the format expected by the API: {elements: [...]}
          return {
            elements: elements
          };
        })
        .toPromise();

      console.log('✅ Migration completed successfully with field data');

      return {
        success: true,
        newItem: newItem.data,
        newVariant: newVariant.data,
      };

    } catch (error: any) {
      console.error(`❌ Migration failed for ${sourceItem.name}:`, error);
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
    try {
      // Step 1: Get the referenced item details
      console.log(`🔍 Checking if ${referencedCodename} needs migration...`);
      
      const referencedItem = await this.deliveryClient
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
          await this.deliveryClient.item(migratedCodename).toPromise();
          console.log(`✅ Migrated version already exists: ${migratedCodename}`);
          return migratedCodename;
        } catch (notFoundError: any) {
          // Migrated version doesn't exist, create it
          console.log(`🔨 Creating new migrated item: ${migratedCodename}`);
          
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
              
              // Handle parent references recursively
              const originalParentField = referencedItem.data.item.elements.parent_tag;
              if (originalParentField && Array.isArray(originalParentField.value) && originalParentField.value.length > 0) {
                console.log(`🔗 Processing parent references for ${migratedCodename}:`, originalParentField.value);
                
                // For now, copy the parent references as-is (could be made recursive)
                const parentReferences = originalParentField.value.map((parentCodename: string) => ({
                  codename: parentCodename
                }));
                
                elements.push(builder.linkedItemsElement({
                  element: { codename: 'parent_page_type_tag' },
                  value: parentReferences
                }));
              }
              
              return { elements: elements };
            })
            .toPromise();
          
          console.log(`✅ Created language variant for migrated item: ${migratedVariant.data.item.id}`);
          
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
}

// Export singleton instance
export const kontentServiceFixed = new KontentServiceFixed();