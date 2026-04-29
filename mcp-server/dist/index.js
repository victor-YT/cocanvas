#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backendClient_1 = require("./backendClient");
const protocol_1 = require("./protocol");
const tools_1 = require("./tools");
const backend = new backendClient_1.BackendClient();
(0, protocol_1.createMcpServer)({
    name: "codex-live-canvas",
    version: "0.1.0",
    tools: [
        (0, tools_1.createFeatureNodeTool)(backend),
        (0, tools_1.updateFeatureNodeTool)(backend),
        (0, tools_1.attachDiffTool)(backend),
        (0, tools_1.markTestResultTool)(backend),
        (0, tools_1.markConflictTool)(backend),
        (0, tools_1.getNodeContextTool)(backend),
    ],
}).start();
