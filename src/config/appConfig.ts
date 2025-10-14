import { getCustomAppContext } from '@kontent-ai/custom-app-sdk';

// Tipos para la configuración de la Custom App
export interface KontentConfig {
  environmentId: string;
  managementApiKey: string;
  previewApiKey: string;
}

// Interfaz para los parámetros JSON del Custom App (lo mínimo necesario)
export interface CustomAppParameters {
  managementApiKey?: string;
  previewApiKey?: string;
}

/**
 * Obtiene la configuración completa de Kontent.ai
 * 
 * Prioridad:
 * 1. Custom App SDK (environmentId del context + API keys de parameters)
 * 2. Variables de entorno (.env) como fallback
 */
export async function getKontentConfig(): Promise<KontentConfig> {
  try {
    // Intentar obtener la configuración del SDK (cuando la app está en Kontent.ai)
    const sdkContext = await getCustomAppContext();
    
    if (!sdkContext.isError) {
      // Obtener environmentId del context (siempre disponible en el SDK)
      const environmentId = sdkContext.context?.environmentId;
      
      // Obtener las API keys de los parámetros JSON
      const params = sdkContext.config as CustomAppParameters | undefined;
      
      if (environmentId && params?.managementApiKey && params?.previewApiKey) {
        console.log('✅ Usando configuración desde Custom App SDK');
        console.log(`   Environment ID: ${environmentId}`);
        console.log(`   Usuario: ${sdkContext.context.userEmail}`);
        
        return {
          environmentId,
          managementApiKey: params.managementApiKey,
          previewApiKey: params.previewApiKey,
        };
      }
    }
  } catch {
    // Si falla el SDK (ej: no está en iframe), continuamos con .env
    console.log('ℹ️ Custom App SDK no disponible, usando variables de entorno');
  }

  // Fallback a variables de entorno
  const environmentId = import.meta.env.VITE_KONTENT_PROJECT_ID;
  const managementApiKey = import.meta.env.VITE_KONTENT_MANAGEMENT_API_KEY;
  const previewApiKey = import.meta.env.VITE_KONTENT_PREVIEW_API_KEY;

  if (!environmentId || !managementApiKey || !previewApiKey) {
    throw new Error(
      'Faltan credenciales de Kontent.ai. Asegúrate de configurar las variables de entorno o los parámetros JSON en la Custom App.'
    );
  }

  console.log('✅ Usando configuración desde variables de entorno (.env)');
  return {
    environmentId,
    managementApiKey,
    previewApiKey,
  };
}

/**
 * Obtiene información del usuario actual desde el SDK
 * Útil para auditoría y permisos
 */
export async function getUserInfo() {
  try {
    const sdkContext = await getCustomAppContext();
    
    if (!sdkContext.isError && sdkContext.context) {
      return {
        userId: sdkContext.context.userId,
        userEmail: sdkContext.context.userEmail,
        userRoles: sdkContext.context.userRoles,
        environmentId: sdkContext.context.environmentId,
      };
    }
  } catch {
    // SDK no disponible (desarrollo local)
  }
  
  return null;
}
