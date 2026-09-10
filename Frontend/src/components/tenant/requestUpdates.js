import { useSyncExternalStore } from "react";
let updates = {};
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const useRequestUpdates = () => useSyncExternalStore(subscribe, () => updates);
export function updateRequest(request, changes, text) {
  const current = updates[request.id] || request;
  updates = { ...updates, [request.id]: { ...current, ...changes, history: [...current.history, { date: new Date().toISOString(), text }] } };
  listeners.forEach(listener => listener());
}
