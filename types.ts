
export interface RawNode {
  id: string;
  parentId: string | null;
  label: string;
  url?: string;
  description?: string;
  imageUrl?: string;
}

export interface MindMapNode {
  id: string;
  name: string;
  url?: string;
  description?: string;
  imageUrl?: string;
  children?: MindMapNode[];
  _children?: MindMapNode[]; 
  x?: number;
  y?: number;
}
