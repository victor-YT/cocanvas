import type { GraphEvent } from "@/lib/types/observedGraph";

export const mockGraphEvents: GraphEvent[] = [
  {
    type: "node.upsert",
    node: {
      id: "task_board_app",
      nodeType: "feature",
      title: "Task Board Web App",
      status: "building",
      summary: "Codex is building a Next.js task board with dashboard, task creation, status controls, API routes, and persistence.",
      confidence: 0.92,
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "dashboard_page",
      nodeType: "feature",
      title: "Open task dashboard",
      status: "implemented",
      summary: "User can open the dashboard and see existing tasks.",
      relatedFiles: ["app/page.tsx", "components/tasks/TaskBoard.tsx"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "task_board_contains_dashboard_page",
      from: "task_board_app",
      to: "dashboard_page",
      relation: "contains",
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "create_task",
      nodeType: "feature",
      title: "Create task",
      status: "implemented",
      summary: "User can add a task from the dashboard form.",
      relatedFiles: ["components/tasks/NewTaskForm.tsx"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "task_board_contains_create_task",
      from: "task_board_app",
      to: "create_task",
      relation: "contains",
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "status_controls",
      nodeType: "feature",
      title: "Update task status",
      status: "building",
      summary: "User can move a task between todo, doing, and done.",
      relatedFiles: ["components/tasks/TaskCard.tsx", "app/api/tasks/[id]/route.ts"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "task_board_contains_status_controls",
      from: "task_board_app",
      to: "status_controls",
      relation: "contains",
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "task_api",
      nodeType: "feature",
      title: "Task API",
      status: "implemented",
      summary: "Next.js route handlers expose task list and create operations.",
      relatedFiles: ["app/api/tasks/route.ts"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "task_board_contains_task_api",
      from: "task_board_app",
      to: "task_api",
      relation: "contains",
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "database_persistence",
      nodeType: "feature",
      title: "Database persistence",
      status: "needs_evidence",
      summary: "Tasks should persist through a database-backed model.",
      relatedFiles: ["prisma/schema.prisma", "lib/db/tasks.ts"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "task_board_contains_database_persistence",
      from: "task_board_app",
      to: "database_persistence",
      relation: "contains",
    },
  },
  {
    type: "evidence.add",
    targetId: "dashboard_page",
    evidence: {
      id: "dashboard_page_created",
      kind: "file",
      summary: "Dashboard page and task board component were created.",
      path: "app/page.tsx",
    },
  },
  {
    type: "evidence.add",
    targetId: "task_api",
    evidence: {
      id: "task_api_route_created",
      kind: "file",
      summary: "Task API route implements GET and POST handlers.",
      path: "app/api/tasks/route.ts",
    },
  },
  {
    type: "evidence.add",
    targetId: "task_api",
    evidence: {
      id: "task_api_tests_passed",
      kind: "test",
      summary: "Task API tests passed after implementation.",
      path: "tests/api/tasks.test.ts",
    },
  },
  {
    type: "status.update",
    targetId: "task_api",
    status: "verified",
    summary: "Task API is verified by passing route tests.",
  },
  {
    type: "evidence.add",
    targetId: "database_persistence",
    evidence: {
      id: "prisma_schema_added",
      kind: "diff",
      summary: "Prisma Task model was added with title, status, and timestamps.",
      path: "prisma/schema.prisma",
    },
  },
  {
    type: "risk.add",
    targetId: "database_persistence",
    risk: {
      id: "migration_not_observed",
      severity: "medium",
      summary: "No migration or database reset command was observed.",
      path: "prisma/schema.prisma",
    },
  },
  {
    type: "risk.add",
    targetId: "status_controls",
    risk: {
      id: "status_update_test_missing",
      severity: "medium",
      summary: "No passing test observed for updating task status.",
      path: "tests/tasks.test.ts",
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "marketing_landing_page",
      nodeType: "feature",
      title: "Marketing Landing Page",
      status: "implemented",
      summary: "Codex also created a marketing page during the run.",
      relatedFiles: ["app/marketing/page.tsx"],
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "marketing_hero_section",
      nodeType: "feature",
      title: "Hero Section",
      status: "implemented",
      summary: "The marketing page includes a top hero section.",
      relatedFiles: ["app/marketing/page.tsx"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "marketing_contains_hero",
      from: "marketing_landing_page",
      to: "marketing_hero_section",
      relation: "contains",
    },
  },
  {
    type: "node.upsert",
    node: {
      id: "marketing_footer",
      nodeType: "feature",
      title: "Footer",
      status: "implemented",
      summary: "The marketing page includes a footer.",
      relatedFiles: ["app/marketing/page.tsx"],
    },
  },
  {
    type: "edge.upsert",
    edge: {
      id: "marketing_contains_footer",
      from: "marketing_landing_page",
      to: "marketing_footer",
      relation: "contains",
    },
  },
];
