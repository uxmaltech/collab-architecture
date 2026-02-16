// ---------------------------------------------------------------------------
// Graph node/edge construction — build nGQL INSERT statements for NebulaGraph
// ---------------------------------------------------------------------------

import { escapeNebula, runNebulaQuery } from './nebula.mjs';
import { BUSINESS_SPACE, CONFIDENCE_LEVELS } from '../config.mjs';

/**
 * Current date as ISO string (YYYY-MM-DD).
 */
export function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validate and normalize a confidence level, defaulting to 'provisional'.
 */
export function ensureConfidence(value) {
  if (value == null) return 'provisional';
  if (CONFIDENCE_LEVELS.includes(value)) return value;
  return 'provisional';
}

/**
 * Build an nGQL INSERT VERTEX statement for a batch of nodes.
 */
export function buildInsertNodes(nodes, confidence) {
  if (!nodes.length) return null;
  const date = nowDate();
  const values = nodes.map((node) => {
    const summary = node.summary || node.name;
    const content = node.content || '';
    return `"${escapeNebula(node.id)}":(\"${escapeNebula(node.node_type)}\", \"${escapeNebula(node.name)}\", \"${escapeNebula(summary)}\", \"${escapeNebula(content)}\", \"active\", \"${escapeNebula(confidence)}\", \"v1.0.0\", \"${date}\", \"${date}\")`;
  });
  return `INSERT VERTEX Node(node_type, name, summary, content, status, confidence, version, created, updated) VALUES ${values.join(', ')};`;
}

/**
 * Build an nGQL INSERT EDGE statement for a batch of edges.
 */
export function buildInsertEdges(edgeType, edges, confidence) {
  if (!edges.length) return null;
  const date = nowDate();
  const values = edges.map((edge) => {
    const rationale = edge.rationale || '';
    return `"${escapeNebula(edge.from)}"->"${escapeNebula(edge.to)}":(\"${escapeNebula(rationale)}\", \"${escapeNebula(confidence)}\", \"${date}\", \"${date}\")`;
  });
  return `INSERT EDGE ${edgeType}(rationale, confidence, created, updated) VALUES ${values.join(', ')};`;
}

/**
 * Create the business graph space and its schema (tags + edges) if they don't exist.
 * Retries are handled by the caller.
 */
export function ensureBusinessSchema() {
  const statements = [
    `CREATE SPACE IF NOT EXISTS ${BUSINESS_SPACE}(vid_type=FIXED_STRING(32), partition_num=1, replica_factor=1);`,
    `USE ${BUSINESS_SPACE};`,
    'CREATE TAG IF NOT EXISTS Node(node_type string, name string, summary string, content string, status string, confidence string, version string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS APPLIES_TO(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS IMPLEMENTS(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS DEPENDS_ON(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS DEFINED_IN(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS OWNS(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS USES_ENTITY(rationale string, confidence string, created string, updated string);'
  ];
  runNebulaQuery(statements.join('\n'));
}
