export function computePixAvailability({ isOnline, status, enabledInPdv }) {
  return Boolean(isOnline) && status === 'connected' && Boolean(enabledInPdv);
}
