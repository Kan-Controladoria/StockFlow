import express from "express";
import cors from "cors";
import pool from "./db"; // conexão ao Neon (DATABASE_URL)

// ---------------------------------
// APP / Middlewares
// ---------------------------------
const app = express();
app.use(cors()); // libera chamadas do file:// e de outros domínios
app.use(express.json());

// Utilitário de log para POSTs
function logReq(path: string, body: any) {
  console.log(`➡️  ${path} body=`, JSON.stringify(body));
}

// ---------------------------------
// Healthcheck
// ---------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------
// PRODUCTS
// ---------------------------------
app.get("/api/products", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, codigo_produto, descricao FROM products ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err: any) {
    console.error("❌ /api/products GET:", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    logReq("/api/products POST", req.body);
    const { codigo_produto, produto } = req.body;

    if (!codigo_produto || !produto) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios: codigo_produto e produto (descrição)" });
    }

    const { rows } = await pool.query(
      "INSERT INTO products (codigo_produto, descricao) VALUES ($1, $2) RETURNING id, codigo_produto, descricao",
      [String(codigo_produto).trim(), String(produto).trim()]
    );

    return res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("❌ /api/products POST:", err.message);
    return res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// ---------------------------------
// MOVEMENTS
// ---------------------------------
app.get("/api/movements", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id,
              m.product_id,
              p.descricao AS product_name,
              m.type,
              m.quantity,
              m.created_at
         FROM movements m
         JOIN products p ON p.id = m.product_id
        ORDER BY m.id DESC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error("❌ /api/movements GET:", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

app.post("/api/movements", async (req, res) => {
  try {
    logReq("/api/movements POST", req.body);
    const { product_id, type, quantity } = req.body;

    if (!product_id || !type || quantity == null) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios: product_id, type, quantity" });
    }

    const qnt = Number(quantity);
    if (!Number.isFinite(qnt) || qnt <= 0) {
      return res.status(400).json({ error: "quantity deve ser um número > 0" });
    }

    if (type !== "entrada" && type !== "saida") {
      return res.status(400).json({ error: "type deve ser 'entrada' ou 'saida'" });
    }

    const { rows } = await pool.query(
      `INSERT INTO movements (product_id, type, quantity, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, product_id, type, quantity, created_at`,
      [Number(product_id), type, qnt]
    );

    return res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("❌ /api/movements POST:", err.message);
    return res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// ---------------------------------
// STOCK SUMMARY (saldo por produto)
// ---------------------------------
app.get("/api/stock/summary", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id,
              p.codigo_produto,
              p.descricao,
              COALESCE(SUM(
                CASE
                  WHEN m.type = 'entrada' THEN m.quantity
                  WHEN m.type = 'saida'   THEN -m.quantity
                  ELSE 0
                END
              ), 0) AS saldo
         FROM products p
    LEFT JOIN movements m ON m.product_id = p.id
     GROUP BY p.id, p.codigo_produto, p.descricao
     ORDER BY p.id ASC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error("❌ /api/stock/summary GET:", err.message);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

// ---------------------------------
// Start
// ---------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
