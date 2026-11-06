import { SetMetadata } from '@nestjs/common';
import type { Scope } from '../scopes.js';

export const SCOPES_KEY = 'requiredScopes';
export const RequireScopes = (...scopes: Scope[]) => SetMetadata(SCOPES_KEY, scopes);
