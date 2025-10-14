import { useEffect, useState } from 'react';
import { getUserInfo } from '../config/appConfig';

interface EnvironmentInfo {
  environmentId: string;
  userEmail?: string;
  source: 'sdk' | 'env';
}

export function EnvironmentBadge() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEnvironmentInfo() {
      try {
        // Intentar obtener del SDK primero
        const userInfo = await getUserInfo();
        
        if (userInfo) {
          setEnvInfo({
            environmentId: userInfo.environmentId,
            userEmail: userInfo.userEmail,
            source: 'sdk'
          });
        } else {
          // Fallback a variables de entorno
          const envId = import.meta.env.VITE_KONTENT_PROJECT_ID;
          if (envId) {
            setEnvInfo({
              environmentId: envId,
              source: 'env'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load environment info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadEnvironmentInfo();
  }, []);

  if (isLoading || !envInfo) {
    return null;
  }

  const isSdkMode = envInfo.source === 'sdk';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`
        flex items-center gap-3 px-3 py-2 rounded-lg shadow-lg border-2 text-xs sm:text-sm font-medium
        transition-all duration-200 hover:shadow-xl
        ${isSdkMode 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 text-green-900' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 text-blue-900'
        }
      `}>
        {/* Icono de ambiente */}
        <div className="relative flex items-center flex-shrink-0">
          <div className={`
            w-2 h-2 rounded-full animate-pulse
            ${isSdkMode ? 'bg-green-500' : 'bg-blue-500'}
          `} />
          <div className={`
            absolute w-2 h-2 rounded-full animate-ping opacity-75
            ${isSdkMode ? 'bg-green-400' : 'bg-blue-400'}
          `} />
        </div>
        
        {/* Información del ambiente */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">
              {isSdkMode ? '🔗 Custom App' : '💻 Dev Mode'}
            </span>
          </div>
          
          {/* Environment ID completo */}
          <code className={`
            px-2 py-1 rounded text-[10px] sm:text-xs font-mono tracking-tight break-all
            ${isSdkMode ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
          `}>
            {envInfo.environmentId}
          </code>
          
          {envInfo.userEmail && (
            <span className="text-[10px] sm:text-xs opacity-70 font-normal truncate">
              👤 {envInfo.userEmail}
            </span>
          )}
        </div>

        {/* Botón para copiar ID completo */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(envInfo.environmentId);
            const message = `✅ Environment ID copiado:\n\n${envInfo.environmentId}`;
            alert(message);
          }}
          className={`
            p-1.5 rounded-md transition-all duration-200 flex-shrink-0
            ${isSdkMode 
              ? 'hover:bg-green-200 active:bg-green-300' 
              : 'hover:bg-blue-200 active:bg-blue-300'
            }
          `}
          title="Copiar Environment ID completo"
          aria-label="Copiar Environment ID"
        >
          📋
        </button>
      </div>
    </div>
  );
}
