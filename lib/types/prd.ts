import type { AcceptanceCriterion } from "./graph";

export type ParsedPrdFeature = {
  id: string;
  name: string;
  description?: string;
  acceptanceCriteria: AcceptanceCriterion[];
};

export type ParsedPrd = {
  title: string;
  sourceText: string;
  features: ParsedPrdFeature[];
};
