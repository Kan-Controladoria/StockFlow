import express from "express";
import pool from "./db"; // conexão ao Neon (ajusta se o caminho for diferente)

const app = express();
app.use(express.json());

// --------------------
// Rota de saúde
// --------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// --------------------
// Produtos
// --------------------
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, codigo_produto, descricao FROM products ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Erro ao buscar produtos:", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { codigo_produto, produto } = req.body;
    if (!codigo_produto || !produto) {
      return res.status(400).json({ error: "Código e descrição são obrigatórios" });
    }
    const result = await pool.query(
      "INSERT INTO products (codigo_produto, descricao) VALUES ($1, $2) RETURNING *",
      [codigo_produto, produto]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Erro ao cadastrar produto:", err.message);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// --------------------
// Movimentos
// --------------------
app.get("/api/movements", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.product_id, p.descricao AS product_name, m.type, m.quantity, m.created_at
      FROM movements m
      JOIN products p ON p.id = m.product_id
      ORDER BY m.id DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Erro ao buscar movimentos:", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, type, quantity } = req.body;
    if (!product_id || !type || !quantity) {
      return res.status(400).json({ error: "Campos obrigatórios: product_id, type, quantity" });
    }
    const result = await pool.query(
      "INSERT INTO movements (product_id, type, quantity) VALUES ($1, $2, $3) RETURNING *",
      [product_id, type, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Erro ao registrar movimento:", err.message);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// --------------------
// Estoque (Resumo)
// --------------------
app.get("/api/stock/summary", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.codigo_produto,
        p.descricao,
        COALESCE(SUM(
          CASE WHEN m.type = 'entrada' THEN m.quantity
               WHEN m.type = 'saida' THEN -m.quantity
               ELSE 0 END
        ), 0) AS saldo
      FROM products p
      LEFT JOIN movements m ON p.id = m.product_id
      GROUP BY p.id, p.codigo_produto, p.descricao
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Erro ao calcular estoque:", err.message);
    res.status(500).json({ error: "Erro ao calcular estoque" });
  }
});

// --------------------
// Start
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
