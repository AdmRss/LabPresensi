/// <reference types="node" />

import { createHash } from 'node:crypto';

export function hashIdentifier(...parts: string[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
