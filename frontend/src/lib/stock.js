/** 'out' at zero, 'low' at or under the reorder level, otherwise 'ok'. */
export function stockState(quantity, minimum) {
  if (quantity <= 0) return 'out';
  if (quantity <= minimum) return 'low';
  return 'ok';
}
