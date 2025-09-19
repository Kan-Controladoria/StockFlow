import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render usa variável de ambiente
  ssl: { rejectUnauthorized: false }
});

export default pool;
