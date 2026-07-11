import { useState, useCallback, useEffect, useRef, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Save,
  Play,
  Upload,
  Undo2,
  Redo2,
  Settings,
  Activity,
  Home,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useWorkflowStore, type PipelineNodeData } from '@/stores/workflowStore';
import { useEditorStore } from '@/stores/editorStore';
import { useToastStore } from '@/components/Toast';
import { workflowApi, getRunWebSocketUrl } from '@/api/client';
import { nodeTypes } from '@/components/nodes';
import NodePalette from '@/components/NodePalette';
import NodeConfigPanel from '@/components/panels/NodeConfigPanel';
import ExecutionLogPanel from '@/components/panels/ExecutionLogPanel';
import TemplatePanel from '@/components/panels/TemplatePanel';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WebSocketMessage } from '@/types';

export default function WorkflowEditorPage() {
  const { id: workflowId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    removeNode,
    selectedNode,
    setSelectedNode,
    workflowName,
    setWorkflowName,
    workflowDescription,
    isDirty,
    loadWorkflow,
    saveWorkflow,
  } = useWorkflowStore();

  const {
    activePanel,
    runStatus,
    setActivePanel,
    togglePanel,
    addLog,
    setRunStatus,
    setCurrentRunId,
    updateSnapshot,
    setProgress,
    clearLogs,
    resetRun,
  } = useEditorStore();

  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const wsRef = useRef<ReturnType<typeof useWebSocket> | null>(null);

  const { connect, disconnect } = useWebSocket({
    onMessage: (data: WebSocketMessage) => {
      switch (data.type) {
        case 'log':
          if (data.message && data.timestamp) {
            addLog({
              nodeId: data.node_id || '',
              message: data.message,
              timestamp: data.timestamp,
              level: 'info',
            });
          }
          break;
        case 'snapshot':
          if (data.snapshot) {
            updateSnapshot(data.snapshot);
          }
          break;
        case 'metrics':
          if (data.metrics) {
            setProgress(data.metrics.total_nodes, data.metrics.completed_nodes);
          }
          break;
        case 'status':
          if (data.status === 'completed') {
            setRunStatus('completed');
            addLog({
              nodeId: '',
              message: '工作流执行完成',
              timestamp: new Date().toISOString(),
              level: 'success',
            });
            disconnect();
          } else if (data.status === 'failed') {
            setRunStatus('failed');
            addLog({
              nodeId: '',
              message: data.error || '工作流执行失败',
              timestamp: new Date().toISOString(),
              level: 'error',
            });
            disconnect();
          }
          break;
        case 'error':
          addLog({
            nodeId: data.node_id || '',
            message: data.error || 'Unknown error',
            timestamp: new Date().toISOString(),
            level: 'error',
          });
          break;
        case 'done':
          disconnect();
          break;
      }
    },
  });

  useEffect(() => {
    wsRef.current = { connect, disconnect };
  }, [connect, disconnect]);

  useEffect(() => {
    if (workflowId) {
      setLoading(true);
      workflowApi
        .get(workflowId)
        .then((res) => {
          loadWorkflow(res.data);
        })
        .catch((err) => {
          addToast('error', err instanceof Error ? err.message : '加载工作流失败');
          navigate('/workflows');
        })
        .finally(() => setLoading(false));
    }
  }, [workflowId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData('application/reactflow-type');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (!type) return;

      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left - 100,
        y: event.clientY - rect.top - 30,
      };

      const newNode: Node<PipelineNodeData> = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: label || type,
          nodeType: type,
          config: {},
        },
      };

      addNode(newNode);
      addToast('info', `已添加节点: ${label || type}`);
    },
    [addNode, addToast]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      if (selected.length === 1) {
        setSelectedNode(selected[0].id);
        if (activePanel === 'logs') {
          setActivePanel('node-config');
        }
      } else {
        setSelectedNode(null);
      }
    },
    [setSelectedNode, setActivePanel, activePanel]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
    },
    []
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNode) {
          removeNode(selectedNode);
          addToast('info', '节点已删除');
        }
      }
    },
    [selectedNode, removeNode, addToast]
  );

  const handleSave = async () => {
    if (!workflowId) {
      const createRes = await workflowApi.create({
        name: workflowName,
        description: workflowDescription,
      });
      const newId = createRes.data.id;
      loadWorkflow({ ...createRes.data, id: newId });
      navigate(`/editor/${newId}`, { replace: true });
    }
    setSaving(true);
    try {
      await saveWorkflow();
      addToast('success', '工作流已保存');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!workflowId) {
      addToast('error', '请先保存工作流');
      return;
    }

    try {
      clearLogs();
      setRunStatus('running');
      setActivePanel('logs');

      addLog({
        nodeId: '',
        message: '正在启动工作流...',
        timestamp: new Date().toISOString(),
        level: 'info',
      });

      const res = await workflowApi.execute(workflowId);
      const runId = res.data.run_id;
      setCurrentRunId(runId);

      const wsUrl = getRunWebSocketUrl(runId);
      connect(wsUrl);
    } catch (err) {
      setRunStatus('failed');
      addLog({
        nodeId: '',
        message: `启动失败: ${err instanceof Error ? err.message : '未知错误'}`,
        timestamp: new Date().toISOString(),
        level: 'error',
      });
      addToast('error', err instanceof Error ? err.message : '执行失败');
    }
  };

  const handlePublish = async () => {
    if (!workflowId) {
      addToast('error', '请先保存工作流');
      return;
    }
    const desc = prompt('发布说明（可选）:') || '';
    try {
      await workflowApi.publish(workflowId, { description: desc });
      addToast('success', '工作流已发布');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '发布失败');
    }
  };

  const rightPanelWidth = activePanel ? 340 : 0;

  return (
    <div className="flex flex-col h-full relative" onKeyDown={onKeyDown} tabIndex={-1}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="返回首页"
          >
            <Home className="w-4 h-4 text-gray-400" />
          </button>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />

          {editingName ? (
            <input
              type="text"
              className="input-field py-1 px-2 text-sm w-48"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingName(false);
              }}
              autoFocus
            />
          ) : (
            <h2
              className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-primary-500 transition-colors"
              onClick={() => setEditingName(true)}
            >
              {workflowName}
              {isDirty && (
                <span className="ml-2 text-[10px] text-amber-500 font-normal">● 未保存</span>
              )}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => togglePanel('templates')}
            className={`btn-ghost text-xs py-1.5 ${activePanel === 'templates' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            title="模板"
          >
            <Sparkles className="w-3.5 h-3.5" />
            模板
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button onClick={handleSave} disabled={saving} className="btn-ghost text-xs py-1.5" title="保存">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存
          </button>

          <button
            onClick={handleRun}
            disabled={runStatus === 'running'}
            className="btn-primary text-xs py-1.5"
          >
            {runStatus === 'running' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            运行
          </button>

          <button onClick={handlePublish} className="btn-secondary text-xs py-1.5" title="发布">
            <Upload className="w-3.5 h-3.5" />
            发布
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button onClick={() => setActivePanel(null)} className="btn-ghost text-xs py-1.5" title="撤销">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => {}} className="btn-ghost text-xs py-1.5" title="重做">
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={() => togglePanel('node-config')}
            className={`btn-ghost text-xs py-1.5 ${activePanel === 'node-config' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            title="节点配置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => togglePanel('logs')}
            className={`btn-ghost text-xs py-1.5 ${activePanel === 'logs' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            title="执行日志"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[240px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 overflow-hidden">
          <NodePalette />
        </div>

        <div
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">加载工作流...</p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={(changes: NodeChange[]) => setNodes(changes as any)}
              onEdgesChange={(changes: EdgeChange[]) => setEdges(changes as any)}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onNodesDelete={onNodesDelete}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={['Delete', 'Backspace']}
              multiSelectionKeyCode="Shift"
              snapToGrid
              snapGrid={[16, 16]}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: '#6b7280', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#cbd5e1"
                className="dark:opacity-30"
              />
              <Controls
                className="!rounded-2xl !overflow-hidden !shadow-lg"
                showInteractive={false}
              />
              <MiniMap
                className="!rounded-2xl !overflow-hidden"
                nodeStrokeColor="#6b7280"
                maskColor="rgba(0,0,0,0.1)"
                pannable
                zoomable
              />
              <Panel position="bottom-center" className="mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-gray-850/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm text-xs text-gray-500 dark:text-gray-400">
                  <span>{nodes.length} 节点</span>
                  <span>·</span>
                  <span>{edges.length} 连线</span>
                  <span>·</span>
                  <span>拖拽左侧节点到画布</span>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </div>

        <div
          className="flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden transition-all duration-300"
          style={{ width: `${rightPanelWidth}px` }}
        >
          {activePanel === 'node-config' && <NodeConfigPanel />}
          {activePanel === 'logs' && <ExecutionLogPanel />}
          {activePanel === 'templates' && <TemplatePanel onImport={(id) => navigate(`/editor/${id}`)} />}
        </div>
      </div>
    </div>
  );
}
