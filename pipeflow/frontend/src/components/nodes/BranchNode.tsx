import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { GitFork } from 'lucide-react';
import type { PipelineNodeData } from '@/stores/workflowStore';

function BranchNode({ data, selected }: NodeProps<PipelineNodeData>) {
  const condition = (data.config?.condition as string) || 'input.score > 0.5';

  return (
    <div
      className={`react-flow__node-pipeline bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700 ${
        selected ? 'selected' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <GitFork className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label || 'Branch'}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px] font-mono">
          {condition}
        </p>
      </div>
      <div className="flex justify-between px-4 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">TRUE</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="react-flow__handle-branch-true !relative !-bottom-0 !right-0 !transform-none"
            style={{ position: 'relative', transform: 'none', bottom: 'auto', right: 'auto' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">FALSE</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="react-flow__handle-branch-false !relative !-bottom-0 !-right-0 !transform-none"
            style={{ position: 'relative', transform: 'none', bottom: 'auto', right: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(BranchNode);
