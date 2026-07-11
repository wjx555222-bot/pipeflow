export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  last_run_status?: 'success' | 'failed' | 'running' | null;
  created_at: string;
  updated_at: string;
}

export interface NodeDefinition {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  input_mapping?: Record<string, string>;
}

export interface EdgeDefinition {
  source_node_id: string;
  target_node_id: string;
  source_handle?: string;
  target_handle?: string;
  condition?: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  metrics: RunMetrics;
  snapshots: NodeRunSnapshot[];
}

export interface NodeRunSnapshot {
  node_id: string;
  node_label: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface RunMetrics {
  total_nodes: number;
  completed_nodes: number;
  status: 'running' | 'completed' | 'failed';
  duration_ms?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  usage_count: number;
  featured: boolean;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  created_at: string;
}

export interface WorkflowVersion {
  version: number;
  workflow_id: string;
  name: string;
  description: string;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  created_at: string;
}

export interface DashboardStats {
  workflows_count: number;
  runs_today: number;
  success_rate: number;
  templates_count: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface WebSocketMessage {
  type: 'log' | 'snapshot' | 'metrics' | 'status' | 'error' | 'done';
  node_id?: string;
  message?: string;
  timestamp?: string;
  snapshot?: NodeRunSnapshot;
  metrics?: RunMetrics;
  status?: string;
  error?: string;
}
