# Management API - Actualización de Referencias

## ✅ Implementación Completa

La funcionalidad de actualización automática de referencias incoming está **totalmente implementada** y lista para usar.

## 🔧 Funciones Implementadas

### 1. `updateItemReference()`

Actualiza una referencia específica en un campo modular_content de un item.

**Ubicación**: `src/services/kontentServiceFixed.ts`

**Parámetros**:
```typescript
async updateItemReference(
  itemCodename: string,        // Codename del item a actualizar
  fieldCodename: string,        // Codename del campo a actualizar
  oldReference: string,         // Referencia antigua a reemplazar
  newReference: string,         // Nueva referencia
  languageCodename: string = 'en'  // Idioma (default: 'en')
): Promise<{ success: boolean; error?: string }>
```

**Ejemplo de uso**:
```typescript
const result = await kontentServiceFixed.updateItemReference(
  'mari_contact_page',          // Item que contiene la referencia
  'tags',                       // Campo que contiene la referencia
  '_l2_page_type__contact_us',  // Referencia antigua (item original)
  'new_tag_item_123',           // Nueva referencia (item migrado)
  'en'                          // Idioma
);

if (result.success) {
  console.log('✅ Referencia actualizada');
} else {
  console.error('❌ Error:', result.error);
}
```

**Proceso interno**:
1. Obtiene el language variant actual del item
2. Encuentra el campo especificado
3. Reemplaza la referencia antigua por la nueva en el array
4. Actualiza el variant usando Management API
5. Retorna resultado

### 2. `updateMultipleReferences()`

Actualiza múltiples referencias en diferentes campos del mismo item en una sola operación.

**Parámetros**:
```typescript
async updateMultipleReferences(
  itemCodename: string,
  updates: Array<{
    fieldCodename: string;
    oldReference: string;
    newReference: string;
  }>,
  languageCodename: string = 'en'
): Promise<{ 
  success: boolean; 
  updatedFields: number; 
  error?: string 
}>
```

**Ejemplo de uso**:
```typescript
const result = await kontentServiceFixed.updateMultipleReferences(
  'mari_contact_page',
  [
    {
      fieldCodename: 'tags',
      oldReference: 'old_tag_1',
      newReference: 'new_tag_1'
    },
    {
      fieldCodename: 'related_items',
      oldReference: 'old_item_2',
      newReference: 'new_item_2'
    }
  ],
  'en'
);

console.log(`Actualizados ${result.updatedFields} campos`);
```

**Ventajas**:
- Más eficiente que múltiples llamadas individuales
- Actualiza el item una sola vez
- Reduce el número de API calls

## 🚀 Integración en el Flujo de Migración

### App.tsx - Implementación

La actualización se ejecuta automáticamente después de la migración si el usuario marca el checkbox:

```typescript
// En handleExecuteMigration()
if (updateIncomingReferences && itemRelationships.length > 0) {
  console.log('🔄 Updating incoming references...');
  
  for (const relationship of itemRelationships) {
    if (relationship.incomingRelationships.length === 0) continue;
    
    const migrationResult = results.find(r => r.sourceItem.id === relationship.itemId);
    if (!migrationResult || migrationResult.status !== 'success') {
      continue;
    }
    
    const newItemId = migrationResult.newItemId;
    const oldItemCodename = relationship.itemCodename;
    
    for (const incomingRef of relationship.incomingRelationships) {
      const updateResult = await kontentServiceFixed.updateItemReference(
        incomingRef.fromItemCodename,
        incomingRef.fieldName,
        oldItemCodename,
        newItemId,
        selectedLanguage
      );
      
      if (updateResult.success) {
        console.log(`✅ Updated ${incomingRef.fromItemName}`);
      }
    }
  }
}
```

### Flujo Completo

```
1. Usuario selecciona items a migrar
   ↓
2. Step 4: Ver relaciones
   - Detecta incoming relationships
   - Usuario marca checkbox "Update references"
   ↓
3. Step 5: Ejecutar migración
   - Migra todos los items seleccionados
   - Crea nuevos items con nuevo content type
   ↓
4. Actualización automática de referencias
   - Para cada item migrado exitosamente:
     → Encuentra items que lo referencian
     → Actualiza campo por campo
     → Reemplaza codename antiguo → codename nuevo
   ↓
5. Resultado
   ✅ Items migrados
   ✅ Referencias actualizadas
   ✅ Todo funcional
```

## 📊 Logs y Debugging

### Logs de Actualización Exitosa

```
🔄 Updating incoming references...
📝 Updating 3 incoming references for _l2_page_type__contact_us
  → Updating mari_contact_page (field: tags)
  🔄 Updating reference in mari_contact_page.tags: _l2_page_type__contact_us → new_tag_123
    Original value: ['_l2_page_type__contact_us', 'other_tag']
    Updated value: ['new_tag_123', 'other_tag']
  ✅ Successfully updated reference in mari_contact_page
```

### Logs de Error

```
❌ Failed to update reference: Language variant not found for item_x in en
```

## 🔐 Requisitos de Configuración

### Variables de Entorno Necesarias

```env
VITE_KONTENT_PROJECT_ID=your-project-id
VITE_KONTENT_MANAGEMENT_API_KEY=your-management-api-key
VITE_KONTENT_PREVIEW_API_KEY=your-preview-api-key
```

### Permisos Requeridos

El Management API Key debe tener permisos para:
- ✅ **View content items** (leer variants)
- ✅ **Edit content items** (actualizar variants)
- ✅ **Manage languages** (acceder a language variants)

## ⚠️ Consideraciones Importantes

### 1. Language Variants

**Comportamiento actual**:
- Solo actualiza el idioma seleccionado durante la migración
- Si el item tiene múltiples idiomas, solo se actualiza uno

**Mejora futura**:
```typescript
// Obtener todos los idiomas del item
const languages = await getItemLanguages(itemCodename);

// Actualizar en todos los idiomas
for (const lang of languages) {
  await updateItemReference(itemCodename, field, old, new, lang);
}
```

### 2. Workflow States

**Importante**: 
- El Management API respeta el workflow state
- Si un item está "Published", la actualización lo dejará en "Draft"
- Necesitarás re-publicar manualmente después

**Solución futura**:
```typescript
// Guardar estado original
const originalWorkflow = await getWorkflowState(itemCodename);

// Actualizar referencias
await updateItemReference(...);

// Restaurar workflow state
if (originalWorkflow === 'published') {
  await publishItem(itemCodename, languageCodename);
}
```

### 3. Manejo de Errores

**Estrategia actual**:
- Si falla una actualización, continúa con las demás
- Los errores se loguean pero no detienen el proceso
- No hay rollback automático

**Mejor práctica**:
```typescript
const updates = [];
const errors = [];

for (const ref of references) {
  const result = await updateItemReference(...);
  if (result.success) {
    updates.push(ref);
  } else {
    errors.push({ ref, error: result.error });
  }
}

// Si hay errores críticos, considerar rollback
if (errors.length > updates.length / 2) {
  console.warn('Too many errors, consider rollback');
}
```

## 🧪 Testing

### Test Case 1: Single Reference Update

**Setup**:
```typescript
// Item: mari_contact_page
// Field: tags
// Old value: ['_l2_page_type__contact_us', 'another_tag']
// Expected: ['new_migrated_tag', 'another_tag']
```

**Test**:
```typescript
const result = await kontentServiceFixed.updateItemReference(
  'mari_contact_page',
  'tags',
  '_l2_page_type__contact_us',
  'new_migrated_tag',
  'en'
);

expect(result.success).toBe(true);
```

### Test Case 2: Multiple Items Referencing Same Item

**Setup**:
```typescript
// Tag: _l2_page_type__contact_us
// Used by: mari_contact_page, another_page, third_page
```

**Test**:
```typescript
const references = [
  { itemCodename: 'mari_contact_page', field: 'tags' },
  { itemCodename: 'another_page', field: 'tags' },
  { itemCodename: 'third_page', field: 'related_items' }
];

for (const ref of references) {
  const result = await kontentServiceFixed.updateItemReference(
    ref.itemCodename,
    ref.field,
    'old_tag',
    'new_tag',
    'en'
  );
  
  expect(result.success).toBe(true);
}
```

### Test Case 3: Non-existent Field

**Expected**: Debería fallar gracefully

```typescript
const result = await kontentServiceFixed.updateItemReference(
  'mari_contact_page',
  'non_existent_field',
  'old',
  'new',
  'en'
);

expect(result.success).toBe(false);
expect(result.error).toContain('Field non_existent_field not found');
```

## 📈 Performance

### Optimizaciones Implementadas

1. **Batch Updates**: `updateMultipleReferences()` reduce API calls
2. **Error Handling**: No detiene por un error individual
3. **Logging Detallado**: Facilita debugging

### Métricas Esperadas

- **1 referencia**: ~500ms
- **10 referencias**: ~3-5 segundos
- **100 referencias**: ~30-50 segundos

### Mejoras Futuras

```typescript
// Parallel updates (cuidado con rate limits)
const updates = references.map(ref => 
  kontentServiceFixed.updateItemReference(...)
);
await Promise.all(updates);

// Batch API (si Kontent.ai lo soporta en el futuro)
await kontentServiceFixed.batchUpdateReferences(allUpdates);
```

## 🎯 Próximos Pasos

### Funcionalidades a Agregar

1. **Multi-language Support**
   - Detectar idiomas del item
   - Actualizar en todos los idiomas

2. **Workflow Preservation**
   - Guardar estado de workflow
   - Restaurar después de actualizar

3. **Rollback Mechanism**
   - Backup antes de actualizar
   - Revertir en caso de error

4. **Progress Tracking**
   - UI para mostrar progreso
   - Barra de progreso para actualizaciones masivas

5. **Validation**
   - Verificar que las referencias existen
   - Validar permisos antes de actualizar

## 📚 Referencias

- [Management SDK Documentation](https://github.com/kontent-ai/management-sdk-js)
- [Upsert Language Variant API](https://kontent.ai/learn/reference/management-api-v2#operation/upsert-a-language-variant)
- [Delivery SDK - itemUsedIn()](https://github.com/kontent-ai/delivery-sdk-js)
