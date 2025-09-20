import express from "express";
import cors from "cors";
import pool from "./db"; // conexão Neon via DATABASE_URL

const app = express();
app.use(cors());
app.use(express.json());

// --------------------- Healthcheck ---------------------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --------------------- Products ------------------------
app.get("/api/products", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria, criado_em 
       FROM products 
       ORDER BY id ASC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error("❌ GET /api/products ->", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria } = req.body;

    if (!codigo_produto || !produto) {
      return res.status(400).json({ error: "codigo_produto e produto são obrigatórios." });
    }

    const result = await pool.query(
      `INSERT INTO products (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria]
    );

    console.log("✅ Produto cadastrado:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ POST /api/products ->", err.message);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// --------------------- Movements ------------------------
app.get("/api/movements", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.tipo, m.quantidade, m.data, 
              p.id as product_id, p.codigo_produto, p.produto, p.codigo_barras
       FROM movements m
       JOIN products p ON m.product_id = p.id
       ORDER BY m.data DESC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error("❌ GET /api/movements ->", err.message);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, codigo_produto, codigo_barras, tipo, quantidade } = req.body;

    if (!tipo || !quantidade) {
      return res.status(400).json({ error: "Tipo e quantidade são obrigatórios." });
    }
    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use "entrada" ou "saida".' });
    }

    // Localizar produto
    let produto;
    if (product_id) {
      produto = await pool.query("SELECT id FROM products WHERE id = $1", [product_id]);
    } else if (codigo_produto) {
      produto = await pool.query("SELECT id FROM products WHERE codigo_produto = $1", [codigo_produto]);
    } else if (codigo_barras) {
      produto = await pool.query("SELECT id FROM products WHERE codigo_barras = $1", [codigo_barras]);
    } else {
      return res.status(400).json({ error: "Informe product_id, codigo_produto ou codigo_barras." });
    }

    if (produto.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const idProduto = produto.rows[0].id;

    // Inserir movimento
    const result = await pool.query(
      `INSERT INTO movements (product_id, tipo, quantidade)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [idProduto, tipo, quantidade]
    );

    console.log("✅ Movimento registrado:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ POST /api/movements ->", err.message);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// --------------------- Balance --------------------------
app.get("/api/balance/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const entradas = await pool.query(
      "SELECT COALESCE(SUM(quantidade),0) as total FROM movements WHERE product_id = $1 AND tipo = 'en_
