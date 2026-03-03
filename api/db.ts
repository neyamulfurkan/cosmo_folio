import { Pool } from '@neondatabase/serverless';
import type { QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  throw new Error('NEON_DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString,
  ssl: true,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

const getClient = () => pool.connect();

export { query, getClient };
export type { QueryResult };