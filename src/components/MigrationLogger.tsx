import { useEffect, useRef } from 'react';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface MigrationLoggerProps {
  logs: LogEntry[];
  progress: number;
  isRunning: boolean;
  currentStep?: string;
}

export function MigrationLogger({ logs, progress, isRunning, currentStep }: Readonly<MigrationLoggerProps>) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-700 bg-green-50';
      case 'error':
        return 'text-red-700 bg-red-50';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50';
      case 'info':
      default:
        return 'text-blue-700 bg-blue-50';
    }
  };

  const getBorderColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'border-red-500';
      case 'success':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'info':
      default:
        return 'border-blue-500';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Migration Log</h3>
          {isRunning && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Running...</span>
            </div>
          )}
        </div>
        
        {/* Current Step */}
        {currentStep && (
          <div className="mt-2 text-sm text-gray-600">
            📍 {currentStep}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-gray-900 text-gray-100 p-4 font-mono text-xs overflow-auto max-h-96">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No logs yet. Click "Execute Migration" to start.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => {
              const borderColor = getBorderColor(log.level);
              return (
                <div 
                  key={`${log.timestamp.getTime()}-${index}`}
                  className={`p-2 rounded ${getLogColor(log.level)} border-l-4 ${borderColor}`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0">{getLogIcon(log.level)}</span>
                    <span className="text-gray-500 flex-shrink-0">{formatTime(log.timestamp)}</span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                  {log.details && (
                    <div className="mt-1 ml-8 text-xs opacity-75">
                      {log.details}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {logs.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Total logs: {logs.length}</span>
            <div className="flex items-center space-x-4">
              <span className="text-green-600">
                ✅ {logs.filter(l => l.level === 'success').length}
              </span>
              <span className="text-red-600">
                ❌ {logs.filter(l => l.level === 'error').length}
              </span>
              <span className="text-yellow-600">
                ⚠️ {logs.filter(l => l.level === 'warning').length}
              </span>
              <span className="text-blue-600">
                ℹ️ {logs.filter(l => l.level === 'info').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
