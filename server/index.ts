import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// conexão com o banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// rota de teste
app.get("/", (_req, res) => {
  res.send("API funcionando!");
});

// rota para listar produtos
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, codigo_produto, descricao FROM products");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// rota para criar movimentação (sem user_id)
app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, type, quantity } = req.body;

    const result = await pool.query(
      `INSERT INTO movements (product_id, type, quantity, created_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [product_id, type, quantity]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao inserir movimentação:", err);
    res.status(500).json({ error: "Erro ao inserir movimentação" });
  }
});

// servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
