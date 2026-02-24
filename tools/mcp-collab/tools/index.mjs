// ---------------------------------------------------------------------------
// Tool registration orchestrator — registers all tools on a McpServer instance
// ---------------------------------------------------------------------------

import { register as registerArchGraphQuery } from './architecture-graph-query.mjs';
import { register as registerBusinessGraphQuery } from './business-graph-query.mjs';
import { register as registerArchVectorSearch } from './architecture-vector-search.mjs';
import { register as registerBusinessVectorSearch } from './business-vector-search.mjs';
import { register as registerBusinessRule } from './business-rule.mjs';
import { register as registerContextScopesV2 } from './context-scopes-list-v2.mjs';
import { register as registerContextVectorSearchV2 } from './context-vector-search-v2.mjs';
import { register as registerContextGraphDegreeSearchV2 } from './context-graph-degree-search-v2.mjs';
import { ENABLE_V1_TOOLS } from '../config.mjs';

/**
 * Register all MCP tools on the given server instance.
 * Each tool module follows the `register(server)` pattern.
 */
export function registerAllTools(server) {
  // V2 tools are always enabled.
  registerContextScopesV2(server);
  registerContextVectorSearchV2(server);
  registerContextGraphDegreeSearchV2(server);

  // Legacy V1 tools are opt-in.
  if (ENABLE_V1_TOOLS) {
    registerArchGraphQuery(server);
    registerBusinessGraphQuery(server);
    registerArchVectorSearch(server);
    registerBusinessVectorSearch(server);
    registerBusinessRule(server);
  }
}
