# 🚀 Guía Rápida: Configurar Custom App en Kontent.ai

## Paso a Paso para Configurar la Custom App

### 1. Preparar la Aplicación Local

```bash
# 1. Generar certificados SSL
./generate-ssl.sh

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 3. Iniciar servidor
npm run dev
```

Tu app estará en: **https://localhost:3001**

### 2. Configurar en Kontent.ai

#### A. Crear la Custom App

1. Ve a tu proyecto en **Kontent.ai**
2. Navega a **Settings** > **Custom applications**
3. Haz clic en **+ Create custom application**

#### B. Configuración Básica

| Campo | Valor |
|-------|--------|
| **Name** | Content Type Migration |
| **Codename** | content-type-migration |
| **URL** | `https://localhost:3001` |
| **Description** | Migrate content items between content types with field mapping |

#### C. Configuración de Permisos

Selecciona estos **scopes** en la sección de permisos:

- ✅ **content_item:read** - Leer content items existentes
- ✅ **content_item:write** - Crear nuevos content items  
- ✅ **content_type:read** - Leer estructura de content types
- ✅ **language:read** - Leer idiomas disponibles

#### D. Configuración Avanzada (Opcional)

| Campo | Valor |
|-------|--------|
| **Callback URL** | `https://localhost:3001/callback` |
| **Icon URL** | `https://localhost:3001/icon.png` |
| **Categories** | Content Management, Migration Tools |

### 3. Obtener Credenciales de API

#### Management API Key
1. Ve a **Environment Settings** > **API keys**
2. En la sección **Management API**:
   - Copia la **API key**
   - Agrégala como `VITE_KONTENT_MANAGEMENT_API_KEY` en `.env.local`

#### Preview API Key  
1. En la misma sección, ve a **Delivery API** > **Preview API**:
   - Copia la **Preview API key**
   - Agrégala como `VITE_KONTENT_PREVIEW_API_KEY` en `.env.local`

#### Project ID
1. Copia el **Project ID** desde:
   - La URL del proyecto: `https://app.kontent.ai/123456789/...`
   - O desde **Environment Settings** > **General**
   - Agrégalo como `VITE_KONTENT_PROJECT_ID` en `.env.local`

### 4. Archivo .env.local Completo

```env
# Tu configuración debería verse así:
VITE_KONTENT_PROJECT_ID=123456789
VITE_KONTENT_PREVIEW_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_KONTENT_MANAGEMENT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_APP_URL=https://localhost:3001
VITE_APP_CALLBACK_URL=https://localhost:3001/callback
```

### 5. Probar la Configuración

1. **Reinicia** el servidor de desarrollo:
   ```bash
   # Detener con Ctrl+C, luego:
   npm run dev
   ```

2. **Abre** https://localhost:3001 en tu navegador
3. **Acepta** el certificado SSL (click "Advanced" > "Proceed to localhost")
4. **Verifica** que puedas ver la lista de content types

### 6. Usar la Custom App

1. **En Kontent.ai**, ve a tu proyecto
2. Haz clic en **Custom applications** en el menú lateral
3. Selecciona **Content Type Migration**
4. La app se abrirá en un iframe dentro de Kontent.ai

## 🔧 Solución de Problemas

### Error de Certificado SSL
- **Problema**: El navegador bloquea HTTPS con certificado self-signed
- **Solución**: Click "Advanced" > "Proceed to localhost (unsafe)"

### API Keys No Funcionan
- **Verificar**: Que las keys están copiadas completas (son muy largas)
- **Verificar**: Que no hay espacios extra al copiar/pegar
- **Verificar**: Que el Project ID es correcto

### Custom App No Aparece
- **Verificar**: Que la URL es exactamente `https://localhost:3001` (con HTTPS)
- **Verificar**: Que el servidor está corriendo
- **Verificar**: Que los permisos están configurados correctamente

### Content Types No Cargan
- **Verificar**: Variables de entorno en `.env.local`
- **Verificar**: Que tienes permisos de lectura en el proyecto
- **Revisar**: Console del navegador (F12) para errores

## 📞 Contacto

Si tienes problemas, revisa los logs en:
- **Console del navegador** (F12 > Console)
- **Terminal** donde corre `npm run dev`
- **Network tab** para errores de API