# Content Type Migration - Kontent.ai Custom App

Una aplicación personalizada para Kontent.ai que permite migrar content items de un content type a otro dentro del mismo ambiente, con mapeo inteligente de campos y validación de compatibilidad.

## 🚀 Características

- **Selección de Content Types**: Interfaz intuitiva para seleccionar content types de origen y destino
- **Mapeo de Campos**: Visualización completa de todos los campos con su tipo y compatibilidad
- **Validación de Compatibilidad**: Indicadores visuales de qué campos son compatibles entre sí
- **Mapeo Automático**: Mapeo automático inicial basado en nombres de campos (codename y display name)
- **Interfaz Responsive**: Diseño moderno con Tailwind CSS
- **Proceso Step-by-Step**: Flujo de trabajo guiado en 3 pasos

## 🛠️ Tecnologías Utilizadas

- **React 18** con TypeScript
- **Vite** para desarrollo y build
- **Tailwind CSS** para estilos
- **Kontent.ai Management SDK** para gestión de content types
- **Kontent.ai Delivery SDK** para lectura de content items

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Acceso a un proyecto de Kontent.ai
- API Keys del proyecto (Management API Key y Preview API Key)

## 🚀 Instalación y Configuración

### 1. Clonar e instalar dependencias

```bash
cd custom-apps/content-type-migration
npm install
```

### 2. Configurar las credenciales de Kontent.ai

Crear un archivo `.env.local` basado en `.env.example`:

```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar y agregar tus credenciales reales
nano .env.local  # o usa tu editor preferido
```

**Contenido del `.env.local`**:
```env
VITE_KONTENT_PROJECT_ID=tu-project-id-aqui
VITE_KONTENT_PREVIEW_API_KEY=tu-preview-api-key-aqui  
VITE_KONTENT_MANAGEMENT_API_KEY=tu-management-api-key-aqui
VITE_APP_URL=https://localhost:3001
VITE_APP_CALLBACK_URL=https://localhost:3001/callback
```

### 3. Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en **`https://localhost:3001`** (nota el HTTPS)

## 📖 Uso

### Paso 1: Selección de Content Types

1. Selecciona el **Content Type de Origen** del cual quieres migrar content items
2. Selecciona el **Content Type de Destino** al cual quieres migrar los content items
3. El sistema mostrará un resumen de los content types seleccionados

### Paso 2: Mapeo de Campos

1. **Visualización de Campos**: Se muestran todos los campos del content type de origen con:
   - Nombre del campo
   - Tipo de elemento (Text, Rich Text, Number, etc.)
   - Si el campo es requerido
   - Estado de compatibilidad

2. **Mapeo Manual**: Para cada campo de origen, puedes:
   - Seleccionar un campo de destino del dropdown
   - Ver indicadores de compatibilidad (✓ compatible, ✗ incompatible, ○ no mapeado)
   - Leer notas sobre transformaciones necesarias

3. **Mapeo Automático**: El sistema intentará mapear automáticamente campos con:
   - Mismo codename
   - Mismo display name (insensible a mayúsculas)

### Paso 3: Ejecución de Migración

1. **Selección de Items**: Elegir qué content items migrar
2. **Revisión Final**: Confirmar la configuración de migración
3. **Ejecución**: Monitorear el progreso de la migración

## 🔧 Tipos de Compatibilidad de Campos

La aplicación valida automáticamente la compatibilidad entre tipos de elementos:

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
