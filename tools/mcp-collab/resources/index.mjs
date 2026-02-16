// ---------------------------------------------------------------------------
// MCP Resources — expose infrastructure state for introspection
// ---------------------------------------------------------------------------

import {
  ARCH_SPACE,
  BUSINESS_SPACE,
  ARCH_COLLECTION,
  BUSINESS_COLLECTION,
  QDRANT_URL,
  VECTOR_SIZE
} from '../config.mjs';
import { runNebulaQuery } from '../lib/nebula.mjs';

/**
 * Register all MCP resources on the given server instance.
 */
export function registerAllResources(server) {
  // --- Server configuration summary ---
  server.registerResource(
    'server-config',
    'collab://config/summary',
    {
      title: 'Server Configuration',
      description: 'Current MCP server configuration including Qdrant and NebulaGraph settings.',
      mimeType: 'application/json'
    },
    async () => ({
      contents: [
        {
          uri: 'collab://config/summary',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              qdrant: {
                url: QDRANT_URL,
                vectorSize: VECTOR_SIZE,
                collections: {
                  architecture: ARCH_COLLECTION,
                  business: BUSINESS_COLLECTION
                }
              },
              nebula: {
                spaces: {
                  architecture: ARCH_SPACE,
                  business: BUSINESS_SPACE
                }
              }
            },
            null,
            2
          )
        }
      ]
    })
  );

  // --- Architecture graph schema ---
  server.registerResource(
    'architecture-graph-schema',
    'collab://schema/architecture',
    {
      title: 'Architecture Graph Schema',
      description: 'Current tags and edges in the architecture graph space.',
      mimeType: 'text/plain'
    },
    async () => {
      let tags, edges;
      try {
        tags = runNebulaQuery(`USE ${ARCH_SPACE}; SHOW TAGS;`);
        edges = runNebulaQuery(`USE ${ARCH_SPACE}; SHOW EDGES;`);
      } catch (err) {
        return {
          contents: [
            {
              uri: 'collab://schema/architecture',
              mimeType: 'text/plain',
              text: `Error fetching schema: ${err.message}`
            }
          ]
        };
      }
      return {
        contents: [
          {
            uri: 'collab://schema/architecture',
            mimeType: 'text/plain',
            text: `=== Tags ===\n${tags}\n\n=== Edges ===\n${edges}`
          }
        ]
      };
    }
  );

  // --- Business graph schema ---
  server.registerResource(
    'business-graph-schema',
    'collab://schema/business',
    {
      title: 'Business Graph Schema',
      description: 'Current tags and edges in the business graph space.',
      mimeType: 'text/plain'
    },
    async () => {
      let tags, edges;
      try {
        tags = runNebulaQuery(`USE ${BUSINESS_SPACE}; SHOW TAGS;`);
        edges = runNebulaQuery(`USE ${BUSINESS_SPACE}; SHOW EDGES;`);
      } catch (err) {
        return {
          contents: [
            {
              uri: 'collab://schema/business',
              mimeType: 'text/plain',
              text: `Error fetching schema: ${err.message}`
            }
          ]
        };
      }
      return {
        contents: [
          {
            uri: 'collab://schema/business',
            mimeType: 'text/plain',
            text: `=== Tags ===\n${tags}\n\n=== Edges ===\n${edges}`
          }
        ]
      };
    }
  );
}
