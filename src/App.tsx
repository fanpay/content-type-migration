import { useState, useCallback } from 'react';
import { ContentTypeSelector } from './components/ContentTypeSelector';
import { FieldMappingEditor } from './components/FieldMappingEditor';
import { ContentItemList } from './components/ContentItemList';
import { ConnectionStatus } from './components/ConnectionStatus';
import { DryRunPreview } from './components/DryRunPreview';
import { DebugPanel } from './components/DebugPanel';
import { MigrationResultsModal } from './components/MigrationResultsModal';
import { ItemRelationshipsViewer } from './components/ItemRelationshipsViewer';
import { MigrationLogger, LogEntry } from './components/MigrationLogger';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { BatchPublisher } from './components/BatchPublisher';
import { useContentTypes } from './hooks/useKontentData';
import { useMigration } from './hooks/useMigration';
import { ContentTypeInfo } from './types';
import { kontentServiceFixed } from './services/kontentServiceFixed';
import * as XLSX from 'xlsx';

// Helper function to get language flag
const getLanguageFlag = (languageCode: string): string => {
  const languageFlags: Record<string, string> = {
    'en': '🇬🇧',
    'de': '🇩🇪',
    'es': '🇪🇸',
    'zh': '🇨🇳'
  };
  return languageFlags[languageCode] || '🌐';
};

// Helper function to download file
const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function App() {
  const [step, setStep] = useState(1);
  const [sourceContentType, setSourceContentType] = useState<ContentTypeInfo | undefined>();
  const [targetContentType, setTargetContentType] = useState<ContentTypeInfo | undefined>();
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showDryRun, setShowDryRun] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [updateIncomingReferences, setUpdateIncomingReferences] = useState(false);
  const [itemRelationships, setItemRelationships] = useState<any[]>([]);
  const [migrationLogs, setMigrationLogs] = useState<LogEntry[]>([]);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [currentMigrationStep, setCurrentMigrationStep] = useState<string>('');
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [updatedReferenceItems, setUpdatedReferenceItems] = useState<Set<string>>(new Set());
  
  const { contentTypes, isLoading: typesLoading, error: typesError } = useContentTypes();
  const { 
    migrationConfig, 
    initializeMigration, 
    updateFieldMapping, 
    resetMigration 
  } = useMigration();

  // Logger helper function
  const addLog = useCallback((level: LogEntry['level'], message: string, details?: string) => {
    setMigrationLogs(prev => [...prev, {
      timestamp: new Date(),
      level,
      message,
      details
    }]);
  }, []);

  const handleSourceTypeSelect = (contentType: ContentTypeInfo) => {
    setSourceContentType(contentType);
    if (targetContentType) {
      initializeMigration(contentType, targetContentType);
      setStep(2);
    }
  };

  const handleTargetTypeSelect = (contentType: ContentTypeInfo) => {
    setTargetContentType(contentType);
    if (sourceContentType) {
      initializeMigration(sourceContentType, contentType);
      setStep(2);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSourceContentType(undefined);
    setTargetContentType(undefined);
    setSelectedItems([]);
    resetMigration();
  };

  const handleNextToItemSelection = () => {
    console.log('🚀 Navigating to step 3 - Item Selection');
    setStep(3);
  };

  const handleItemsSelected = useCallback((items: any[]) => {
    console.log('📝 Items selected:', items.length, 'items');
    setSelectedItems(items);
    // Don't automatically advance to step 4
  }, []);

  const handleContinueToExecution = () => {
    console.log('🎯 Continuing to relationships view with', selectedItems.length, 'items');
    setStep(4);
  };

  const handleContinueToMigration = (data: { updateIncomingReferences: boolean; relationships: any[] }) => {
    console.log('🚀 Moving to migration execution');
    console.log('📊 Update incoming references:', data.updateIncomingReferences);
    console.log('📊 Relationships received:', data.relationships.length);
    console.log('📊 Full relationships data:', data.relationships);
    setUpdateIncomingReferences(data.updateIncomingReferences);
    setItemRelationships(data.relationships);
    console.log('✅ itemRelationships state updated');
    setStep(5);
  };

  const handleBackToRelationships = () => {
    setStep(4);
  };

  // Generate detailed migration report in JSON format
  const generateJSONReport = () => {
    const report = {
      migrationSummary: {
        timestamp: new Date().toISOString(),
        sourceContentType: sourceContentType?.name || 'Unknown',
        sourceContentTypeCodename: sourceContentType?.codename || 'unknown',
        targetContentType: targetContentType?.name || 'Unknown',
        targetContentTypeCodename: targetContentType?.codename || 'unknown',
        language: selectedLanguage,
        languageFlag: getLanguageFlag(selectedLanguage),
        totalItemsProcessed: migrationResults.length,
        successfulMigrations: migrationResults.filter(r => r.status === 'success').length,
        failedMigrations: migrationResults.filter(r => r.status === 'error').length,
        updateIncomingReferences: updateIncomingReferences,
        totalIncomingReferencesUpdated: updateIncomingReferences && Array.isArray(itemRelationships)
          ? itemRelationships.reduce((sum, rel) => {
              return sum + (Array.isArray(rel.incomingRelationships) ? rel.incomingRelationships.length : 0);
            }, 0)
          : 0,
      },
      fieldMappings: migrationConfig?.fieldMappings.filter(m => m.targetField).map(m => ({
        sourceField: m.sourceField.name,
        sourceFieldCodename: m.sourceField.codename,
        sourceFieldType: m.sourceField.type,
        targetField: m.targetField?.name || 'N/A',
        targetFieldCodename: m.targetField?.codename || 'N/A',
        targetFieldType: m.targetField?.type || 'N/A',
        transformationNeeded: m.transformationNeeded,
        warnings: Array.isArray(m.warnings) ? m.warnings : [],
      })),
      migratedItems: migrationResults.map(result => ({
        sourceItem: {
          id: result.sourceItem.id,
          name: result.sourceItem.name,
          codename: result.sourceItem.codename,
        },
        status: result.status,
        newItemId: result.newItemId,
        message: result.message,
        timestamp: result.timestamp.toISOString(),
        createdItems: result.createdItems?.map((item: any) => ({
          originalCodename: item.originalCodename,
          originalName: item.originalName,
          originalType: item.originalType,
          newCodename: item.newCodename,
          newName: item.newName,
          newType: item.newType,
          newId: item.newId,
          wasAutoMigrated: item.wasAutoMigrated,
          alreadyExisted: item.alreadyExisted,
        })) || [],
      })),
      relationships: updateIncomingReferences && Array.isArray(itemRelationships) ? itemRelationships.map(rel => ({
        itemId: rel.itemId,
        itemName: rel.itemName,
        itemCodename: rel.itemCodename,
        incomingReferences: Array.isArray(rel.incomingRelationships) ? rel.incomingRelationships.map((ref: any) => ({
          fromItemName: ref.fromItemName,
          fromItemCodename: ref.fromItemCodename,
          fromItemType: ref.fromItemType,
          fieldName: ref.fieldName,
        })) : [],
      })) : [],
      logs: migrationLogs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        details: log.details,
      })),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `migration-report-${timestamp}.json`;
    downloadFile(JSON.stringify(report, null, 2), filename, 'application/json');
  };

  // Generate human-readable migration report in text format
  const generateTextReport = () => {
    const successCount = migrationResults.filter(r => r.status === 'success').length;
    const errorCount = migrationResults.filter(r => r.status === 'error').length;
    
    let report = '';
    report += '═══════════════════════════════════════════════════════════\n';
    report += '           KONTENT.AI CONTENT TYPE MIGRATION REPORT\n';
    report += '═══════════════════════════════════════════════════════════\n\n';
    
    report += `📅 Date: ${new Date().toLocaleString()}\n`;
    report += `${getLanguageFlag(selectedLanguage)} Language: ${selectedLanguage.toUpperCase()}\n\n`;
    
    report += '───────────────────────────────────────────────────────────\n';
    report += ' MIGRATION SUMMARY\n';
    report += '───────────────────────────────────────────────────────────\n';
    report += `Source Content Type: ${sourceContentType?.name} (${sourceContentType?.codename})\n`;
    report += `Target Content Type: ${targetContentType?.name} (${targetContentType?.codename})\n`;
    report += `Total Items Processed: ${migrationResults.length}\n`;
    report += `✅ Successful: ${successCount}\n`;
    report += `❌ Failed: ${errorCount}\n`;
    report += `Update Incoming References: ${updateIncomingReferences ? 'Yes' : 'No'}\n`;
    
    if (updateIncomingReferences && Array.isArray(itemRelationships)) {
      const totalRefs = itemRelationships.reduce((sum, rel) => {
        return sum + (Array.isArray(rel.incomingRelationships) ? rel.incomingRelationships.length : 0);
      }, 0);
      report += `Total Incoming References: ${totalRefs}\n`;
    }
    
    report += '\n───────────────────────────────────────────────────────────\n';
    report += ' FIELD MAPPINGS\n';
    report += '───────────────────────────────────────────────────────────\n';
    migrationConfig?.fieldMappings.filter(m => m.targetField).forEach(m => {
      report += `• ${m.sourceField.name} (${m.sourceField.type}) → ${m.targetField?.name} (${m.targetField?.type})\n`;
      if (m.transformationNeeded) {
        report += `  ⚠️ Transformation needed\n`;
      }
      if (m.warnings && Array.isArray(m.warnings) && m.warnings.length > 0) {
        m.warnings.forEach(w => report += `  ⚠️ ${w}\n`);
      }
    });
    
    report += '\n───────────────────────────────────────────────────────────\n';
    report += ' MIGRATED ITEMS DETAILS\n';
    report += '───────────────────────────────────────────────────────────\n\n';
    
    migrationResults.forEach((result, index) => {
      report += `${index + 1}. ${result.sourceItem.name}\n`;
      report += `   Codename: ${result.sourceItem.codename}\n`;
      report += `   Status: ${result.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}\n`;
      report += `   Message: ${result.message}\n`;
      if (result.newItemId) {
        report += `   New Item ID: ${result.newItemId}\n`;
      }
      report += `   Completed: ${result.timestamp.toLocaleString()}\n`;
      
      if (result.createdItems && result.createdItems.length > 0) {
        report += `\n   📋 Created Items (${result.createdItems.length} total):\n`;
        
        // Main items
        const mainItems = result.createdItems.filter((item: any) => !item.wasAutoMigrated);
        if (mainItems.length > 0) {
          report += `\n   🎯 Main Item:\n`;
          mainItems.forEach((item: any) => {
            report += `      • ${item.newName}\n`;
            report += `        Original: [${item.originalType}] ${item.originalCodename}\n`;
            report += `        New: [${item.newType}] ${item.newCodename}\n`;
            report += `        ID: ${item.newId}\n`;
            if (item.alreadyExisted) {
              report += `        ⚠️ Status: Already existed (skipped)\n`;
            }
          });
        }
        
        // Auto-migrated items
        const autoItems = result.createdItems.filter((item: any) => item.wasAutoMigrated);
        if (autoItems.length > 0) {
          report += `\n   🔗 Auto-Migrated Linked Items (${autoItems.length}):\n`;
          autoItems.forEach((item: any) => {
            report += `      • ${item.newName}\n`;
            report += `        Original: [${item.originalType}] ${item.originalCodename}\n`;
            report += `        New: [${item.newType}] ${item.newCodename}\n`;
            report += `        ID: ${item.newId}\n`;
            if (item.alreadyExisted) {
              report += `        ⚠️ Status: Already existed (skipped)\n`;
            }
          });
        }
      }
      report += '\n';
    });
    
    if (updateIncomingReferences && Array.isArray(itemRelationships) && itemRelationships.length > 0) {
      report += '───────────────────────────────────────────────────────────\n';
      report += ' INCOMING REFERENCES UPDATED\n';
      report += '───────────────────────────────────────────────────────────\n\n';
      
      itemRelationships.forEach(rel => {
        if (rel.incomingRelationships && Array.isArray(rel.incomingRelationships) && rel.incomingRelationships.length > 0) {
          report += `Item: ${rel.itemName} (${rel.itemCodename})\n`;
          report += `References updated: ${rel.incomingRelationships.length}\n`;
          rel.incomingRelationships.forEach((ref: any) => {
            report += `  • From: ${ref.fromItemName} [${ref.fromItemType}]\n`;
            report += `    Field: ${ref.fieldName}\n`;
          });
          report += '\n';
        }
      });
    }
    
    report += '───────────────────────────────────────────────────────────\n';
    report += ' MIGRATION LOGS\n';
    report += '───────────────────────────────────────────────────────────\n\n';
    
    migrationLogs.forEach(log => {
      const level = log.level === 'success' ? '✅' : log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : 'ℹ️';
      report += `[${log.timestamp.toLocaleTimeString()}] ${level} ${log.message}\n`;
      if (log.details) {
        report += `   ${log.details}\n`;
      }
    });
    
    report += '\n═══════════════════════════════════════════════════════════\n';
    report += '                    END OF REPORT\n';
    report += '═══════════════════════════════════════════════════════════\n';
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `migration-report-${timestamp}.txt`;
    downloadFile(report, filename, 'text/plain');
  };

  // Generate Excel report with multiple sheets
  const generateExcelReport = () => {
    console.log('📊 Generating Excel report...');
    
    const successCount = migrationResults.filter(r => r.status === 'success').length;
    const errorCount = migrationResults.filter(r => r.status === 'error').length;
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const summaryData = [
      ['KONTENT.AI CONTENT TYPE MIGRATION REPORT'],
      [],
      ['Date:', new Date().toLocaleString()],
      ['Language:', `${getLanguageFlag(selectedLanguage)} ${selectedLanguage.toUpperCase()}`],
      [],
      ['MIGRATION SUMMARY'],
      ['Source Content Type:', sourceContentType?.name || 'Unknown', `(${sourceContentType?.codename || 'unknown'})`],
      ['Target Content Type:', targetContentType?.name || 'Unknown', `(${targetContentType?.codename || 'unknown'})`],
      ['Total Items Processed:', migrationResults.length],
      ['Successful Migrations:', successCount],
      ['Failed Migrations:', errorCount],
      ['Update Incoming References:', updateIncomingReferences ? 'Yes' : 'No'],
    ];
    
    if (updateIncomingReferences && Array.isArray(itemRelationships)) {
      const totalRefs = itemRelationships.reduce((sum, rel) => {
        return sum + (Array.isArray(rel.incomingRelationships) ? rel.incomingRelationships.length : 0);
      }, 0);
      summaryData.push(['Total Incoming References:', totalRefs]);
    }
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 30 },
      { wch: 40 },
      { wch: 30 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Sheet 2: Field Mappings
    const fieldMappingsData: any[] = [
      ['Source Field', 'Source Type', 'Target Field', 'Target Type', 'Transformation Needed', 'Warnings']
    ];
    
    migrationConfig?.fieldMappings.filter(m => m.targetField).forEach(m => {
      const warnings = (m.warnings && Array.isArray(m.warnings)) ? m.warnings.join('; ') : '';
      fieldMappingsData.push([
        m.sourceField.name,
        m.sourceField.type,
        m.targetField?.name || 'N/A',
        m.targetField?.type || 'N/A',
        m.transformationNeeded ? 'Yes' : 'No',
        warnings
      ]);
    });
    
    const fieldMappingsSheet = XLSX.utils.aoa_to_sheet(fieldMappingsData);
    fieldMappingsSheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 50 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, fieldMappingsSheet, 'Field Mappings');
    
    // Sheet 3: Migrated Items
    const migratedItemsData: any[] = [
      ['#', 'Item Name', 'Codename', 'Status', 'New Item ID', 'Message', 'Completed']
    ];
    
    migrationResults.forEach((result, index) => {
      migratedItemsData.push([
        index + 1,
        result.sourceItem.name,
        result.sourceItem.codename,
        result.status === 'success' ? 'SUCCESS' : 'FAILED',
        result.newItemId || 'N/A',
        result.message,
        result.timestamp.toLocaleString()
      ]);
    });
    
    const migratedItemsSheet = XLSX.utils.aoa_to_sheet(migratedItemsData);
    migratedItemsSheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 25 },
      { wch: 10 },
      { wch: 40 },
      { wch: 50 },
      { wch: 20 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, migratedItemsSheet, 'Migrated Items');
    
    // Sheet 4: Created Items Details
    const createdItemsData: any[] = [
      ['Source Item', 'Created Item Name', 'Original Type', 'New Type', 'Original Codename', 'New Codename', 'New ID', 'Auto-Migrated', 'Already Existed']
    ];
    
    migrationResults.forEach(result => {
      if (result.createdItems && result.createdItems.length > 0) {
        result.createdItems.forEach((item: any) => {
          createdItemsData.push([
            result.sourceItem.name,
            item.newName,
            item.originalType,
            item.newType,
            item.originalCodename,
            item.newCodename,
            item.newId,
            item.wasAutoMigrated ? 'Yes' : 'No',
            item.alreadyExisted ? 'Yes' : 'No'
          ]);
        });
      }
    });
    
    const createdItemsSheet = XLSX.utils.aoa_to_sheet(createdItemsData);
    createdItemsSheet['!cols'] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, createdItemsSheet, 'Created Items');
    
    // Sheet 5: Incoming References (if applicable)
    if (updateIncomingReferences && Array.isArray(itemRelationships) && itemRelationships.length > 0) {
      const referencesData: any[] = [
        ['Migrated Item', 'Migrated Item Codename', 'Referenced From Item', 'Referenced From Codename', 'Referenced From Type', 'Field Modified', 'Item URL', 'Was Updated']
      ];
      
      // Get project ID for building URLs
      const projectId = import.meta.env.VITE_KONTENT_PROJECT_ID || '';
      
      itemRelationships.forEach(rel => {
        if (rel.incomingRelationships && Array.isArray(rel.incomingRelationships) && rel.incomingRelationships.length > 0) {
          rel.incomingRelationships.forEach((ref: any) => {
            // Build the Kontent.ai item URL with collection ID and variant ID
            // Collection can be a UUID or 'default' string - convert 'default' to the default collection UUID
            const collectionId = ref.fromItemCollection === 'default' 
              ? '00000000-0000-0000-0000-000000000000' 
              : (ref.fromItemCollection || '00000000-0000-0000-0000-000000000000');
            
            // Build URL with variant ID if available, otherwise fallback to simpler format
            const itemUrl = projectId && ref.fromItemLanguageVariantId
              ? `https://app.kontent.ai/${projectId}/content-inventory/${collectionId}/${ref.fromItemLanguageVariantId}/content/${ref.fromItemId}`
              : projectId
              ? `https://app.kontent.ai/${projectId}/content-inventory/${collectionId}/${ref.fromItemId}/content`
              : 'N/A';
            
            // Check if this item was updated (it's in the updatedReferenceItems set)
            const wasUpdated = updatedReferenceItems.has(ref.fromItemId) ? 'Yes' : 'No';
            
            referencesData.push([
              rel.itemName,
              rel.itemCodename,
              ref.fromItemName,
              ref.fromItemCodename,
              ref.fromItemType,
              ref.fieldName,
              itemUrl,
              wasUpdated
            ]);
          });
        }
      });
      
      const referencesSheet = XLSX.utils.aoa_to_sheet(referencesData);
      
      // Set column widths
      referencesSheet['!cols'] = [
        { wch: 30 },  // Migrated Item
        { wch: 25 },  // Migrated Item Codename
        { wch: 30 },  // Referenced From Item
        { wch: 25 },  // Referenced From Codename
        { wch: 25 },  // Referenced From Type
        { wch: 25 },  // Field Modified
        { wch: 70 },  // Item URL (wider for full URL)
        { wch: 12 }   // Was Updated
      ];
      
      XLSX.utils.book_append_sheet(workbook, referencesSheet, 'Incoming References');
    }
    
    // Sheet 6: Migration Logs
    const logsData: any[] = [
      ['Timestamp', 'Level', 'Message', 'Details']
    ];
    
    migrationLogs.forEach(log => {
      const levelText = log.level === 'success' ? 'SUCCESS' : 
                       log.level === 'error' ? 'ERROR' : 
                       log.level === 'warning' ? 'WARNING' : 'INFO';
      logsData.push([
        log.timestamp.toLocaleString(),
        levelText,
        log.message,
        log.details || ''
      ]);
    });
    
    const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
    logsSheet['!cols'] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 60 },
      { wch: 40 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, logsSheet, 'Migration Logs');
    
    // Generate and download the file
    const excelTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const excelFilename = `migration-report-${excelTimestamp}.xlsx`;
    
    console.log('📥 Downloading Excel file:', excelFilename);
    XLSX.writeFile(workbook, excelFilename);
    console.log('✅ Excel report downloaded');
  };

  const handleExecuteMigration = async () => {
    if (!migrationConfig) return;

    // CRITICAL DEBUG - This should ALWAYS show
    console.log('🚀 === MIGRATION EXECUTION STARTED ===');
    console.log('📊 Selected items:', selectedItems.length, selectedItems);
    console.log('📊 Item relationships:', itemRelationships.length, itemRelationships);
    console.log('📊 Update incoming references:', updateIncomingReferences);

    try {
      setMigrationInProgress(true);
      setMigrationLogs([]);
      setMigrationProgress(0);
      
      addLog('info', '🚀 Starting migration process...');
      setCurrentMigrationStep('Initializing migration');
      
      addLog('info', '🚀 Starting migration execution...');
      addLog('info', `📊 Selected items: ${selectedItems.length}`);
      addLog('info', `📊 Item relationships available: ${itemRelationships.length}`);
      addLog('info', `📊 Update incoming references: ${updateIncomingReferences}`);
      
      const results = [];
      const migratedItemsMap = new Map<string, string>(); // oldCodename -> newItemId
      
      // Build list of items to migrate, including auto-discovered related items
      const itemsToMigrate = new Set<string>(); // Set of item IDs
      const itemsById = new Map<string, any>(); // Map ID -> item object
      
      // Add selected items
      selectedItems.forEach(item => {
        itemsToMigrate.add(item.id);
        itemsById.set(item.id, item);
        addLog('info', `  ✓ Added to migration: ${item.name} (${item.codename})`);
      });
      
      // Analyze incoming relationships to find items that need auto-migration
      // These are items of the SAME SOURCE TYPE that reference items being migrated
      const sourceTypeCodename = migrationConfig.sourceContentType.codename;
      const autoMigrateItems: any[] = [];
      
      addLog('info', `🔍 Analyzing relationships for auto-migration...`);
      addLog('info', `📋 Source type: ${sourceTypeCodename}`);
      addLog('info', `📋 Relationships to check: ${itemRelationships.length}`);
      
      for (const relationship of itemRelationships) {
        addLog('info', `  → Checking relationships for: ${relationship.itemName} (${relationship.itemCodename})`);
        addLog('info', `    Incoming: ${relationship.incomingRelationships.length}, Outgoing: ${relationship.outgoingRelationships?.length || 0}`);
        
        // Only process if this item is being migrated
        if (!itemsToMigrate.has(relationship.itemId)) {
          addLog('info', `    ⏭️ Skipping - item not in migration list`);
          continue;
        }
        
        for (const incomingRef of relationship.incomingRelationships) {
          addLog('info', `    → Incoming ref from: ${incomingRef.fromItemName} (type: ${incomingRef.fromItemType})`);
          
          // Check if the referencing item is of the same source type
          if (incomingRef.fromItemType === sourceTypeCodename) {
            // This item needs to be auto-migrated to maintain relationships
            if (!itemsToMigrate.has(incomingRef.fromItemId)) {
              addLog('info', `🔗 Auto-discovered related item: ${incomingRef.fromItemName}`, 
                `Will auto-migrate because it references migrated item of same type`);
              
              // Add to migration list
              itemsToMigrate.add(incomingRef.fromItemId);
              autoMigrateItems.push({
                id: incomingRef.fromItemId,
                name: incomingRef.fromItemName,
                codename: incomingRef.fromItemCodename,
                type: incomingRef.fromItemType,
                autoMigrated: true,
              });
              itemsById.set(incomingRef.fromItemId, {
                id: incomingRef.fromItemId,
                name: incomingRef.fromItemName,
                codename: incomingRef.fromItemCodename,
                type: incomingRef.fromItemType,
              });
            } else {
              addLog('info', `    ✓ Already in migration list: ${incomingRef.fromItemName}`);
            }
          } else {
            addLog('info', `    ⏭️ Different type: ${incomingRef.fromItemType} !== ${sourceTypeCodename}`);
          }
        }
      }
      
      if (autoMigrateItems.length > 0) {
        addLog('info', `📋 Auto-migration list: ${autoMigrateItems.length} additional items`, 
          autoMigrateItems.map(i => i.name).join(', '));
      }
      
      const allItemsToMigrate = Array.from(itemsToMigrate).map(id => itemsById.get(id));
      const totalItems = allItemsToMigrate.length;
      
      addLog('info', `📊 Total items to migrate: ${totalItems}`, 
        `Selected: ${selectedItems.length}, Auto-discovered: ${autoMigrateItems.length}`);
      
      // Calculate total steps: migration items + reference updates (if enabled)
      const totalReferences = updateIncomingReferences 
        ? itemRelationships.reduce((sum, rel) => sum + rel.incomingRelationships.length, 0)
        : 0;
      const totalSteps = totalItems + totalReferences;
      let completedSteps = 0;
      
      for (let i = 0; i < totalItems; i++) {
        const item = allItemsToMigrate[i];
        const isAutoMigrated = autoMigrateItems.some(a => a.id === item.id);
        setCurrentMigrationStep(`Migrating item ${i + 1} of ${totalItems}: ${item.name}${isAutoMigrated ? ' (auto)' : ''}`);
        
        addLog('info', `📝 Migrating item ${i + 1}/${totalItems}${isAutoMigrated ? ' 🔗 (auto-discovered)' : ''}`, item.name);
        
        try {
          // Transform field mappings to the expected format
          const mappings = migrationConfig.fieldMappings
            .filter(mapping => mapping.targetField)
            .map(mapping => ({
              sourceField: mapping.sourceField.codename,
              targetField: mapping.targetField!.codename,
            }));

          addLog('info', `  → Mapping ${mappings.length} fields`);

          // Call the real migration function with logger
          const migrationResult = await kontentServiceFixed.migrateContentItem(
            item,
            mappings,
            migrationConfig.sourceContentType,
            migrationConfig.targetContentType,
            selectedLanguage,
            addLog // Pass the logger function
          );
          
          if (migrationResult.success) {
            addLog('success', `✅ Successfully migrated "${item.name}"`, 
              `New item ID: ${migrationResult.newItem?.id || 'unknown'}`);
            
            // Track migrated items for reference updates
            // Store mapping: old_codename -> new_migrated_codename
            const newCodename = migrationResult.newItem?.codename || `${item.codename}_migrated`;
            migratedItemsMap.set(item.codename, newCodename);
            
            addLog('info', `  → Mapped ${item.codename} → ${newCodename}`);
            
            results.push({
              sourceItem: item,
              status: 'success',
              newItemId: migrationResult.newItem?.id || 'unknown',
              newItemCodename: newCodename,
              message: `Successfully migrated "${item.name}" from ${migrationConfig.sourceContentType.name} to ${migrationConfig.targetContentType.name}`,
              timestamp: new Date(),
              createdItems: migrationResult.createdItems || [],
            });
          } else {
            addLog('error', `❌ Failed to migrate "${item.name}"`, migrationResult.error);
            
            results.push({
              sourceItem: item,
              status: 'error',
              newItemId: null,
              message: `Failed to migrate "${item.name}": ${migrationResult.error}`,
              timestamp: new Date(),
              createdItems: [],
            });
          }
          
        } catch (itemError) {
          const errorMsg = itemError instanceof Error ? itemError.message : 'Unknown error';
          addLog('error', `❌ Failed to migrate item ${item.name}`, errorMsg);
          
          results.push({
            sourceItem: item,
            status: 'error',
            newItemId: null,
            message: `Failed to migrate "${item.name}": ${errorMsg}`,
            timestamp: new Date(),
            createdItems: [],
          });
        }
        
        // Update progress after each item migration
        completedSteps++;
        const progress = (completedSteps / totalSteps) * 100;
        setMigrationProgress(progress);
      }
      
      // Reset the updated reference items tracking
      const updatedItemsSet = new Set<string>();
      
      // PHASE 1: Update OUTGOING references (references within each migrated item)
      // For each migrated item, update its internal references to point to migrated versions
      if (updateIncomingReferences && migratedItemsMap.size > 0) {
        setCurrentMigrationStep('Updating outgoing references in migrated items');
        addLog('info', '🔗 Phase 1: Updating outgoing references (references within migrated items)...');
        addLog('info', `📋 Migrated items map: ${migratedItemsMap.size} items`, 
          Array.from(migratedItemsMap.entries()).map(([old, newC]) => `${old} → ${newC}`).join(', '));
        
        for (const result of results) {
          if (result.status !== 'success') continue;
          
          const migratedItemCodename = result.newItemCodename;
          const originalItemCodename = result.sourceItem.codename;
          
          addLog('info', `🔍 Checking outgoing references for: ${migratedItemCodename} [was: ${originalItemCodename}]`);
          
          try {
            // Fetch the original item's data to see what it references
            const originalItemData = await kontentServiceFixed.getItemData(originalItemCodename, selectedLanguage);
            
            if (!originalItemData?.data?.item?.elements) {
              addLog('warning', `  ⚠️ Could not fetch original item data for ${originalItemCodename}`);
              continue;
            }
            
            // Find all modular_content fields in the original item
            const elements = originalItemData.data.item.elements;
            let referencesUpdated = 0;
            
            for (const [fieldName, fieldData] of Object.entries(elements)) {
              const typedFieldData = fieldData as any;
              if (typedFieldData.type === 'modular_content' && Array.isArray(typedFieldData.value)) {
                // Check each reference in this field
                for (const referencedCodename of typedFieldData.value) {
                  // If this referenced item was also migrated, update the reference
                  const migratedRefCodename = migratedItemsMap.get(referencedCodename);
                  
                  if (migratedRefCodename) {
                    addLog('info', `  → Updating outgoing reference in ${migratedItemCodename}.${fieldName}`, 
                      `${referencedCodename} → ${migratedRefCodename}`);
                    
                    const updateResult = await kontentServiceFixed.updateItemReference(
                      migratedItemCodename,     // Item to update
                      fieldName,                // Field name
                      referencedCodename,       // Old reference (original)
                      migratedRefCodename,      // New reference (migrated)
                      selectedLanguage
                    );
                    
                    if (updateResult.success) {
                      addLog('success', `  ✅ Updated outgoing reference successfully`);
                      referencesUpdated++;
                    } else {
                      addLog('error', `  ❌ Failed to update outgoing reference`, updateResult.error || 'Unknown error');
                    }
                  }
                }
              }
            }
            
            if (referencesUpdated > 0) {
              addLog('success', `✅ Updated ${referencesUpdated} outgoing reference(s) in ${migratedItemCodename}`);
            } else {
              addLog('info', `  ℹ️ No outgoing references to update in ${migratedItemCodename}`);
            }
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            addLog('error', `❌ Failed to process outgoing references for ${migratedItemCodename}`, errorMsg);
          }
          
          // Update progress
          completedSteps++;
          const progress = (completedSteps / totalSteps) * 100;
          setMigrationProgress(progress);
        }
      }
      
      // PHASE 2: Update INCOMING references (references from other migrated items)
      // IMPORTANT: Only update references BETWEEN MIGRATED ITEMS (same source type)
      // Do NOT update references in items of different types or non-migrated items
      if (updateIncomingReferences && itemRelationships.length > 0) {
        setCurrentMigrationStep('Updating incoming references in migrated items');
        addLog('info', '🔗 Phase 2: Updating incoming references (references from other migrated items)...');
        
        for (const relationship of itemRelationships) {
          if (relationship.incomingRelationships.length === 0) continue;
          
          // Find the migration result for this item
          const migrationResult = results.find(r => r.sourceItem.id === relationship.itemId);
          if (!migrationResult || migrationResult.status !== 'success') {
            addLog('warning', `⚠️ Skipping reference update for ${relationship.itemName}`, 
              'Migration failed or not found');
            continue;
          }
          
          const newMigratedCodename = migrationResult.newItemCodename;
          const oldItemCodename = relationship.itemCodename;
          
          addLog('info', `🔗 Processing references for migrated item: ${oldItemCodename} → ${newMigratedCodename}`);
          
          // Filter to ONLY update references from OTHER MIGRATED ITEMS of the same source type
          const sourceTypeCodename = migrationConfig.sourceContentType.codename;
          const referencesToUpdate = relationship.incomingRelationships.filter((ref: any) => {
            // Only update if referencing item is of the same source type
            const isSameSourceType = ref.fromItemType === sourceTypeCodename;
            // AND if that item was also migrated
            const wasAlsoMigrated = migratedItemsMap.has(ref.fromItemCodename);
            
            if (!isSameSourceType) {
              addLog('info', `  ⏭️ Skipping ${ref.fromItemName} (different type: ${ref.fromItemType})`);
              return false;
            }
            
            if (!wasAlsoMigrated) {
              addLog('info', `  ⏭️ Skipping ${ref.fromItemName} (not migrated, keeping original reference)`);
              return false;
            }
            
            return true;
          });
          
          if (referencesToUpdate.length === 0) {
            addLog('info', `⏭️ No migrated items reference ${newMigratedCodename}`);
            continue;
          }
          
          addLog('info', `📝 Updating ${referencesToUpdate.length} references in migrated items`, 
            `From: ${oldItemCodename} → To: ${newMigratedCodename}`);
          
          for (const incomingRef of referencesToUpdate) {
            try {
              const needsVariant = incomingRef.needsLanguageVariant || false;
              const migratedRefItemCodename = migratedItemsMap.get(incomingRef.fromItemCodename);
              
              if (!migratedRefItemCodename) {
                addLog('error', `  ❌ Could not find migrated version of ${incomingRef.fromItemCodename}`);
                continue;
              }
              
              addLog('info', `  → Updating reference in MIGRATED item: ${migratedRefItemCodename} [was: ${incomingRef.fromItemCodename}]`, 
                `Field: ${incomingRef.fieldName}${needsVariant ? ` (will create ${selectedLanguage} variant)` : ''}`);
              
              // Update reference in the MIGRATED item (not the original)
              // Pass CODENAMES (not IDs) - the function will handle ID conversion
              const updateResult = await kontentServiceFixed.updateItemReference(
                migratedRefItemCodename, // MIGRATED item codename (where to update)
                incomingRef.fieldName,   // Field name
                oldItemCodename,         // Old reference codename (original item)
                newMigratedCodename,     // New reference codename (migrated item)
                selectedLanguage
              );
              
              if (updateResult.success) {
                addLog('success', `  ✅ Successfully updated reference in migrated item`, 
                  `Item: ${migratedRefItemCodename}, now references: ${newMigratedCodename}`);
                // Track this item as having been updated
                updatedItemsSet.add(incomingRef.fromItemId);
              } else {
                addLog('error', `  ❌ Failed to update reference`, 
                  updateResult.error || 'Unknown error');
              }
            } catch (refError) {
              const errorMsg = refError instanceof Error ? refError.message : 'Unknown error';
              addLog('error', `Failed to update reference in ${incomingRef.fromItemName}`, errorMsg);
            }
            
            // Update progress after each reference update
            completedSteps++;
            const progress = (completedSteps / totalSteps) * 100;
            setMigrationProgress(progress);
          }
        }
      }
      
      // PHASE 3: Update references in items of DIFFERENT types (e.g., pages referencing migrated tags)
      // Update ALL incoming references to point to the migrated versions
      if (updateIncomingReferences && itemRelationships.length > 0) {
        setCurrentMigrationStep('Updating references in external items (different types)');
        addLog('info', '🔗 Phase 3: Updating references in external items (items of different types)...');
        
        for (const relationship of itemRelationships) {
          if (relationship.incomingRelationships.length === 0) continue;
          
          // Find the migration result for this item
          const migrationResult = results.find(r => r.sourceItem.id === relationship.itemId);
          if (!migrationResult || migrationResult.status !== 'success') {
            continue;
          }
          
          const newMigratedCodename = migrationResult.newItemCodename;
          const oldItemCodename = relationship.itemCodename;
          
          // Filter to ONLY update references from items of DIFFERENT types
          const sourceTypeCodename = migrationConfig.sourceContentType.codename;
          const externalReferences = relationship.incomingRelationships.filter((ref: any) => {
            // Only update if referencing item is of a DIFFERENT type
            const isDifferentType = ref.fromItemType !== sourceTypeCodename;
            
            if (!isDifferentType) {
              // Skip - already handled in Phase 2
              return false;
            }
            
            return true;
          });
          
          if (externalReferences.length === 0) {
            continue;
          }
          
          addLog('info', `📝 Updating ${externalReferences.length} external references to ${newMigratedCodename}`, 
            `From items of different types`);
          
          for (const incomingRef of externalReferences) {
            try {
              addLog('info', `  → Updating reference in EXTERNAL item: ${incomingRef.fromItemName} (${incomingRef.fromItemType})`, 
                `Field: ${incomingRef.fieldName}, ${oldItemCodename} → ${newMigratedCodename}`);
              
              // Update reference in the ORIGINAL external item (not migrated because it's a different type)
              const updateResult = await kontentServiceFixed.updateItemReference(
                incomingRef.fromItemCodename, // External item codename (where to update)
                incomingRef.fieldName,        // Field name
                oldItemCodename,              // Old reference codename (original item)
                newMigratedCodename,          // New reference codename (migrated item)
                selectedLanguage
              );
              
              if (updateResult.success) {
                addLog('success', `  ✅ Successfully updated external reference`, 
                  `Item: ${incomingRef.fromItemName}, now references: ${newMigratedCodename}`);
                updatedItemsSet.add(incomingRef.fromItemId);
              } else {
                addLog('error', `  ❌ Failed to update external reference`, 
                  updateResult.error || 'Unknown error');
              }
            } catch (refError) {
              const errorMsg = refError instanceof Error ? refError.message : 'Unknown error';
              addLog('error', `Failed to update external reference in ${incomingRef.fromItemName}`, errorMsg);
            }
            
            // Update progress after each reference update
            completedSteps++;
            const progress = (completedSteps / totalSteps) * 100;
            setMigrationProgress(progress);
          }
        }
      }
      
      setMigrationProgress(100);
      setCurrentMigrationStep('Migration completed');
      setMigrationResults(results);
      
      // Save the updated reference items to state for Excel report
      setUpdatedReferenceItems(updatedItemsSet);
      
      // Collect all draft items created during migration (avoid duplicates)
      const allDraftItems: any[] = [];
      const seenIds = new Set<string>();
      
      // 1. Add items created during migration (exclude items that already existed)
      results.forEach(result => {
        if (result.status === 'success' && Array.isArray(result.createdItems)) {
          result.createdItems.forEach((item: any) => {
            // Skip items that already existed (they were not created, just referenced)
            if (item.alreadyExisted) {
              return;
            }
            
            // Skip if we've already added this item ID
            if (seenIds.has(item.newId)) {
              return;
            }
            seenIds.add(item.newId);
            
            // Items created during migration are in draft state
            allDraftItems.push({
              id: item.newId,
              name: item.newName,
              codename: item.newCodename,
              type: item.newType,
              language: selectedLanguage,
              wasAutoMigrated: item.wasAutoMigrated,
              originalName: item.originalName,
            });
          });
        }
      });

      // 2. Add items that had incoming references updated (they are now in draft too)
      if (updateIncomingReferences && Array.isArray(itemRelationships)) {
        itemRelationships.forEach(rel => {
          if (Array.isArray(rel.incomingRelationships) && rel.incomingRelationships.length > 0) {
            // Add each item that references the migrated item
            rel.incomingRelationships.forEach((ref: any) => {
              const refItemId = ref.fromItemId;
              
              // Skip if not in the updated items set (not actually updated)
              if (!updatedItemsSet.has(refItemId)) {
                return;
              }
              
              // Skip if already added
              if (seenIds.has(refItemId)) {
                return;
              }
              
              // Add this referencing item to draft items for publishing
              allDraftItems.push({
                id: refItemId,
                name: ref.fromItemName,
                codename: ref.fromItemCodename,
                type: ref.fromItemType,
                language: selectedLanguage,
                wasAutoMigrated: false,
                originalName: ref.fromItemName,
              });
              seenIds.add(refItemId);
            });
          }
        });
      }

      setDraftItems(allDraftItems);
      
      setShowResults(true);
      addLog('success', '✅ Migration completed successfully!', 
        `${results.filter(r => r.status === 'success').length} of ${results.length} items migrated`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', '💥 Migration failed', errorMsg);
    } finally {
      setMigrationInProgress(false);
    }
  };

  const handleBackToMapping = () => {
    setStep(2);
  };

  const handleBackToItemSelection = () => {
    setStep(3);
  };

  const handleContinueToPublishing = () => {
    if (draftItems.length > 0) {
      setStep(6);
    }
  };

  const handlePublishBatch = async (itemsToPublish: any[], _batchSize: number) => {
    const result = await kontentServiceFixed.publishItemsBatch(
      itemsToPublish.map(item => ({
        id: item.id,
        language: selectedLanguage,
        name: item.name,
      })),
      addLog
    );
    
    // Log results but don't throw error - let the process continue
    if (result.published > 0) {
      addLog('success', `✅ Published ${result.published} item(s) in this batch`);
    }
    if (result.failed > 0) {
      addLog('warning', `⚠️ ${result.failed} item(s) failed to publish in this batch`);
      result.errors.forEach(err => addLog('error', `  → ${err}`));
    }
    
    // Return the result so BatchPublisher can update its UI
    return result;
  };

  const handlePublishingComplete = () => {
    addLog('success', '🎉 All publishing operations completed!');
    setStep(5); // Return to migration summary
  };

  const handleBackToMigrationSummary = () => {
    setStep(5);
  };

  const renderStepIndicator = () => {
    console.log('📍 Current step:', step, { sourceContentType: sourceContentType?.name, targetContentType: targetContentType?.name });
    return (
    <div className="flex items-center space-x-4 mb-8">
      <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <span>Select Content Types</span>
      </div>
      
      <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
        <span>Map Fields</span>
      </div>
      
      <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          3
        </div>
        <span>Select Items</span>
      </div>
      
      <div className={`w-8 h-0.5 ${step >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          4
        </div>
        <span>View Relationships</span>
      </div>

      <div className={`w-8 h-0.5 ${step >= 5 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 5 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 5 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          5
        </div>
        <span>Execute Migration</span>
      </div>

      <div className={`w-8 h-0.5 ${step >= 6 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      
      <div className={`flex items-center space-x-2 ${step >= 6 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 6 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          6
        </div>
        <span>Batch Publishing</span>
      </div>
    </div>
    );
  };

  if (typesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Content Types</h2>
            <p className="text-gray-600 mb-4">{typesError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Environment Badge */}
      <EnvironmentBadge />
      
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Content Type Migration</h1>
          <p className="mt-2 text-gray-600">
            Migrate content items from one content type to another with field mapping
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ConnectionStatus />
        
        {renderStepIndicator()}

        {step === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ContentTypeSelector
              contentTypes={contentTypes}
              selectedSourceType={sourceContentType}
              selectedTargetType={targetContentType}
              onSourceTypeSelect={handleSourceTypeSelect}
              onTargetTypeSelect={handleTargetTypeSelect}
              isLoading={typesLoading}
            />
          </div>
        )}

        {step === 2 && migrationConfig && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Field Mapping Configuration</h2>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ← Back to Selection
                </button>
              </div>
              
              <FieldMappingEditor
                fieldMappings={migrationConfig.fieldMappings}
                targetFields={migrationConfig.targetContentType.elements}
                onMappingChange={updateFieldMapping}
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleNextToItemSelection}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={!migrationConfig.fieldMappings.some(m => m.targetField)}
              >
                Continue to Item Selection →
              </button>
              
              {/* Debug button - remove in production */}
              <button
                onClick={() => {
                  console.log('🧪 DEBUG: Force navigation to step 3');
                  setStep(3);
                }}
                className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium text-sm"
                title="Debug: Force go to step 3"
              >
                🧪 Skip to Step 3
              </button>
            </div>
          </div>
        )}

        {step === 3 && sourceContentType && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Select Content Items to Migrate
                  </h2>
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-medium text-blue-900">🌐 Language:</span>
                    <select
                      id="language-select"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="px-2 py-1 border border-blue-300 rounded-md text-sm font-medium bg-white text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">🇬🇧 English</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="zh">🇨🇳 中文</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleBackToMapping}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ← Back to Field Mapping
                </button>
              </div>
              
              <ContentItemList
                contentTypeCodename={sourceContentType.codename}
                language={selectedLanguage}
                onItemsSelected={handleItemsSelected}
              />
              
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleContinueToExecution}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  disabled={selectedItems.length === 0}
                >
                  Continue to Relationships View ({selectedItems.length} items) →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ItemRelationshipsViewer
              selectedItems={selectedItems}
              selectedLanguage={selectedLanguage}
              onContinue={handleContinueToMigration}
              onBack={handleBackToItemSelection}
            />
          </div>
        )}

        {step === 5 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Execute Migration</h2>
              <button
                onClick={handleBackToRelationships}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                ← Back to Relationships
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Migration Summary</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <div>Source: {sourceContentType?.name}</div>
                <div>Target: {targetContentType?.name}</div>
                <div>Selected Language: {getLanguageFlag(selectedLanguage)} {selectedLanguage.toUpperCase()}</div>
                <div>Items to migrate: {selectedItems.length}</div>
                <div>Mapped fields: {migrationConfig?.fieldMappings.filter(m => m.targetField).length}</div>
                {updateIncomingReferences && (
                  <div className="mt-3 pt-3 border-t border-blue-300">
                    <div className="flex items-center text-blue-900 font-medium">
                      <span className="mr-2" role="img" aria-label="sync">🔄</span>
                      Update incoming references: Enabled
                    </div>
                    <div className="ml-6 mt-1">
                      Total items to update: {itemRelationships.reduce((sum, rel) => sum + rel.incomingRelationships.length, 0)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Migration Logger */}
            {(migrationLogs.length > 0 || migrationInProgress) && (
              <div className="mb-6">
                <MigrationLogger
                  logs={migrationLogs}
                  progress={migrationProgress}
                  isRunning={migrationInProgress}
                  currentStep={currentMigrationStep}
                />
              </div>
            )}
            
            <p className="text-gray-600 mb-6">
              Ready to migrate {selectedItems.length} content item{selectedItems.length !== 1 ? 's' : ''} 
              from "{sourceContentType?.name}" to "{targetContentType?.name}".
            </p>
            
            {/* Download Reports Section - Show after migration completes */}
            {migrationProgress === 100 && migrationResults.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">📊</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Migration Complete!</h4>
                      <p className="text-sm text-gray-600">Download detailed reports of the migration process</p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={generateTextReport}
                      className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium shadow-sm"
                      title="Download human-readable text report"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>TXT</span>
                    </button>
                    <button
                      onClick={generateExcelReport}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm"
                      title="Download Excel spreadsheet with detailed data"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Excel</span>
                    </button>
                    <button
                      onClick={generateJSONReport}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                      title="Download JSON report with all migration data"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Start Over
              </button>
              
              {migrationProgress === 100 && draftItems.length > 0 && (
                <button
                  onClick={handleContinueToPublishing}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Publish Draft Items ({draftItems.length})</span>
                </button>
              )}
              
              <button
                onClick={() => setShowDryRun(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={selectedItems.length === 0 || migrationProgress === 100}
              >
                Preview Migration
              </button>
              <button
                onClick={handleExecuteMigration}
                className={`px-8 py-3 rounded-lg font-medium ${
                  migrationInProgress 
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : migrationProgress === 100
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={selectedItems.length === 0 || migrationInProgress || migrationProgress === 100}
              >
                {migrationInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Migrating...
                  </>
                ) : (
                  `Execute Migration (${selectedItems.length} items)`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Batch Publishing */}
        {step === 6 && (
          <BatchPublisher
            draftItems={draftItems}
            selectedLanguage={selectedLanguage}
            onPublish={handlePublishBatch}
            onBack={handleBackToMigrationSummary}
            onComplete={handlePublishingComplete}
          />
        )}
      </div>

      {/* Dry Run Preview Modal */}
      {showDryRun && migrationConfig && (
        <DryRunPreview
          migrationConfig={migrationConfig}
          selectedItems={selectedItems}
          selectedLanguage={selectedLanguage}
          onClose={() => setShowDryRun(false)}
          onConfirmMigration={() => {
            setShowDryRun(false);
            void handleExecuteMigration();
          }}
        />
      )}
      
      {/* Migration Results Modal */}
      <MigrationResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        results={migrationResults}
        onStartNew={() => {
          setShowResults(false);
          handleReset();
        }}
      />

      {/* Debug Panel */}
      <DebugPanel 
        currentStep={step}
        sourceContentType={sourceContentType?.name}
        targetContentType={targetContentType?.name}
      />
    </div>
  );
}