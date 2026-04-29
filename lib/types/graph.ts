import type { CodexTimelineEvent } from "./codex";

export type FeatureStatus =
  | "not_started"
  | "in_progress"
  | "verified"
  | "risk"
  | "drift";

export type ArtifactKind =
  | "ui"
  | "api"
  | "service"
  | "db"
  | "test"
  | "external"
  | "unknown";

export type AcceptanceCriterion = {
  id: string;
  text: string;
  status: "unknown" | "implemented" | "verified" | "missing_evidence" | "risk";
  evidenceIds: string[];
};

export type ArtifactRef = {
  id: string;
  path: string;
  kind: ArtifactKind;
  role?: string;
  confidence: number;
  evidence: string;
};

export type Evidence = {
  id: string;
  type:
    | "prd"
    | "file_path"
    | "diff"
    | "command"
    | "test_result"
    | "codex_plan"
    | "llm_inference";
  title: string;
  detail: string;
  path?: string;
  codexEventId?: string;
  confidence?: number;
};

export type FeatureNode = {
  id: string;
  name: string;
  description?: string;
  source: "prd" | "repo" | "codex";
  status: FeatureStatus;
  confidence: number;
  acceptanceCriteria: AcceptanceCriterion[];
  artifacts: ArtifactRef[];
  evidence: Evidence[];
  riskSummary?: string;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type:
    | "contains"
    | "implements"
    | "calls"
    | "tests"
    | "modifies"
    | "depends_on"
    | "inferred";
  confidence: number;
  evidenceIds: string[];
};

export type GraphState = {
  features: FeatureNode[];
  edges: GraphEdge[];
  selectedNodeId?: string;
  timeline: CodexTimelineEvent[];
};
