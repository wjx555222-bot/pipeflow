import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Code2 } from 'lucide-react';
import type { PipelineNodeData } from '@/stores/workflowStore';

function CodeNode({ data, selected }: NodeProps<PipelineNodeData>) {
  const language = (data.config?.language as string) || 'python';

  return (
    <div
      className={`react-flow__node-pipeline bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 ${
        selected ? 'selected' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-700 to-gray-900 text-white">
        <Code2 className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label || 'Code'}</span>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Runtime</span>
          <span className="font-medium text-gray-900 dark:text-white uppercase">{language}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}

export default memo(CodeNode);
