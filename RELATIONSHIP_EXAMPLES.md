# Visual Relationship Examples

## Example 1: Tag Used in Multiple Pages

### Content Structure
```
┌─────────────────────────────────────┐
│  _l2_page_type__contact_us (Tag)   │  ← Selected Item
└─────────────────────────────────────┘
         ↑              ↑
         │              │
         │              │
    (used by)      (used by)
         │              │
         │              │
┌────────┴─────┐  ┌─────┴───────┐
│mari_contact  │  │mari_about   │
│_page (Page)  │  │_page (Page) │
└──────────────┘  └─────────────┘
```

### What You See in Step 4

```
📦 _l2_page_type__contact_us
   Type: _tag
   
   → Outgoing Relationships (0)
   [No items referenced by this tag]
   
   ← Incoming Relationships (2)
   
   ✅ mari_contact_page
      Type: _page
      via field: "Page Type Tags"
      
   ✅ mari_about_page
      Type: _page
      via field: "Page Type Tags"
```

## Example 2: Page with Multiple Related Items

### Content Structure
```
┌─────────────────────────────┐
│  mari_contact_page (Page)   │  ← Selected Item
└─────────────────────────────┘
         │              │
         │              │
   (references)    (references)
         │              │
         ↓              ↓
┌────────┴──────┐  ┌───┴─────────────┐
│_l2_page_type  │  │contact_form     │
│__contact_us   │  │_component       │
│(Tag)          │  │(Component)      │
└───────────────┘  └─────────────────┘
```

### What You See in Step 4

```
📦 mari_contact_page
   Type: _page
   
   → Outgoing Relationships (2)
   
   🔗 Page Type Tags
      ✅ _l2_page_type__contact_us
         Type: _tag
         
   🔗 Form Component
      ✅ contact_form_component
         Type: _component
   
   ← Incoming Relationships (1)
   
   ✅ main_navigation
      Type: _navigation
      via field: "Menu Items"
```

## Example 3: Shared Component

### Content Structure
```
                 ┌─────────────────┐
           ┌────→│  Page A         │
           │     └─────────────────┘
           │
┌──────────┴──────┐     ┌─────────────────┐
│  hero_component │←────│  Page B         │
│  (Component)    │     └─────────────────┘
└──────────┬──────┘
           │     ┌─────────────────┐
           └────→│  Page C         │
                 └─────────────────┘
                 
      ↑ Selected Item
```

### What You See in Step 4

```
📦 hero_component
   Type: _component
   
   → Outgoing Relationships (0)
   [This component doesn't reference other items]
   
   ← Incoming Relationships (3)
   
   ✅ page_a
      Type: _page
      via field: "Hero Section"
      
   ✅ page_b
      Type: _page
      via field: "Hero Section"
      
   ✅ page_c
      Type: _page
      via field: "Top Component"
```

## Example 4: Navigation Structure

### Content Structure
```
┌──────────────────────┐
│  main_navigation     │
└──────────────────────┘
         │
    (references)
         │
    ┌────┴────┬─────────┬──────────┐
    ↓         ↓         ↓          ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Home    │ │About   │ │Contact │ │Blog    │
│Link    │ │Link    │ │Link    │ │Link    │
└────────┘ └────────┘ └────────┘ └────────┘
```

### What You See When Selecting a Link

```
📦 contact_link
   Type: _nav_item
   
   → Outgoing Relationships (1)
   
   🔗 Target Page
      ✅ mari_contact_page
         Type: _page
   
   ← Incoming Relationships (1)
   
   ✅ main_navigation
      Type: _navigation
      via field: "Navigation Items"
```

## Example 5: Complex Hierarchy

### Content Structure
```
┌──────────────────────┐
│  Article Page        │
└──────────────────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    │         │         │          │
    ↓         ↓         ↓          ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Author  │ │Tags    │ │Related │ │Images  │
│Info    │ │(3)     │ │Articles│ │(2)     │
└────┬───┘ └────────┘ └────┬───┘ └────────┘
     │                     │
     ↓                     ↓
┌────────┐           ┌────────┐
│Author  │           │Article │
│Profile │           │1, 2    │
└────────┘           └────────┘
```

### What You See When Selecting Article

```
📦 article_page
   Type: _article
   
   → Outgoing Relationships (8)
   
   🔗 Author
      ✅ author_info_component
         Type: _author_info
         
   🔗 Tags
      ✅ tag_technology
      ✅ tag_tutorial
      ✅ tag_beginner
         
   🔗 Related Articles
      ✅ related_article_1
      ✅ related_article_2
         
   🔗 Gallery
      ✅ image_component_1
      ✅ image_component_2
   
   ← Incoming Relationships (2)
   
   ✅ blog_listing_page
      Type: _listing
      via field: "Featured Articles"
      
   ✅ home_page
      Type: _page
      via field: "Latest Content"
```

## Color Legend

| Symbol | Color | Meaning |
|--------|-------|---------|
| → | 🔵 Blue | Outgoing: Items this content references |
| ← | 🟢 Green | Incoming: Items referencing this content |
| 🔗 | - | Field name containing the relationship |
| ✅ | - | Related item |

## UI Interaction

```
┌─────────────────────────────────────────────────────────┐
│  📦 Item Name                                    ▼      │ ← Click to expand
├─────────────────────────────────────────────────────────┤
│                                                          │
│  → Outgoing Relationships (3)                           │ ← Blue section
│  ┌────────────────────────────────────────────────┐    │
│  │ 🔗 Field Name                                  │    │
│  │    ✅ Referenced Item (Type: _type)            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ← Incoming Relationships (5)                           │ ← Green section
│  ┌────────────────────────────────────────────────┐    │
│  │ ✅ Parent Item (Type: _page)                   │    │
│  │    via field: "Field Name"                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Migration Impact Analysis

### Before Seeing Relationships
```
❓ "Can I safely migrate this tag?"
❓ "What will be affected?"
❓ "Which pages use this component?"
```

### After Seeing Relationships
```
✅ "This tag is used by 5 pages"
✅ "I need to update these 5 pages after migration"
✅ "These pages will need field mapping updates"
✅ "I can see the exact field names to check"
```
