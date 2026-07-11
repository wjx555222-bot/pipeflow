import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Workflow as WorkflowIcon,
  Edit3,
  Trash2,
  Play,
  GitBranch,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { workflowApi } from '@/api/client';
import { useToastStore } from '@/components/Toast';
import type { Workflow } from '@/types';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  success: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: '成功' },
  failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '失败' },
  running: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: '运行中' },
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await workflowApi.list();
      setWorkflows(res.data || []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      addToast('error', '请输入工作流名称');
      return;
    }
    setCreating(true);
    try {
      const res = await workflowApi.create({
        name: newName.trim(),
        description: newDesc.trim(),
      });
      addToast('success', '工作流创建成功');
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      navigate(`/editor/${res.data.id}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此工作流吗？此操作不可撤销。')) return;
    try {
      await workflowApi.delete(id);
      addToast('success', '工作流已删除');
      fetchWorkflows();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '删除失败');
    }
  };

  const filtered = workflows.filter(
    (w) =>
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">工作流</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理和编排您的 AI 流水线
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary self-start"
        >
          <Plus className="w-4 h-4" />
          创建工作流
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="搜索工作流..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
            {search ? '没有找到匹配的工作流' : '还没有工作流'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-6">
            {search ? '尝试其他搜索词' : '创建您的第一个 AI 流水线'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              创建工作流
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wf, i) => (
            <div
              key={wf.id}
              className="card-hover cursor-pointer animate-fade-slide-up"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => navigate(`/editor/${wf.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/40 dark:to-purple-900/40 flex items-center justify-center">
                    <WorkflowIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {wf.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                        v{wf.version}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        wf.status === 'published'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : wf.status === 'draft'
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {wf.status === 'published' ? '已发布' : wf.status === 'draft' ? '草稿' : '已归档'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {wf.description || '暂无描述'}
              </p>

              {wf.last_run_status && STATUS_STYLES[wf.last_run_status] && (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium mb-3 ${STATUS_STYLES[wf.last_run_status].bg} ${STATUS_STYLES[wf.last_run_status].text}`}>
                  <Play className="w-3 h-3" />
                  {STATUS_STYLES[wf.last_run_status].label}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(wf.updated_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/editor/${wf.id}`)}
                    className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors"
                    title="编辑"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white dark:bg-gray-850 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              创建工作流
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  名称
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="输入工作流名称"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  描述
                </label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  placeholder="输入描述（可选）"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
