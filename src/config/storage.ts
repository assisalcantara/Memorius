export const STORAGE_PREFIX = "legacyflow" as const;

export function getTenantStorageKey(tenantId: string, key: string): string {
  return `${STORAGE_PREFIX}_${tenantId}_${key}`;
}
