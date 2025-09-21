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

// Helpers
function normStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  return String(v).trim();
}
function normOpt(v: any): string | null {
  const s = normStr(v);
  return s && s.length > 0 ? s : null;
}

// ========== PROFILES ==========
async function getAllProfiles() {
  const { rows } = await pool.query(
    "SELECT id, full_name, email FROM profiles ORDER BY id"
  );
  return rows;
}

async function createUser(userData: { email: string; full_name: string }) {
  const email = normStr(userData.email);
  const full_name = normOpt(userData.full_name) ?? "";

  if (!email) {
    throw new Error("email é obrigatório");
  }

  const { rows } = await pool.query(
    `INSERT INTO profiles (email, full_name)
     VALUES ($1, $2)
     RETURNING id, full_name, email`,
    [email, full_name]
  );
  return rows[0];
}

// ========== PRODUCTS ==========
async function getAllProducts() {
  const { rows } = await pool.query("SELECT * FROM products ORDER BY id");
  return rows;
}

async function searchProducts(search: string) {
  const term = `%${search}%`;
  const { rows } = await pool.query(
    "SELECT * FROM products WHERE produto ILIKE $1 OR codigo_produto ILIKE $1",
    [term]
  );
  return rows;
}

async function getProduct(id: number) {
  const { rows } = await pool.query(
    "SELECT * FROM products WHERE id = $1",
    [id]
  );
  return rows[0];
}

async function createProduct(data: any) {
  const codigo_produto = normStr(data.codigo_produto);
  const produto        = normStr(data.produto);
  const codigo_barras  = normOpt(data.codigo_barras);
  const departamento   = normOpt(data.departamento);
  const categoria      = normOpt(data.categoria);
  const subcategoria   = normOpt(data.subcategoria);

  if (!codigo_produto || !produto) {
    throw new Error("Informe codigo_produto e produto");
  }

  const { rows } = await pool.query(
    `INSERT INTO products (codigo_barras, produto, codigo_produto, departamento, categoria, subcategoria)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [codigo_barras, produto, codigo_produto, departamento, categoria, subcategoria]
  );
  return rows[0];
}

async function updateProduct(id: number, data: any) {
  // Atualização dinâmica: só atualiza o que vier
  const fields: Record<string, any> = {
    codigo_barras: normOpt(data.codigo_barras),
    produto:       normOpt(data.produto),
    codigo_produto:normOpt(data.codigo_produto),
    departamento:  normOpt(data.departamento),
    categoria:     normOpt(data.categoria),
    subcategoria:  normOpt(data.subcategoria),
  };

  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  for (const [col, val] of Object.entries(fields)) {
    if (val !== null) {
      sets.push(`${col} = $${idx++}`);
      vals.push(val);
    }
  }

  if (sets.length === 0) {
    // nada para atualizar
    const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
    return rows[0] ?? null;
  }

  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE products
     SET ${sets.join(", ")}
     WHERE id = $${idx}
     RETURNING *`,
    vals
  );
  return rows[0];
}

async function deleteProduct(id: number) {
  const { rowCount } = await pool.query(
    "DELETE FROM products WHERE id=$1",
    [id]
  );
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
  const corredor = normStr(data.corredor);
  const linha    = normStr(data.linha);
  const coluna   = normStr(data.coluna);
  const address  = normStr(data.address) ?? (corredor && linha && coluna ? `${corredor}${linha}${coluna}` : null);

  if (!corredor || !linha || !coluna) {
    throw new Error("Campos obrigatórios: corredor, linha, coluna");
  }

  const { rows } = await pool.query(
    `INSERT INTO compartments (corredor, linha, coluna, address)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [corredor, linha, coluna, address]
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
  const compartment_id = Number(data.compartment_id);
  const product_id     = Number(data.product_id);
  const quantity       = Number(data.quantity);

  if (!compartment_id || !product_id || Number.isNaN(quantity)) {
    throw new Error("Campos obrigatórios: compartment_id, product_id, quantity");
  }

  const { rows } = await pool.query(
    `INSERT INTO stock_by_compartment (compartment_id, product_id, quantity)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [compartment_id, product_id, quantity]
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
  const { rowCount } = await pool.query(
    "DELETE FROM stock_by_compartment WHERE id=$1",
    [stockId]
  );
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
    values.push(String(filters.type).toUpperCase());
  }

  query += " ORDER BY id DESC";
  const { rows } = await pool.query(query, values);
  return rows;
}

async function createMovement(data: any) {
  const user_id       = data.user_id ?? null;
  const product_id    = Number(data.product_id);
  const compartment_id= Number(data.compartment_id);
  const tipo          = String(data.tipo).toUpperCase();
  const qty           = Number(data.qty);

  if (!product_id || !compartment_id || !tipo || Number.isNaN(qty)) {
    throw new Error("Campos obrigatórios: product_id, compartment_id, tipo, qty");
  }

  const { rows } = await pool.query(
    `INSERT INTO movements (user_id, product_id, compartment_id, tipo, qty)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user_id, product_id, compartment_id, tipo, qty]
  );
  return rows[0];
}

// ========== REPORTS ==========
async function getStats() {
  const totalProducts = (await pool.query("SELECT COUNT(*) FROM products")).rows[0].count;
  const totalMovements = (await pool.query("SELECT COUNT(*) FROM movements")).rows[0].count;

  const compartmentsWithStock = (await pool.query(
    `SELECT COUNT(DISTINCT compartment_id) AS count
     FROM stock_by_compartment
     WHERE quantity > 0`
  )).rows[0].count;

  return {
    totalProducts: parseInt(totalProducts, 10),
    monthlyMovements: parseInt(totalMovements, 10),
    compartmentsWithStock: parseInt(compartmentsWithStock, 10)
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
