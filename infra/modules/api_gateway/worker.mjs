// Admin API gateway. Runs on the admin API hostname after the NGFW (WAF) rules and before the
// Express API: only GraphQL calls get through, each stamped with the shared secret the API
// requires before it honors an admin token (server/src/lib/gateway.js). Admin tokens then
// work only on the admin hostname, which is only tighter than the mobile one once the NGFW
// locks it to admin IPs (admin_allowed_ips).
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/graphql') return new Response('Not found', { status: 404 });
    // OPTIONS must pass untouched-by-auth: it's the browser's CORS preflight.
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'POST, OPTIONS' } });
    }
    const headers = new Headers(request.headers);
    headers.set('x-louagi-gateway', env.GATEWAY_SECRET);
    return fetch(new Request(request, { headers }));
  },
};
