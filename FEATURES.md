# Content Type Migration Tool - Features Documentation

## Table of Contents

1. [Overview](#overview)
2. [Recursive Migration](#recursive-migration)
3. [Migration Report](#migration-report)
4. [Skip Existing Items](#skip-existing-items)
5. [UI Components](#ui-components)
6. [Technical Implementation](#technical-implementation)
7. [Usage Examples](#usage-examples)

---

## Overview

This content type migration tool provides comprehensive functionality for migrating content items between different content types in Kontent.ai, with advanced features for handling linked items, reporting, and preventing duplicates.

### Key Features

- ✅ **Recursive Linked Item Migration**: Automatically migrates linked items of the same type
- ✅ **Comprehensive Reporting**: Detailed reports in both console and UI
- ✅ **Duplicate Prevention**: Detects and skips already migrated items
- ✅ **Visual Feedback**: Color-coded UI indicators for different item states
- ✅ **Complete Traceability**: Track all items created during migration

---

## Recursive Migration

### Problem Solved

When migrating a content item that has linked items (modular content) of the same source type, those linked items must also be migrated to maintain consistency.

**Example**:
```
[Page Type] About Us (type: _tag)
  └── parent_tag: [L1 - Page Type] (type: _tag)
      └── parent_tag: [Root] (type: _tag)
```

When migrating from `_tag` to `page_type_tags`, all items in the hierarchy need to be migrated.

### How It Works

1. **Main Item Migration**: The selected item is migrated to the target content type
2. **Linked Item Detection**: System detects linked items that are of the same source type
3. **Recursive Processing**: Each linked item is automatically migrated
4. **Chain Migration**: Process continues recursively through all levels

### Code Implementation

```typescript
async handleLinkedItemMigration(
  referencedCodename: string,
  sourceContentType: any,
  targetContentType: any
): Promise<string> {
  // Get referenced item
  const referencedItem = await this.deliveryClient
    .item(referencedCodename)
    .toPromise();

  // Check if same type as source
  if (referencedItem.data.item.system.type === sourceContentType.codename) {
    // Migrate this item recursively
    const migratedCodename = `${referencedCodename}_migrated`;
    
    // Process parent references recursively
    for (const parentCodename of parentReferences) {
      const migratedParent = await this.handleLinkedItemMigration(
        parentCodename,
        sourceContentType,
        targetContentType
      );
      // Use migrated parent reference
    }
  }
}
```

### Result

All items in the hierarchy are migrated and properly referenced:

```
[Page Type] About Us (type: page_type_tags)
  └── parent_tag: _l1___page_type_migrated (type: page_type_tags)
      └── parent_tag: _root_migrated (type: page_type_tags)
```

---

## Migration Report

### Problem Solved

Users need visibility into what items were created during migration, especially when recursive migration creates additional items automatically.

### Features

#### 1. Created Items Registry

Each migration tracks:
- Original item details (codename, name, type)
- New item details (codename, name, type, ID)
- Whether it was auto-migrated
- Whether it already existed (skipped)

```typescript
interface CreatedItemInfo {
  originalCodename: string;
  originalName: string;
  originalType: string;
  newCodename: string;
  newName: string;
  newType: string;
  newId: string;
  wasAutoMigrated: boolean;
  alreadyExisted: boolean;
}
```

#### 2. Console Output

Detailed summary printed after each migration:

```
📋 ========== MIGRATION SUMMARY ==========

✅ Total items processed: 3
   └─ Main items: 1
   └─ Auto-migrated linked items: 2
   └─ New items created: 3
   └─ Items already existed (skipped): 0

🎯 MAIN ITEMS MIGRATED:

1. "[Page Type] About Us"
   Original: [_tag] _page_type__about_us
   New:      [page_type_tags] abc123-def456
   ID:       abc123-def456-ghi789

🔗 AUTO-MIGRATED LINKED ITEMS:

1. "[L1 - Page Type]"
   Original: [_tag] _l1___page_type
   New:      [page_type_tags] _l1___page_type_migrated
   ID:       xyz789-uvw012-rst345

2. "[Root]"
   Original: [_tag] _root
   New:      [page_type_tags] _root_migrated
   ID:       mno345-pqr678-stu901

========================================
```

#### 3. UI Display

The migration results modal shows all created items with expandable details:

**Collapsed View**:
```
✅ [Page Type] About Us                        ▼
   _page_type__about_us
```

**Expanded View**:
```
✅ [Page Type] About Us                        ▲
   _page_type__about_us
─────────────────────────────────────────────────
Status: success
Message: Successfully migrated...
New Item ID: abc123-def456
Completed: 10/13/2025, 3:45:00 PM

📋 Items Created (3 total)

🎯 Main Item (1):
┌─────────────────────────────────────┐
│ 💙 [MIGRATED] [Page Type] About Us  │
│    Original: [_tag] _page_type__... │
│    New: [page_type_tags] abc123...  │
│    ID: abc123-def456-ghi789         │
└─────────────────────────────────────┘

🔗 Auto-Migrated Linked Items (2):
┌─────────────────────────────────────┐
│ 💚 [L1 - Page Type]                 │
│    Original: [_tag] _l1___page_type │
│    New: [page_type_tags] ...migrated│
│    ID: xyz789-uvw012-rst345         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 💚 [Root]                           │
│    Original: [_tag] _root           │
│    New: [page_type_tags] _root_mig..│
│    ID: mno345-pqr678-stu901         │
└─────────────────────────────────────┘
```

---

## Skip Existing Items

### Problem Solved

When running multiple migrations with overlapping linked items, the system should not create duplicates. Instead, it should detect already migrated items and skip them.

### How It Works

#### 1. Detection

Before creating a migrated item, the system checks if it already exists:

```typescript
const migratedCodename = `${referencedCodename}_migrated`;

try {
  // Try to fetch existing item
  const existingItem = await this.deliveryClient
    .item(migratedCodename)
    .toPromise();
  
  // Item exists - register and skip creation
  console.log(`✅ Item already exists: ${migratedCodename}`);
  
  this.createdItemsRegistry.push({
    ...itemInfo,
    alreadyExisted: true, // Mark as existing
  });
  
  return migratedCodename; // Use existing item
  
} catch (notFoundError) {
  // Item doesn't exist - create it
  // ... creation logic
}
```

#### 2. Visual Indicators

Items are displayed with different colors based on their state:

| State | Color | Indicator |
|-------|-------|-----------|
| **New Item (Main)** | Blue | No indicator |
| **New Item (Auto-migrated)** | Green | No indicator |
| **Already Existed** | Yellow | ⚠️ ALREADY EXISTED |

#### 3. Example Scenarios

**First Migration**:
```
Migrate: [Page Type] About Us
  └─ parent_tag: _l1___page_type
      └─ parent_tag: _root

Result:
✅ Create: [Page Type] About Us → page_type_tags
✅ Create: _l1___page_type → _l1___page_type_migrated
✅ Create: _root → _root_migrated

Total: 3 created, 0 skipped
UI: All blue/green items
```

**Second Migration**:
```
Migrate: [Page Type] Contact Us
  └─ parent_tag: _l1___page_type (exists as _l1___page_type_migrated)
      └─ parent_tag: _root (exists as _root_migrated)

Result:
✅ Create: [Page Type] Contact Us → page_type_tags
⚠️ Skip: _l1___page_type (already exists)
⚠️ Skip: _root (already exists)

Total: 1 created, 2 skipped
UI: 1 blue item, 2 yellow items with ⚠️
```

#### 4. Console Output

```
📋 ========== MIGRATION SUMMARY ==========

✅ Total items processed: 3
   └─ Main items: 1
   └─ Auto-migrated linked items: 2
   └─ New items created: 1
   └─ Items already existed (skipped): 2  ← Skip counter

🎯 MAIN ITEMS MIGRATED:
1. "[Page Type] Contact Us"
   Original: [_tag] _page_type__contact_us
   New:      [page_type_tags] def456-ghi789
   ID:       def456-ghi789-jkl012

🔗 AUTO-MIGRATED LINKED ITEMS:
1. "[L1 - Page Type]" ⚠️ ALREADY EXISTED
   Original: [_tag] _l1___page_type
   New:      [page_type_tags] _l1___page_type_migrated
   ID:       xyz789-uvw012-rst345
   Status:   ⚠️ Skipped (already migrated)

2. "[Root]" ⚠️ ALREADY EXISTED
   Original: [_tag] _root
   New:      [page_type_tags] _root_migrated
   ID:       mno345-pqr678-stu901
   Status:   ⚠️ Skipped (already migrated)
```

#### 5. UI Display

**New Item**:
```
┌─────────────────────────────────────┐
│ 💙 [MIGRATED] [Page Type] Contact...│  ← Blue
│    Original: [_tag] ...             │
│    New: [page_type_tags] ...        │
│    ID: def456-ghi789-jkl012         │
└─────────────────────────────────────┘
```

**Already Existed Item**:
```
┌─────────────────────────────────────┐
│ ⚠️ ALREADY EXISTED                  │  ← Yellow
│ [L1 - Page Type]                    │
│    Original: [_tag] _l1___page_type │
│    New: [page_type_tags] ...migrated│
│    ID: xyz789-uvw012-rst345         │
│    Status: Skipped (already migrated)│
└─────────────────────────────────────┘
```

---

## UI Components

### Color Coding System

| Color | Component | Purpose |
|-------|-----------|---------|
| 💙 **Blue** (`bg-blue-50`) | Main item boxes | Items directly selected for migration |
| 💚 **Green** (`bg-green-50`) | Auto-migrated boxes | Items migrated automatically (linked items) |
| ⚠️ **Yellow** (`bg-yellow-50`) | Skipped boxes | Items that already existed and were skipped |

### Migration Results Modal

#### Features

1. **Summary Statistics**
   - Total items processed
   - Success/failure count
   - Created vs skipped breakdown

2. **Expandable Item Details**
   - Click ▼/▲ to expand/collapse
   - Shows all created items
   - Color-coded by type and status

3. **Item Information**
   - Original item details
   - New item details
   - Unique Kontent.ai IDs
   - Status indicators

#### Component Structure

```tsx
<MigrationResultsModal>
  <Summary>
    - Total Items: X
    - Successful: Y
    - Failed: Z
  </Summary>
  
  <ResultsList>
    <ResultItem>
      <Header>
        ✅ Item Name [Codename]
      </Header>
      
      <Details> (expandable)
        Status: success
        Message: ...
        New Item ID: ...
        
        <CreatedItems>
          <MainItems> (blue)
            - Item details
          </MainItems>
          
          <AutoMigratedItems> (green/yellow)
            - Item details
            - Status indicators
          </AutoMigratedItems>
        </CreatedItems>
      </Details>
    </ResultItem>
  </ResultsList>
</MigrationResultsModal>
```

---

## Technical Implementation

### Files Modified

#### 1. `kontentServiceFixed.ts`

**Interfaces**:
```typescript
export interface CreatedItemInfo {
  originalCodename: string;
  originalName: string;
  originalType: string;
  newCodename: string;
  newName: string;
  newType: string;
  newId: string;
  wasAutoMigrated: boolean;
  alreadyExisted: boolean;
}
```

**Key Methods**:
- `migrateContentItem()`: Main migration orchestrator
- `handleLinkedItemMigration()`: Recursive linked item processor
- `getCreatedItemsSummary()`: Format console report
- `clearCreatedItemsRegistry()`: Reset registry

**Registry**:
```typescript
private createdItemsRegistry: CreatedItemInfo[] = [];
```

#### 2. `App.tsx`

**Changes**:
```typescript
// Capture created items from migration result
results.push({
  sourceItem: item,
  status: 'success',
  newItemId: migrationResult.newItem?.id || 'unknown',
  message: '...',
  timestamp: new Date(),
  createdItems: migrationResult.createdItems || [], // ← Pass to UI
});
```

#### 3. `MigrationResultsModal.tsx`

**Interface Updates**:
```typescript
interface MigrationResult {
  sourceItem: any;
  status: 'success' | 'error';
  newItemId: string | null;
  message: string;
  timestamp: Date;
  createdItems?: CreatedItemInfo[]; // ← New property
}
```

**Conditional Rendering**:
```tsx
<div className={`p-2 rounded border ${
  item.alreadyExisted 
    ? 'bg-yellow-50 border-yellow-300' 
    : item.wasAutoMigrated
      ? 'bg-green-50 border-green-200'
      : 'bg-blue-50 border-blue-200'
}`}>
  {item.alreadyExisted && (
    <span className="text-yellow-600">⚠️ ALREADY EXISTED</span>
  )}
  {/* Item details */}
</div>
```

---

## Usage Examples

### Example 1: Simple Migration

**Input**:
```
Item: [Page Type] About Us (type: _tag)
No linked items
```

**Process**:
1. Create new item: `[MIGRATED] [Page Type] About Us` (type: `page_type_tags`)

**Output**:
```
📋 Total items processed: 1
   └─ New items created: 1
   └─ Items skipped: 0

🎯 MAIN ITEMS MIGRATED:
1. "[Page Type] About Us"
```

**UI**: 1 blue item

---

### Example 2: Recursive Migration

**Input**:
```
Item: [Page Type] About Us (type: _tag)
  └── parent_tag: [L1 - Page Type] (type: _tag)
      └── parent_tag: [Root] (type: _tag)
```

**Process**:
1. Create main item: `[Page Type] About Us` → `page_type_tags`
2. Detect linked item: `_l1___page_type` (type: `_tag`)
3. Auto-migrate: `_l1___page_type` → `_l1___page_type_migrated`
4. Detect parent: `_root` (type: `_tag`)
5. Auto-migrate: `_root` → `_root_migrated`

**Output**:
```
📋 Total items processed: 3
   └─ Main items: 1
   └─ Auto-migrated: 2
   └─ New items created: 3
   └─ Items skipped: 0

🎯 MAIN ITEMS MIGRATED:
1. "[Page Type] About Us"

🔗 AUTO-MIGRATED LINKED ITEMS:
1. "[L1 - Page Type]"
2. "[Root]"
```

**UI**: 1 blue item, 2 green items

---

### Example 3: Migration with Existing Items

**Input** (First run):
```
Item: [Page Type] About Us (type: _tag)
  └── parent_tag: [L1 - Page Type] (type: _tag)
```

**Process**:
1. Create: `[Page Type] About Us` → `page_type_tags`
2. Create: `_l1___page_type` → `_l1___page_type_migrated`

**Output**:
```
📋 Total items processed: 2
   └─ New items created: 2
   └─ Items skipped: 0
```

**UI**: 1 blue, 1 green

---

**Input** (Second run):
```
Item: [Page Type] Contact Us (type: _tag)
  └── parent_tag: [L1 - Page Type] (type: _tag)
```

**Process**:
1. Create: `[Page Type] Contact Us` → `page_type_tags`
2. Check: `_l1___page_type_migrated` already exists
3. Skip: Use existing item reference

**Output**:
```
📋 Total items processed: 2
   └─ New items created: 1
   └─ Items skipped: 1  ← One item skipped

🎯 MAIN ITEMS MIGRATED:
1. "[Page Type] Contact Us"

🔗 AUTO-MIGRATED LINKED ITEMS:
1. "[L1 - Page Type]" ⚠️ ALREADY EXISTED
   Status: ⚠️ Skipped (already migrated)
```

**UI**: 1 blue, 1 yellow (with ⚠️)

---

## Benefits Summary

### Recursive Migration
- ✅ Maintains content relationships
- ✅ Ensures consistency across hierarchy
- ✅ Fully automated process
- ✅ Handles unlimited depth

### Migration Report
- ✅ Complete visibility of all changes
- ✅ Traceability for audit purposes
- ✅ Console and UI reporting
- ✅ Item IDs for reference

### Skip Existing Items
- ✅ Prevents duplicates
- ✅ Saves API calls
- ✅ Faster migrations
- ✅ Clear visual feedback

### UI Components
- ✅ Intuitive color coding
- ✅ Expandable details
- ✅ Clear status indicators
- ✅ Professional appearance

---

## Future Enhancements

Potential improvements for future versions:

1. **Batch Processing**: Process multiple main items in parallel
2. **Progress Bar**: Real-time progress for recursive migrations
3. **Export Report**: Download migration report as CSV/JSON
4. **Rollback**: Ability to undo migrations
5. **Dry Run**: Preview what will be migrated before executing
6. **Custom Naming**: Configure naming pattern for migrated items
7. **Conflict Resolution**: Handle items with same codename
8. **Scheduling**: Schedule migrations for later execution

---

## Support

For issues, questions, or contributions, please refer to the main README.md file.

**Version**: 2.0.0  
**Last Updated**: October 13, 2025
