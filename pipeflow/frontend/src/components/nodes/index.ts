import { type NodeTypes } from 'reactflow';
import LLMNode from './LLMNode';
import CodeNode from './CodeNode';
import HttpNode from './HttpNode';
import BranchNode from './BranchNode';

export const nodeTypes: NodeTypes = {
  llm: LLMNode,
  code: CodeNode,
  http: HttpNode,
  branch: BranchNode,
};
