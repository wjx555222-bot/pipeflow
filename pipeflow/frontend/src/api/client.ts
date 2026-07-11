import type {
  User,
  Workflow,
  WorkflowRun,
  WorkflowTemplate,
  WorkflowVersion,
  DashboardStats,
  ApiResponse,
} from '@/types';

const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('未授权，请重新登录');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      errorData?.detail || errorData?.message || `请求失败 (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<{ token: string; user: User }>> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: {
    username: string;
    password: string;
  }): Promise<ApiResponse<{ token: string; user: User }>> =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const workflowApi = {
  list: (): Promise<ApiResponse<Workflow[]>> =>
    request('/workflows'),

  create: (data: {
    name: string;
    description?: string;
    nodes?: import('@/types').NodeDefinition[];
    edges?: import('@/types').EdgeDefinition[];
  }): Promise<ApiResponse<Workflow>> =>
    request('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: string): Promise<ApiResponse<Workflow>> =>
    request(`/workflows/${id}`),

  update: (
    id: string,
    data: Partial<Workflow>
  ): Promise<ApiResponse<Workflow>> =>
    request(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<ApiResponse<null>> =>
    request(`/workflows/${id}`, {
      method: 'DELETE',
    }),

  execute: (id: string): Promise<ApiResponse<{ run_id: string }>> =>
    request(`/workflows/${id}/execute`, {
      method: 'POST',
    }),

  getRuns: (id: string): Promise<ApiResponse<WorkflowRun[]>> =>
    request(`/workflows/${id}/runs`),

  getRun: (id: string, runId: string): Promise<ApiResponse<WorkflowRun>> =>
    request(`/workflows/${id}/runs/${runId}`),

  publish: (
    id: string,
    data: { description?: string }
  ): Promise<ApiResponse<Workflow>> =>
    request(`/workflows/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  rollback: (id: string, version: number): Promise<ApiResponse<Workflow>> =>
    request(`/workflows/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),

  getVersions: (id: string): Promise<ApiResponse<WorkflowVersion[]>> =>
    request(`/workflows/${id}/versions`),
};

export const templateApi = {
  list: (): Promise<ApiResponse<WorkflowTemplate[]>> =>
    request('/templates'),

  importTemplate: (id: string): Promise<ApiResponse<Workflow>> =>
    request(`/templates/${id}/import`, {
      method: 'POST',
    }),
};

export const healthApi = {
  getHealth: (): Promise<{ status: string; version: string }> =>
    request('/health'),
};

export function getRunWebSocketUrl(runId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/runs/${runId}`;
}

export const statsApi = {
  getStats: (): Promise<ApiResponse<DashboardStats>> =>
    request('/stats'),
};
