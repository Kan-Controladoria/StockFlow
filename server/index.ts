import express from "express"; 
import pool from "./db"; // conexão ao Neon (ajusta o caminho se for diferente)
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors()); // libera acesso do frontend (CORS)

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

// rota de produtos
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, codigo_produto, descricao FROM products ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Products error:", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// rota de movimentos corrigida (sem user_id)
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
    res.status(500).json({ error: err.message });
  }
});

// porta dinâmica para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
