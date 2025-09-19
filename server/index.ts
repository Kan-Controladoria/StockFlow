import express from "express";
import pool from "./db"; // conexão ao Neon
import cors from "cors"; // <-- precisamos instalar isso

const app = express();

// habilita CORS para todas as origens
app.use(cors());
app.use(express.json());

// rota de saúde
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// rota de relatórios
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

// rota de movimentos
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
    console.error("❌ Movement error:", err.message);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// porta dinâmica para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



