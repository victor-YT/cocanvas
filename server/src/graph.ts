import type { FeatureNode, GraphSnapshot, NodeContext } from "./types.ts";

export function buildNodeScopedPrompt(context: NodeContext, followUpPrompt: string) {
  const changedFiles =
    context.changedFiles.length > 0
      ? context.changedFiles.map((file) => `- ${file}`).join("\n")
      : "- none recorded yet";
  const riskReasons =
    context.riskReasons.length > 0
      ? context.riskReasons.map((reason) => `- ${reason}`).join("\n")
      : "- none recorded";

  return `You are continuing work on the feature node: ${context.title}.

Original task:
${context.originalPrompt}

Current changed files:
${changedFiles}

Current test status:
${context.testStatus}

Current risks:
${riskReasons}

User follow-up request:
${followUpPrompt}

Rules:
Only edit files related to this feature unless necessary.
If you need to touch shared files, explain why.
After editing, summarize changed files and update the Live Canvas.`;
}

export function summarizeNode(node: FeatureNode) {
  return {
    id: node.id,
    title: node.title,
    status: node.status,
    changedFileCount: node.changedFiles.length,
    testStatus: node.testStatus,
    riskLevel: node.riskLevel,
    linkedThreadCount: node.linkedThreadIds.length,
    lastUpdatedAt: node.lastUpdatedAt,
  };
}

export function summarizeGraph(snapshot: GraphSnapshot) {
  return {
    nodes: snapshot.nodes.map(summarizeNode),
    threadCount: snapshot.threads.length,
    eventCount: snapshot.events.length,
    conflictCount: snapshot.conflicts.length,
  };
}
