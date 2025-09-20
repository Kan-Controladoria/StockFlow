import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pkg from "pg";

const { Pool } = pkg;

// Conexão com o banco Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------------------------
// ROTA DE SAÚDE
// ---------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------
// LISTAR PRODUTOS
// ---------------------------
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria FROM products ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/products error:", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// ---------------------------
// CADASTRAR PRODUTO
// ---------------------------
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

    const insert = await pool.query(
      `INSERT INTO products 
        (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
       VALUES ($1,$2,$3,$4,$5,$6) 
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

    res.json(insert.rows[0]);
  } catch (err: any) {
    console.error("POST /api/products error:", err.message);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// ---------------------------
// REGISTRAR MOVIMENTO
// ---------------------------
app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, codigo_produto, codigo_barras, tipo, quantidade } =
      req.body;

    if (!tipo || !quantidade) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios: tipo e quantidade" });
    }

    // Identificar o produto pelo que vier
    let finalProductId = null;

    if (product_id) {
      finalProductId = product_id;
    } else if (codigo_produto) {
      const r = await pool.query(
        "SELECT id FROM products WHERE codigo_produto = $1",
        [codigo_produto]
      );
      if (r.rows.length > 0) finalProductId = r.rows[0].id;
    } else if (codigo_barras) {
      const r = await pool.query(
        "SELECT id FROM products WHERE codigo_barras = $1",
        [codigo_barras]
      );
      if (r.rows.length > 0) finalProductId = r.rows[0].id;
    }

    if (!finalProductId) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const insert = await pool.query(
      `INSERT INTO movements (product_id, type, quantity)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [finalProductId, tipo, quantidade]
    );

    res.json({ message: "Movimento registrado", movimento: insert.rows[0] });
  } catch (err: any) {
    console.error("POST /api/movements error:", err.message);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// ---------------------------
// LISTAR MOVIMENTOS
// ---------------------------
app.get("/api/movements", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, p.produto, m.type, m.quantity, m.created_at
       FROM movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/movements error:", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

// ---------------------------
// SALDOS POR PRODUTO
// ---------------------------
app.get("/api/balance", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.id, 
         p.codigo_produto, 
         p.produto, 
         COALESCE(SUM(CASE WHEN m.type = 'entrada' THEN m.quantity ELSE 0 END),0) -
         COALESCE(SUM(CASE WHEN m.type = 'saida' THEN m.quantity ELSE 0 END),0) AS saldo
       FROM products p
       LEFT JOIN movements m ON m.product_id = p.id
       GROUP BY p.id
       ORDER BY p.id`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/balance error:", err.message);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

// ---------------------------
// INICIAR SERVIDOR
// ---------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
