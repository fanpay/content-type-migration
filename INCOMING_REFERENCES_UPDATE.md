# Actualización Automática de Referencias Entrantes (Incoming References)

## Descripción General

Esta funcionalidad permite actualizar automáticamente las referencias en otros content items cuando se migra un item a un nuevo content type.

## Problema que Resuelve

Cuando un content item A es referenciado por otros items (B, C, D...) y se migra A a un nuevo content type:
- Se crea un nuevo item A' con el nuevo content type
- Los items B, C, D siguen apuntando al item A original
- **Sin esta funcionalidad**: Las referencias quedan rotas o apuntando al item antiguo
- **Con esta funcionalidad**: Las referencias se actualizan automáticamente para apuntar a A'

## Flujo de Trabajo

### Paso 1: Detección de Relaciones (Step 4)

En el **ItemRelationshipsViewer**, el usuario puede ver:

1. **Outgoing Relationships** (→): Items a los que este item apunta
2. **Incoming Relationships** (←): Items que apuntan a este item

```
Example:
_l2_page_type__contact_us (Tag)
  
  Incoming Relationships (← 1):
  - FROM: mari_contact_page (type: _page)
    VIA FIELD: tags
```

### Paso 2: Opción de Actualización

Si existen incoming relationships, aparece un checkbox:

```tsx
🔄 Update incoming references after migration

When enabled, items that reference the migrated content will be 
automatically updated to point to the new migrated item with the 
new content type.
```

### Paso 3: Confirmación

Al marcar el checkbox, se muestra información detallada:

```
⚠️ What will happen:
• The original item will be migrated to the new content type
• A new item with the new content type will be created
• All incoming references will be updated to point to the new item
• The original item will remain unchanged (unless you delete it manually)

Total items to update: X
```

### Paso 4: Ejecución (Step 5)

En el **Migration Summary** se muestra:

```
Migration Summary
Source: _tag
Target: new_tag_type
Items to migrate: 1
Mapped fields: 3

🔄 Update incoming references: Enabled
   Total items to update: 5
```

### Paso 5: Proceso de Actualización

1. **Migrar todos los items**
   ```typescript
   for (const item of selectedItems) {
     const result = await migrateContentItem(item, ...);
     results.push(result);
   }
   ```

2. **Actualizar referencias entrantes** (si está habilitado)
   ```typescript
   if (updateIncomingReferences) {
     for (const relationship of itemRelationships) {
       for (const incomingRef of relationship.incomingRelationships) {
         // 1. Obtener el item que contiene la referencia
         // 2. Encontrar el campo con la referencia
         // 3. Reemplazar old codename → new item ID
         // 4. Actualizar via Management API
       }
     }
   }
   ```

## Implementación Técnica

### 1. Tipos de Datos

```typescript
interface IncomingRelationship {
  fromItemId: string;           // ID del item que contiene la referencia
  fromItemName: string;          // Nombre del item
  fromItemCodename: string;      // Codename del item
  fromItemType: string;          // Tipo del item
  fieldName: string;             // Campo que contiene la referencia
}

interface ItemRelationship {
  itemId: string;
  itemName: string;
  itemCodename: string;
  itemType: string;
  outgoingRelationships: RelationshipInfo[];
  incomingRelationships: IncomingRelationship[];
}
```

### 2. Estados en App.tsx

```typescript
const [updateIncomingReferences, setUpdateIncomingReferences] = useState(false);
const [itemRelationships, setItemRelationships] = useState<any[]>([]);
```

### 3. Flujo de Datos

```
ItemRelationshipsViewer
  ↓ (onContinue)
  { updateIncomingReferences: boolean, relationships: ItemRelationship[] }
  ↓
App.handleContinueToMigration
  ↓
setUpdateIncomingReferences(...)
setItemRelationships(...)
  ↓
Step 5: Execute Migration
  ↓
handleExecuteMigration()
  → Migrate all items
  → If updateIncomingReferences: Update references
```

### 4. Detección de Referencias con SDK

```typescript
// Usando SDK v16.3.0
const deliveryClient = createDeliveryClient({
  environmentId: PROJECT_ID,
  previewApiKey: PREVIEW_API_KEY,
  defaultQueryConfig: {
    usePreviewMode: true,
  },
});

const usedInResponse = await deliveryClient
  .itemUsedIn(item.codename)
  .toAllPromise();

// usedInResponse.data.items contiene todos los items que usan este item
```

### 5. Actualización de Referencias (TODO)

```typescript
// PENDIENTE: Implementar usando Management API
import { ManagementClient } from '@kontent-ai/management-sdk';

const client = new ManagementClient({
  projectId: PROJECT_ID,
  apiKey: MANAGEMENT_API_KEY,
});

// Actualizar el item
await client
  .upsertLanguageVariant()
  .byItemCodename(incomingRef.fromItemCodename)
  .byLanguageCodename(languageCodename)
  .withData((builder) => {
    return {
      elements: [
        {
          element: {
            codename: incomingRef.fieldName
          },
          value: updatedValue  // Array con el nuevo codename
        }
      ]
    };
  })
  .toPromise();
```

## UI/UX Mejoras

### 1. Dropdown Fix

**Problema**: Dropdowns con fondo negro
**Solución**: Cambiar `<div>` por `<button>` con clase `bg-gray-50`

```tsx
// Antes
<div className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100" onClick={...}>

// Después  
<button className="w-full bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 text-left" onClick={...}>
```

### 2. Checkbox de Actualización

```tsx
<input
  type="checkbox"
  id="updateReferences"
  checked={updateIncomingReferences}
  onChange={(e) => setUpdateIncomingReferences(e.target.checked)}
  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
/>
```

### 3. Información Contextual

- **Color amarillo** para warnings/opciones importantes
- **Iconos**: 🔄 para actualización, ⚠️ para advertencias
- **Contador dinámico** de items a actualizar
- **Expansión condicional** de detalles al marcar checkbox

## Limitaciones Actuales

1. **Management API no implementada**: 
   - La lógica de detección está completa
   - La actualización de referencias está preparada
   - Falta implementar la llamada al Management API

2. **Manejo de Errores**:
   - Si falla la actualización de una referencia, continúa con las demás
   - Los errores se loguean en consola
   - No se revierten cambios automáticamente

3. **Idiomas**:
   - Actualmente usa el idioma seleccionado en la migración
   - No maneja múltiples variantes de idioma automáticamente

## Próximos Pasos

### 1. Implementar Management API Update
```typescript
// En kontentService.ts
export async function updateItemReferences(
  itemCodename: string,
  fieldCodename: string,
  newReferences: string[],
  languageCodename: string
) {
  // Implementar usando Management SDK
}
```

### 2. Agregar Rollback
```typescript
// Si falla alguna actualización, revertir cambios
const backup = await backupItemState(item);
try {
  await updateReferences(...);
} catch (error) {
  await restoreItemState(backup);
}
```

### 3. Soporte Multi-idioma
```typescript
// Actualizar en todos los idiomas del item
for (const language of item.languages) {
  await updateReferences(item, field, newValue, language);
}
```

### 4. Preview de Cambios
```typescript
// Mostrar qué se va a actualizar antes de hacerlo
interface ReferenceUpdate {
  itemName: string;
  fieldName: string;
  oldValue: string[];
  newValue: string[];
}

const previewUpdates: ReferenceUpdate[] = calculateUpdates(relationships);
```

## Testing

### Caso de Prueba 1: Tag → New Tag Type

**Setup**:
- Tag: `_l2_page_type__contact_us`
- Página: `mari_contact_page` (referencia al tag en campo `tags`)
- Migrar tag a nuevo tipo

**Esperado**:
1. ✅ Detecta 1 incoming relationship
2. ✅ Muestra checkbox de actualización
3. ✅ Al migrar, crea nuevo tag con nuevo tipo
4. ⚠️ Actualiza referencia en página (pendiente Management API)

### Caso de Prueba 2: Múltiples Referencias

**Setup**:
- Item A referenciado por items B, C, D
- Migrar A a nuevo tipo

**Esperado**:
1. ✅ Detecta 3 incoming relationships
2. ✅ Muestra "Total items to update: 3"
3. ✅ Actualiza las 3 referencias

## Referencias

- [Kontent.ai Management SDK](https://github.com/kontent-ai/management-sdk-js)
- [Delivery SDK - itemUsedIn()](https://github.com/kontent-ai/delivery-sdk-js#item-used-in)
- [Management API - Upsert Language Variant](https://kontent.ai/learn/reference/management-api-v2#operation/upsert-a-language-variant)
