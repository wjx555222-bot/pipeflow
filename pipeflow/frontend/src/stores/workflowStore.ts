import { create } from 'zustand';
import type { Node, Edge, Connection } from 'reactflow';
import type { NodeDefinition, EdgeDefinition, Workflow } from '@/types';
import { workflowApi } from '@/api/client';

export interface PipelineNodeData {
  label: string;
  nodeType: string;
  config: Record<string, unknown>;
  inputMapping?: Record<string, string>;
  [key: string]: unknown;
}

interface WorkflowState {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  selectedNode: string | null;
  workflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean;
  setNodes: (nodes: Node<PipelineNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node<PipelineNodeData>) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<PipelineNodeData>) => void;
  setSelectedNode: (nodeId: string | null) => void;
  loadWorkflow: (workflow: Workflow) => void;
  saveWorkflow: () => Promise<void>;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (desc: string) => void;
  markClean: () => void;
  getApiFormat: () => { nodes: NodeDefinition[]; edges: EdgeDefinition[] };
}

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${Date.now()}_${++nodeIdCounter}`;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  input: '#3b82f6',
  llm: '#8b5cf6',
  code: '#1e293b',
  http: '#10b981',
  branch: '#f59e0b',
  loop: '#06b6d4',
  merge: '#6366f1',
  normalize: '#14b8a6',
  output: '#ef4444',
  sub_workflow: '#ec4899',
  tool: '#6b7280',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  input: 'Input',
  llm: 'LLM',
  code: 'Code',
  http: 'HTTP',
  branch: 'Branch',
  loop: 'Loop',
  merge: 'Merge',
  normalize: 'Normalize',
  output: 'Output',
  sub_workflow: 'Sub-Workflow',
  tool: 'Tool',
};

const NODE_TYPE_ICONS: Record<string, string> = {
  input: 'ArrowDown',
  llm: 'Brain',
  code: 'Code2',
  http: 'Globe',
  branch: 'GitFork',
  loop: 'Repeat',
  merge: 'GitMerge',
  normalize: 'Filter',
  output: 'ArrowUp',
  sub_workflow: 'Workflow',
  tool: 'Wrench',
};

export { NODE_TYPE_COLORS, NODE_TYPE_LABELS, NODE_TYPE_ICONS };

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  workflowId: null,
  workflowName: 'Untitled Workflow',
  workflowDescription: '',
  isDirty: false,

  setNodes: (nodes) => set({ nodes, isDirty: true }),

  setEdges: (edges) => set({ edges, isDirty: true }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node], isDirty: true })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
      isDirty: true,
    })),

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    })),

  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),

  loadWorkflow: (workflow) => {
    const flowNodes: Node<PipelineNodeData>[] = (workflow.nodes || []).map(
      (nd) => ({
        id: nd.id,
        type: nd.type || 'default',
        position: nd.position || { x: 0, y: 0 },
        data: {
          label: nd.label || nd.type || 'Node',
          nodeType: nd.type || 'default',
          config: nd.config || {},
          inputMapping: nd.input_mapping || {},
        },
      })
    );

    const flowEdges: Edge[] = (workflow.edges || []).map((ed, index) => ({
      id: `edge_${ed.source_node_id}_${ed.target_node_id}_${index}`,
      source: ed.source_node_id,
      target: ed.target_node_id,
      sourceHandle: ed.source_handle || undefined,
      targetHandle: ed.target_handle || undefined,
      label: ed.condition || undefined,
      animated: true,
      style: { stroke: '#6b7280', strokeWidth: 2 },
    }));

    set({
      nodes: flowNodes,
      edges: flowEdges,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowDescription: workflow.description || '',
      isDirty: false,
      selectedNode: null,
    });
  },

  saveWorkflow: async () => {
    const state = get();
    const apiFormat = state.getApiFormat();

    if (state.workflowId) {
      await workflowApi.update(state.workflowId, {
        name: state.workflowName,
        description: state.workflowDescription,
        nodes: apiFormat.nodes,
        edges: apiFormat.edges,
      });
    }
    set({ isDirty: false });
  },

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  setWorkflowDescription: (desc) =>
    set({ workflowDescription: desc, isDirty: true }),

  markClean: () => set({ isDirty: false }),

  getApiFormat: () => {
    const state = get();
    return {
      nodes: state.nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        label: n.data.label,
        position: n.position,
        config: n.data.config,
        input_mapping: n.data.inputMapping,
      })),
      edges: state.edges.map((e) => ({
        source_node_id: e.source,
        target_node_id: e.target,
        source_handle: e.sourceHandle || undefined,
        target_handle: e.targetHandle || undefined,
        condition: typeof e.label === 'string' ? e.label : undefined,
      })),
    };
  },
}));
