import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Brain } from 'lucide-react';
import type { PipelineNodeData } from '@/stores/workflowStore';

function LLMNode({ data, selected }: NodeProps<PipelineNodeData>) {
  const model = (data.config?.model as string) || 'gpt-4';
  const temperature = (data.config?.temperature as number) ?? 0.7;

  return (
    <div
      className={`react-flow__node-pipeline bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700 ${
        selected ? 'selected' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white">
        <Brain className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label || 'LLM'}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Model</span>
          <span className="font-medium text-gray-900 dark:text-white">{model}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Temp</span>
          <span className="font-medium text-gray-900 dark:text-white">{temperature}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}

export default memo(LLMNode);
