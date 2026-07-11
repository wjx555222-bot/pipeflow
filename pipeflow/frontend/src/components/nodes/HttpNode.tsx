import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Globe } from 'lucide-react';
import type { PipelineNodeData } from '@/stores/workflowStore';

function HttpNode({ data, selected }: NodeProps<PipelineNodeData>) {
  const method = (data.config?.method as string) || 'GET';
  const url = (data.config?.url as string) || 'https://';

  return (
    <div
      className={`react-flow__node-pipeline bg-white dark:bg-gray-800 border-emerald-300 dark:border-emerald-700 ${
        selected ? 'selected' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <Globe className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label || 'HTTP'}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-1.5 py-0.5 rounded font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30">
            {method}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
          {url}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}

export default memo(HttpNode);
