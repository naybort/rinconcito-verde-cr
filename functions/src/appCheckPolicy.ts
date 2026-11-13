// Only an explicit deployment value can pause enforcement. Missing or malformed
// settings must never silently turn off the normal production protection.
export function appCheckEnforced(value?: string): boolean {
 if (value === undefined || value === 'true') return true;
 if (value === 'false') return false;
 throw new Error('CATALOG_APPCHECK_ENFORCED debe ser true o false.');
}
