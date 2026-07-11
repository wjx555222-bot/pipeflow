import { useState, useEffect } from 'react';
import { X, Save, Settings } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useEditorStore } from '@/stores/editorStore';

const MODEL_OPTIONS = [
  'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini',
  'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
  'gemini-pro', 'gemini-ultra',
];

const LANGUAGE_OPTIONS = ['python', 'javascript', 'typescript', 'bash', 'sql'];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function NodeConfigPanel() {
  const { nodes, selectedNode, updateNodeData, setSelectedNode } = useWorkflowStore();
  const { setActivePanel } = useEditorStore();

  const node = nodes.find((n) => n.id === selectedNode);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (node) {
      setConfig({ ...node.data.config });
      setLabel(node.data.label || '');
    }
  }, [node]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-6">
        <Settings className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">选择一个节点进行配置</p>
      </div>
    );
  }

  const handleSave = () => {
    updateNodeData(node.id, { config, label });
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const renderConfigFields = () => {
    switch (node.data.nodeType) {
      case 'llm':
        return (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Model
              </label>
              <select
                value={(config.model as string) || 'gpt-4'}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="input-field"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Temperature: {config.temperature as number ?? 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={(config.temperature as number) ?? 0.7}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                className="w-full accent-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                System Prompt
              </label>
              <textarea
                value={(config.system_prompt as string) || ''}
                onChange={(e) => handleConfigChange('system_prompt', e.target.value)}
                className="input-field min-h-[80px] resize-y"
                placeholder="You are a helpful assistant..."
                rows={4}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Max Tokens
              </label>
              <input
                type="number"
                value={(config.max_tokens as number) ?? 2048}
                onChange={(e) => handleConfigChange('max_tokens', parseInt(e.target.value) || 2048)}
                className="input-field"
                min={1}
                max={128000}
              />
            </div>
          </>
        );

      case 'code':
        return (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Language
              </label>
              <select
                value={(config.language as string) || 'python'}
                onChange={(e) => handleConfigChange('language', e.target.value)}
                className="input-field"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Code
              </label>
              <textarea
                value={(config.code as string) || ''}
                onChange={(e) => handleConfigChange('code', e.target.value)}
                className="input-field min-h-[150px] resize-y font-mono text-xs"
                placeholder="# Write your code here..."
                rows={8}
                spellCheck={false}
              />
            </div>
          </>
        );

      case 'http':
        return (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Method
              </label>
              <select
                value={(config.method as string) || 'GET'}
                onChange={(e) => handleConfigChange('method', e.target.value)}
                className="input-field"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                URL
              </label>
              <input
                type="text"
                value={(config.url as string) || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Headers (JSON)
              </label>
              <textarea
                value={(config.headers as string) || '{}'}
                onChange={(e) => handleConfigChange('headers', e.target.value)}
                className="input-field min-h-[60px] resize-y font-mono text-xs"
                rows={3}
                spellCheck={false}
                placeholder='{"Content-Type": "application/json"}'
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Body
              </label>
              <textarea
                value={(config.body as string) || ''}
                onChange={(e) => handleConfigChange('body', e.target.value)}
                className="input-field min-h-[60px] resize-y font-mono text-xs"
                rows={3}
                spellCheck={false}
              />
            </div>
          </>
        );

      case 'branch':
        return (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Condition Expression
              </label>
              <input
                type="text"
                value={(config.condition as string) || ''}
                onChange={(e) => handleConfigChange('condition', e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="input.score > 0.5"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                使用 input 引用上游节点输出
              </p>
            </div>
          </>
        );

      default:
        return (
          <>
            {Object.entries(config).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={String(value ?? '')}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                  className="input-field"
                />
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Add Config Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="key"
                  className="input-field flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      const key = input.value.trim();
                      if (key && !(key in config)) {
                        handleConfigChange(key, '');
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary-500" />
          节点配置
        </h3>
        <button
          onClick={() => { setSelectedNode(null); setActivePanel(null); }}
          className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input-field"
            placeholder="Node label"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Type
          </label>
          <p className="input-field bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-default capitalize">
            {node.data.nodeType}
          </p>
        </div>

        {renderConfigFields()}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={handleSave} className="btn-primary w-full">
          <Save className="w-4 h-4" />
          保存配置
        </button>
      </div>
    </div>
  );
}
