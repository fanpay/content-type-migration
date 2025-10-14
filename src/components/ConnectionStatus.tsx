import { getConfigurationStatus } from '../config/kontent';

export function ConnectionStatus() {
  const status = getConfigurationStatus();

  if (status.isValid) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-800 text-sm font-medium">
            ✅ Conectado a Kontent.ai (API real)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
        <div className="flex-1">
          <h4 className="text-yellow-800 text-sm font-medium mb-2">
            ⚠️ Usando datos de prueba
          </h4>
          <p className="text-yellow-700 text-xs mb-2">
            Configura las variables de entorno para conectar con tu proyecto real de Kontent.ai:
          </p>
          <div className="text-xs text-yellow-600 space-y-1">
            <div>• {status.hasProjectId ? '✅' : '❌'} VITE_KONTENT_PROJECT_ID</div>
            <div>• {status.hasApiKey ? '✅' : '❌'} VITE_KONTENT_MANAGEMENT_API_KEY</div>
          </div>
          <p className="text-yellow-700 text-xs mt-2">
            Copia <code className="bg-yellow-100 px-1 rounded">.env.example</code> a <code className="bg-yellow-100 px-1 rounded">.env</code> y completa tus credenciales.
          </p>
        </div>
      </div>
    </div>
  );
}