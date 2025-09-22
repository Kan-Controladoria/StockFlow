import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pkg from "pg";

const { Pool } = pkg;

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// 🔤 Força UTF-8 em todas as respostas JSON
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Conexão com Postgres (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ------------------------- HEALTH -------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ------------------------- PRODUCTS -------------------------
// Lista todos os produtos
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao listar produtos:", err?.message || err);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

// Cria produto
app.post("/api/products", async (req, res) => {
  try {
    const {
      codigo_produto,
      produto,
      codigo_barras,
      departamento,
      categoria,
      subcategoria,
    } = req.body;

    if (!codigo_produto || !produto) {
      return res
        .status(400)
        .json({ error: "Informe 'codigo_produto' e 'produto'" });
    }

    const insert = await pool.query(
      `INSERT INTO products
        (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        codigo_produto,
        produto,
        codigo_barras || null,
        departamento || null,
        categoria || null,
        subcategoria || null,
      ]
    );

    res.json({ message: "Produto cadastrado", produto: insert.rows[0] });
  } catch (err: any) {
    console.error("Erro ao cadastrar produto:", err?.message || err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// ------------------------- MOVEMENTS -------------------------
// Lista movimentos
app.get("/api/movements", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id,
              m.product_id,
              p.codigo_produto,
              p.produto,
              m.type,
              m.quantity,
              m.created_at
       FROM movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.id DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao listar movimentos:", err?.message || err);
    res.status(500).json({ error: "Erro ao listar movimentos" });
  }
});

// Cria movimento (entrada/saida)
app.post("/api/movements", async (req, res) => {
  try {
    const { codigo_produto, type, quantity } = req.body;

    if (!codigo_produto || !type || !quantity) {
      return res
        .status(400)
        .json({ error: "Informe 'codigo_produto', 'type' e 'quantity'" });
    }

    // Busca o id do produto pelo codigo_produto
    const prod = await pool.query(
      "SELECT id FROM products WHERE codigo_produto = $1",
      [codigo_produto]
    );
    if (prod.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    const product_id = prod.rows[0].id;

    // Insere movimento
    const insert = await pool.query(
      "INSERT INTO movements (product_id, type, quantity) VALUES ($1, $2, $3) RETURNING *",
      [product_id, type, quantity]
    );

    res.json({ message: "Movimento registrado", movimento: insert.rows[0] });
  } catch (err: any) {
    console.error("Erro ao registrar movimento:", err?.message || err);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// ------------------------- BALANCE -------------------------
// Calcula saldo por produto
app.get("/api/balance", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT  p.id,
              p.codigo_produto,
              p.produto,
              COALESCE(SUM(
                CASE
                  WHEN m.type = 'entrada' THEN m.quantity
                  WHEN m.type = 'saida'   THEN -m.quantity
                  ELSE 0
                END
              ), 0) AS saldo
      FROM products p
      LEFT JOIN movements m ON m.product_id = p.id
      GROUP BY p.id, p.codigo_produto, p.produto
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao calcular saldo:", err?.message || err);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

// ------------------------- START -------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
