import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  if (!apiKey) return;
  posthog.init(apiKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  });
  initialized = true;
}

export function track(event, properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identifyUser(user) {
  if (!initialized || !user) return;
  posthog.identify(String(user.id), { email: user.email, plan_name: user.plan_name });
}
