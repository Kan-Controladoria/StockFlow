import express from "express";
import cors from "cors";
import pool from "./db"; // conexão ao Neon
import { registerRoutes } from "./routes"; // importa as rotas completas

const app = express();
app.use(express.json());
app.use(cors());

// rota de saúde
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// rota simples de relatórios (mantida como fallback)
app.get("/api/reports/stats-basic", async (_req, res) => {
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

// inicializa todas as rotas definidas em routes.ts
registerRoutes(app);

// porta dinâmica para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

