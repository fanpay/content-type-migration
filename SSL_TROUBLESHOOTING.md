# 🔧 Solución para ERR_CERT_AUTHORITY_INVALID

Este error es **completamente normal** para certificados SSL auto-firmados en desarrollo local. Aquí tienes varias formas de solucionarlo:

## 🚀 Solución Rápida (Recomendada)

### Opción 1: Chrome/Safari/Edge
1. Ve a **https://localhost:3001**
2. Verás una pantalla de "Tu conexión no es privada" o "ERR_CERT_AUTHORITY_INVALID"
3. Haz clic en **"Avanzado"** o **"Show details"**
4. Haz clic en **"Continuar a localhost (no seguro)"** o **"Proceed to localhost (unsafe)"**
5. ¡Listo! La página se cargará correctamente

### Opción 2: Firefox  
1. Ve a **https://localhost:3001**
2. Haz clic en **"Avanzado"**
3. Haz clic en **"Aceptar el riesgo y continuar"**
4. ¡Listo!

## 🔐 Solución Permanente (macOS)

Para evitar el error permanentemente, instala el certificado en tu Keychain:

```bash
# Opción A: Script automático (requiere password de admin)
./install-cert-macos.sh

# Opción B: Manual
open localhost.pem  # Abre Keychain Access
# Encuentra "localhost" > Doble clic > Trust > Always Trust
```

## 🛠️ Scripts Disponibles

```bash
# Regenerar certificados SSL
npm run cert:generate

# Instalar certificado en macOS Keychain  
npm run cert:install

# Iniciar servidor normal (HTTPS)
npm run dev

# Iniciar servidor sin HTTPS (puerto 3002)
npm run dev:insecure
```

## ❓ ¿Por Qué Este Error?

- **ERR_CERT_AUTHORITY_INVALID** significa que el certificado SSL no está firmado por una autoridad certificadora reconocida
- Esto es **normal y esperado** para desarrollo local
- Los certificados auto-firmados son seguros para desarrollo
- Kontent.ai Custom Apps **requieren HTTPS**, por eso necesitamos SSL

## ✅ Verificación

Después de aceptar el certificado, deberías ver:
- 🔒 Candado en la barra de direcciones (puede mostrar "No seguro" pero funciona)
- ✅ La aplicación de migración cargando correctamente
- ✅ No más errores de SSL

## 🔍 Troubleshooting

### El navegador sigue bloqueando
```bash
# Prueba con otro navegador
open -a "Google Chrome" https://localhost:3001
open -a Firefox https://localhost:3001

# O usa modo incógnito/privado
```

### Certificado corrupto
```bash
# Regenera certificados
rm localhost*.pem
./generate-ssl.sh
npm run dev
```

### Puerto ocupado
```bash
# Usar puerto alternativo
npm run dev:insecure  # HTTP en puerto 3002
```

## 🎯 Para Kontent.ai

Una vez que aceptes el certificado:
1. La URL **https://localhost:3001** funcionará perfectamente
2. Puedes configurarla como Custom App en Kontent.ai
3. El iframe de Kontent.ai cargará tu app sin problemas

## 📞 Última Solución

Si nada funciona, puedes usar la versión HTTP temporalmente:

```bash
# Cambiar vite.config.ts para deshabilitar HTTPS temporalmente
npm run dev:insecure  # Puerto 3002 sin SSL

# Pero recuerda: Kontent.ai Custom Apps requieren HTTPS
# Esto solo para probar que la app funciona
```

---

**💡 Tip:** Este proceso solo se hace UNA vez por navegador. Una vez aceptado, el certificado funcionará siempre para localhost:3001.