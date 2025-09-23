import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pkg from "pg";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const { Pool } = pkg;

const app = express();

// ------------------- MIDDLEWARES -------------------
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Força UTF-8 nos headers
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// ------------------- POSTGRES -------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ------------------- SWAGGER -------------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "StockFlow API",
      version: "1.0.0",
      description: "API do StockFlow com Swagger UI",
    },
    servers: [
      {
        url: "https://stockflow-v8aj.onrender.com",
      },
    ],
  },
  apis: ["./server/index.ts"], // garante que lê este arquivo
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "StockFlow API Docs",
  })
);

// ------------------- ENDPOINTS -------------------

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Check if server is running
 *     responses:
 *       200:
 *         description: Returns ok:true if running
 */
app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List all products
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo_produto:
 *                 type: string
 *               produto:
 *                 type: string
 *               codigo_barras:
 *                 type: string
 *               departamento:
 *                 type: string
 *               categoria:
 *                 type: string
 *               subcategoria:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 */
app.get("/api/products", async (_, res) => {
  const result = await pool.query("SELECT * FROM products");
  res.json(result.rows);
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

    const result = await pool.query(
      `INSERT INTO products (codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria]
    );

    res.status(201).json({ message: "Product created", product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating product" });
  }
});

/**
 * @openapi
 * /api/movements:
 *   get:
 *     summary: List all movements
 *     responses:
 *       200:
 *         description: List of movements
 *   post:
 *     summary: Register a new movement (entry or exit)
 *     responses:
 *       201:
 *         description: Movement created
 */
app.get("/api/movements", async (_, res) => {
  const result = await pool.query("SELECT * FROM movements");
  res.json(result.rows);
});

app.post("/api/movements", async (req, res) => {
  try {
    const { product_id, type, quantidade } = req.body;
    const result = await pool.query(
      `INSERT INTO movements (product_id, type, quantidade) 
       VALUES ($1, $2, $3) RETURNING *`,
      [product_id, type, quantidade]
    );
    res.status(201).json({ message: "Movement created", movement: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating movement" });
  }
});

/**
 * @openapi
 * /api/balance:
 *   get:
 *     summary: Get balance of each product
 *     responses:
 *       200:
 *         description: Products balance
 */
app.get("/api/balance", async (_, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.codigo_produto, p.produto,
             COALESCE(SUM(CASE WHEN m.type='entrada' THEN m.quantidade ELSE 0 END),0) -
             COALESCE(SUM(CASE WHEN m.type='saida' THEN m.quantidade ELSE 0 END),0) as saldo
      FROM products p
      LEFT JOIN movements m ON p.id = m.product_id
      GROUP BY p.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error calculating balance" });
  }
});

// ------------------- SERVER -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
