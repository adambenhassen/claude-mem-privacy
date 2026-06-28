/**
 * Flattens a captured logger call's arguments into a single searchable string,
 * INCLUDING Error message/stack. `JSON.stringify` alone misses those (they are
 * non-enumerable), which is exactly how a `logger.warn(..., error)` leak — the
 * original bug — would slip past a naive assertion. Use this for "must not leak"
 * checks so they actually fail when an Error carrying secrets is logged.
 */
export function logArgsText(call: unknown[]): string {
  return call
    .map((arg) =>
      arg instanceof Error ? `${arg.message} ${arg.stack ?? ''}` : JSON.stringify(arg)
    )
    .join(' ');
}
