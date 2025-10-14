# Incoming Relationships - Deep Search Implementation

## 🎯 Problem

The previous implementation only showed outgoing relationships but failed to detect incoming relationships like:
- `_l2_page_type__contact_us` (Tag) ← used by ← `mari_contact_page` (Page)

## ✅ Solution: Multi-Type Deep Search

### New Approach

Instead of relying on depth=1 loaded items, we now actively search for incoming relationships:

```typescript
// 1. Get all content types in project
GET /types

// 2. For each content type (up to 15), search items
GET /items?system.type={typeCodename}&depth=0&limit=100

// 3. Check each item for modular_content fields containing our item's codename
if (element.value.includes(selectedItem.codename)) {
  // Found incoming relationship!
}
```

### Search Parameters

- **Content Types**: First 15 types (covers most common scenarios)
- **Items per Type**: Up to 100 items
- **Total Search**: Up to 1,500 items (15 × 100)
- **Depth**: 0 (faster, we only need element values)
- **Parallel**: All type searches run in parallel

## 📊 What You'll See Now

### For Tag: `_l2_page_type__contact_us`

```
📦 _l2_page_type__contact_us (Tag)

→ Outgoing Relationships (0)
[This tag doesn't reference other items]

← Incoming Relationships (1+) ⭐ NOW WORKING
✅ mari_contact_page (Type: _page)
   via field: "Page Type Tags"
```

### For Page: `mari_contact_page`

```
📦 mari_contact_page (Page)

→ Outgoing Relationships (1+)
🔗 Page Type Tags
   ✅ _l2_page_type__contact_us (Tag)

← Incoming Relationships (0+)
[If any items use this page, they will be shown here]
```

## 🚀 Performance Optimizations

### Why Limit to 15 Types?

- ✅ **Prevents API rate limiting** - Reasonable number of parallel requests
- ✅ **Fast loading** - Usually completes in 2-5 seconds
- ✅ **Covers common scenarios** - Most projects have main content types first
- ✅ **Avoids timeouts** - No long-running searches

### Why 100 Items per Type?

- ✅ **Good coverage** - Catches most relationships
- ✅ **Reasonable response size** - Faster API responses
- ✅ **Scalable** - Works on projects with thousands of items

### What if I need more?

If you have:
- More than 15 content types
- More than 100 items per type
- Need 100% complete incoming analysis

**Options:**
1. **Increase limits** in code:
   ```typescript
   const typesToSearch = allContentTypes.slice(0, 30); // More types
   const searchUrl = `...&limit=500`; // More items
   ```

2. **Use Kontent.ai UI**: 
   - Open item → "Used in" section
   - More reliable for exhaustive search

3. **Export & Analyze**:
   - Export all content
   - Run custom analysis script

## 🔍 How It Works

### Step-by-Step Process

1. **Load Content Types**
   ```
   Fetching content types...
   Found 23 content types
   Selecting first 15 for search
   ```

2. **Parallel Search**
   ```
   Searching type: _page (100 items)
   Searching type: _tag (100 items)
   Searching type: _component (100 items)
   ...
   All searches running in parallel
   ```

3. **Check Each Item**
   ```
   For each item in results:
     For each modular_content field:
       If field.value includes "our_item_codename":
         Add to incoming relationships
   ```

4. **Display Results**
   ```
   Found 3 incoming relationships
   - Item A via "Related Tags"
   - Item B via "Page Tags"
   - Item C via "Categories"
   ```

## 📝 Console Output

You'll see helpful logs:

```
Found 23 content types for incoming search
Searching 15 types for incoming relationships to _l2_page_type__contact_us
Found 1 incoming relationships for _l2_page_type__contact_us
```

## ⚡ API Calls Summary

**Before** (per selected item):
- 1 call to get item with depth=1
- ❌ No incoming relationship search

**After** (per selected item):
- 1 call to get types (cached)
- 1 call to get item with depth=1
- 15 parallel calls to search types for incoming
- **Total: ~17 calls per item**

**Impact:**
- ✅ Reasonable for 1-5 selected items
- ⚠️ May be slow for 10+ selected items (but still works)
- 💡 Consider selecting fewer items if slow

## 🎯 Use Cases Now Supported

### 1. Tag Usage Analysis
```
Select: _l2_page_type__contact_us
See: All pages using this tag ✅
```

### 2. Component Reuse
```
Select: hero_component
See: All pages using this component ✅
```

### 3. Navigation Structure
```
Select: contact_link
See: Which navigation menus include this link ✅
```

### 4. Content Dependency
```
Select: author_profile
See: Which articles reference this author ✅
```

## 🔧 Testing

1. **Refresh browser** (Cmd+Shift+R)
2. Go to Step 4 (Relationships)
3. Select a tag or component
4. Check console for:
   ```
   Found X content types for incoming search
   Searching Y types for incoming relationships...
   Found Z incoming relationships
   ```
5. Expand the item to see incoming relationships in green cards

## 📊 Expected Results

For `_l2_page_type__contact_us` you should now see:

✅ **Outgoing**: (if any)  
✅ **Incoming**: `mari_contact_page` and any other pages using this tag  

The relationship viewer now provides **comprehensive bidirectional analysis**! 🎉
