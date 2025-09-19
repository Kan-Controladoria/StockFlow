import express from "express";
import cors from "cors";          // <-- IMPORTANTE: adiciona o CORS
import pool from "./db";          // conexão ao Neon (ajusta o caminho se for diferente)

const app = express();

// Habilita JSON e CORS
app.use(express.json());
app.use(cors());                  // <-- PERMITE que navegadores externos (ex: teu teste.html) acessem a API

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

// porta dinâmica para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


