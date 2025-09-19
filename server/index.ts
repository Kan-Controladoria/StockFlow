import express from "express";
import pool from "./db"; // conexão ao Neon (ajusta o caminho se for diferente)

const app = express();
app.use(express.json());

// rota de saúde
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// =====================
// PRODUTOS
// =====================
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, codigo_produto, descricao FROM products ORDER BY id ASC");
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
      return res.status(400).json({ error: "codigo_produto e produto são obrigatórios" });
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

// =====================
// RELATÓRIOS
// =====================
app.get("/api/reports/stats", async (_req, res) => {
  try {
    const totalProd = await pool.query("SELECT COUNT(*) FROM products");
    const totalMov = await pool.query("SELECT COUNT(*) FROM movements");
    res.json({
      products: Number(totalProd.rows[0].count),
      movements: Number(totalMov.rows[0].count)
    });
  } catch (err: any) {
    console.error("❌ Stats error:", err.message);
    res.status(503).json({ error: "DB not ready" });
  }
});

// =====================
// MOVIMENTOS
// =====================
app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, type, quantity } = req.body;
    const result = await pool.query(
      "INSERT INTO movements (product_id, type, quantity) VALUES ($1, $2, $3) RETURNING *",
      [product_id, type, quantity]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Movement error:", err.message);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

app.get("/api/movements", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.product_id, p.descricao as product_name, m.type, m.quantity, m.created_at
       FROM movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.id DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Erro ao buscar movimentos:", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

// =====================
// PORTA
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
