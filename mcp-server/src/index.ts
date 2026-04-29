#!/usr/bin/env node

import { BackendClient } from "./backendClient";
import { createMcpServer } from "./protocol";
import {
  attachDiffTool,
  createFeatureNodeTool,
  getNodeContextTool,
  markConflictTool,
  markTestResultTool,
  updateFeatureNodeTool,
} from "./tools";

const backend = new BackendClient();

createMcpServer({
  name: "codex-live-canvas",
  version: "0.1.0",
  tools: [
    createFeatureNodeTool(backend),
    updateFeatureNodeTool(backend),
    attachDiffTool(backend),
    markTestResultTool(backend),
    markConflictTool(backend),
    getNodeContextTool(backend),
  ],
}).start();

