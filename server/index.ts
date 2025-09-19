import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cors from "cors";
import { Pool } from "pg";

const app = express();
const port = process.env.PORT || 3000;

// Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(
  session({
    secret: "estoque-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// ========================
// Rota: GET /api/products
// ========================
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// ========================
// Rota: POST /api/movements
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
// Rota: GET /api/movements
// ========================
app.get("/api/movements", async (req, res) => {
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

// Start server
app.listen(port, () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});

