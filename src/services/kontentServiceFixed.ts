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
   * Get language ID from language codename
   * @param languageCodename - Language codename like 'en', 'de', 'es', 'zh', 'default'
   * @returns Language ID (UUID) or default language ID
   */
  private async getLanguageId(languageCodename: string): Promise<string> {
    await this.ensureInitialized();
    
    // If 'default', use the default language ID
    if (languageCodename === 'default' || languageCodename === 'en') {
      return '00000000-0000-0000-0000-000000000000';
    }

    try {
      // Get all languages from the project
      const languagesResponse = await this.managementClient
        .listLanguages()
        .toPromise();

      // Find the language by codename
      const language = languagesResponse.data.items.find(
        (lang: any) => lang.codename === languageCodename
      );

      if (language) {
        console.log(`✅ Found language "${languageCodename}" with ID: ${language.id}`);
        return language.id;
      }

      // If language not found, fallback to default and warn
      console.warn(`⚠️ Language "${languageCodename}" not found. Using default language.`);
      return '00000000-0000-0000-0000-000000000000';
    } catch (error) {
      console.error(`❌ Failed to get language ID for "${languageCodename}":`, error);
      // Fallback to default language
      return '00000000-0000-0000-0000-000000000000';
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
      console.log(`🌐 Fetching items for type: "${contentTypeCodename}" in language: "${language}"`);
      
      const items = await this.deliveryClient!
        .items()
        .type(contentTypeCodename)
        .languageParameter(language)
        .toPromise();
      
      console.log(`📊 API returned ${items.data.items.length} total items`);
      
      // Log first item details for debugging
      if (items.data.items.length > 0) {
        const firstItem = items.data.items[0];
        console.log(`📄 First item from API:`, {
          name: firstItem.system.name,
          codename: firstItem.system.codename,
          language: firstItem.system.language,
          type: firstItem.system.type
        });
      }
      
      // CLIENT-SIDE FILTER: Filter items by language as fallback
      // This ensures we only get items in the requested language
      let filteredItems = items.data.items;
      if (language !== 'default') {
        const beforeFilter = filteredItems.length;
        filteredItems = items.data.items.filter((item: any) => {
          return item.system.language === language;
        });
        console.log(`🔍 Client-side filter: ${beforeFilter} items → ${filteredItems.length} items in "${language}"`);
      }
      
      console.log(`✅ Final result: ${filteredItems.length} items for language "${language}"`);
      
      return filteredItems.map((item: any) => ({
        id: item.system.id,
        codename: item.system.codename,
        name: item.system.name,
        type: item.system.type,
        language: item.system.language, // Include language in response
        lastModified: item.system.lastModified ? new Date(item.system.lastModified) : new Date(),
      }));
    } catch (error) {
      console.error(`❌ Failed to fetch content items for language "${language}":`, error);
      throw error;
    }
  }

  /**
   * Get full item data including all elements (for checking references)
   */
  async getItemData(itemCodename: string, language: string = 'en'): Promise<any> {
    await this.ensureInitialized();
    
    try {
      console.log(`🔍 Fetching item data for: ${itemCodename} in language: ${language}`);
      
      // Try to get item from Delivery API with preview mode
      const response = await this.deliveryClient
        .item(itemCodename)
        .languageParameter(language)
        .toPromise();
      
      console.log(`✅ Found item: ${itemCodename}`);
      return response;
      
    } catch (error) {
      console.error(`❌ Failed to fetch item data for ${itemCodename}:`, error);
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

      // Step 1: Get source content with complete data using Delivery API with language fallback
      log('info', '  → Step 1: Fetching source item data...');
      log('info', `  → Requested language: ${sourceLanguage}`);
      log('info', `  → Item codename: ${sourceItem.codename}`);
      
      let sourceItemData: any;
      let actualSourceLanguage = sourceLanguage;
      
      // Try multiple strategies to get the item
      try {
        // Strategy 1: Try requested language with explicit parameter
        try {
          sourceItemData = await this.deliveryClient!
            .item(sourceItem.codename)
            .depthParameter(1)
            .languageParameter(sourceLanguage)
            .toPromise();
          log('info', `  ✅ Found item in requested language: ${sourceLanguage}`);
        } catch (langErr: any) {
          log('warning', `  ⚠️ Strategy 1 failed (language: ${sourceLanguage}): ${langErr.message || 'Unknown error'}`);
          
          // Strategy 2: Try without language parameter (uses default)
          try {
            sourceItemData = await this.deliveryClient!
              .item(sourceItem.codename)
              .depthParameter(1)
              .toPromise();
            
            actualSourceLanguage = sourceItemData.data.item.system.language || 'default';
            log('info', `  ✅ Strategy 2 success - Found item in fallback language: ${actualSourceLanguage}`);
            log('info', `  📋 Will copy content from "${actualSourceLanguage}" and create variant in "${sourceLanguage}"`);
          } catch (defaultErr: any) {
            // Strategy 3: Try to get ALL languages and pick first available
            log('warning', `  ⚠️ Strategy 2 failed: ${defaultErr.message || 'Unknown error'}`);
            log('info', `  → Strategy 3: Trying to fetch item in any available language...`);
            
            // Strategy 3: Try other common languages
            log('info', `  → Trying other languages: de, es, zh...`);
            const languagesToTry = ['de', 'es', 'zh'];
            let found = false;
            
            for (const lang of languagesToTry) {
              try {
                sourceItemData = await this.deliveryClient!
                  .item(sourceItem.codename)
                  .depthParameter(1)
                  .languageParameter(lang)
                  .toPromise();
                actualSourceLanguage = sourceItemData.data.item.system.language || lang;
                log('info', `  ✅ Strategy 3 success - Found item in language: ${actualSourceLanguage}`);
                log('info', `  📋 Will copy content from "${actualSourceLanguage}" and create variant in "${sourceLanguage}"`);
                found = true;
                break;
              } catch {
                // Try next language
                continue;
              }
            }
            
            if (!found) {
              // Strategy 4: Try using Management API as last resort
              log('warning', `  ⚠️ Strategy 3 failed. Trying Strategy 4: Management API...`);
              try {
                // Get item from Management API
                const managementItem = await this.managementClient
                  .viewContentItem()
                  .byItemCodename(sourceItem.codename)
                  .toPromise();
                
                // Get the language variant
                const managementVariant = await this.managementClient
                  .viewLanguageVariant()
                  .byItemCodename(sourceItem.codename)
                  .byLanguageCodename(sourceLanguage)
                  .toPromise();
                
                // Transform Management API format to Delivery API format
                sourceItemData = {
                  data: {
                    item: {
                      system: {
                        id: managementItem.data.id,
                        name: managementItem.data.name,
                        codename: managementItem.data.codename,
                        type: managementItem.data.type.codename || managementItem.data.type.id,
                        language: sourceLanguage
                      },
                      elements: {}
                    }
                  }
                };
                
                // Transform elements
                for (const element of managementVariant.data.elements) {
                  sourceItemData.data.item.elements[element.element.codename] = {
                    type: element.element.type,
                    name: element.element.name,
                    value: element.value
                  };
                }
                
                actualSourceLanguage = sourceLanguage;
                log('info', `  ✅ Strategy 4 success - Found item using Management API in language: ${actualSourceLanguage}`);
                found = true;
              } catch (mgmtErr: any) {
                log('error', `  ❌ Strategy 4 failed: ${mgmtErr.message || 'Unknown error'}`);
              }
            }
            
            if (!found) {
              throw new Error(`Source item ${sourceItem.codename} not found in any language using any strategy`);
            }
          }
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        log('error', `  ❌ Failed to fetch source item: ${errorMsg}`);
        throw new Error(`Source item ${sourceItem.codename} not found: ${errorMsg}`);
      }

      if (!sourceItemData || !sourceItemData.data || !sourceItemData.data.item) {
        throw new Error('Source item not found or invalid response');
      }

      log('info', `  → Found ${Object.keys(sourceItemData.data.item.elements).length} source elements`);

      // Step 2: Get target content type structure
      log('info', '  → Step 2: Fetching target content type structure...');
      const targetTypeData = await this.managementClient
        .viewContentType()
        .byTypeCodename(targetContentType.codename)
        .toPromise();

      log('info', `  → Found ${targetTypeData.data.elements.length} target elements`);

      // Step 2.1: Get language ID based on source language
      log('info', `  → Step 2.1: Getting language ID for "${sourceLanguage}"...`);
      const languageId = await this.getLanguageId(sourceLanguage);
      log('info', `  → Using language: ${sourceLanguage} (ID: ${languageId})`);

      // Step 3: Generate migrated codename and check if item already exists
      const migratedCodename = `${sourceItem.codename}_migrated`;
      log('info', `  → Step 3: Checking if migrated item already exists: ${migratedCodename}...`);
      
      let newItem: any;
      let itemAlreadyExisted = false;
      let shouldCreateVariant = true;
      
      try {
        // Check if migrated item already exists in Management API
        const existingItem = await this.managementClient
          .viewContentItem()
          .byItemCodename(migratedCodename)
          .toPromise();
        
        log('info', `  → Migrated item already exists: ${migratedCodename}`);
        newItem = existingItem;
        itemAlreadyExisted = true;
        
        // Check if the language variant already exists for this item
        try {
          await this.managementClient
            .viewLanguageVariant()
            .byItemCodename(migratedCodename)
            .byLanguageId(languageId)
            .toPromise();
          
          log('warning', `  ⚠️ Language variant already exists for ${migratedCodename} in ${sourceLanguage}. Skipping...`);
          shouldCreateVariant = false;
          
          // Register that this item and variant already existed
          this.createdItemsRegistry.push({
            originalCodename: sourceItem.codename,
            originalName: sourceItem.name,
            originalType: sourceContentType.codename,
            newCodename: migratedCodename,
            newName: existingItem.data.name,
            newType: targetContentType.codename,
            newId: existingItem.data.id,
            wasAutoMigrated: false,
            alreadyExisted: true,
          });
          
          return {
            success: true,
            newItem: existingItem.data,
            newVariant: null,
            createdItems: this.createdItemsRegistry,
          };
        } catch (variantError: any) {
          // Variant doesn't exist, we should create it
          log('info', `  → Language variant doesn't exist yet for ${sourceLanguage}. Will create it...`);
          shouldCreateVariant = true;
        }
      } catch (notFoundError: any) {
        // Item doesn't exist, create it
        log('info', `  → Creating new content item: ${migratedCodename}...`);
        newItem = await this.managementClient
          .addContentItem()
          .withData({
            name: `${sourceItem.name}`,
            codename: migratedCodename,
            type: {
              codename: targetContentType.codename,
            },
          })
          .toPromise();

        log('success', `  ✅ New content item created`, `ID: ${newItem.data.id}`);
      }

      // Register the main migrated item
      this.createdItemsRegistry.push({
        originalCodename: sourceItem.codename,
        originalName: sourceItem.name,
        originalType: sourceContentType.codename,
        newCodename: itemAlreadyExisted ? migratedCodename : newItem.data.codename,
        newName: newItem.data.name,
        newType: targetContentType.codename,
        newId: newItem.data.id,
        wasAutoMigrated: false, // This is the main item, not auto-migrated
        alreadyExisted: itemAlreadyExisted && !shouldCreateVariant,  // True only if item AND variant existed
      });
      
      // Only proceed with variant creation if it should be created
      if (!shouldCreateVariant) {
        log('info', '  → Skipping variant creation (already exists)...');
        
        const summary = this.getCreatedItemsSummary();
        if (summary) {
          log('info', 'Migration summary:', summary);
        }
        
        return {
          success: true,
          newItem: newItem.data,
          newVariant: null,
          createdItems: this.createdItemsRegistry,
        };
      }

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
      if (actualSourceLanguage !== sourceLanguage) {
        log('info', `  📋 Creating variant in "${sourceLanguage}" using content from "${actualSourceLanguage}"`);
      } else {
        log('info', `  📋 Creating variant in "${sourceLanguage}"`);
      }
      
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
      
      // NOTE: We do NOT pre-process linked items here because referenced items may not exist yet.
      // References will be updated later in the "Update references" phase after ALL items are migrated.
      log('info', '    ℹ️ Skipping linked items during initial creation - will be added in reference update phase');
      
      const newVariant = await this.managementClient
        .upsertLanguageVariant()
        .byItemId(newItem.data.id)
        .byLanguageId(languageId)
        .withData((builder: any) => {
          const elements = [];
          
          // Add name element
          const nameElement = elementsData.find(e => e.element.codename === 'name');
          if (nameElement) {
            elements.push(builder.textElement({
              element: { codename: 'name' },
              value: nameElement.value || ''
            }));
          }
          
          // Do NOT add linked items here - they will be added in the reference update phase
          // This prevents errors when the referenced items haven't been created yet
          
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
    targetContentType: any,
    sourceLanguage: string = 'en'
  ): Promise<string> {
    await this.ensureInitialized();
    try {
      // Step 1: Get the referenced item details with language fallback
      console.log(`🔍 Checking if ${referencedCodename} needs migration...`);
      console.log(`📍 Requested language: ${sourceLanguage}`);
      
      // Try to get item in the requested language, with fallback to any available language
      let referencedItem: any;
      let actualLanguage = sourceLanguage;
      
      // Try multiple strategies to get the item
      try {
        // Strategy 1: Try requested language
        try {
          referencedItem = await this.deliveryClient!
            .item(referencedCodename)
            .languageParameter(sourceLanguage)
            .toPromise();
          console.log(`✅ Found item in requested language: ${sourceLanguage}`);
        } catch (langErr: any) {
          console.log(`⚠️ Strategy 1 failed (language: ${sourceLanguage}): ${langErr.message || 'Unknown error'}`);
          
          // Strategy 2: Try default language
          try {
            referencedItem = await this.deliveryClient!
              .item(referencedCodename)
              .toPromise();
            
            actualLanguage = referencedItem.data.item.system.language || 'default';
            console.log(`✅ Strategy 2 success - Found item in fallback language: ${actualLanguage}`);
          } catch (defaultErr: any) {
            console.log(`⚠️ Strategy 2 failed: ${defaultErr.message || 'Unknown error'}`);
            
            // Strategy 3: Try other common languages
            const languagesToTry = ['de', 'es', 'zh'];
            let found = false;
            
            for (const lang of languagesToTry) {
              try {
                referencedItem = await this.deliveryClient!
                  .item(referencedCodename)
                  .languageParameter(lang)
                  .toPromise();
                actualLanguage = referencedItem.data.item.system.language || lang;
                console.log(`✅ Strategy 3 success - Found item in language: ${actualLanguage}`);
                found = true;
                break;
              } catch {
                continue;
              }
            }
            
            if (!found) {
              throw new Error(`Item ${referencedCodename} not found in any language (${sourceLanguage}, de, es, zh, default)`);
            }
          }
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.error(`❌ Failed to fetch linked item: ${errorMsg}`);
        throw new Error(`Item ${referencedCodename} not found: ${errorMsg}`);
      }

      // Step 2: Check if the referenced item is of the same type that we're migrating
      if (referencedItem.data.item.system.type === sourceContentType.codename) {
        console.log(`🎯 Referenced item ${referencedCodename} is of type ${sourceContentType.codename}, needs migration!`);
        
        // Step 3: Automatically migrate the referenced item
        console.log(`🚀 Auto-migrating linked item "${referencedCodename}" from "${sourceContentType.codename}" to "${targetContentType.codename}"`);
        
        // Generate a shorter, cleaner codename for the migrated item
        const migratedCodename = `${referencedCodename}_migrated`;
        const languageId = await this.getLanguageId(sourceLanguage);
        
        // Step 4: Check if migrated version already exists
        console.log(`🔍 Checking if ${migratedCodename} already exists...`);
        let newMigratedItem: any;
        let itemAlreadyExisted = false;
        let shouldCreateVariant = true;
        
        try {
          // Check in Management API if item exists
          const existingItem = await this.managementClient
            .viewContentItem()
            .byItemCodename(migratedCodename)
            .toPromise();
          
          console.log(`✅ Migrated version already exists: ${migratedCodename}`);
          newMigratedItem = existingItem;
          itemAlreadyExisted = true;
          
          // Check if the language variant already exists for this item
          try {
            await this.managementClient
              .viewLanguageVariant()
              .byItemCodename(migratedCodename)
              .byLanguageId(languageId)
              .toPromise();
            
            console.log(`⚠️ Language variant already exists for ${migratedCodename} in ${sourceLanguage}. Skipping variant creation...`);
            shouldCreateVariant = false;
            
            // Register that this item and variant already existed
            this.createdItemsRegistry.push({
              originalCodename: referencedCodename,
              originalName: referencedItem.data.item.system.name,
              originalType: sourceContentType.codename,
              newCodename: migratedCodename,
              newName: existingItem.data.name,
              newType: targetContentType.codename,
              newId: existingItem.data.id,
              wasAutoMigrated: true,
              alreadyExisted: true,
            });
            
            return migratedCodename;
          } catch (variantError: any) {
            // Variant doesn't exist, we should create it
            console.log(`→ Language variant doesn't exist yet for ${sourceLanguage}. Will create it...`);
          }
        } catch (notFoundError: unknown) {
          // Migrated version doesn't exist, create it
          console.log(`🔨 Creating new migrated item: ${migratedCodename}`, notFoundError instanceof Error ? notFoundError.message : 'Item not found');
          
          // Step 5: Create the new migrated content item
          newMigratedItem = await this.managementClient
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
          itemAlreadyExisted = false;
        }
        
        // Only create variant if it doesn't already exist
        if (shouldCreateVariant) {
          console.log(`🔧 Creating language variant for migrated item in "${sourceLanguage}"...`);
          console.log(`📋 Copying content from available language: "${actualLanguage}"`);
          
          // NOTE: We do NOT add parent references here because the parent items may not exist yet.
          // References will be updated later in the "Update references" phase after ALL items are migrated.
          console.log(`⏭️ Skipping parent references during initial creation - will be added in reference update phase`);
          
          // Get language ID for the REQUESTED language (where we want to create the variant)
          const targetLanguageId = await this.getLanguageId(sourceLanguage);
          
          const migratedVariant = await this.managementClient
            .upsertLanguageVariant()
            .byItemId(newMigratedItem.data.id)
            .byLanguageId(targetLanguageId)
            .withData((builder: any) => {
              const elements = [];
              
              // Copy the name from original item
              const originalName = referencedItem.data.item.elements.name?.value || referencedItem.data.item.system.name;
              elements.push(builder.textElement({
                element: { codename: 'name' },
                value: originalName
              }));
              
              // Do NOT add parent references here - they will be added in the reference update phase
              // This prevents errors when the parent items haven't been created yet
              
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
            wasAutoMigrated: true,
            alreadyExisted: itemAlreadyExisted,
          });
        }
        
        return migratedCodename;
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
   * Get language variant with fallback to default language if not found
   * Returns null variant if not found in either language (for graceful skipping)
   */
  private async getLanguageVariantWithFallback(
    itemCodename: string,
    languageCodename: string
  ): Promise<{ variant: any | null; actualLanguage: string }> {
    try {
      const variant = await this.managementClient
        .viewLanguageVariant()
        .byItemCodename(itemCodename)
        .byLanguageCodename(languageCodename)
        .toPromise();
      
      return { variant, actualLanguage: languageCodename };
    } catch (error: any) {
      // Check if it's a 404 error (variant not found)
      const is404 = error?.response?.status === 404 || 
                    error?.status === 404 || 
                    error?.code === 'ERR_BAD_REQUEST' ||
                    (error?.message && (error.message.includes('404') || error.message.includes('not found')));
      
      if (is404) {
        console.warn(`⚠️ Language variant "${languageCodename}" not found for item "${itemCodename}". Trying default language...`);
        
        try {
          // Try to get default language variant
          const variant = await this.managementClient
            .viewLanguageVariant()
            .byItemCodename(itemCodename)
            .byLanguageId('00000000-0000-0000-0000-000000000000')
            .toPromise();
          
          console.log(`✅ Using default language variant instead`);
          return { variant, actualLanguage: 'default' };
        } catch (defaultError) {
          // Item doesn't exist in migration language or default - skip with warning
          console.warn(`⚠️ Item "${itemCodename}" not found in language "${languageCodename}" or default. Skipping...`);
          return { variant: null, actualLanguage: 'not_found' };
        }
      } else {
        // Re-throw non-404 errors
        throw error;
      }
    }
  }

  /**
   * Update a modular content field reference in a language variant
   */

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

      // Step 4: Get current language variant with fallback to default
      let { variant, actualLanguage } = await this.getLanguageVariantWithFallback(itemCodename, languageCodename);

      // Skip if variant not found in any language
      if (!variant) {
        console.warn(`⚠️ Skipping reference update - item "${itemCodename}" not found in "${languageCodename}" or default language`);
        return { success: false, error: 'Item not found in migration language' };
      }

      if (!variant.data) {
        throw new Error(`Language variant not found for ${itemCodename} in ${actualLanguage}`);
      }

      // If variant doesn't exist in the requested language, create it first
      if (actualLanguage !== languageCodename) {
        console.warn(`⚠️ Item "${itemCodename}" only exists in ${actualLanguage}, not in ${languageCodename}`);
        console.log(`📝 Creating language variant in ${languageCodename} before updating reference...`);
        
        try {
          // Get the language ID for the migration language
          const targetLanguageId = await this.getLanguageId(languageCodename);
          
          // Get the item ID
          const item = await this.managementClient
            .viewContentItem()
            .byItemCodename(itemCodename)
            .toPromise();
          
          // Create an empty variant in the target language by copying the default variant
          const defaultVariant = variant.data;
          const elementsToCreate: any[] = [];
          
          // Copy elements from default variant
          for (const element of defaultVariant.elements) {
            elementsToCreate.push({
              element: { id: element.element.id },
              value: element.value
            });
          }
          
          // Create the new language variant
          await this.managementClient
            .upsertLanguageVariant()
            .byItemId(item.data.id)
            .byLanguageId(targetLanguageId)
            .withData(() => ({
              elements: elementsToCreate
            }))
            .toPromise();
          
          console.log(`✅ Created language variant in ${languageCodename} for item ${itemCodename}`);
          
          // Now get the newly created variant
          variant = await this.managementClient
            .viewLanguageVariant()
            .byItemCodename(itemCodename)
            .byLanguageCodename(languageCodename)
            .toPromise();
          
          actualLanguage = languageCodename;
          
        } catch (createError) {
          const errorMsg = createError instanceof Error ? createError.message : 'Unknown error';
          console.error(`❌ Failed to create language variant: ${errorMsg}`);
          return { 
            success: false, 
            error: `Failed to create language variant in ${languageCodename}: ${errorMsg}` 
          };
        }
      }

      console.log(`📝 Working with language variant: ${actualLanguage}`);

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

      // Step 6.5: Get the ID of the new item (by codename)
      let newItemId: string;
      try {
        const newItem = await this.managementClient
          .viewContentItem()
          .byItemCodename(newReference)
          .toPromise();
        newItemId = newItem.data.id;
        console.log(`🔍 New item ${newReference} has ID: ${newItemId}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`Could not find new item ${newReference}: ${errorMsg}`);
      }

      // Step 7: Update the value - replace old reference ID with new one
      let updatedValue = fieldElement.value;
      
      if (Array.isArray(fieldElement.value)) {
        // For modular_content fields (array of reference objects with IDs)
        updatedValue = fieldElement.value.map((ref: any) => {
          // The value might be an object with id, or just a string
          const refId = typeof ref === 'object' && ref.id ? ref.id : ref;
          
          if (refId === oldItemId) {
            return { id: newItemId };  // Use the new item's ID
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
      // IMPORTANT: Always use the TARGET language (languageCodename), not actualLanguage
      // because we just created the variant in that language
      try {
        // Try to create a new version (this will fail if already in draft)
        await this.managementClient
          .createNewVersionOfLanguageVariant()
          .byItemCodename(itemCodename)
          .byLanguageCodename(languageCodename) // Use target language
          .toPromise();
        console.log(`📝 Created new draft version of ${itemCodename} in ${languageCodename}`);
      } catch (err) {
        // Item is already in draft state, or error creating version
        const errMsg = err instanceof Error ? err.message : 'Unknown';
        console.log(`ℹ️  Item already in draft state or error creating version in ${languageCodename}: ${errMsg}, continuing...`);
      }

      // Step 9: Update the language variant - ONLY send the element we're updating
      // The Management API allows partial updates, we don't need to send all elements
      // IMPORTANT: Use languageCodename (target language) to ensure we update the correct variant
      await this.managementClient
        .upsertLanguageVariant()
        .byItemCodename(itemCodename)
        .byLanguageCodename(languageCodename) // Use target language, not actualLanguage
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

      console.log(`✅ Successfully updated reference in ${itemCodename} language variant: ${languageCodename} (item is now in draft state)`);
      
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

      // Step 1: Get current language variant with fallback to default
      const { variant, actualLanguage } = await this.getLanguageVariantWithFallback(itemCodename, languageCodename);

      // Skip if variant not found in any language
      if (!variant) {
        console.warn(`⚠️ Skipping multiple reference updates - item "${itemCodename}" not found in "${languageCodename}" or default language`);
        return { 
          success: false, 
          updatedFields: 0,
          error: 'Item not found in migration language' 
        };
      }

      if (!variant.data) {
        throw new Error(`Language variant not found for ${itemCodename} in ${actualLanguage}`);
      }

      // IMPORTANT: Only update if variant is in the requested language
      if (actualLanguage !== languageCodename) {
        console.warn(`⏭️ Skipping reference updates in "${itemCodename}" - item only exists in ${actualLanguage}, not in ${languageCodename}`);
        return { 
          success: false, 
          updatedFields: 0,
          error: `Item only exists in ${actualLanguage}, not in migration language ${languageCodename}` 
        };
      }

      console.log(`📝 Working with language variant: ${actualLanguage}`);

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
        .byLanguageCodename(actualLanguage)
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

  /**
   * Publish a language variant (move from draft to published workflow step)
   * @param itemId - Item ID
   * @param languageCodename - Language codename
   * @param log - Optional logging function
   * @returns Promise with success status
   */
  async publishLanguageVariant(
    itemId: string,
    languageCodename: string,
    log?: (level: 'info' | 'success' | 'error' | 'warning', message: string, details?: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    try {
      const actualLanguage = languageCodename || 'default';
      
      log?.('info', `📤 Publishing item ${itemId} in ${actualLanguage}...`);

      // Get the workflow step ID for "Published" status
      const workflowsResponse = await this.managementClient
        .listWorkflows()
        .toPromise();

      // Find the default workflow
      const defaultWorkflow = workflowsResponse.data.find((w: any) => w.name === 'Default');
      
      if (!defaultWorkflow) {
        throw new Error('Default workflow not found');
      }

      // Find the "Published" step (usually the last step)
      const publishedStep = defaultWorkflow.publishedStep;
      
      if (!publishedStep) {
        throw new Error('Published step not found in workflow');
      }

      log?.('info', `  → Moving to published step: ${publishedStep.name} (${publishedStep.codename})`);

      // Items created during migration are already in Draft state, 
      // so we can publish them directly without creating a new version
      await this.managementClient
        .publishLanguageVariant()
        .byItemId(itemId)
        .byLanguageCodename(actualLanguage)
        .withoutData()
        .toPromise();

      log?.('success', `✅ Successfully published item ${itemId}`);

      return { success: true };

    } catch (error) {
      // Get detailed error message from Axios error
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object') {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error_code) {
          errorMessage = `Error ${axiosError.response.data.error_code}: ${axiosError.response.data.message || 'API Error'}`;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      log?.('error', `❌ Failed to publish item ${itemId}`, errorMessage);
      console.error(`Failed to publish item ${itemId}:`, errorMessage, error);
      
      return { 
        success: false,
        error: errorMessage 
      };
    }
  }

  /**
   * Publish multiple items in batches
   * @param items - Array of items to publish (with id and language)
   * @param log - Optional logging function
   * @returns Promise with results
   */
  async publishItemsBatch(
    items: Array<{ id: string; language: string; name: string }>,
    log?: (level: 'info' | 'success' | 'error' | 'warning', message: string, details?: string) => void
  ): Promise<{ published: number; failed: number; errors: string[] }> {
    const results = {
      published: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const item of items) {
      const result = await this.publishLanguageVariant(item.id, item.language, log);
      
      if (result.success) {
        results.published++;
      } else {
        results.failed++;
        results.errors.push(`${item.name}: ${result.error || 'Unknown error'}`);
      }
    }

    return results;
  }
}

// Export singleton instance
export const kontentServiceFixed = new KontentServiceFixed();