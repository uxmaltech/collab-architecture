// ---------------------------------------------------------------------------
// Tool registration orchestrator — registers all tools on a McpServer instance
// ---------------------------------------------------------------------------

import { register as registerArchGraphQuery } from './architecture-graph-query.mjs';
import { register as registerBusinessGraphQuery } from './business-graph-query.mjs';
import { register as registerArchVectorSearch } from './architecture-vector-search.mjs';
import { register as registerBusinessVectorSearch } from './business-vector-search.mjs';
import { register as registerBusinessRule } from './business-rule.mjs';

/**
 * Register all MCP tools on the given server instance.
 * Each tool module follows the `register(server)` pattern.
 */
export function registerAllTools(server) {
  registerArchGraphQuery(server);
  registerBusinessGraphQuery(server);
  registerArchVectorSearch(server);
  registerBusinessVectorSearch(server);
  registerBusinessRule(server);
}
