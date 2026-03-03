// api/stats.ts — public alias for api/admin/stats.ts
// App.tsx fetches /api/stats for maintenance_mode; this proxies to the same handler.

import handler from './admin/stats';
export default handler;