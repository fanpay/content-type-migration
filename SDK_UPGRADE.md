# SDK Upgrade - Using itemUsedIn() Method

## Resumen

Se actualizó el código para usar el método `itemUsedIn()` del Kontent.ai Delivery SDK v16.3.0 en lugar de llamadas directas al API REST.

## Versiones del SDK

### Anterior
```json
"@kontent-ai/delivery-sdk": "^14.8.0"
```

### Actual
```json
"@kontent-ai/delivery-sdk": "^16.3.0"
"@kontent-ai/management-sdk": "^7.11.0"
"@kontent-ai/smart-link": "^5.0.1"
```

## Cambios Implementados

### Antes (API REST directo)
```typescript
const usedInResponse = await fetch(
  `https://deliver.kontent.ai/${projectId}/items/${item.codename}/used-in`,
  {
    headers: {
      'Authorization': `Bearer ${previewApiKey}`,
    },
  }
);

if (usedInResponse.ok) {
  const usedInData = await usedInResponse.json();
  // procesar resultados...
}
```

### Después (SDK v16.3.0)
```typescript
const deliveryClient = createDeliveryClient({
  environmentId: import.meta.env.VITE_KONTENT_PROJECT_ID,
  previewApiKey: import.meta.env.VITE_KONTENT_PREVIEW_API_KEY,
  defaultQueryConfig: {
    usePreviewMode: true,
  },
});

const usedInResponse = await deliveryClient
  .itemUsedIn(item.codename)
  .toAllPromise();

// usedInResponse.data.items contiene todos los items que usan este item
```

## Ventajas del SDK

### 1. **Type Safety**
- El SDK proporciona tipos TypeScript completos
- Mejor IntelliSense en el editor
- Detección de errores en tiempo de compilación

### 2. **Manejo de Errores**
- El SDK maneja automáticamente errores de red
- Reintentos automáticos configurables
- Mensajes de error más descriptivos

### 3. **Paginación Automática**
- `.toAllPromise()` maneja automáticamente la paginación
- No necesitas gestionar manualmente el continuation token
- Obtiene TODOS los resultados sin límites

### 4. **Mantenibilidad**
- Código más limpio y legible
- Menos código boilerplate
- Actualizaciones del SDK traen mejoras automáticas

### 5. **Funcionalidad Adicional**
- Filtros y queries adicionales disponibles
- Caché integrado (si se configura)
- Soporte para preview mode ya incluido

## Método itemUsedIn()

### Descripción
El método `itemUsedIn()` devuelve todos los content items que referencian/usan el item especificado.

### Sintaxis
```typescript
deliveryClient.itemUsedIn(itemCodename: string): UsedInQuery
```

### Métodos Disponibles
- `.toPromise()` - Obtiene una página de resultados
- `.toAllPromise()` - Obtiene TODOS los resultados (maneja paginación automáticamente)

### Filtros Opcionales
```typescript
deliveryClient
  .itemUsedIn('item_codename')
  .type('page')                    // Solo items de tipo 'page'
  .types(['page', 'blog_post'])    // Múltiples tipos
  .collection('default')           // Solo de una colección
  .languageParameter('es-ES')      // Solo en un idioma
  .toAllPromise();
```

## Respuesta del SDK

### Estructura
```typescript
{
  data: {
    items: IUsedInItemRecord[]  // Array de items que usan el item
  },
  responses: IDeliveryNetworkResponse[]  // Respuestas HTTP originales
}
```

### IUsedInItemRecord
```typescript
{
  system: {
    id: string;
    name: string;
    codename: string;
    language: string;
    type: string;
    collection: string;
    workflow: string;
    workflowStep: string;
    lastModified: string;
  }
}
```

## Flujo de Incoming Relationships

1. **Obtener items que usan el item actual**
   ```typescript
   const usedInResponse = await deliveryClient
     .itemUsedIn(item.codename)
     .toAllPromise();
   ```

2. **Para cada item encontrado, obtener detalles**
   ```typescript
   for (const usedInItem of usedInResponse.data.items) {
     // Fetch completo del item para obtener los elementos
     const detailResponse = await fetch(...);
   }
   ```

3. **Encontrar en qué campo está la referencia**
   ```typescript
   Object.entries(detailData.item.elements).forEach(([_, element]) => {
     if (element.type === 'modular_content' && 
         element.value.includes(item.codename)) {
       // Este campo contiene la referencia
       incomingRels.push({
         fromItemId: usedInItem.system.id,
         fromItemName: usedInItem.system.name,
         fieldName: element.name,
         // ...
       });
     }
   });
   ```

## Testing

### Caso de Prueba
- **Item**: Tag con codename `_l2_page_type__contact_us`
- **Usado en**: Page con codename `mari_contact_page`
- **Campo**: El tag está referenciado en algún campo modular_content de la página

### Resultado Esperado
```
🔍 Searching for items using: _l2_page_type__contact_us
✅ Found 1 items using _l2_page_type__contact_us
📊 _l2_page_type__contact_us: 0 outgoing, 1 incoming

Incoming Relationships (← 1):
- FROM: mari_contact_page (type: _page)
  VIA FIELD: [nombre del campo]
```

## Referencias

- [Kontent.ai Delivery SDK v16.1.0 Release Notes](https://github.com/kontent-ai/delivery-sdk-js/releases/tag/v16.1.0)
- [SDK Documentation - itemUsedIn()](https://github.com/kontent-ai/delivery-sdk-js#item-used-in-query)
- [Delivery API - Used In Endpoint](https://kontent.ai/learn/reference/delivery-api#operation/view-a-content-item-used-in)

## Próximos Pasos

1. ✅ Actualizar package.json a SDK v16.3.0
2. ✅ Implementar `itemUsedIn()` en ItemRelationshipsViewer
3. ✅ Probar con el caso de uso del tag
4. 🔄 Considerar usar el SDK también para obtener outgoing relationships
5. 🔄 Agregar caché para mejorar performance
