import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface RelationshipInfo {
  fieldName: string;
  fieldType: string;
  relatedItems: {
    id: string;
    name: string;
    codename: string;
    type: string;
    url?: string;
  }[];
}

interface IncomingRelationship {
  fromItemId: string;
  fromItemName: string;
  fromItemCodename: string;
  fromItemType: string;
  fromItemCollection?: string; // Collection ID of the referencing item
  fromItemLanguageVariantId?: string; // Language variant ID for building correct URLs
  fieldName: string;
  fromItemUrl?: string;
  language?: string; // Language where this item exists
  needsLanguageVariant?: boolean; // True if language variant needs to be created
}

interface ItemRelationship {
  itemId: string;
  itemName: string;
  itemCodename: string;
  itemType: string;
  itemUrl?: string;
  outgoingRelationships: RelationshipInfo[];
  incomingRelationships: IncomingRelationship[];
}

interface ItemRelationshipsViewerProps {
  selectedItems: any[];
  selectedLanguage: string;
  onContinue: (data: { updateIncomingReferences: boolean; relationships: ItemRelationship[] }) => void;
  onBack: () => void;
}

export function ItemRelationshipsViewer({
  selectedItems,
  selectedLanguage,
  onContinue,
  onBack,
}: Readonly<ItemRelationshipsViewerProps>) {
  const [relationships, setRelationships] = useState<ItemRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [updateIncomingReferences, setUpdateIncomingReferences] = useState(false);

  useEffect(() => {
    async function loadRelationships() {
      setLoading(true);
      const itemRelationships: ItemRelationship[] = [];

      for (const item of selectedItems) {
        try {
          // Get outgoing relationships (items this item points to)
          // IMPORTANT: Include language parameter to get the correct variant
          const response = await fetch(
            `https://deliver.kontent.ai/${import.meta.env.VITE_KONTENT_PROJECT_ID}/items/${item.codename}?depth=1&language=${selectedLanguage}`,
            {
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_KONTENT_PREVIEW_API_KEY}`,
              },
            }
          );

          if (!response.ok) {
            console.error(`Failed to fetch item ${item.codename}:`, response.status);
            continue;
          }

          const data = await response.json();
          const itemData = data.item;
          const modularContent = data.modular_content || {};

          const outgoingRels: RelationshipInfo[] = [];
          const incomingRels: IncomingRelationship[] = [];

          // Analyze each element to find outgoing relationships
          Object.entries(itemData.elements).forEach(([_, element]: [string, any]) => {
            if (element.type === 'modular_content' && element.value && element.value.length > 0) {
              const relatedItems = element.value.map((codename: string) => {
                const relatedItem = modularContent[codename];
                const itemId = relatedItem?.system?.id || 'unknown';
                return {
                  id: itemId,
                  name: relatedItem?.system?.name || codename,
                  codename: codename,
                  type: relatedItem?.system?.type || 'unknown',
                  url: itemId !== 'unknown' ? getKontentItemUrl(itemId, selectedLanguage) : undefined,
                };
              });

              outgoingRels.push({
                fieldName: element.name,
                fieldType: element.type,
                relatedItems,
              });
            }
          });

          // Use Delivery API's itemUsedIn endpoint to find ALL items that reference this item
          // IMPORTANT: We don't filter by language here because we want to find ALL references
          // The migration process will create language variants if needed
          try {
            console.log(`🔍 Searching for items using: ${item.codename} in ANY language (will check ${selectedLanguage})`);
            
            // Don't filter by language - we want to find all items that reference this item
            const usedInUrl = `https://deliver.kontent.ai/${import.meta.env.VITE_KONTENT_PROJECT_ID}/items/${item.codename}/used-in`;
            const usedInResponse = await fetch(usedInUrl, {
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_KONTENT_PREVIEW_API_KEY}`,
                'Accept': 'application/json',
              },
            });

            if (!usedInResponse.ok) {
              throw new Error(`Failed to fetch used-in: ${usedInResponse.status}`);
            }

            const usedInData = await usedInResponse.json();
            const usedInItems = usedInData.items || [];

            console.log(`✅ Found ${usedInItems.length} items using ${item.codename} in any language`);

            for (const usedInItem of usedInItems) {
              // Fetch the item details to get element information
              // Try to get it in the migration language first, then fall back to any language
              try {
                // First, try to get the item in the selected language
                let detailResponse = await fetch(
                  `https://deliver.kontent.ai/${import.meta.env.VITE_KONTENT_PROJECT_ID}/items/${usedInItem.system.codename}?depth=0&language=${selectedLanguage}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${import.meta.env.VITE_KONTENT_PREVIEW_API_KEY}`,
                    },
                  }
                );

                // If not found in selected language, try default language
                if (!detailResponse.ok && detailResponse.status === 404) {
                  console.log(`⚠️ Item ${usedInItem.system.codename} not in ${selectedLanguage}, trying default language...`);
                  detailResponse = await fetch(
                    `https://deliver.kontent.ai/${import.meta.env.VITE_KONTENT_PROJECT_ID}/items/${usedInItem.system.codename}?depth=0`,
                    {
                      headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_KONTENT_PREVIEW_API_KEY}`,
                      },
                    }
                  );
                }

                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  const itemLanguage = detailData.item.system.language;
                  
                  // Log if item exists in different language
                  if (itemLanguage !== selectedLanguage) {
                    console.log(`📝 Item ${usedInItem.system.codename} exists in ${itemLanguage}, will create variant in ${selectedLanguage} during migration`);
                  }
                  
                  // Get the language variant ID from Management API for correct URL construction
                  let languageVariantId: string | undefined;
                  try {
                    const variantResponse = await fetch(
                      `https://manage.kontent.ai/v2/projects/${import.meta.env.VITE_KONTENT_PROJECT_ID}/items/codename/${usedInItem.system.codename}/variants/codename/${itemLanguage}`,
                      {
                        headers: {
                          'Authorization': `Bearer ${import.meta.env.VITE_KONTENT_MANAGEMENT_API_KEY}`,
                          'Content-Type': 'application/json',
                        },
                      }
                    );
                    
                    if (variantResponse.ok) {
                      const variantData = await variantResponse.json();
                      languageVariantId = variantData.item?.id;
                    }
                  } catch (variantError) {
                    console.log(`Could not fetch variant ID for ${usedInItem.system.codename}:`, variantError);
                  }
                  
                  // Find which field contains the reference
                  Object.entries(detailData.item.elements || {}).forEach(([elementCodename, element]: [string, any]) => {
                    if (element.type === 'modular_content' && element.value && Array.isArray(element.value)) {
                      if (element.value.includes(item.codename)) {
                        incomingRels.push({
                          fromItemId: usedInItem.system.id,
                          fromItemName: usedInItem.system.name,
                          fromItemCodename: usedInItem.system.codename,
                          fromItemType: usedInItem.system.type,
                          fromItemCollection: usedInItem.system.collection || 'default', // Capture collection ID
                          fromItemLanguageVariantId: languageVariantId, // Capture variant ID for URL
                          fieldName: elementCodename, // Use the element codename, not the display name
                          fromItemUrl: getKontentItemUrl(usedInItem.system.id, selectedLanguage),
                          language: itemLanguage, // Store the language where this item exists
                          needsLanguageVariant: itemLanguage !== selectedLanguage, // Flag if variant needs to be created
                        });
                      }
                    }
                  });
                } else if (detailResponse.status === 404) {
                  console.log(`⚠️ Item ${usedInItem.system.codename} doesn't exist in any accessible language`);
                }
              } catch (detailError) {
                console.log(`Could not fetch details for ${usedInItem.system.codename}:`, detailError);
              }
            }
          } catch (usedInError) {
            console.log(`Could not fetch used-in data for ${item.codename}:`, usedInError);
          }

          console.log(`📊 ${item.codename}: ${outgoingRels.length} outgoing, ${incomingRels.length} incoming`);

          if (outgoingRels.length > 0 || incomingRels.length > 0) {
            itemRelationships.push({
              itemId: item.id,
              itemName: item.name,
              itemCodename: item.codename,
              itemType: item.type || 'unknown',
              itemUrl: getKontentItemUrl(item.id, selectedLanguage),
              outgoingRelationships: outgoingRels,
              incomingRelationships: incomingRels,
            });
          }
        } catch (error) {
          console.error(`Error loading relationships for ${item.name}:`, error);
        }
      }

      setRelationships(itemRelationships);
      setLoading(false);
    }

    loadRelationships();
  }, [selectedItems, selectedLanguage]); // Re-run when items or language changes

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const totalRelationships = relationships.reduce(
    (sum, item) => sum + item.outgoingRelationships.length + item.incomingRelationships.length,
    0
  );

  // Helper function to get language flag
  const getLanguageFlag = (languageCode: string): string => {
    const languageFlags: Record<string, string> = {
      'en': '🇬🇧',
      'de': '🇩🇪',
      'es': '🇪🇸',
      'zh': '🇨🇳',
      'default': '🌐'
    };
    return languageFlags[languageCode] || languageFlags['default'];
  };

  // Helper function to generate Kontent.ai app URL for an item
  const getKontentItemUrl = (itemId: string, languageCodename: string): string => {
    const projectId = import.meta.env.VITE_KONTENT_PROJECT_ID;
    return `https://app.kontent.ai/goto/edit-item/project/${projectId}/variant-codename/${languageCodename}/item/${itemId}`;
  };

  // Function to export relationships to Excel
  const exportToExcel = () => {
    // Create data for Excel
    const excelData: any[] = [];

    // Add header information
    excelData.push({
      'Item Name': 'MIGRATION RELATIONSHIPS REPORT',
      'Item Codename': '',
      'Item Type': '',
      'Relationship Type': '',
      'Related Item Name': '',
      'Related Item Codename': '',
      'Related Item Type': '',
      'Field Name': '',
    });

    excelData.push({
      'Item Name': `Language: ${selectedLanguage} ${getLanguageFlag(selectedLanguage)}`,
      'Item Codename': '',
      'Item Type': '',
      'Relationship Type': '',
      'Related Item Name': '',
      'Related Item Codename': '',
      'Related Item Type': '',
      'Field Name': '',
    });

    excelData.push({
      'Item Name': `Total Items: ${selectedItems.length}`,
      'Item Codename': `Items with Relationships: ${relationships.length}`,
      'Item Type': `Total Relationships: ${totalRelationships}`,
      'Relationship Type': '',
      'Related Item Name': '',
      'Related Item Codename': '',
      'Related Item Type': '',
      'Field Name': '',
    });

    excelData.push({}); // Empty row

    // Add column headers
    excelData.push({
      'Item Name': 'Item Name',
      'Item Codename': 'Item Codename',
      'Item Type': 'Item Type',
      'Item URL': 'Item URL',
      'Relationship Type': 'Relationship Type',
      'Related Item Name': 'Related Item Name',
      'Related Item Codename': 'Related Item Codename',
      'Related Item Type': 'Related Item Type',
      'Related Item URL': 'Related Item URL',
      'Field Name': 'Field Name',
    });

    // Add relationships data
    for (const itemRel of relationships) {
      // Add outgoing relationships
      for (const outgoing of itemRel.outgoingRelationships) {
        for (const relItem of outgoing.relatedItems) {
          excelData.push({
            'Item Name': itemRel.itemName,
            'Item Codename': itemRel.itemCodename,
            'Item Type': itemRel.itemType,
            'Item URL': itemRel.itemUrl || '',
            'Relationship Type': '→ Outgoing',
            'Related Item Name': relItem.name,
            'Related Item Codename': relItem.codename,
            'Related Item Type': relItem.type,
            'Related Item URL': relItem.url || '',
            'Field Name': outgoing.fieldName,
          });
        }
      }

      // Add incoming relationships
      for (const incoming of itemRel.incomingRelationships) {
        excelData.push({
          'Item Name': itemRel.itemName,
          'Item Codename': itemRel.itemCodename,
          'Item Type': itemRel.itemType,
          'Item URL': itemRel.itemUrl || '',
          'Relationship Type': '← Incoming',
          'Related Item Name': incoming.fromItemName,
          'Related Item Codename': incoming.fromItemCodename,
          'Related Item Type': incoming.fromItemType,
          'Related Item URL': incoming.fromItemUrl || '',
          'Field Name': incoming.fieldName,
        });
      }
    }

    // Add items without relationships
    excelData.push({}); // Empty row
    excelData.push({
      'Item Name': 'ITEMS WITHOUT RELATIONSHIPS',
      'Item Codename': '',
      'Item Type': '',
      'Relationship Type': '',
      'Related Item Name': '',
      'Related Item Codename': '',
      'Related Item Type': '',
      'Field Name': '',
    });

    for (const item of selectedItems) {
      if (!relationships.find(rel => rel.itemId === item.id)) {
        excelData.push({
          'Item Name': item.name,
          'Item Codename': item.codename,
          'Item Type': item.type || 'unknown',
          'Relationship Type': 'None',
          'Related Item Name': '',
          'Related Item Codename': '',
          'Related Item Type': '',
          'Field Name': '',
        });
      }
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relationships');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Item Name
      { wch: 30 }, // Item Codename
      { wch: 20 }, // Item Type
      { wch: 80 }, // Item URL
      { wch: 15 }, // Relationship Type
      { wch: 30 }, // Related Item Name
      { wch: 30 }, // Related Item Codename
      { wch: 20 }, // Related Item Type
      { wch: 80 }, // Related Item URL
      { wch: 25 }, // Field Name
    ];

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `migration-relationships-${selectedLanguage}-${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing item relationships...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              📊 Item Relationships Analysis
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              Review the relationships of selected items before migration. 
              This shows both outgoing and incoming relationships for your content.
            </p>
          </div>
          <button
            onClick={exportToExcel}
            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 whitespace-nowrap"
            title="Export relationships to Excel"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export to Excel</span>
          </button>
        </div>

        {/* Language Badge */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-2 flex items-center">
          <span className="text-2xl mr-3">{getLanguageFlag(selectedLanguage)}</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Migration Language: <span className="text-blue-700">{selectedLanguage.toUpperCase()}</span>
            </p>
            <p className="text-xs text-blue-700">
              All relationships and references will be analyzed and updated in this language variant.
            </p>
          </div>
        </div>

        <div className="bg-blue-100 border-l-4 border-blue-400 p-3 mt-2">
          <p className="text-xs text-blue-800">
            <strong>🔍 Deep Search:</strong> Scanning up to 15 content types (first 100 items each) to find incoming relationships. 
            This provides comprehensive relationship visibility while maintaining reasonable performance.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedItems.length}</div>
          <div className="text-sm text-gray-600">Selected Items</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{relationships.length}</div>
          <div className="text-sm text-gray-600">Items with Relationships</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{totalRelationships}</div>
          <div className="text-sm text-gray-600">Total Relationships</div>
        </div>
      </div>

      {/* Relationships List */}
      {relationships.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">✓ No relationships found. All selected items are independent.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Items with Relationships:</h4>
          
          {relationships.map((itemRel) => (
            <div
              key={itemRel.itemId}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Item Header */}
              <button
                className="w-full bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors text-left"
                onClick={() => toggleExpanded(itemRel.itemId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-xl">
                      {expandedItems.has(itemRel.itemId) ? '▼' : '▶'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-900">{itemRel.itemName}</div>
                        {itemRel.itemUrl && (
                          <a
                            href={itemRel.itemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Open in Kontent.ai"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{itemRel.itemCodename}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {itemRel.outgoingRelationships.length + itemRel.incomingRelationships.length} relationships
                  </div>
                </div>
              </button>

              {/* Relationships Details */}
              {expandedItems.has(itemRel.itemId) && (
                <div className="p-4 space-y-6 bg-white">
                  {/* Outgoing Relationships */}
                  {itemRel.outgoingRelationships.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="text-blue-600 mr-2">→</span>
                        Outgoing Relationships ({itemRel.outgoingRelationships.length})
                        <span className="ml-2 text-xs text-gray-500">(items this content references)</span>
                      </h4>
                      {itemRel.outgoingRelationships.map((rel, relIndex) => (
                        <div key={`out-${relIndex}`} className="border-l-4 border-blue-300 pl-4 mb-4">
                          <div className="font-medium text-gray-700 mb-2">
                            🔗 {rel.fieldName}
                            <span className="ml-2 text-xs text-gray-500">({rel.fieldType})</span>
                          </div>
                          <div className="space-y-2">
                            {rel.relatedItems.map((relItem, itemIndex) => (
                              <div
                                key={`out-item-${itemIndex}`}
                                className="bg-blue-50 border border-blue-200 rounded p-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <div className="font-medium text-blue-900">{relItem.name}</div>
                                      {relItem.url && (
                                        <a
                                          href={relItem.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 transition-colors"
                                          title="Open in Kontent.ai"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      )}
                                    </div>
                                    <div className="text-sm text-blue-700">{relItem.codename}</div>
                                  </div>
                                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Type: {relItem.type}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Incoming Relationships */}
                  {itemRel.incomingRelationships.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="text-green-600 mr-2">←</span>
                        Incoming Relationships ({itemRel.incomingRelationships.length})
                        <span className="ml-2 text-xs text-gray-500">(items referencing this content)</span>
                      </h4>
                      <div className="space-y-2">
                        {itemRel.incomingRelationships.map((incoming, incIndex) => (
                          <div
                            key={`inc-${incIndex}`}
                            className="bg-green-50 border border-green-200 rounded p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <div className="font-medium text-green-900">{incoming.fromItemName}</div>
                                  {incoming.fromItemUrl && (
                                    <a
                                      href={incoming.fromItemUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-800 transition-colors"
                                      title="Open in Kontent.ai"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                  {incoming.needsLanguageVariant && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                      🌐 Will create {selectedLanguage} variant
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-green-700">{incoming.fromItemCodename}</div>
                                <div className="text-xs text-green-600 mt-1">
                                  via field: <span className="font-medium">{incoming.fieldName}</span>
                                  {incoming.language && incoming.language !== selectedLanguage && (
                                    <span className="ml-2 text-amber-600">
                                      (currently in <strong>{incoming.language}</strong>)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Type: {incoming.fromItemType}
                                </div>
                                {incoming.language && (
                                  <div className={`text-xs px-2 py-1 rounded ${
                                    incoming.language === selectedLanguage 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    Lang: {incoming.language}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Items without relationships */}
      {selectedItems.length > relationships.length && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">
            ✓ Items without relationships ({selectedItems.length - relationships.length}):
          </h4>
          <div className="space-y-1">
            {selectedItems
              .filter(item => !relationships.find(rel => rel.itemId === item.id))
              .map(item => (
                <div key={item.id} className="text-sm text-green-700">
                  • {item.name} <span className="text-green-600">({item.codename})</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Update References Option */}
      {relationships.some(rel => rel.incomingRelationships.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="updateReferences"
              checked={updateIncomingReferences}
              onChange={(e) => setUpdateIncomingReferences(e.target.checked)}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <div className="flex-1">
              <label htmlFor="updateReferences" className="font-semibold text-yellow-900 cursor-pointer block mb-2">
                🔄 Update incoming references after migration
              </label>
              <p className="text-sm text-yellow-800 mb-3">
                When enabled, items that reference the migrated content will be automatically updated 
                to point to the new migrated item with the new content type.
              </p>
              
              {updateIncomingReferences && (
                <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 rounded">
                  <p className="text-sm font-medium text-yellow-900 mb-2">⚠️ What will happen:</p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>The original item will be migrated to the new content type</li>
                    <li>A new item with the new content type will be created</li>
                    <li>All incoming references will be updated to point to the new item</li>
                    <li>The original item will remain unchanged (unless you delete it manually)</li>
                  </ul>
                  <p className="text-xs text-yellow-700 mt-2 italic">
                    Total items to update: {relationships.reduce((sum, rel) => sum + rel.incomingRelationships.length, 0)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Item Selection
        </button>
        <button
          onClick={() => onContinue({ updateIncomingReferences, relationships })}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Migration →
        </button>
      </div>
    </div>
  );
}
