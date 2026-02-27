// ---------------------------------------------------------------------------
// Context router — resolves V2 scope/context to Qdrant collections and Nebula spaces
// ---------------------------------------------------------------------------

import {
  TECHNICAL_SCOPES,
  QDRANT_COLLECTION_BUSINESS,
  NEBULA_SPACE_TECHNICAL,
  NEBULA_SPACE_BUSINESS
} from '../config.mjs';

const technicalScopeNames = Object.keys(TECHNICAL_SCOPES);

export const CONTEXTS = /** @type {const} */ (['technical', 'business']);
export const SCOPES = /** @type {const} */ ([...technicalScopeNames, 'business', 'global']);

function normalize(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

export function getScopeCatalog() {
  // Build technical collections map from env-driven TECHNICAL_SCOPES
  const technicalCollections = {};
  for (const [scope, collection] of Object.entries(TECHNICAL_SCOPES)) {
    technicalCollections[scope] = [collection];
  }
  // global = search across all technical collections
  technicalCollections.global = Object.values(TECHNICAL_SCOPES);

  return {
    contexts: {
      technical: {
        scopes: [...technicalScopeNames, 'global'],
        collections: technicalCollections,
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
