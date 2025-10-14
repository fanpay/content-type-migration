# Content Item Relationships Analysis

## Overview

The Relationship Viewer (Step 4) provides comprehensive analysis of content item relationships, showing both **outgoing** and **incoming** relationships for selected items before migration.

## Features

### 🔍 Relationship Types

#### 1. **Outgoing Relationships** (Blue → )
Items that the selected content item **references** through modular_content fields.

**Example:**
- `mari_contact_page` (Page type) → references → `_l2_page_type__contact_us` (Tag type)
- The page has a field that links to the tag

#### 2. **Incoming Relationships** (Green ← )
Items that **reference** the selected content item through their modular_content fields.

**Example:**
- `_l2_page_type__contact_us` (Tag type) ← referenced by ← `mari_contact_page` (Page type)
- The tag is used by the page

## How It Works

### 1. Data Collection

The system performs API calls with depth=1:

```typescript
// For each selected item, get detailed info with related items
GET /items/{codename}?depth=1
```

### 2. Analysis Process

For each selected item:
- **Outgoing**: Scans all `modular_content` fields to find linked items
- **Incoming** (Limited): Checks if any of the loaded related items also reference back to this item

**Important Limitation:** Incoming relationships are only detected from items already loaded in the response (depth=1). This means:
- ✅ You'll see bidirectional relationships between items
- ⚠️ You might miss incoming relationships from items not directly connected
- 💡 For complete incoming relationship analysis, use Kontent.ai UI or export all content

### 3. Display

Results are shown in an expandable view:

```
📊 Selected Item
   ├─ → Outgoing Relationships (items this references)
   │   └─ 🔗 Field Name
   │       └─ 📄 Referenced Item (type, codename)
   │
   └─ ← Incoming Relationships (items referencing this)
       └─ 📄 Parent Item (type, codename)
           └─ via field: field_name
```

## UI Components

### Summary Cards

1. **Selected Items**: Total number of items you're migrating
2. **Items with Relationships**: Count of items that have any relationships
3. **Total Relationships**: Sum of outgoing + incoming relationships

### Relationship Details (Expandable)

#### Outgoing (Blue Cards)
- Field name that contains the relationship
- Referenced item name, codename, and type
- Visual indication with → arrow

#### Incoming (Green Cards)
- Parent item name, codename, and type
- Field name in parent that creates the relationship
- Visual indication with ← arrow

### Items Without Relationships

Green section listing items that have no relationships (independent items).

## Example Scenario

### Selected Item: `_l2_page_type__contact_us` (Tag type)

**Outgoing Relationships**: None
- This tag doesn't reference other items

**Incoming Relationships**: Found!
- `mari_contact_page` (Type: `_page`)
  - via field: "Page Type Tags"
  - Meaning: The contact page uses this tag in its "Page Type Tags" field

## Use Cases

### 1. Migration Planning
Understand dependencies before migrating:
- See what items will be affected
- Identify potential migration order issues
- Plan for recursive migration needs

### 2. Content Audit
- Find orphaned items (no relationships)
- Discover unexpected connections
- Validate content structure

### 3. Quality Assurance
- Verify relationship integrity
- Ensure no broken links after migration
- Confirm field mappings are correct

## Technical Details

### Performance Considerations

- **API Calls**: One call per selected item with `depth=1`
- **Loading Time**: Depends on number of selected items and their complexity
- **Caching**: Results are calculated once per item selection
- **Incoming Relationships**: Limited to items loaded in depth=1 response (performance optimization)

### API Limitations

- Uses Delivery API with `depth=1` to get linked items
- Preview API key required for draft content access
- Rate limits apply based on Kontent.ai plan
- **Incoming relationships detection is limited to directly connected items** (depth=1 scope)

**Why limited incoming relationships?**
- ✅ Prevents API rate limiting
- ✅ Faster loading times
- ✅ No timeouts on large projects
- ⚠️ May not show ALL items using your content
- 💡 For complete analysis, use Kontent.ai UI's "Used in" feature

### Data Structure

```typescript
interface ItemRelationship {
  itemId: string;
  itemName: string;
  itemCodename: string;
  itemType: string;
  outgoingRelationships: RelationshipInfo[];
  incomingRelationships: IncomingRelationship[];
}

interface RelationshipInfo {
  fieldName: string;
  fieldType: string;
  relatedItems: Array<{
    id: string;
    name: string;
    codename: string;
    type: string;
  }>;
}

interface IncomingRelationship {
  fromItemId: string;
  fromItemName: string;
  fromItemCodename: string;
  fromItemType: string;
  fieldName: string;
}
```

## Best Practices

1. **Review Before Migration**: Always check relationships to understand impact
2. **Plan Order**: Migrate referenced items before items that reference them
3. **Verify Mappings**: Ensure field mappings preserve relationship structures
4. **Check Incoming**: Pay attention to incoming relationships - these items won't be migrated but will still reference your content

## Troubleshooting

### "No relationships found"
- ✅ Normal for independent content items
- Items might use other relationship types (taxonomy, assets)
- Check if items have modular_content fields

### "Loading takes too long"
- Large project with many items
- Network latency to Kontent.ai API
- Consider filtering items before this step

### "Missing incoming relationships"
- Items might be in different language variant
- Check API key has access to all content
- Verify depth parameter is working

## Future Enhancements

Potential improvements:
- [ ] Filter by relationship type
- [ ] Export relationship graph
- [ ] Visual diagram of connections
- [ ] Search/filter within relationships
- [ ] Show asset and taxonomy relationships
- [ ] Pagination for large relationship sets
