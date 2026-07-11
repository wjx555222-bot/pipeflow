import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Download,
  Sparkles,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { templateApi } from '@/api/client';
import { useToastStore } from '@/components/Toast';
import type { WorkflowTemplate } from '@/types';

const CATEGORIES = ['All', 'AI', 'Data', 'Web', 'Automation', 'Integration'];

const CATEGORY_ICONS: Record<string, string> = {
  AI: '🧠',
  Data: '📊',
  Web: '🌐',
  Automation: '⚡',
  Integration: '🔗',
};

interface TemplatePanelProps {
  onImport?: (workflowId: string) => void;
}

export default function TemplatePanel({ onImport }: TemplatePanelProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await templateApi.list();
        setTemplates(res.data || []);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleImport = async (templateId: string) => {
    setImporting(templateId);
    try {
      const res = await templateApi.importTemplate(templateId);
      addToast('success', '模板导入成功');
      if (onImport && res.data?.id) {
        onImport(res.data.id);
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(null);
    }
  };

  const filtered = templates.filter((t) => {
    const matchCategory = category === 'All' || t.category === category;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          模板市场
        </h3>
      </div>

      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="搜索模板..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                category === cat
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat === 'All' ? '全部' : `${CATEGORY_ICONS[cat] || ''} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <WorkflowIcon className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">没有找到模板</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((template, i) => (
              <div
                key={template.id}
                className="card-hover animate-fade-slide-up relative overflow-hidden"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {template.featured && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                      Featured
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center flex-shrink-0">
                    <WorkflowIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {template.name}
                      </h4>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">
                          {template.usage_count} 次使用
                        </span>
                        <button
                          onClick={() => handleImport(template.id)}
                          disabled={importing === template.id}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          {importing === template.id ? (
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </span>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              导入
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
