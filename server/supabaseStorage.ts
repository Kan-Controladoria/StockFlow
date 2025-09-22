import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função para criar produto
export async function createProduct(data: any) {
  const query = `
    INSERT INTO products 
      (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    data.codigo_produto,
    data.produto,
    data.codigo_barras || null,
    data.departamento || null,
    data.categoria || null,
    data.subcategoria || null,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error("❌ Erro em createProduct:", err.message);
    throw err;
  }
}

// Função para listar produtos
export async function listProducts() {
  const query = `SELECT * FROM products ORDER BY id ASC;`;
  const result = await pool.query(query);
  return result.rows;
}
