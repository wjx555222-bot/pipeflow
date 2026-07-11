import { useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Trash2,
  Activity,
} from 'lucide-react';
import { useEditorStore, type LogEntry } from '@/stores/editorStore';
import type { NodeRunSnapshot } from '@/types';

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Pending',
  },
  running: {
    icon: Loader2,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    label: 'Running',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Done',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    label: 'Failed',
  },
  skipped: {
    icon: Clock,
    color: 'text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800',
    label: 'Skipped',
  },
};

const LOG_LEVEL_STYLES: Record<LogEntry['level'], string> = {
  info: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
  success: 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10',
  warning: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
  error: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
};

function SnapshotCard({ snapshot }: { snapshot: NodeRunSnapshot }) {
  const cfg = STATUS_CONFIG[snapshot.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg}`}>
      <Icon
        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color} ${
          snapshot.status === 'running' ? 'animate-spin' : ''
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {snapshot.node_label}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        {snapshot.error && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">
            {snapshot.error}
          </p>
        )}
        {snapshot.output && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            Output: {JSON.stringify(snapshot.output).substring(0, 60)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ExecutionLogPanel() {
  const {
    logs,
    snapshots,
    runStatus,
    totalNodes,
    completedNodes,
    setActivePanel,
    clearLogs,
    resetRun,
  } = useEditorStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, snapshots]);

  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-500" />
          执行日志
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={() => setActivePanel(null)}
            className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {runStatus === 'running' && totalNodes > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              {completedNodes}/{totalNodes} ({progress}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {runStatus === 'idle' && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 py-12">
            <Play className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">运行工作流以查看日志</p>
          </div>
        )}

        {snapshots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              节点状态
            </p>
            {snapshots.map((s) => (
              <SnapshotCard key={s.node_id} snapshot={s} />
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              日志
            </p>
            {logs.map((log, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-r-xl border-l-2 text-xs ${LOG_LEVEL_STYLES[log.level]} text-gray-700 dark:text-gray-300`}
              >
                <span className="text-gray-400 dark:text-gray-500 mr-2 font-mono text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {runStatus === 'running' && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
            <span className="text-xs text-gray-500 dark:text-gray-400">运行中...</span>
          </div>
        )}

        {runStatus === 'completed' && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              执行完成
            </span>
          </div>
        )}

        {runStatus === 'failed' && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              执行失败
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
