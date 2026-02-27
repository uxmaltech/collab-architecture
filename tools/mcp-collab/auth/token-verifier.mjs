// ---------------------------------------------------------------------------
// Bearer token verifier — implements OAuthTokenVerifier using API keys
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { MCP_API_KEYS } from '../config.mjs';

// One year from now, in seconds since epoch — effectively "never expires"
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Simple token verifier that validates bearer tokens against a list of
 * pre-configured API keys from the MCP_API_KEYS environment variable.
 *
 * Implements the OAuthTokenVerifier interface required by the SDK's
 * `requireBearerAuth` middleware.
 *
 * The SDK requires `expiresAt` to be a valid number (seconds since epoch)
 * and checks that it has not passed. For static API keys we set expiration
 * to one year in the future on each verification call.
 *
 * API keys format in env: 'clientId1:key1,clientId2:key2'
 */
export const tokenVerifier = {
  async verifyAccessToken(token) {
    const tokenBuf = Buffer.from(String(token));
    const keyEntry = MCP_API_KEYS.find((k) => {
      const keyBuf = Buffer.from(k.key);
      if (keyBuf.length !== tokenBuf.length) return false;
      return crypto.timingSafeEqual(keyBuf, tokenBuf);
    });
    if (!keyEntry) {
      const { InvalidTokenError } = await import(
        '@modelcontextprotocol/sdk/server/auth/errors.js'
      );
      throw new InvalidTokenError('Invalid or unknown API key');
    }
    return {
      token,
      clientId: keyEntry.clientId,
      scopes: keyEntry.scopes || [],
      expiresAt: Math.floor(Date.now() / 1000) + ONE_YEAR_SECONDS
    };
  }
};
