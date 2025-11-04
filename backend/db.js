import pg from 'pg';
import 'dotenv/config';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
export default {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};