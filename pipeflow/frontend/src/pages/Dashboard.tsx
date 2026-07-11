import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Workflow as WorkflowIcon,
  Play,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Plus,
  Library,
  Activity,
  Zap,
  BarChart3,
} from 'lucide-react';
import { statsApi, workflowApi, templateApi } from '@/api/client';
import type { DashboardStats, Workflow, WorkflowTemplate } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const statCards = [
  {
    key: 'workflows_count',
    label: '工作流',
    icon: WorkflowIcon,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'runs_today',
    label: '今日运行',
    icon: Play,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    key: 'success_rate',
    label: '成功率',
    icon: Activity,
    gradient: 'from-purple-500 to-pink-500',
    isPercent: true,
  },
  {
    key: 'templates_count',
    label: '模板',
    icon: Library,
    gradient: 'from-amber-500 to-orange-500',
  },
] as const;

const quickActions = [
  {
    icon: Plus,
    title: '创建工作流',
    desc: '从空白画布开始构建 AI 流水线',
    to: '/editor',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: Library,
    title: '浏览模板',
    desc: '使用预置模板快速上手',
    to: '/workflows',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: Zap,
    title: '运行工作流',
    desc: '执行已有工作流并查看日志',
    to: '/workflows',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: BarChart3,
    title: '分析数据',
    desc: '查看运行指标和统计报告',
    to: '/workflows',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  success: { color: 'text-emerald-500', label: '成功' },
  failed: { color: 'text-red-500', label: '失败' },
  running: { color: 'text-amber-500', label: '运行中' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, wfRes, tplRes] = await Promise.all([
          statsApi.getStats().catch(() => ({ data: null })),
          workflowApi.list().catch(() => ({ data: [] })),
          templateApi.list().catch(() => ({ data: [] })),
        ]);
        setStats(statsRes.data);
        setWorkflows((wfRes.data || []).slice(0, 5));
        setTemplates((tplRes.data || []).filter((t) => t.featured).slice(0, 3));
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          欢迎回来，{' '}
          <span className="gradient-heading">{user?.username || '用户'}</span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          AI 流水线编排引擎 — 可视化构建、运行和监控您的 AI 工作流
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => (
          <div
            key={card.key}
            className={`card p-5 animate-fade-slide-up stagger-${i + 1}`}
          >
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-10 w-10 rounded-2xl" />
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-4 w-20" />
              </div>
            ) : (
              <>
                <div
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-3`}
                >
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats?.[card.key] ?? 0}
                  {card.isPercent ? '%' : ''}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                最近的工作流
              </h2>
              <Link
                to="/workflows"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
              >
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8">
                <WorkflowIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  还没有工作流，快去创建一个吧
                </p>
                <button
                  onClick={() => navigate('/editor')}
                  className="btn-primary mt-4 inline-flex"
                >
                  <Plus className="w-4 h-4" />
                  创建工作流
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {workflows.map((wf) => (
                  <Link
                    key={wf.id}
                    to={`/editor/${wf.id}`}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <WorkflowIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                        {wf.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {wf.description || '暂无描述'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {wf.last_run_status && STATUS_CONFIG[wf.last_run_status] && (
                        <span className={`text-xs ${STATUS_CONFIG[wf.last_run_status].color}`}>
                          {STATUS_CONFIG[wf.last_run_status].label}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        v{wf.version}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            快速入门
          </h2>
          <div className="space-y-4">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className={`flex gap-3 p-3 rounded-2xl ${action.bgColor} animate-fade-slide-up stagger-${i + 1} hover:scale-[1.02] transition-transform`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${action.bgColor}`}>
                  <span className={`text-sm font-bold ${action.color}`}>
                    {i + 1}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                    {action.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {action.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-purple-500" />
              精选模板
            </h2>
            <Link
              to="/workflows"
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              浏览更多 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tpl, i) => (
              <div
                key={tpl.id}
                className="card-hover animate-fade-slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center flex-shrink-0">
                    <WorkflowIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {tpl.usage_count} 次使用
                  </span>
                  <button
                    onClick={() => navigate(`/editor?template=${tpl.id}`)}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                  >
                    使用模板 <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
