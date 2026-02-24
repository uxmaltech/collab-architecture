// ---------------------------------------------------------------------------
// Context router — resolves V2 scope/context to Qdrant collections and Nebula spaces
// ---------------------------------------------------------------------------

import {
  QDRANT_COLLECTION_TECH_UXMAL,
  QDRANT_COLLECTION_TECH_ENVIAFLORES,
  QDRANT_COLLECTION_BUSINESS,
  NEBULA_SPACE_TECHNICAL,
  NEBULA_SPACE_BUSINESS
} from '../config.mjs';

export const CONTEXTS = /** @type {const} */ (['technical', 'business']);
export const SCOPES = /** @type {const} */ (['uxmal', 'enviaflores', 'business', 'global']);

function normalize(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

export function getScopeCatalog() {
  return {
    contexts: {
      technical: {
        scopes: ['uxmal', 'enviaflores', 'global'],
        collections: {
          uxmal: [QDRANT_COLLECTION_TECH_UXMAL],
          enviaflores: [QDRANT_COLLECTION_TECH_ENVIAFLORES],
          global: [QDRANT_COLLECTION_TECH_UXMAL, QDRANT_COLLECTION_TECH_ENVIAFLORES]
        },
        space: NEBULA_SPACE_TECHNICAL
      },
      business: {
        scopes: ['business', 'global'],
        collections: {
          business: [QDRANT_COLLECTION_BUSINESS],
          global: [QDRANT_COLLECTION_BUSINESS]
        },
        space: NEBULA_SPACE_BUSINESS
      }
    }
  };
}

export function resolveContextScope(contextInput, scopeInput) {
  const context = normalize(contextInput, 'technical');
  const scope = normalize(scopeInput, context === 'business' ? 'business' : 'global');

  const catalog = getScopeCatalog();
  const contextConfig = catalog.contexts[context];
  if (!contextConfig) {
    throw new Error(`Invalid context "${contextInput}". Valid contexts: technical, business.`);
  }

  if (!contextConfig.scopes.includes(scope)) {
    throw new Error(
      `Invalid scope "${scopeInput}" for context "${context}". Valid scopes: ${contextConfig.scopes.join(', ')}.`
    );
  }

  return { context, scope, contextConfig };
}

export function resolveVectorCollections(contextInput, scopeInput) {
  const { context, scope, contextConfig } = resolveContextScope(contextInput, scopeInput);
  return {
    context,
    scope,
    collections: contextConfig.collections[scope]
  };
}

export function resolveGraphSpace(contextInput) {
  const { context, contextConfig } = resolveContextScope(contextInput);
  return {
    context,
    space: contextConfig.space
  };
}
