import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pkg from "pg";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

const { Pool } = pkg;
const app = express();

// ------------------------- MIDDLEWARES -------------------------
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Força UTF-8 nas respostas
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// ------------------------- DB CONFIG -------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ------------------------- SWAGGER CONFIG -------------------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "StockFlow API",
      version: "1.0.0",
      description: "Documentação da API do StockFlow",
    },
    servers: [
      {
        url: process.env.RENDER_EXTERNAL_URL || "http://localhost:3000",
      },
    ],
  },
  apis: ["./server/index.ts"], // este arquivo contém as rotas
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ------------------------- HEALTH -------------------------
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Verifica se o servidor está online
 *     responses:
 *       200:
 *         description: Servidor funcionando
 */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ------------------------- PRODUCTS -------------------------
/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Lista todos os produtos
 *   post:
 *     summary: Cadastra um novo produto
 */
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar produtos:", err);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria } = req.body;

    if (!codigo_produto || !produto) {
      return res.status(400).json({ error: "Informe código_produto e produto" });
    }

    const result = await pool.query(
      `INSERT INTO products (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [codigo_produto, produto, codigo_barras || null, departamento || null, categoria || null, subcategoria || null]
    );

    res.json({ message: "Produto cadastrado", produto: result.rows[0] });
  } catch (err) {
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// ------------------------- MOVEMENTS -------------------------
/**
 * @openapi
 * /api/movements:
 *   get:
 *     summary: Lista todos os movimentos
 *   post:
 *     summary: Registra um movimento (entrada/saída)
 */
app.get("/api/movements", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.product_id, p.codigo_produto, p.produto, m.type, m.quantity, m.created_at
       FROM movements m
       JOIN products p ON m.product_id = p.id
       ORDER BY m.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar movimentos:", err);
    res.status(500).json({ error: "Erro ao listar movimentos" });
  }
});

app.post("/api/movements", async (req, res) => {
  try {
    const { codigo_produto, type, quantity } = req.body;

    if (!codigo_produto || !type || !quantity) {
      return res.status(400).json({ error: "Informe codigo_produto, type e quantity" });
    }

    const productResult = await pool.query(
      "SELECT id FROM products WHERE codigo_produto = $1",
      [codigo_produto]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const product_id = productResult.rows[0].id;

    const insertResult = await pool.query(
      "INSERT INTO movements (product_id, type, quantity) VALUES ($1, $2, $3) RETURNING *",
      [product_id, type, quantity]
    );

    res.json({ message: "Movimento registrado", movimento: insertResult.rows[0] });
  } catch (err) {
    console.error("Erro ao registrar movimento:", err);
    res.status(500).json({ error: "Erro ao registrar movimento" });
  }
});

// ------------------------- BALANCE -------------------------
/**
 * @openapi
 * /api/balance:
 *   get:
 *     summary: Retorna o saldo de todos os produtos
 */
app.get("/api/balance", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.codigo_produto, p.produto,
        COALESCE(SUM(
          CASE WHEN m.type = 'entrada' THEN m.quantity
               WHEN m.type = 'saida' THEN -m.quantity
               ELSE 0 END
        ), 0) as saldo
      FROM products p
      LEFT JOIN movements m ON p.id = m.product_id
      GROUP BY p.id, p.codigo_produto, p.produto
      ORDER BY p.id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao calcular saldo:", err);
    res.status(500).json({ error: "Erro ao calcular saldo" });
  }
});

// ------------------------- START -------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
