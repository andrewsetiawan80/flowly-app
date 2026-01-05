// Simple event system to trigger refreshes across components

export const REFRESH_EVENTS = {
  PROJECTS: 'refresh-projects',
  TASKS: 'refresh-tasks',
  ALL: 'refresh-all',
} as const;

export function triggerRefresh(event: keyof typeof REFRESH_EVENTS | 'ALL' = 'ALL') {
  if (typeof window === 'undefined') return;
  
  if (event === 'ALL') {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENTS.PROJECTS));
    window.dispatchEvent(new CustomEvent(REFRESH_EVENTS.TASKS));
  } else {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENTS[event]));
  }
}

export function useRefreshListener(event: keyof typeof REFRESH_EVENTS, callback: () => void) {
  if (typeof window === 'undefined') return;
  
  const eventName = REFRESH_EVENTS[event];
  
  const handler = () => callback();
  window.addEventListener(eventName, handler);
  
  return () => window.removeEventListener(eventName, handler);
}


