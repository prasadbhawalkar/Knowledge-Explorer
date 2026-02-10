
import { RawNode, MindMapNode } from '../types';

export const buildHierarchy = (data: RawNode[]): MindMapNode | null => {
  if (!data || data.length === 0) return null;

  const nodeMap: { [key: string]: MindMapNode } = {};
  let root: MindMapNode | null = null;

  // First pass: create all nodes and map ALL properties including new ones
  data.forEach((item) => {
    nodeMap[item.id] = {
      id: item.id,
      name: item.label || "Untitled Node",
      url: item.url || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      children: [],
    };
  });

  // Second pass: establish parent-child relationships
  data.forEach((item) => {
    const node = nodeMap[item.id];
    if (!node) return;

    const pId = item.parentId;
    if (pId === null || pId === "" || pId === undefined || !nodeMap[pId]) {
      if (!root) root = node;
    } else {
      const parent = nodeMap[pId];
      if (parent && parent !== node) {
        parent.children?.push(node);
      }
    }
  });

  return root;
};

export const sampleSpreadsheetCSV = `ID,ParentID,Label,URL,Description,ImageURL
1,,Enterprise Strategy,https://example.com/strategy,Core 2025 Vision,https://placehold.co/100x60/3b82f6/white?text=Core
2,1,Product Roadmap,,Feature delivery schedule,
3,1,Market Analysis,https://example.com/market,Competitive landscape,
4,1,Infrastructure,,Scale and security,
5,2,Q1 Launch,,Initial release,
6,2,Q2 Expansion,,Regional scaling,
7,3,Competitor Research,,Direct competitors analysis,
8,3,Customer Surveys,,User feedback loops,
9,4,Cloud Migration,https://example.com/cloud,AWS to GCP move,https://placehold.co/100x60/e2e8f0/64748b?text=Cloud
10,4,Security Audit,,External pen test,
11,5,Beta Testing,,Internal QA phase,
12,5,Marketing Sync,,Brand alignment,`;
