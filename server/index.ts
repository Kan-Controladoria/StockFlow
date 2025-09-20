import express from "express";
import cors from "cors";
import pool from "./db";

const app = express();
app.use(cors());
app.use(express.json());

// util log
function log(label: string, data?: any) {
  const stamp = new Date().toISOString();
  if (data === undefined) {
    console.log(`[${stamp}] ${label}`);
  } else {
    console.log(
      `[${stamp}] ${label}`,
      typeof data === "string" ? data : JSON.stringify(data)
    );
  }
}

// -------------------- Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// -------------------- Products
app.get("/api/products", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria FROM products ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err: any) {
    log("GET /api/products", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

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
    const { rows } = await pool.query(
      `INSERT INTO products (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        codigo_produto,
        produto,
        codigo_barras,
        departamento,
        categoria,
        subcategoria,
      ]
    );
    res.json(rows[0]);
  } catch (err: any) {
    log("POST /api/products", err.message);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// -------------------- Movements
app.get("/api/movements", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, p.produto, m.type AS tipo, m.quantity AS quantidade, m.created_at AS data
       FROM movements m
       JOIN products p ON m.product_id = p.id
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err: any) {
    log("GET /api/movements", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, codigo_produto, codigo_barras, tipo, quantidade } =
      req.body;

    let idFinal: number | null = null;

    if (product_id) {
      idFinal = product_id;
    } else if (codigo_produto) {
      const r = await pool.query(
        "SELECT id FROM products WHERE codigo_produto = $1",
        [codigo_produto]
      );
      if (r.rows.length) idFinal = r.rows[0].id;
    } else if (codigo_barras) {
      const r = await pool.query(
        "SELECT id FROM products WHERE codigo_barras = $1",
        [codigo_barras]
      );
      if (r.rows.length) idFinal = r.rows[0].id;
    }

    if (!idFinal) {
      return res.status(400).json({ error: "Produto não encontrado" });
    }

    const { rows } = await pool.query(
      `INSERT INTO movements (product_id, type, quantity)
       VALUES ($1,$2,$3) RETURNING id, product_id, type AS tipo, quantity AS quantidade, created_at AS data`,
      [idFinal, tipo, quantidade]
    );
    res.json(rows[0]);
  } catch (err: any) {
    log("POST /api/movements", err.message);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// -------------------- Balance por produto
app.get("/api/balance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
          COALESCE(SUM(CASE WHEN type = 'entrada' THEN quantity ELSE 0 END),0) -
          COALESCE(SUM(CASE WHEN type = 'saida' THEN quantity ELSE 0 END),0) AS saldo
       FROM movements
       WHERE product_id = $1`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    log("GET /api/balance/:id", err.message);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

// -------------------- Start
const port = process.env.PORT || 10000;
app.listen(port, () => {
  log(`Servidor rodando na porta ${port}`);
});


