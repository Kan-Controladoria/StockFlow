import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Pool } from "pg";

const app = express();
const port = process.env.PORT || 3000;

// Conexão com PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// ========================
// Rota de saúde
// ========================
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ========================
// Rota: listar produtos
// ========================
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// ========================
// Rota: registrar movimento (POST)
// ========================
app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, type, quantity } = req.body;

    const result = await pool.query(
      `INSERT INTO movements (product_id, type, quantity, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [product_id, type, quantity]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao registrar movimento:", err);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// ========================
// Rota: listar movimentos (GET)
// ========================
app.get("/api/movements", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.product_id, p.descricao AS product_name, m.type, m.quantity, m.created_at
       FROM movements m
       JOIN products p ON m.product_id = p.id
       ORDER BY m.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar movimentos:", err);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

// ========================
// NOVO: Rota saldo por produto
// ========================
app.get("/api/stock/summary", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id,
              p.codigo_produto,
              p.descricao,
              COALESCE(SUM(CASE WHEN m.type = 'entrada' THEN m.quantity ELSE -m.quantity END), 0) AS saldo
       FROM products p
       LEFT JOIN movements m ON m.product_id = p.id
       GROUP BY p.id, p.codigo_produto, p.descricao
       ORDER BY p.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao calcular saldo:", err);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

// ========================
// Start server
// ========================
app.listen(port, () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});

