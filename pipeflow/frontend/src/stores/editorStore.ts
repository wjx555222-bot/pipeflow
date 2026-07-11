import { create } from 'zustand';
import type { NodeRunSnapshot } from '@/types';

export interface LogEntry {
  nodeId: string;
  message: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

interface EditorState {
  activePanel: 'node-config' | 'logs' | 'templates' | 'history' | null;
  runStatus: 'idle' | 'running' | 'completed' | 'failed';
  currentRunId: string | null;
  logs: LogEntry[];
  snapshots: NodeRunSnapshot[];
  totalNodes: number;
  completedNodes: number;
  setActivePanel: (panel: EditorState['activePanel']) => void;
  togglePanel: (panel: EditorState['activePanel']) => void;
  addLog: (log: LogEntry) => void;
  setRunStatus: (status: EditorState['runStatus']) => void;
  setCurrentRunId: (runId: string | null) => void;
  updateSnapshot: (snapshot: NodeRunSnapshot) => void;
  setProgress: (total: number, completed: number) => void;
  clearLogs: () => void;
  resetRun: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activePanel: null,
  runStatus: 'idle',
  currentRunId: null,
  logs: [],
  snapshots: [],
  totalNodes: 0,
  completedNodes: 0,

  setActivePanel: (panel) => set({ activePanel: panel }),

  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    })),

  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log],
    })),

  setRunStatus: (runStatus) => set({ runStatus }),

  setCurrentRunId: (currentRunId) => set({ currentRunId }),

  updateSnapshot: (snapshot) =>
    set((state) => {
      const existing = state.snapshots.findIndex(
        (s) => s.node_id === snapshot.node_id
      );
      if (existing >= 0) {
        const updated = [...state.snapshots];
        updated[existing] = snapshot;
        return { snapshots: updated };
      }
      return { snapshots: [...state.snapshots, snapshot] };
    }),

  setProgress: (totalNodes, completedNodes) =>
    set({ totalNodes, completedNodes }),

  clearLogs: () => set({ logs: [], snapshots: [], totalNodes: 0, completedNodes: 0 }),

  resetRun: () =>
    set({
      runStatus: 'idle',
      currentRunId: null,
      logs: [],
      snapshots: [],
      totalNodes: 0,
      completedNodes: 0,
    }),
}));
