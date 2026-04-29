export type ObservedNodeType =
  | "feature"
  | "flow"
  | "capability"
  | "evidence"
  | "risk"
  | "cluster";

export type ObservedNodeStatus =
  | "planned"
  | "building"
  | "implemented"
  | "needs_evidence"
  | "verified"
  | "risk"
  | "unlinked";

export type ObservedEdgeRelation =
  | "contains"
  | "supports"
  | "blocks"
  | "enables"
  | "related";

export type EvidenceKind =
  | "test"
  | "diff"
  | "file"
  | "command"
  | "plan"
  | "inference";

export type RiskSeverity = "low" | "medium" | "high";

export type ObservedEvidence = {
  id: string;
  kind: EvidenceKind;
  summary: string;
  path?: string;
};

export type ObservedRisk = {
  id: string;
  severity: RiskSeverity;
  summary: string;
  path?: string;
};

export type ObservedGraphNode = {
  id: string;
  nodeType: ObservedNodeType;
  title: string;
  status: ObservedNodeStatus;
  summary?: string;
  confidence?: number;
  evidence: ObservedEvidence[];
  risks: ObservedRisk[];
  relatedFiles: string[];
  rawEvents: GraphEvent[];
};

export type ObservedGraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: ObservedEdgeRelation;
  label?: string;
};

export type NodeUpsertEvent = {
  type: "node.upsert";
  node: {
    id: string;
    nodeType: ObservedNodeType;
    title: string;
    status?: ObservedNodeStatus;
    summary?: string;
    confidence?: number;
    relatedFiles?: string[];
  };
};

export type EdgeUpsertEvent = {
  type: "edge.upsert";
  edge: ObservedGraphEdge;
};

export type StatusUpdateEvent = {
  type: "status.update";
  targetId: string;
  status: ObservedNodeStatus;
  summary?: string;
};

export type EvidenceAddEvent = {
  type: "evidence.add";
  targetId: string;
  evidence: ObservedEvidence;
};

export type RiskAddEvent = {
  type: "risk.add";
  targetId: string;
  risk: ObservedRisk;
};

export type GraphEvent =
  | NodeUpsertEvent
  | EdgeUpsertEvent
  | StatusUpdateEvent
  | EvidenceAddEvent
  | RiskAddEvent;

export type GraphTimelineItem = {
  id: string;
  title: string;
  detail?: string;
  type: GraphEvent["type"];
  raw: GraphEvent;
};

export type ObservedGraphState = {
  nodes: ObservedGraphNode[];
  edges: ObservedGraphEdge[];
  selectedNodeId?: string;
  timeline: GraphTimelineItem[];
};
