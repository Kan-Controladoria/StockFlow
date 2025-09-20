import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// =========================
// ROTAS DE PRODUTOS
// =========================

// Listar todos os produtos
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// Cadastrar novo produto
app.post("/api/products", async (req, res) => {
  const { codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// =========================
// ROTAS DE MOVIMENTOS
// =========================

// Listar movimentos
app.get("/api/movements", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, p.produto, m.type AS tipo, m.quantity AS quantidade, m.created_at AS data
       FROM movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar movimentos:", err);
    res.status(500).json({ error: "Erro ao buscar movimentos" });
  }
});

// Registrar movimento
app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, codigo_produto, codigo_barras, tipo, quantidade } = req.body;

    if (!tipo || !quantidade) {
      return res.status(400).json({ error: "Tipo e quantidade são obrigatórios" });
    }
    if (quantidade <= 0) {
      return res.status(400).json({ error: "Quantidade deve ser maior que zero" });
    }

    // Encontrar o produto
    let productResult;
    if (product_id) {
      productResult = await pool.query("SELECT * FROM products WHERE id = $1", [product_id]);
    } else if (codigo_produto) {
      productResult = await pool.query("SELECT * FROM products WHERE codigo_produto = $1", [codigo_produto]);
    } else if (codigo_barras) {
      productResult = await pool.query("SELECT * FROM products WHERE codigo_barras = $1", [codigo_barras]);
    } else {
      return res.status(400).json({ error: "É necessário informar product_id, codigo_produto ou codigo_barras" });
    }

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const product = productResult.rows[0];

    // Calcular saldo atual
    const saldoResult = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'entrada' THEN quantity ELSE 0 END),0) -
         COALESCE(SUM(CASE WHEN type = 'saida' THEN quantity ELSE 0 END),0) AS saldo
       FROM movements WHERE product_id = $1`,
      [product.id]
    );

    const saldoAtual = saldoResult.rows[0].saldo || 0;

    if (tipo === "saida" && quantidade > saldoAtual) {
      return res.status(400).json({ error: `Estoque insuficiente. Saldo atual: ${saldoAtual}` });
    }

    // Inserir movimento
    const insertResult = await pool.query(
      `INSERT INTO movements (product_id, type, quantity)
       VALUES ($1,$2,$3) RETURNING *`,
      [product.id, tipo, quantidade]
    );

    res.json({ message: "Movimento registrado", movimento: insertResult.rows[0] });
  } catch (err) {
    console.error("Erro ao registrar movimento:", err);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// =========================
// INICIAR SERVIDOR
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
