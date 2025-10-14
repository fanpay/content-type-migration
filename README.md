# Content Type Migration - Kontent.ai Custom App

A custom application for Kontent.ai that allows migrating content items from one content type to another within the same environment, with intelligent field mapping and compatibility validation.

## 🚀 Key Features

- **Content Type Selection**: Intuitive interface for selecting source and target content types
- **Field Mapping**: Complete visualization of all fields with their type and compatibility
- **Compatibility Validation**: Visual indicators of which fields are compatible with each other
- **Automatic Mapping**: Initial automatic mapping based on field names (codename and display name)
- **Recursive Migration**: Automatically migrates linked items of the same type
- **Migration Reports**: Comprehensive reporting in console and UI
- **Skip Duplicates**: Detects and skips already migrated items
- **Relationship Viewer**: Visual analysis of item relationships before migration
- **Responsive Interface**: Modern design with Tailwind CSS
- **Step-by-Step Process**: Guided workflow in 5 steps

📚 **For detailed feature documentation, see [FEATURES.md](./FEATURES.md)**

## 🛠️ Technologies Used

- **React 18** with TypeScript
- **Vite** for development and build
- **Tailwind CSS** for styling
- **Kontent.ai Management SDK** for content type management
- **Kontent.ai Delivery SDK** for reading content items

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to a Kontent.ai project
- Project API Keys (Management API Key and Preview API Key)

## 🚀 Installation and Setup

### 1. Clone and install dependencies

```bash
cd custom-apps/content-type-migration
npm install
```

### 2. Configure Kontent.ai credentials

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

### 3. Run in development mode

```bash
npm run dev
```

The application will be available at **`https://localhost:3001`** (note the HTTPS)

## 📖 Usage

### Step 1: Content Type Selection

1. Select the **Source Content Type** from which you want to migrate content items
2. Select the **Target Content Type** to which you want to migrate the content items
3. The system will show a summary of the selected content types

### Step 2: Field Mapping

1. **Field Visualization**: All fields from the source content type are displayed with:
   - Field name
   - Element type (Text, Rich Text, Number, etc.)
   - Whether the field is required
   - Compatibility status

2. **Manual Mapping**: For each source field, you can:
   - Select a target field from the dropdown
   - View compatibility indicators (✓ compatible, ✗ incompatible, ○ not mapped)
   - Read notes about necessary transformations

3. **Automatic Mapping**: The system will attempt to automatically map fields with:
   - Same codename
   - Same display name (case insensitive)

### Step 3: Item Selection

1. Choose which content items to migrate from the source content type
2. Select language variant
3. Review selected items count

### Step 4: Relationship Analysis

1. **Automatic Analysis**: The system analyzes all selected items for relationships
2. **Dual Direction Analysis**:
   - **Outgoing Relationships** (→): Items that your selected content references
   - **Incoming Relationships** (←): Items that reference your selected content
3. **Visual Display**: Expandable cards for each item showing:
   - **Blue cards**: Outgoing relationships with field names and referenced items
   - **Green cards**: Incoming relationships showing which items use this content
4. **Summary Statistics**:
   - Total selected items
   - Items with relationships
   - Total relationship count (outgoing + incoming)
5. **Items without relationships**: Clearly listed for transparency

**Example**: If you select a tag `_l2_page_type__contact_us`:
- **Outgoing**: Shows items the tag references (if any)
- **Incoming**: Shows pages like `mari_contact_page` that use this tag

📚 **For detailed relationship documentation, see [RELATIONSHIPS.md](./RELATIONSHIPS.md)**

### Step 5: Migration Execution

1. **Final Review**: Confirm the migration configuration
2. **Preview**: Optional dry-run preview
3. **Execution**: Monitor migration progress with real-time updates

## 🎯 Advanced Features

### Recursive Linked Item Migration

When migrating items with linked items (modular content) of the same source type, the system automatically:
- Detects linked items that need migration
- Recursively migrates all linked items in the hierarchy
- Maintains proper references in the migrated structure

### Comprehensive Reporting

After each migration, you'll receive:
- **Console Report**: Detailed summary with all created items
- **UI Display**: Visual report with color-coded items
  - 💙 Blue: Main items you selected
  - 💚 Green: Auto-migrated linked items
  - ⚠️ Yellow: Items that already existed (skipped)

### Duplicate Prevention

The system intelligently:
- Detects already migrated items
- Skips creation of duplicates
- Uses existing item references
- Clearly indicates skipped items in reports

📚 **For complete feature documentation and examples, see [FEATURES.md](./FEATURES.md)**

## 🔧 Field Type Compatibility

The application automatically validates compatibility between element types:

| Tipo Origen | Tipos Destino Compatibles |
|-------------|---------------------------|
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

## 🏗️ Arquitectura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── ContentTypeSelector.tsx
│   ├── FieldMappingEditor.tsx
│   └── ContentItemList.tsx
├── hooks/              # Custom hooks
│   ├── useKontentData.ts
│   └── useMigration.ts
├── services/           # Servicios para API
│   ├── kontentService.ts
│   └── migrationService.ts
├── types/              # Definiciones de tipos TypeScript
│   └── index.ts
├── App.tsx             # Componente principal
└── main.tsx            # Punto de entrada
```

## 🧪 Estado del Desarrollo

### ✅ Completado
- [x] Estructura base del proyecto
- [x] Selección de content types
- [x] Mapeo visual de campos
- [x] Validación de compatibilidad
- [x] Interfaz responsive
- [x] Sistema de tipos TypeScript
- [x] Mock data para desarrollo

### 🚧 En Desarrollo
- [ ] Integración real con Kontent.ai APIs
- [ ] Selección y listado de content items
- [ ] Ejecución de migración
- [ ] Manejo de errores y progress tracking
- [ ] Generación de certificados SSL para HTTPS

### 🔮 Próximas Características
- [ ] Mapeo de elementos relacionados (Linked Items)
- [ ] Transformación de datos complejos
- [ ] Rollback de migraciones
- [ ] Exportar/importar configuraciones de mapeo
- [ ] Batch processing para grandes volúmenes

## 📝 Notas de Implementación

### Servicios Kontent.ai

Para implementar la funcionalidad completa, descomenta y configura los servicios en `src/services/kontentService.ts`:

```typescript
// Ejemplo de uso real
const kontentService = new KontentService({
  projectId: process.env.VITE_KONTENT_PROJECT_ID!,
  managementApiKey: process.env.VITE_KONTENT_MANAGEMENT_API_KEY!,
  previewApiKey: process.env.VITE_KONTENT_PREVIEW_API_KEY!,
});

const contentTypes = await kontentService.getContentTypes();
```

### 4. Generar certificados SSL locales (requerido para Custom Apps)

```bash
# Generar certificados SSL para HTTPS local
openssl req -x509 -out localhost.pem -keyout localhost-key.pem \
  -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -extensions EXT -config <(printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

### 5. Configurar Custom App en Kontent.ai

1. **Ir a App Management** en tu proyecto de Kontent.ai
2. **Crear nueva Custom App** con los siguientes datos:
   - **Nombre**: Content Type Migration
   - **URL de la App**: `https://localhost:3001/`
   - **Callback URL**: `https://localhost:3001/callback`
3. **Configurar permisos** (en la sección de scopes):
   - ✅ `content_item:read` - Para leer content items
   - ✅ `content_item:write` - Para crear nuevos content items
   - ✅ `content_type:read` - Para leer content types
   - ✅ `language:read` - Para leer idiomas disponibles
4. **Guardar** la configuración

### 6. Obtener credenciales de API

Ve a **Environment Settings > API keys** en tu proyecto:

1. **Management API Key**:
   - Copia la clave desde "Management API"
   - Agrégala como `VITE_KONTENT_MANAGEMENT_API_KEY` en tu `.env.local`

2. **Preview API Key**:
   - Ve a "Delivery API" > "Preview API"
   - Copia la clave Preview
   - Agrégala como `VITE_KONTENT_PREVIEW_API_KEY` en tu `.env.local`

3. **Project ID**:
   - Copia el Project ID desde la URL o settings
   - Agrégalo como `VITE_KONTENT_PROJECT_ID` en tu `.env.local`

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Para reportar bugs o solicitar nuevas características, por favor abre un [issue](https://github.com/your-username/kai-custom/issues) en GitHub.
