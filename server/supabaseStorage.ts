import { Pool } from "pg";

// Conexão com PostgreSQL via DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("❌ Missing DATABASE_URL environment variable");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

console.log("✅ Connected to PostgreSQL via pool");

// ========== PROFILES ==========
async function getAllProfiles() {
  const { rows } = await pool.query("SELECT id, full_name, email FROM profiles ORDER BY id");
  return rows;
}

async function createUser(userData: { email: string; full_name: string }) {
  const { rows } = await pool.query(
    `INSERT INTO profiles (email, full_name)
     VALUES ($1, $2)
     RETURNING id, full_name, email`,
    [userData.email, userData.full_name]
  );
  return rows[0];
}

// ========== PRODUCTS ==========
async function getAllProducts() {
  const { rows } = await pool.query("SELECT * FROM products ORDER BY id");
  return rows;
}

async function searchProducts(search: string) {
  const { rows } = await pool.query(
    "SELECT * FROM products WHERE produto ILIKE $1 OR codigo_produto ILIKE $1",
    [`%${search}%`]
  );
  return rows;
}

async function getProduct(id: number) {
  const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
  return rows[0];
}

async function createProduct(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO products (codigo_barras, produto, codigo_produto, departamento, categoria, subcategoria)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.codigo_barras, data.produto, data.codigo_produto, data.departamento, data.categoria, data.subcategoria]
  );
  return rows[0];
}

async function updateProduct(id: number, data: any) {
  const { rows } = await pool.query(
    `UPDATE products
     SET codigo_barras=$1, produto=$2, codigo_produto=$3, departamento=$4, categoria=$5, subcategoria=$6
     WHERE id=$7
     RETURNING *`,
    [data.codigo_barras, data.produto, data.codigo_produto, data.departamento, data.categoria, data.subcategoria, id]
  );
  return rows[0];
}

async function deleteProduct(id: number) {
  const { rowCount } = await pool.query("DELETE FROM products WHERE id=$1", [id]);
  return rowCount > 0;
}

// ========== COMPARTMENTS ==========
async function getAllCompartments() {
  const { rows } = await pool.query(
    `SELECT id, corredor, linha, coluna,
            (corredor::text || linha || coluna::text) as address
     FROM compartments
     ORDER BY id`
  );
  return rows;
}

async function createCompartment(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO compartments (corredor, linha, coluna, address)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.corredor, data.linha, data.coluna, data.address]
  );
  return rows[0];
}

// ========== STOCK ==========
async function getProductStock(productId: number) {
  const { rows } = await pool.query(
    "SELECT COALESCE(SUM(quantity),0) as total FROM stock_by_compartment WHERE product_id=$1",
    [productId]
  );
  return parseInt(rows[0]?.total || "0", 10);
}

async function getCompartmentStock(compartmentId: number) {
  const { rows } = await pool.query(
    `SELECT s.id, s.compartment_id, s.product_id, s.quantity,
            p.produto, p.codigo_produto,
            c.corredor, c.linha, c.coluna, c.address
     FROM stock_by_compartment s
     JOIN products p ON p.id = s.product_id
     JOIN compartments c ON c.id = s.compartment_id
     WHERE s.compartment_id=$1`,
    [compartmentId]
  );
  return rows;
}

async function getAllStock() {
  const { rows } = await pool.query(
    `SELECT s.id, s.compartment_id, s.product_id, s.quantity,
            p.produto, p.codigo_produto,
            c.corredor, c.linha, c.coluna, c.address
     FROM stock_by_compartment s
     JOIN products p ON p.id = s.product_id
     JOIN compartments c ON c.id = s.compartment_id
     ORDER BY s.id DESC`
  );
  return rows;
}

async function createStock(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO stock_by_compartment (compartment_id, product_id, quantity)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.compartment_id, data.product_id, data.quantity]
  );
  return rows[0];
}

async function updateStockQuantity(stockId: number, quantity: number) {
  const { rows } = await pool.query(
    `UPDATE stock_by_compartment SET quantity=$1 WHERE id=$2 RETURNING *`,
    [quantity, stockId]
  );
  return rows[0];
}

async function deleteStock(stockId: number) {
  const { rowCount } = await pool.query("DELETE FROM stock_by_compartment WHERE id=$1", [stockId]);
  return rowCount > 0;
}

// ========== MOVEMENTS ==========
async function getMovements(filters: any) {
  let query = "SELECT * FROM movements WHERE 1=1";
  const values: any[] = [];
  let idx = 1;

  if (filters.productId) {
    query += ` AND product_id=$${idx++}`;
    values.push(parseInt(filters.productId as string, 10));
  }
  if (filters.compartmentId) {
    query += ` AND compartment_id=$${idx++}`;
    values.push(parseInt(filters.compartmentId as string, 10));
  }
  if (filters.type) {
    query += ` AND tipo=$${idx++}`;
    values.push(filters.type.toString().toUpperCase());
  }

  query += " ORDER BY id DESC";
  const { rows } = await pool.query(query, values);
  return rows;
}

async function createMovement(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO movements (user_id, product_id, compartment_id, tipo, qty)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.user_id, data.product_id, data.compartment_id, data.tipo, data.qty]
  );
  return rows[0];
}

// ========== REPORTS ==========
async function getStats() {
  const totalProducts = (await pool.query("SELECT COUNT(*) FROM products")).rows[0].count;
  const totalMovements = (await pool.query("SELECT COUNT(*) FROM movements")).rows[0].count;
  return {
    totalProducts: parseInt(totalProducts, 10),
    monthlyMovements: parseInt(totalMovements, 10),
    compartmentsWithStock: 0 // ainda pode ser detalhado
  };
}

// ========== EXPORT ==========
export const supabaseStorage = {
  // profiles
  getAllProfiles,
  createUser,
  // products
  getAllProducts,
  searchProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  // compartments
  getAllCompartments,
  createCompartment,
  // stock
  getProductStock,
  getCompartmentStock,
  getAllStock,
  createStock,
  updateStockQuantity,
  deleteStock,
  // movements
  getMovements,
  createMovement,
  // reports
  getStats
};
