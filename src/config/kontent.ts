import { KontentServiceFixed as KontentService } from '../services/kontentServiceFixed';

// Environment variables para desarrollo
const KONTENT_PROJECT_ID = import.meta.env.VITE_KONTENT_PROJECT_ID || 'your-project-id';
const KONTENT_MANAGEMENT_API_KEY = import.meta.env.VITE_KONTENT_MANAGEMENT_API_KEY || 'your-management-api-key';
const KONTENT_PREVIEW_API_KEY = import.meta.env.VITE_KONTENT_PREVIEW_API_KEY || 'your-preview-api-key';

// Instancia global del servicio (KontentServiceFixed lee las env vars directamente)
export const kontentServiceInstance = new KontentService();

// Función para verificar la configuración
export function validateKontentConfiguration(): boolean {
  return !!(KONTENT_PROJECT_ID && 
           KONTENT_MANAGEMENT_API_KEY && 
           KONTENT_PREVIEW_API_KEY &&
           KONTENT_PROJECT_ID !== 'your-project-id' && 
           KONTENT_MANAGEMENT_API_KEY !== 'your-management-api-key' &&
           KONTENT_PREVIEW_API_KEY !== 'your-preview-api-key');
}

// Función para mostrar el estado de la configuración
export function getConfigurationStatus() {
  const status = {
    hasProjectId: !!KONTENT_PROJECT_ID && KONTENT_PROJECT_ID !== 'your-project-id',
    hasApiKey: !!KONTENT_MANAGEMENT_API_KEY && KONTENT_MANAGEMENT_API_KEY !== 'your-management-api-key',
    hasPreviewKey: !!KONTENT_PREVIEW_API_KEY && KONTENT_PREVIEW_API_KEY !== 'your-preview-api-key',
    isValid: validateKontentConfiguration(),
    projectId: KONTENT_PROJECT_ID,
    apiKeyLength: KONTENT_MANAGEMENT_API_KEY?.length || 0,
    previewKeyLength: KONTENT_PREVIEW_API_KEY?.length || 0,
  };
  
  // Only log once per session or when there's an issue
  if (!status.isValid) {
    console.log('🔧 Kontent Configuration Status:', status);
  }
  return status;
}