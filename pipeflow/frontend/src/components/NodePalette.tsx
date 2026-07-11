import { type DragEvent } from 'react';
import {
  ArrowDown,
  Brain,
  Code2,
  Globe,
  GitFork,
  Repeat,
  GitMerge,
  Filter,
  ArrowUp,
  Workflow,
  Wrench,
} from 'lucide-react';

interface NodeTypeInfo {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const NODE_TYPES: NodeTypeInfo[] = [
  {
    type: 'input',
    label: 'Input',
    description: '接收输入数据',
    icon: ArrowDown,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    type: 'llm',
    label: 'LLM',
    description: '大语言模型节点',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  {
    type: 'code',
    label: 'Code',
    description: '执行自定义代码',
    icon: Code2,
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-600',
  },
  {
    type: 'http',
    label: 'HTTP',
    description: '发送 HTTP 请求',
    icon: Globe,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    type: 'branch',
    label: 'Branch',
    description: '条件分支判断',
    icon: GitFork,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    type: 'loop',
    label: 'Loop',
    description: '循环迭代处理',
    icon: Repeat,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
  },
  {
    type: 'merge',
    label: 'Merge',
    description: '合并多条分支',
    icon: GitMerge,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  {
    type: 'normalize',
    label: 'Normalize',
    description: '数据规范化处理',
    icon: Filter,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    type: 'output',
    label: 'Output',
    description: '输出结果数据',
    icon: ArrowUp,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  {
    type: 'sub_workflow',
    label: 'Sub-Workflow',
    description: '嵌套子工作流',
    icon: Workflow,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
  {
    type: 'tool',
    label: 'Tool',
    description: '调用外部工具',
    icon: Wrench,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-900/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
  },
];

export const NODE_TYPE_REGISTRY = NODE_TYPES;

export default function NodePalette() {
  const onDragStart = (
    event: DragEvent<HTMLDivElement>,
    nodeType: NodeTypeInfo
  ) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType.type);
    event.dataTransfer.setData('application/reactflow-label', nodeType.label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-3 space-y-1 overflow-y-auto scrollbar-thin h-full">
      <div className="px-2 py-2 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          节点类型
        </h3>
      </div>
      {NODE_TYPES.map((nodeType) => (
        <div
          key={nodeType.type}
          draggable
          onDragStart={(e) => onDragStart(e, nodeType)}
          className={`flex items-center gap-3 p-3 rounded-2xl border ${nodeType.borderColor} ${nodeType.bgColor} cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${nodeType.bgColor} group-hover:scale-110 transition-transform`}
          >
            <nodeType.icon className={`w-4.5 h-4.5 ${nodeType.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {nodeType.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {nodeType.description}
            </p>
          </div>
        </div>
      ))}
      <div className="px-2 py-3 mt-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          拖拽节点到画布上
        </p>
      </div>
    </div>
  );
}
