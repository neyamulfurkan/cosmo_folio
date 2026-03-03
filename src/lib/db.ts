import { Pool, neon } from '@neondatabase/serverless';
import type { QueryResult, QueryResultRow } from 'pg';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

const getClient = () => pool.connect();

export { query, getClient };
export type { QueryResult };