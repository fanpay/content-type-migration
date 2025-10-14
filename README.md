# Content Type Migration - Kontent.ai Custom App

A production-ready custom application for Kontent.ai that enables seamless migration of content items between different content types within the same environment. Features intelligent field mapping, automatic linked item migration, real-time progress tracking, and comprehensive relationship analysis.

## 🚀 Key Features

- **Content Type Selection**: Intuitive interface for selecting source and target content types
- **Smart Field Mapping**: Visual field mapping with automatic compatibility validation
- **Compatibility Validation**: Real-time indicators showing field compatibility status
- **Automatic Mapping**: Initial field mapping based on codenames and display names
- **Recursive Linked Item Migration**: Automatically migrates linked items of the same type
- **Reference Updates**: Updates incoming references to point to migrated items
- **Real-time Progress Tracking**: Live progress bar and detailed step-by-step logging
- **Relationship Analysis**: Visual analysis of item dependencies before migration
- **Duplicate Prevention**: Detects and skips already migrated items
- **Comprehensive Logging**: Real-time UI logger with color-coded messages
- **Responsive Interface**: Modern design with Tailwind CSS
- **Step-by-Step Workflow**: Guided 5-step migration process

📚 **For detailed feature documentation, see [FEATURES.md](./FEATURES.md)**

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application (UI)                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   App.tsx  │──│   Hooks    │──│   Components         │  │
│  │  (State &  │  │  (Data &   │  │  (UI Elements)       │  │
│  │   Logic)   │  │ Migration) │  │                      │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │ kontentService   │◄───────►│ migrationService     │     │
│  │ (API Wrapper)    │         │ (Business Logic)     │     │
│  └──────────────────┘         └──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Kontent.ai APIs                           │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │  Management API  │         │   Delivery API       │     │
│  │  (Write/Update)  │         │   (Read Content)     │     │
│  └──────────────────┘         └──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
src/
├── components/                    # React UI Components
│   ├── ConnectionStatus.tsx       # API connection status indicator
│   ├── ContentItemList.tsx        # List and selection of content items
│   ├── ContentTypeSelector.tsx    # Source/target content type selection
│   ├── DebugPanel.tsx            # Development debugging panel
│   ├── DryRunPreview.tsx         # Preview mode before migration
│   ├── FieldMappingEditor.tsx    # Visual field mapping interface
│   ├── ItemRelationshipsViewer.tsx # Relationship analysis viewer
│   ├── MigrationLogger.tsx       # Real-time migration logger
│   ├── MigrationResultsModal.tsx # Post-migration results display
│   └── SearchableSelect.tsx      # Enhanced select with search
│
├── hooks/                         # Custom React Hooks
│   ├── useKontentData.ts         # Data fetching and caching
│   └── useMigration.ts           # Migration logic orchestration
│
├── services/                      # API Services
│   ├── kontentService.ts         # Abstract Kontent.ai service
│   ├── kontentServiceFixed.ts    # Production service implementation
│   ├── kontentServiceReal.ts     # Alternative implementation
│   └── migrationService.ts       # Migration business logic
│
├── types/                         # TypeScript Definitions
│   └── index.ts                  # Shared type definitions
│
├── config/                        # Configuration
│   └── kontent.ts                # Kontent.ai SDK configuration
│
├── App.tsx                        # Main application component
├── main.tsx                       # Application entry point
└── index.css                      # Global styles (Tailwind)
```

### Core Components

#### 1. **App.tsx** - Application Orchestration
- Manages global state and step progression
- Coordinates between components
- Handles migration workflow execution
- Real-time logging integration

#### 2. **Services Layer**

**kontentServiceFixed.ts** - Main service implementation:
- Content type fetching and caching
- Content item CRUD operations
- Linked item recursive migration
- Reference update management
- Error handling and logging

**migrationService.ts** - Business logic:
- Field mapping validation
- Data transformation
- Migration execution
- Results aggregation

#### 3. **UI Components**

**MigrationLogger.tsx** - Real-time logger:
- Color-coded log levels (info, success, warning, error)
- Progress bar (0-100%)
- Auto-scrolling log display
- Statistics summary

**ItemRelationshipsViewer.tsx** - Relationship analysis:
- Outgoing relationships (items referenced by selected items)
- Incoming relationships (items that reference selected items)
- Visual dependency tree
- Impact analysis

#### 4. **Hooks**

**useKontentData.ts**:
- Data fetching with React Query patterns
- Content type loading
- Content item retrieval
- Caching and state management

**useMigration.ts**:
- Migration state management
- Progress tracking
- Error handling
- Result aggregation

## � How It Works

### Migration Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Content Type Selection                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • User selects source content type                │    │
│  │  • User selects target content type                │    │
│  │  • System validates selection                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Field Mapping Configuration                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Auto-map fields by codename/name                │    │
│  │  • Manual mapping adjustments                      │    │
│  │  • Compatibility validation                        │    │
│  │  • Guidelines fields excluded                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Content Item Selection                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Load items from source content type             │    │
│  │  • User selects items to migrate                   │    │
│  │  • Select language variant                         │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Relationship Analysis                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Analyze outgoing references (items used)        │    │
│  │  • Analyze incoming references (used by items)     │    │
│  │  • Display dependency tree                         │    │
│  │  • Option to update incoming references            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Migration Execution                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  FOR EACH selected item:                           │    │
│  │    1. Fetch source item data (Delivery API)       │    │
│  │    2. Get target type structure                    │    │
│  │    3. Create new content item                      │    │
│  │    4. Map and transform fields                     │    │
│  │    5. Handle linked items (recursive)              │    │
│  │    6. Create language variant                      │    │
│  │    7. Update progress                              │    │
│  │                                                     │    │
│  │  IF update_references enabled:                     │    │
│  │    FOR EACH incoming reference:                    │    │
│  │      1. Create new version (if published)          │    │
│  │      2. Update reference field                     │    │
│  │      3. Save updated variant                       │    │
│  │      4. Update progress                            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Migration Algorithm

#### Core Migration Function

```typescript
async migrateContentItem(
  sourceItem,
  fieldMappings,
  sourceContentType,
  targetContentType,
  language,
  logger?  // Optional UI logger
) {
  // 1. Fetch complete source data via Delivery API
  const sourceData = await deliveryClient
    .item(sourceItem.codename)
    .depthParameter(1)
    .toPromise();

  // 2. Get target content type structure via Management API
  const targetType = await managementClient
    .viewContentType()
    .byTypeCodename(targetContentType.codename)
    .toPromise();

  // 3. Create new content item
  const newItem = await managementClient
    .addContentItem()
    .withData({
      name: `[MIGRATED] ${sourceItem.name}`,
      type: { codename: targetContentType.codename }
    })
    .toPromise();

  // 4. Build mapped elements
  const elements = [];
  for (const mapping of fieldMappings) {
    const sourceElement = sourceData.elements[mapping.sourceField];
    const targetElement = targetType.elements.find(
      e => e.codename === mapping.targetField
    );
    
    const transformedValue = transformFieldValue(
      sourceElement,
      targetElement,
      mapping.targetField
    );
    
    if (transformedValue) {
      elements.push(transformedValue);
    }
  }

  // 5. Add default values for unmapped required fields
  for (const targetElement of targetType.elements) {
    if (!elements.find(e => e.element.codename === targetElement.codename)) {
      if (targetElement.type !== 'guidelines') {
        elements.push(getDefaultValue(targetElement));
      }
    }
  }

  // 6. Process linked items (recursive migration)
  const linkedElement = elements.find(
    e => e.element.codename === 'parent_page_type_tag'
  );
  
  if (linkedElement?.value?.length > 0) {
    for (const linkedItem of linkedElement.value) {
      const migratedCodename = await handleLinkedItemMigration(
        linkedItem.codename,
        sourceContentType,
        targetContentType
      );
      linkedItem.codename = migratedCodename;
    }
  }

  // 7. Create language variant with all elements
  const variant = await managementClient
    .upsertLanguageVariant()
    .byItemId(newItem.id)
    .byLanguageId(languageId)
    .withData(builder => ({
      elements: elements.map(el => 
        builder.element(el.type, el.element, el.value)
      )
    }))
    .toPromise();

  return { success: true, newItem, variant };
}
```

#### Linked Item Recursive Migration

```typescript
async handleLinkedItemMigration(
  referencedCodename,
  sourceContentType,
  targetContentType
) {
  // 1. Check if linked item is of same source type
  const referencedItem = await deliveryClient
    .item(referencedCodename)
    .toPromise();

  if (referencedItem.system.type !== sourceContentType.codename) {
    return referencedCodename; // Different type, keep original
  }

  // 2. Check if already migrated
  const migratedCodename = `${referencedCodename}_migrated`;
  try {
    const existing = await deliveryClient
      .item(migratedCodename)
      .toPromise();
    return migratedCodename; // Already exists, reuse
  } catch {
    // 3. Not migrated yet, create it
    const newItem = await managementClient
      .addContentItem()
      .withData({
        name: referencedItem.system.name,
        codename: migratedCodename,
        type: { codename: targetContentType.codename }
      })
      .toPromise();

    // 4. Recursively migrate its linked items
    // ... (repeat process)

    return migratedCodename;
  }
}
```

#### Reference Update Algorithm

```typescript
async updateItemReference(
  itemCodename,
  fieldCodename,
  oldReference,
  newReference,
  language
) {
  // 1. Get item to find its content type
  const item = await managementClient
    .viewContentItem()
    .byItemCodename(itemCodename)
    .toPromise();

  // 2. Get content type to map field codename → field ID
  const contentType = await managementClient
    .viewContentType()
    .byTypeId(item.type.id)
    .toPromise();

  const fieldId = contentType.elements.find(
    e => e.codename === fieldCodename
  ).id;

  // 3. Get current variant
  const variant = await managementClient
    .viewLanguageVariant()
    .byItemCodename(itemCodename)
    .byLanguageCodename(language)
    .toPromise();

  // 4. Check if published → create new version first
  if (variant.workflowStep.codename === 'published') {
    await managementClient
      .createNewVersionOfLanguageVariant()
      .byItemCodename(itemCodename)
      .byLanguageCodename(language)
      .toPromise();
  }

  // 5. Get old item ID (Management API uses IDs, not codenames)
  const oldItem = await managementClient
    .viewContentItem()
    .byItemCodename(oldReference)
    .toPromise();

  // 6. Update reference: oldItemId → newItemId
  const fieldElement = variant.elements.find(
    e => e.element.id === fieldId
  );
  
  const updatedValue = fieldElement.value.map(ref =>
    ref.id === oldItem.id ? { id: newReference } : ref
  );

  // 7. Save updated variant
  await managementClient
    .upsertLanguageVariant()
    .byItemCodename(itemCodename)
    .byLanguageCodename(language)
    .withData(builder => ({
      elements: [
        builder.linkedItemsElement({
          element: { id: fieldId },
          value: updatedValue
        })
      ]
    }))
    .toPromise();

  return { success: true };
}
```

### Progress Calculation

The progress bar accurately reflects the complete migration process:

```typescript
// Calculate total steps
const totalItems = selectedItems.length;
const totalReferences = updateIncomingReferences 
  ? itemRelationships.reduce((sum, rel) => 
      sum + rel.incomingRelationships.length, 0
    )
  : 0;
const totalSteps = totalItems + totalReferences;

let completedSteps = 0;

// After each item migration
completedSteps++;
setProgress((completedSteps / totalSteps) * 100);

// After each reference update
completedSteps++;
setProgress((completedSteps / totalSteps) * 100);

// Final
setProgress(100); // Only when truly complete
```

### Real-time Logging System

```typescript
// Logger function signature
type LogLevel = 'info' | 'success' | 'warning' | 'error';
type Logger = (level: LogLevel, message: string, details?: string) => void;

// In App.tsx
const addLog = (level: LogLevel, message: string, details?: string) => {
  setMigrationLogs(prev => [...prev, {
    id: Date.now(),
    level,
    message,
    details,
    timestamp: new Date()
  }]);
};

// Passed to service layer
await kontentService.migrateContentItem(
  item,
  mappings,
  sourceType,
  targetType,
  language,
  addLog  // Logger passed here
);

// In service
const log = (level, message, details?) => {
  if (logger) logger(level, message, details);
  console.log(message, details); // Also to console for debugging
};

log('info', 'Starting migration...');
log('success', 'Migration completed', `ID: ${newItem.id}`);
log('error', 'Migration failed', error.message);
```

## 📖 Usage Guide

### Quick Start

1. **Launch Application**: Access at `https://localhost:3001`
2. **Select Content Types**: Choose source and target types
3. **Map Fields**: Configure field mappings
4. **Select Items**: Choose items to migrate
5. **Analyze Relationships**: Review dependencies
6. **Execute Migration**: Run and monitor progress

### Detailed Step-by-Step Guide

### Detailed Step-by-Step

#### Step 1: Content Type Selection

1. Select the **Source Content Type** from which you want to migrate content items
2. Select the **Target Content Type** to which you want to migrate the content items
3. The system will show a summary of the selected content types
4. Click **Continue** to proceed

**What Happens Behind the Scenes:**
- Fetches all available content types via Management API
- Validates that source and target types are different
- Loads content type structures for field mapping

#### Step 2: Field Mapping

1. **Automatic Mapping**: The system automatically maps fields with:
   - Identical codenames
   - Matching display names (case insensitive)

2. **Manual Adjustments**: For each unmapped source field:
   - Select a compatible target field from dropdown
   - View compatibility indicators:
     - ✅ **Green check**: Compatible field types
     - ⚠️ **Yellow warning**: Possible data loss/transformation
     - ❌ **Red X**: Incompatible types
   - Read transformation notes

3. **Field Types**: Guidelines fields are automatically excluded (non-migratable)

4. **Validation**: Ensure critical fields are mapped before proceeding

**Field Type Compatibility Matrix:**

| Source Type | Compatible Target Types |
|-------------|------------------------|
| Text | Text, Rich Text, URL Slug |
| Rich Text | Rich Text, Text |
| Number | Number, Text |
| Multiple Choice | Multiple Choice, Text |
| Date & Time | Date & Time, Text |
| Asset | Asset |
| Linked Items | Linked Items |
| Taxonomy | Taxonomy, Multiple Choice |
| URL Slug | URL Slug, Text |
| Custom Element | Custom Element, Text |

#### Step 3: Item Selection

1. **View Items**: All items from source content type are loaded
2. **Select Items**: 
   - Use checkboxes to select items to migrate
   - Search/filter available
3. **Choose Language**: Select language variant to migrate
4. **Review Selection**: Confirm count and selected items
5. Click **Continue**

**Performance Note**: For large content types (>100 items), consider batching migrations

#### Step 4: Relationship Analysis

The system performs deep analysis of selected items:

**Outgoing Relationships** (→):
- Items that your selected content references
- Shows which linked items will be migrated
- Displays field names and referenced items

**Incoming Relationships** (←):
- Items that reference your selected content
- Critical for understanding impact
- Option to **update incoming references** automatically

**Example Scenario:**
```
Selected Item: "_l2_page_type__contact_us" (Tag)

Outgoing Relationships (0):
  → This tag doesn't reference anything

Incoming Relationships (3):
  ← "mari_contact_page" references this in field "page_type"
  ← "en_contact_page" references this in field "page_type"
  ← "es_contact_page" references this in field "page_type"

✅ Enable "Update incoming references" to automatically 
   update these 3 items to use the new migrated tag
```

**Update Incoming References:**
- ☑️ **Enabled**: Automatically updates all items that reference migrated items
- ☐ **Disabled**: You'll need to manually update references later

📚 **For detailed relationship documentation, see [RELATIONSHIPS.md](./RELATIONSHIPS.md)**

#### Step 5: Migration Execution

1. **Review Configuration**: 
   - Source → Target types
   - Field mappings count
   - Items to migrate count
   - Incoming references count (if enabled)

2. **Monitor Progress**:
   - **Progress Bar**: Shows 0-100% completion
   - **Current Step**: Displays current operation
   - **Real-time Logs**: Color-coded messages
     - 🔵 **Blue (Info)**: Information messages
     - 🟢 **Green (Success)**: Successful operations
     - 🟡 **Yellow (Warning)**: Warnings/skipped items
     - 🔴 **Red (Error)**: Errors/failures

3. **Migration Logs Example**:
```
🚀 Starting migration process...
📝 Migrating item 1/3: Contact Us Tag
  🔄 Starting migration for item: Contact Us Tag
  → Step 1: Fetching source item data...
  → Found 5 source elements
  → Step 2: Fetching target content type structure...
  → Found 8 target elements
  → Step 3: Creating new content item...
  ✅ New content item created (ID: abc123)
  → Step 4: Building field mappings...
    • Mapping: name → title
      ✅ Mapped successfully
  → Step 5: Creating language variant with 6 elements...
  ✅ Migration completed successfully for: Contact Us Tag
✅ Successfully migrated "Contact Us Tag" (ID: abc123)

🔄 Updating incoming references...
📝 Updating 3 incoming references for: Contact Us Tag
  → Updating reference in mari_contact_page
  ✅ Successfully updated reference
  → Updating reference in en_contact_page
  ✅ Successfully updated reference
  → Updating reference in es_contact_page
  ✅ Successfully updated reference

✅ Migration completed successfully! (3 of 3 items migrated)
```

4. **Results Summary**:
   - Total items migrated
   - Success/failure breakdown
   - List of created items with IDs
   - Auto-migrated linked items
   - Updated references count

## 🎯 Advanced Features

### Recursive Linked Item Migration

When migrating items with linked items (modular content) of the same source type:

**Automatic Behavior:**
```
Item A (Source Type) 
  ├── references → Item B (Source Type) ✅ Auto-migrated
  │                ├── references → Item C (Source Type) ✅ Auto-migrated
  │                └── references → Item D (Different Type) ❌ Not migrated
  └── references → Item E (Different Type) ❌ Not migrated
```

**Process:**
1. Detects linked items of same source type
2. Recursively migrates entire hierarchy
3. Generates unique codenames (`original_migrated`)
4. Skips duplicates (checks if `_migrated` version exists)
5. Maintains proper references in migrated structure

**Naming Convention:**
- Original: `contact_us_tag`
- Migrated: `contact_us_tag_migrated`

### Duplicate Prevention & Reuse

The system intelligently handles duplicates:

```typescript
// Check if item already migrated
const migratedCodename = `${sourceCodename}_migrated`;

try {
  const existingItem = await deliveryClient
    .item(migratedCodename)
    .toPromise();
  
  // ✅ Item exists, reuse it
  return { 
    codename: migratedCodename, 
    wasReused: true 
  };
} catch {
  // ❌ Doesn't exist, create new
  return createNewItem();
}
```

**Benefits:**
- Prevents duplicate content creation
- Saves API calls and processing time
- Maintains referential integrity
- Clearly indicates reused items in logs

### Reference Update Workflow

When **Update Incoming References** is enabled:

**Step-by-Step Process:**
```
1. Item is migrated: old_item → new_item_migrated
2. Find all items referencing old_item
3. For each referencing item:
   a. Check if published
   b. If published: Create new draft version
   c. Get field ID (Management API uses IDs, not codenames)
   d. Map old item ID → new item ID
   e. Update reference field
   f. Save variant
   g. Log success/failure
```

**Important Notes:**
- Uses **Item IDs** (not codenames) for reference updates
- Automatically creates new version for published items
- Maps codenames to IDs via Content Type API
- Updates progress bar for each reference

### Comprehensive Reporting

After migration, you receive detailed reports:

**Console Report** (Technical):
```
📊 Migration Summary
─────────────────────────────────────────
Main Items Migrated: 1
Auto-Migrated Linked Items: 2
Already Existed (Skipped): 1
─────────────────────────────────────────

Created Items:
  ✅ contact_us_tag_migrated (Main)
  🔗 related_tag_1_migrated (Auto)
  🔗 related_tag_2_migrated (Auto)
  ⏭️  existing_tag_migrated (Skipped - Already Exists)
```

**UI Report** (Visual):
- ✅ Success/failure status
- � Items migrated list
- 🔗 Auto-migrated items (green badges)
- ⚠️ Skipped items (yellow badges)
- 🔄 Updated references count
- ⏱️ Execution time

📚 **For complete feature documentation and examples, see [FEATURES.md](./FEATURES.md)**

## 🛠️ Technologies Used

- **React 18** with TypeScript
- **Vite** for development and build  
- **Tailwind CSS** for styling
- **Kontent.ai Management SDK** (@kontent-ai/management-sdk-js)
- **Kontent.ai Delivery SDK** (@kontent-ai/delivery-sdk)

## � Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to a Kontent.ai project
- Project API Keys (Management API Key and Preview API Key)

## 🚀 Installation and Setup

### 1. Clone and Install Dependencies

```bash
cd custom-apps/content-type-migration
npm install
```

### 2. Configure Kontent.ai Credentials

Create a `.env.local` file based on `.env.example`:

```bash
# Copy the example file
cp .env.example .env.local

# Edit and add your real credentials
nano .env.local  # or use your preferred editor
```

**Contents of `.env.local`**:
```env
VITE_KONTENT_PROJECT_ID=your-project-id-here
VITE_KONTENT_PREVIEW_API_KEY=your-preview-api-key-here  
VITE_KONTENT_MANAGEMENT_API_KEY=your-management-api-key-here
VITE_APP_URL=https://localhost:3001
VITE_APP_CALLBACK_URL=https://localhost:3001/callback
```

### 3. Generate SSL Certificates (Required for HTTPS)

```bash
# Generate local SSL certificates
openssl req -x509 -out localhost.pem -keyout localhost-key.pem \
  -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -extensions EXT -config <(printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

### 4. Run in Development Mode

```bash
npm run dev
```

The application will be available at **`https://localhost:3001`** (note the HTTPS)

### 5. Configure Custom App in Kontent.ai

1. **Go to App Management** in your Kontent.ai project
2. **Create New Custom App** with these settings:
   - **Name**: Content Type Migration
   - **App URL**: `https://localhost:3001/`
   - **Callback URL**: `https://localhost:3001/callback`
3. **Configure Permissions** (scopes):
   - ✅ `content_item:read` - Read content items
   - ✅ `content_item:write` - Create/update content items
   - ✅ `content_type:read` - Read content types
   - ✅ `language:read` - Read available languages
4. **Save** configuration

### 6. Obtain API Credentials

Go to **Environment Settings > API keys** in your project:

1. **Management API Key**:
   - Copy key from "Management API" section
   - Add as `VITE_KONTENT_MANAGEMENT_API_KEY` in `.env.local`

2. **Preview API Key**:
   - Go to "Delivery API" > "Preview API"
   - Copy Preview API key
   - Add as `VITE_KONTENT_PREVIEW_API_KEY` in `.env.local`

3. **Project ID**:
   - Copy from URL or environment settings
   - Add as `VITE_KONTENT_PROJECT_ID` in `.env.local`

## 🧪 Development Status

### ✅ Completed Features
- [x] Complete project architecture
- [x] Content type selection interface
- [x] Visual field mapping with auto-mapping
- [x] Compatibility validation system
- [x] Content item selection and filtering
- [x] Relationship analysis (outgoing/incoming)
- [x] Recursive linked item migration
- [x] Incoming reference updates
- [x] Real-time progress tracking
- [x] Comprehensive UI logging system
- [x] Duplicate detection and prevention
- [x] Published item workflow handling
- [x] Management API ID mapping
- [x] Error handling and recovery
- [x] Responsive UI design
- [x] TypeScript type safety

### 🚀 Production Ready Features
- Full migration workflow (5 steps)
- Automatic and manual field mapping
- Deep relationship analysis
- Smart linked item handling
- Reference update automation
- Real-time monitoring and logging
- Color-coded progress indicators
- Comprehensive error handling

### 🔮 Future Enhancements
- [ ] Batch processing for large volumes (>1000 items)
- [ ] Migration rollback capability
- [ ] Export/import mapping configurations
- [ ] Scheduled migrations
- [ ] Multi-language batch migration
- [ ] Advanced transformation rules
- [ ] Migration history and audit log
- [ ] Performance optimization for large datasets

## 🔍 API Integration Details

### Management API Usage

**Content Type Operations:**
```typescript
// Get all content types
const types = await managementClient.listContentTypes().toAllPromise();

// Get specific type structure
const type = await managementClient
  .viewContentType()
  .byTypeCodename('article')
  .toPromise();
```

**Content Item Operations:**
```typescript
// Create item
const newItem = await managementClient
  .addContentItem()
  .withData({
    name: 'Item Name',
    type: { codename: 'article' }
  })
  .toPromise();

// Upsert language variant
const variant = await managementClient
  .upsertLanguageVariant()
  .byItemId(itemId)
  .byLanguageId(languageId)
  .withData(builder => ({
    elements: [
      builder.textElement({
        element: { codename: 'title' },
        value: 'Title Text'
      })
    ]
  }))
  .toPromise();

// Create new version (for published items)
await managementClient
  .createNewVersionOfLanguageVariant()
  .byItemCodename('item_codename')
  .byLanguageCodename('en')
  .toPromise();
```

### Delivery API Usage

**Content Retrieval:**
```typescript
// Get item with depth
const item = await deliveryClient
  .item('item_codename')
  .depthParameter(1)
  .languageParameter('en')
  .toPromise();

// List items by type
const items = await deliveryClient
  .items()
  .type('article')
  .toPromise();
```

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For bugs or feature requests, please open an [issue](https://github.com/fanpay/content-type-migration/issues) on GitHub.

## 📚 Additional Documentation

- **[FEATURES.md](./FEATURES.md)** - Detailed feature documentation
- **[RELATIONSHIPS.md](./RELATIONSHIPS.md)** - Relationship analysis guide
- **[API.md](./API.md)** - API integration details (if exists)

## 🙏 Acknowledgments

- Built for [Kontent.ai](https://kontent.ai/)
- Uses Kontent.ai Management and Delivery SDKs
- Designed for content migration workflows
