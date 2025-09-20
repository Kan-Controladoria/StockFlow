import express from "express";
import cors from "cors";
import pool from "./db"; // conexão Neon via DATABASE_URL

const app = express();
app.use(cors());
app.use(express.json());

function log(label: string, data?: any) {
  const stamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${stamp}] ${label}:`, typeof data === "string" ? data : JSON.stringify(data));
  } else {
    console.log(`[${stamp}] ${label}`);
  }
}

// -------------------- Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// -------------------- Products
app.get("/api/products", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, codigo_produto, descricao FROM products ORDER BY id ASC"
    );
    log("GET /api/products -> rows", rows);
    res.json(rows);
  } catch (err: any) {
    log("ERR GET /api/products", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// debug auxiliar: contagem rápida
app.get("/api/products/count", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM products");
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao contar produtos" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { codigo_produto, produto, descricao } = req.body;
    log("POST /api/products body", req.body);

    const desc = produto ?? descricao; // aceita ambos
    if (!codigo_produto || !desc) {
      return res.status(400).json({
        error: "Campos obrigatórios: codigo_produto e produto (ou descricao)",
      });
    }

    const insert = await pool.query(
      `INSERT INTO products (codigo_produto, descricao)
       VALUES ($1, $2)
       RETURNING id, codigo_produto, descricao`,
      [String(codigo_produto).trim(), String(desc).trim()]
    );

    const row = insert.rows[0];
    log("POST /api/products inserted", row);

    // retorna o item inserido
    return res.status(201).json(row);
  } catch (err: any) {
    log("ERR POST /api/products", err.message);
    return res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// -------------------- Movements
app.get("/api/movements", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.product_id, p.descricao AS product_name, m.type, m.quantity, m.created_at
         FROM movements m
         JOIN products p ON p.id = m.product_id
        ORDER BY m.id DESC`
    );
    res.json(rows);
  } catch (err: any) {
    log("ERR GET /api/movements", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, type, quantity } = req.body;
    log("POST /api/movements body", req.body);

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
    log("ERR POST /api/movements", err.message);
    return res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// -------------------- Stock summary
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
                  ELSE 0 END
              ), 0) AS saldo
         FROM products p
    LEFT JOIN movements m ON m.product_id = p.id
     GROUP BY p.id, p.codigo_produto, p.descricao
     ORDER BY p.id ASC`
    );
    res.json(rows);
  } catch (err: any) {
    log("ERR GET /api/stock/summary", err.message);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log(`🚀 Server running on port ${PORT}`);
});

