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
    console.log('📊 Relationships:', data.relationships.length);
    setUpdateIncomingReferences(data.updateIncomingReferences);
    setItemRelationships(data.relationships);
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
        ['Migrated Item', 'Migrated Item Codename', 'Referenced From Item', 'Referenced From Type', 'Field Name']
      ];
      
      itemRelationships.forEach(rel => {
        if (rel.incomingRelationships && Array.isArray(rel.incomingRelationships) && rel.incomingRelationships.length > 0) {
          rel.incomingRelationships.forEach((ref: any) => {
            referencesData.push([
              rel.itemName,
              rel.itemCodename,
              ref.fromItemName,
              ref.fromItemType,
              ref.fieldName
            ]);
          });
        }
      });
      
      const referencesSheet = XLSX.utils.aoa_to_sheet(referencesData);
      referencesSheet['!cols'] = [
        { wch: 30 },
        { wch: 25 },
        { wch: 30 },
        { wch: 25 },
        { wch: 25 }
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

    try {
      setMigrationInProgress(true);
      setMigrationLogs([]);
      setMigrationProgress(0);
      
      addLog('info', '🚀 Starting migration process...');
      setCurrentMigrationStep('Initializing migration');
      
      const results = [];
      const totalItems = selectedItems.length;
      
      // Calculate total steps: migration items + reference updates (if enabled)
      const totalReferences = updateIncomingReferences 
        ? itemRelationships.reduce((sum, rel) => sum + rel.incomingRelationships.length, 0)
        : 0;
      const totalSteps = totalItems + totalReferences;
      let completedSteps = 0;
      
      for (let i = 0; i < totalItems; i++) {
        const item = selectedItems[i];
        setCurrentMigrationStep(`Migrating item ${i + 1} of ${totalItems}: ${item.name}`);
        
        addLog('info', `📝 Migrating item ${i + 1}/${totalItems}`, item.name);
        
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
            
            results.push({
              sourceItem: item,
              status: 'success',
              newItemId: migrationResult.newItem?.id || 'unknown',
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
      
      // Update incoming references if enabled
      if (updateIncomingReferences && itemRelationships.length > 0) {
        setCurrentMigrationStep('Updating incoming references');
        addLog('info', '🔄 Updating incoming references...');
        
        for (const relationship of itemRelationships) {
          if (relationship.incomingRelationships.length === 0) continue;
          
          // Find the migration result for this item
          const migrationResult = results.find(r => r.sourceItem.id === relationship.itemId);
          if (!migrationResult || migrationResult.status !== 'success') {
            addLog('warning', `⚠️ Skipping reference update for ${relationship.itemName}`, 
              'Migration failed or not found');
            continue;
          }
          
          const newItemId = migrationResult.newItemId;
          const oldItemCodename = relationship.itemCodename;
          
          // IMPORTANT: Filter out incoming references from items of the SAME SOURCE TYPE
          // We only want to update references in items of the TARGET TYPE or other different types
          const sourceTypeCodename = migrationConfig?.sourceContentType.codename;
          const filteredIncomingRefs = relationship.incomingRelationships.filter((ref: any) => {
            const isSameSourceType = ref.fromItemType === sourceTypeCodename;
            if (isSameSourceType) {
              addLog('info', `  ⏭️ Skipping reference from ${ref.fromItemName} (same source type: ${sourceTypeCodename})`);
            }
            return !isSameSourceType;
          });
          
          if (filteredIncomingRefs.length === 0) {
            addLog('info', `⏭️ No references to update for ${relationship.itemName} (all were from source type)`);
            continue;
          }
          
          addLog('info', `📝 Updating ${filteredIncomingRefs.length} incoming references (filtered from ${relationship.incomingRelationships.length} total)`, 
            `For item: ${relationship.itemName}`);
          
          for (const incomingRef of filteredIncomingRefs) {
            try {
              addLog('info', `  → Updating reference in ${incomingRef.fromItemName} [${incomingRef.fromItemType}]`, 
                `Field: ${incomingRef.fieldName}`);
              
              // Use the new updateItemReference function
              const updateResult = await kontentServiceFixed.updateItemReference(
                incomingRef.fromItemCodename,
                incomingRef.fieldName,
                oldItemCodename,
                newItemId,
                selectedLanguage
              );
              
              if (updateResult.success) {
                addLog('success', `  ✅ Successfully updated reference`, 
                  `In item: ${incomingRef.fromItemName}`);
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
      
      setMigrationProgress(100);
      setCurrentMigrationStep('Migration completed');
      setMigrationResults(results);
      setShowResults(true);
      addLog('success', '✅ Migration completed successfully!', 
        `${results.filter(r => r.status === 'success').length} of ${results.length} items migrated`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', '💥 Migration failed', errorMsg);
      alert(`Migration failed: ${errorMsg}`);
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
              <button
                onClick={() => setShowDryRun(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={selectedItems.length === 0}
              >
                Preview Migration
              </button>
              <button
                onClick={handleExecuteMigration}
                className={`px-8 py-3 rounded-lg font-medium ${
                  migrationInProgress 
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={selectedItems.length === 0 || migrationInProgress}
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