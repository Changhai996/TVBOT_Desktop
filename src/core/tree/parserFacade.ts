import type { TreeNode, TreeParseInput } from "./types";

import { TreeParser as LegacyTreeParser } from "../../js/treeParser";

const isTreeNodeLike = (value: unknown): value is TreeNode => {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  return (
    typeof node.length === "number" &&
    typeof node.nodeIndex === "string" &&
    typeof node.uniformNodeId === "string" &&
    Array.isArray(node.children)
  );
};

const normalizeTreeShape = (value: unknown, parent: TreeNode | undefined = undefined): TreeNode => {
  if (typeof value !== "object" || value === null) {
    throw new Error("TreeParser: invalid tree node");
  }
  const node = value as any;

  if (typeof node.name !== "string") node.name = node.name == null ? "" : String(node.name);

  const rawLen = node.length;
  const len =
    typeof rawLen === "number" ? rawLen : rawLen == null || rawLen === "" ? NaN : Number(rawLen);
  node.length = Number.isFinite(len) ? len : NaN;

  if (typeof node.nodeIndex !== "string") node.nodeIndex = node.nodeIndex == null ? "" : String(node.nodeIndex);

  if (typeof node.uniformNodeId !== "string" || !node.uniformNodeId) {
    node.uniformNodeId = node.name || node.nodeIndex || "";
  }

  if (!Array.isArray(node.children)) node.children = [];

  if (parent) node.parent = parent;
  node.children = node.children.map((c: unknown) => normalizeTreeShape(c, node));

  if (!isTreeNodeLike(node)) {
    throw new Error("TreeParser: invalid tree node shape after normalize");
  }
  return node as TreeNode;
};

const cloneNodeShallow = (node: TreeNode): TreeNode => {
  const cloned = { ...(node as any) } as TreeNode;
  cloned.children = [];
  delete (cloned as any).parent;
  return cloned;
};

const cloneSubtree = (node: TreeNode, parent?: TreeNode): TreeNode => {
  const cloned = cloneNodeShallow(node);
  if (parent) cloned.parent = parent;
  cloned.children = Array.isArray(node.children)
    ? node.children.map((child) => cloneSubtree(child, cloned))
    : [];
  return normalizeTreeShape(cloned, parent);
};

export class TreeParser {
  private readonly legacy = new LegacyTreeParser();

  identifyTreeFile(input: TreeParseInput): TreeNode {
    const root = this.legacy.identifyTreeFile(input);
    return normalizeTreeShape(root);
  }

  reRoot(nodeIndex: string, offsetRate = 0.5): TreeNode {
    if (!nodeIndex) {
      throw new Error("TreeParser: nodeIndex is required for reRoot");
    }
    const rateRaw = Number(offsetRate);
    const rate = Math.max(0, Math.min(1, Number.isFinite(rateRaw) ? rateRaw : 0.5));
    const rerooted = this.legacy.reRoot(nodeIndex, rate);
    const normalized = normalizeTreeShape(rerooted);
    return cloneSubtree(normalized);
  }
}
