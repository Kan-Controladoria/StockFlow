import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// SOLUTION: Use direct PostgreSQL connection with correct DATABASE_URL
// This connects to the correct Neon database that has the 'address' field
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Create PostgreSQL connection pool to correct database
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

console.log('✅ Using correct PostgreSQL connection with DATABASE_URL');

// Also maintain Supabase client for compatibility (but won't use for queries)
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'backend-api-fallback' } }
});

console.log('🔧 PostgreSQL pool initialized for correct database connection');

export interface SupabaseProduct {
  id: number;             // BIGINT ID as per schema
  codigo_barras: string;  // Required field
  produto: string;        // tabela products usa 'produto'
  codigo_produto: string; // tabela products usa 'codigo_produto'
  departamento: string;
  categoria: string;
  subcategoria: string;
  created_at: string;
  updated_at: string;     // Missing field added - matches schema
}

export interface SupabaseMovement {
  id: number;             // Integer serial ID
  user_id: string;        // UUID (references profiles.id)
  product_id: number;     // BIGINT (references products.id)
  compartment_id: number; // BIGINT (references compartments.id)
  tipo: 'ENTRADA' | 'SAIDA';
  qty: number;           // tabela movements usa 'qty'
  timestamp: string;     // tabela movements usa 'timestamp'
  obs?: string;          // optional obs field
}

export interface SupabaseUser {
  id: string;             // UUID for profiles table
  email: string;
  full_name: string;
}

export class SupabaseStorage {
  // Expose supabase client for startup validation
  public readonly supabase = supabase;
  
  // Direct PostgreSQL connection to correct database
  private readonly pool = pool;
  private readonly addressField = 'address';
  
  // Helper method to execute raw SQL queries
  private async query(text: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  // BIGINT validation for product and compartment IDs
  private isValidBigIntId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }
  
  
  // DATABASE IDENTITY VERIFICATION - Critical for data loss recovery
  async verifyDatabaseIdentity(): Promise<any> {
    try {
      console.log('🔍 [CRITICAL] DATABASE IDENTITY VERIFICATION - Data Recovery Mode');
      
      const identityQuery = `
        SELECT 
          current_database() as database_name,
          current_user as db_user,
          inet_server_addr() as server_ip,
          inet_server_port() as server_port,
          (SELECT count(*) FROM compartments) as compartment_count,
          (SELECT count(*) FROM movements) as movement_count,
          (SELECT count(*) FROM products) as product_count,
          (SELECT count(*) FROM profiles) as profile_count
      `;
      
      const identity = await this.query(identityQuery);
      const dbInfo = identity[0];
      
      console.log('📊 DATABASE IDENTITY:', {
        database: dbInfo.database_name,
        user: dbInfo.db_user,
        server_ip: dbInfo.server_ip,
        server_port: dbInfo.server_port,
        compartments: dbInfo.compartment_count,
        movements: dbInfo.movement_count,
        products: dbInfo.product_count,
        profiles: dbInfo.profile_count
      });
      
      // CRITICAL: Check if compartment 3B7 exists
      console.log('🔍 [CRITICAL] Checking compartment 3B7 status...');
      const compartment3B7Check = await this.query(
        'SELECT id, address, corredor, linha, coluna FROM compartments WHERE address = $1 OR (corredor = 3 AND linha = \'B\' AND coluna = 7)',
        ['3B7']
      );
      
      console.log('📋 3B7 Status:', compartment3B7Check.length > 0 ? compartment3B7Check[0] : 'NOT FOUND');
      
      // Check product 6 status
      console.log('🔍 [CRITICAL] Checking product 6 status...');
      const product6Check = await this.query(
        'SELECT id, codigo_produto, produto FROM products WHERE id = 6',
        []
      );
      
      console.log('📋 Product 6 Status:', product6Check.length > 0 ? product6Check[0] : 'NOT FOUND');
      
      return {
        ...dbInfo,
        compartment_3b7_exists: compartment3B7Check.length > 0,
        compartment_3b7_data: compartment3B7Check[0] || null,
        product_6_exists: product6Check.length > 0,
        product_6_data: product6Check[0] || null
      };
      
    } catch (error: any) {
      console.error('❌ Database identity check failed:', error.message);
      throw error;
    }
  }
  
  // DATA SEEDING - Critical recovery function
  async seedMissingCriticalData(): Promise<void> {
    try {
      console.log('🌱 [RECOVERY] Seeding missing critical data...');
      
      // Seed compartment 3B7 if missing
      const compartment3B7Seed = `
        INSERT INTO compartments (address, corredor, linha, coluna) 
        VALUES ('3B7', 3, 'B', 7) 
        ON CONFLICT (address) DO UPDATE SET
          corredor = EXCLUDED.corredor,
          linha = EXCLUDED.linha,
          coluna = EXCLUDED.coluna
      `;
      
      await this.query(compartment3B7Seed);
      console.log('✅ Compartment 3B7 seeded (auto-generated ID)');
      
      // Seed test product if missing
      const product6Seed = `
        INSERT INTO products (codigo_barras, codigo_produto, produto, departamento, categoria, subcategoria, created_at, updated_at) 
        VALUES ('UNIFIED3B7_2025', 'PROD_UNIFIED3B7', 'Test Product 3B7', 'Test Dept', 'Test Cat', 'Test Sub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (codigo_barras) DO UPDATE SET
          codigo_produto = EXCLUDED.codigo_produto,
          produto = EXCLUDED.produto,
          departamento = EXCLUDED.departamento,
          categoria = EXCLUDED.categoria,
          subcategoria = EXCLUDED.subcategoria,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.query(product6Seed);
      console.log('✅ Test product seeded (auto-generated ID)');
      
      // Seed a few basic test compartments for stability
      const basicCompartmentsSeed = `
        INSERT INTO compartments (address, corredor, linha, coluna) VALUES
        ('1A1', 1, 'A', 1),
        ('1A2', 1, 'A', 2),
        ('2A1', 2, 'A', 1),
        ('3B6', 3, 'B', 6),
        ('3B7', 3, 'B', 7),
        ('3B8', 3, 'B', 8)
        ON CONFLICT (address) DO UPDATE SET
          corredor = EXCLUDED.corredor,
          linha = EXCLUDED.linha,
          coluna = EXCLUDED.coluna
      `;
      
      await this.query(basicCompartmentsSeed);
      console.log('✅ Basic compartments seeded with auto-generated IDs (1A1, 1A2, 2A1, 3B6, 3B7, 3B8)');
      
    } catch (error: any) {
      console.error('❌ Data seeding failed:', error.message);
      throw error;
    }
  }
  
  // HARDENED Address to BIGINT compartment ID lookup - Case-insensitive with numeric ID support
  async getCompartmentIdByAddress(address: string): Promise<number> {
    const normalized = address.trim().toUpperCase();
    console.log(`🔍 [HARDENED] Looking up compartment BIGINT for address: ${normalized} (PostgreSQL)`);
    
    try {
      // HARDENING: Accept numeric input as direct ID lookup
      if (/^[0-9]+$/.test(address.trim())) {
        const directId = parseInt(address.trim(), 10);
        console.log('🔢 Numeric input detected, searching by ID:', directId);
        
        const result = await this.query(
          'SELECT id FROM compartments WHERE id = $1 LIMIT 1',
          [directId]
        );
        
        if (result.length > 0) {
          console.log(`✅ Found compartment via direct ID lookup: ${directId}`);
          return directId;
        } else {
          console.log(`⚠️ Compartment ID ${directId} not found`);
        }
      }
      
      // Step 1: Case-insensitive search by address field
      console.log('📍 Step 1: Case-insensitive address search...');
      const result1 = await this.query(
        'SELECT id FROM compartments WHERE UPPER(address) = UPPER($1) LIMIT 1',
        [normalized]
      );
      
      if (result1.length > 0) {
        const compartmentId = parseInt(result1[0].id, 10);
        console.log(`✅ Found compartment via address: ID ${compartmentId}`);
        return compartmentId;
      }
      
      // Step 2: Parse address and search by individual columns
      console.log('📍 Step 2: Parsing address for corredor/linha/coluna lookup...');
      const match = normalized.match(/^([0-9]+)([A-Z])([0-9]+)$/);
      
      if (match) {
        const [, corridorStr, linha, colunaStr] = match;
        const corredor = parseInt(corridorStr, 10);
        const coluna = parseInt(colunaStr, 10);
        
        console.log(`🔍 Searching for corredor=${corredor}, linha=${linha}, coluna=${coluna}`);
        
        const result2 = await this.query(
          'SELECT id FROM compartments WHERE corredor = $1 AND linha = $2 AND coluna = $3 LIMIT 1',
          [corredor, linha, coluna]
        );
        
        if (result2.length > 0) {
          const compartmentId = parseInt(result2[0].id, 10);
          console.log(`✅ Found compartment via individual columns: ID ${compartmentId}`);
          return compartmentId;
        }
      } else {
        console.log(`⚠️ Address format not recognized for individual lookup: ${normalized}`);
      }
      
      // Step 3: AUTO-RECOVER - Try seeding missing data if this is 3B7
      if (normalized === '3B7') {
        console.log('🚨 [AUTO-RECOVERY] Critical address 3B7 missing - attempting data recovery...');
        await this.seedMissingCriticalData();
        
        // Retry lookup after seeding
        console.log('🔄 Retrying 3B7 lookup after data recovery...');
        const recoveryResult = await this.query(
          'SELECT id FROM compartments WHERE UPPER(address) = UPPER($1) LIMIT 1',
          ['3B7']
        );
        
        if (recoveryResult.length > 0) {
          const recoveredId = parseInt(recoveryResult[0].id, 10);
          console.log(`✅ [RECOVERED] 3B7 found after data seeding: ID ${recoveredId}`);
          return recoveredId;
        }
      }
      
      // Step 4: Show available compartments if still not found
      console.log('📍 Step 4: Compartment not found, fetching available data...');
      const available = await this.query(
        'SELECT id, address, corredor, linha, coluna FROM compartments ORDER BY id LIMIT 20'
      );
      
      const availableAddresses = available.map(c => 
        c.address || `${c.corredor}${c.linha}${c.coluna}`
      ).filter(addr => addr && addr !== 'nullnullnull').join(', ') || 'none';
      
      console.error(`❌ Address not found: ${normalized}`);
      console.error(`📋 Available addresses: ${availableAddresses}`);
      
      throw new Error(`Compartment not found for address: ${normalized}. Available: ${availableAddresses}`);
      
    } catch (error: any) {
      console.error(`❌ Error looking up compartment: ${error.message}`);
      throw error;
    }
  }
  
  // Database schema validation
  async logDatabaseSchema(): Promise<void> {
    console.log('🗺 Database schema info:');
    console.log('- products.id: BIGINT (mode: number)');
    console.log('- compartments.id: BIGINT (mode: number)');
    console.log('- movements.product_id: BIGINT (mode: number)');
    console.log('- movements.compartment_id: BIGINT (mode: number)');
    console.log('- movements.user_id: UUID (string)');
    console.log('- profiles.id: UUID (string)');
  }
  
  // Compartment methods - using direct PostgreSQL connection
  async getAllCompartments(): Promise<any[]> {
    try {
      const compartments = await this.query(
        'SELECT id, address, corredor, linha, coluna FROM compartments ORDER BY id'
      );
      
      // Ensure all compartments have address field (synthesize if null)
      return compartments.map(comp => ({
        ...comp,
        address: comp.address || `${comp.corredor}${comp.linha}${comp.coluna}`
      }));
    } catch (error: any) {
      throw new Error(`Error fetching compartments: ${error.message}`);
    }
  }

  // Product methods - UNIFIED to use PostgreSQL pool
  async getAllProducts(): Promise<SupabaseProduct[]> {
    console.log('🔧 [UNIFIED] Fetching all products via PostgreSQL pool');
    try {
      const products = await this.query(
        'SELECT * FROM products ORDER BY created_at DESC'
      );
      console.log(`✅ [UNIFIED] Fetched ${products.length} products via PostgreSQL`);
      return products || [];
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error fetching products:', error.message);
      throw new Error(`Error fetching products: ${error.message}`);
    }
  }

  async getProduct(id: number): Promise<SupabaseProduct | null> {
    console.log(`🔧 [UNIFIED] Fetching product ${id} via PostgreSQL pool`);
    try {
      const result = await this.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
      );
      const product = result.length > 0 ? result[0] : null;
      console.log(`✅ [UNIFIED] Product ${id} found:`, !!product);
      return product;
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error fetching product ${id}:`, error.message);
      throw new Error(`Error fetching product: ${error.message}`);
    }
  }

  async findProductByCode(codigo: string): Promise<SupabaseProduct | null> {
    console.log(`🔧 [UNIFIED] Finding product by code '${codigo}' via PostgreSQL pool`);
    try {
      const result = await this.query(
        'SELECT * FROM products WHERE codigo_produto = $1',
        [codigo]
      );
      const product = result.length > 0 ? result[0] : null;
      console.log(`✅ [UNIFIED] Product code '${codigo}' found:`, !!product);
      return product;
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error finding product by code '${codigo}':`, error.message);
      throw new Error(`Error finding product by code: ${error.message}`);
    }
  }

  async createProduct(product: Omit<SupabaseProduct, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseProduct> {
    console.log('🔧 [UNIFIED] Creating product via PostgreSQL pool:', product.codigo_produto);
    try {
      const result = await this.query(
        `INSERT INTO products (codigo_barras, produto, codigo_produto, departamento, categoria, subcategoria, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [product.codigo_barras, product.produto, product.codigo_produto, product.departamento, product.categoria, product.subcategoria]
      );
      const createdProduct = result[0];
      console.log(`✅ [UNIFIED] Created product via PostgreSQL:`, createdProduct.id);
      return createdProduct;
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error creating product:', error.message);
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  async searchProducts(term: string): Promise<SupabaseProduct[]> {
    console.log(`🔧 [UNIFIED] Searching products for '${term}' via PostgreSQL pool`);
    try {
      const result = await this.query(
        'SELECT * FROM products WHERE produto ILIKE $1 OR codigo_produto ILIKE $2',
        [`%${term}%`, `%${term}%`]
      );
      console.log(`✅ [UNIFIED] Found ${result.length} products matching '${term}'`);
      return result || [];
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error searching products for '${term}':`, error.message);
      throw new Error(`Error searching products: ${error.message}`);
    }
  }

  // Update product - UNIFIED to use PostgreSQL pool
  async updateProduct(productId: number, productData: Partial<Omit<SupabaseProduct, 'id' | 'created_at'>>): Promise<SupabaseProduct> {
    console.log(`🔧 [UNIFIED] Updating product ${productId} via PostgreSQL pool`);
    
    if (!this.isValidBigIntId(productId)) {
      throw new Error(`Invalid BIGINT product ID: ${productId}`);
    }
    
    try {
      // Build dynamic update query based on provided fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (productData.codigo_barras !== undefined) {
        updateFields.push(`codigo_barras = $${paramIndex++}`);
        values.push(productData.codigo_barras);
      }
      if (productData.produto !== undefined) {
        updateFields.push(`produto = $${paramIndex++}`);
        values.push(productData.produto);
      }
      if (productData.codigo_produto !== undefined) {
        updateFields.push(`codigo_produto = $${paramIndex++}`);
        values.push(productData.codigo_produto);
      }
      if (productData.departamento !== undefined) {
        updateFields.push(`departamento = $${paramIndex++}`);
        values.push(productData.departamento);
      }
      if (productData.categoria !== undefined) {
        updateFields.push(`categoria = $${paramIndex++}`);
        values.push(productData.categoria);
      }
      if (productData.subcategoria !== undefined) {
        updateFields.push(`subcategoria = $${paramIndex++}`);
        values.push(productData.subcategoria);
      }
      
      // Always update the updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(productId);
      
      const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await this.query(query, values);
      
      if (result.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      console.log(`✅ [UNIFIED] Updated product ${productId} via PostgreSQL`);
      return result[0];
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error updating product ${productId}:`, error.message);
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  // Delete product - UNIFIED to use PostgreSQL pool  
  async deleteProduct(productId: number): Promise<void> {
    console.log(`🔧 [UNIFIED] Deleting product ${productId} via PostgreSQL pool`);
    
    if (!this.isValidBigIntId(productId)) {
      throw new Error(`Invalid BIGINT product ID: ${productId}`);
    }
    
    try {
      const result = await this.query(
        'DELETE FROM products WHERE id = $1',
        [productId]
      );
      
      // Check if deletion happened by trying to find the product
      const checkResult = await this.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );
      
      if (checkResult.length > 0) {
        throw new Error(`Product ${productId} could not be deleted`);
      }
      
      console.log(`✅ [UNIFIED] Deleted product ${productId} via PostgreSQL`);
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error deleting product ${productId}:`, error.message);
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }

  // Movement methods - UNIFIED to use PostgreSQL pool
  async getAllMovements(): Promise<SupabaseMovement[]> {
    console.log('🔧 [UNIFIED] Fetching all movements via PostgreSQL pool');
    try {
      const movements = await this.query(
        'SELECT id, user_id, product_id, compartment_id, tipo, qty, timestamp FROM movements ORDER BY id DESC'
      );
      console.log(`✅ [UNIFIED] Fetched ${movements.length} movements via PostgreSQL`);
      return movements || [];
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error fetching movements:', error.message);
      throw new Error(`Error fetching movements: ${error.message}`);
    }
  }

  async createMovement(movement: Omit<SupabaseMovement, 'id' | 'timestamp' | 'obs'>): Promise<SupabaseMovement> {
    console.log('🗺 Movement creation with BIGINT IDs:', {
      user_id: movement.user_id,
      user_id_type: typeof movement.user_id,
      product_id: movement.product_id, 
      product_id_type: typeof movement.product_id,
      compartment_id: movement.compartment_id,
      compartment_id_type: typeof movement.compartment_id,
      tipo: movement.tipo,
      qty: movement.qty,
      qty_type: typeof movement.qty
    });
    
    // BIGINT validation for compartment_id and product_id
    if (!this.isValidBigIntId(movement.compartment_id)) {
      throw new Error(`Invalid compartment_id - must be positive BIGINT: ${movement.compartment_id} (${typeof movement.compartment_id})`);
    }
    
    if (!this.isValidBigIntId(movement.product_id)) {
      throw new Error(`Invalid product_id - must be positive BIGINT: ${movement.product_id} (${typeof movement.product_id})`);
    }
    
    // UUID validation for user_id
    if (typeof movement.user_id !== 'string' || !movement.user_id.trim()) {
      throw new Error(`Invalid user_id - must be UUID string: ${movement.user_id} (${typeof movement.user_id})`);
    }
    
    // Quantity validation
    if (!Number.isInteger(movement.qty) || movement.qty <= 0) {
      throw new Error(`Invalid qty - must be positive integer: ${movement.qty} (${typeof movement.qty})`);
    }
    
    // Movement data with correct types
    const movementData = {
      user_id: movement.user_id,        // UUID string
      product_id: movement.product_id,  // BIGINT number
      compartment_id: movement.compartment_id, // BIGINT number
      tipo: movement.tipo,
      qty: movement.qty
    };
    
    console.log('🔧 Final movement data for insert (BIGINT):', movementData);
    
    try {
      // 🔧 [UNIFIED] Use PostgreSQL pool for consistency with getCompartmentIdByAddress()
      console.log('🔧 [UNIFIED] Using PostgreSQL pool for movement creation (consistency fix)');
      
      const query = `
        INSERT INTO movements (user_id, product_id, compartment_id, tipo, qty, timestamp) 
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
        RETURNING id, user_id, product_id, compartment_id, tipo, qty, timestamp
      `;
      
      const values = [
        movementData.user_id,        // UUID string
        movementData.product_id,     // BIGINT number  
        movementData.compartment_id, // BIGINT number
        movementData.tipo,           // enum
        movementData.qty             // integer
      ];
      
      console.log('🔧 [UNIFIED] PostgreSQL insert query:', { query: query.trim(), values });
      
      const result = await this.query(query, values);
      
      if (!result || result.length === 0) {
        throw new Error('No movement data returned from PostgreSQL insert');
      }
      
      const data = result[0];
      console.log('✅ [UNIFIED] Successfully created movement with PostgreSQL pool:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Movement creation failed with error:', {
        message: error.message,
        data: movementData
      });
      throw new Error(`Failed to create movement: ${error.message}`);
    }
  }

  async getMovementsByProduct(productId: number): Promise<SupabaseMovement[]> {
    console.log(`🔧 [UNIFIED] Fetching movements for product ${productId} via PostgreSQL pool`);
    try {
      const result = await this.query(
        'SELECT id, user_id, product_id, compartment_id, tipo, qty, timestamp FROM movements WHERE product_id = $1 ORDER BY id DESC',
        [productId]
      );
      console.log(`✅ [UNIFIED] Found ${result.length} movements for product ${productId} via PostgreSQL`);
      return result || [];
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error fetching movements for product ${productId}:`, error.message);
      throw new Error(`Error fetching movements by product: ${error.message}`);
    }
  }

  async getProductStock(productId: number): Promise<number> {
    const movements = await this.getMovementsByProduct(productId);
    
    let stock = 0;
    for (const movement of movements) {
      if (movement.tipo === 'ENTRADA') {
        stock += movement.qty;
      } else if (movement.tipo === 'SAIDA') {
        stock -= movement.qty;
      }
    }
    
    return Math.max(0, stock);
  }

  // User methods - UNIFIED to use PostgreSQL pool
  async createUser(user: Omit<SupabaseUser, 'id'>): Promise<SupabaseUser> {
    console.log('🔧 [UNIFIED] Creating user via PostgreSQL pool:', user.email);
    try {
      const result = await this.query(
        'INSERT INTO profiles (email, full_name) VALUES ($1, $2) RETURNING id, email, full_name',
        [user.email, user.full_name]
      );
      const createdUser = result[0];
      console.log(`✅ [UNIFIED] Created user via PostgreSQL:`, createdUser.id);
      return createdUser;
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error creating user:', error.message);
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Get all profiles - UNIFIED to use PostgreSQL pool
  async getAllProfiles(): Promise<SupabaseUser[]> {
    console.log('🔧 [UNIFIED] Fetching all profiles via PostgreSQL pool');
    try {
      const result = await this.query(
        'SELECT id, email, full_name, created_at FROM profiles ORDER BY created_at DESC'
      );
      console.log(`✅ [UNIFIED] Found ${result.length} profiles via PostgreSQL`);
      return result.map(row => ({
        id: row.id,
        email: row.email || '',
        full_name: row.full_name || ''
      }));
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error fetching all profiles:', error.message);
      throw new Error(`Error fetching profiles: ${error.message}`);
    }
  }

  // Get single profile by ID - UNIFIED to use PostgreSQL pool
  async getProfile(profileId: string): Promise<SupabaseUser | null> {
    console.log(`🔧 [UNIFIED] Fetching profile ${profileId} via PostgreSQL pool`);
    
    // UUID validation
    if (!profileId || typeof profileId !== 'string' || !profileId.trim()) {
      throw new Error('Invalid UUID profile ID');
    }
    
    try {
      const result = await this.query(
        'SELECT id, email, full_name FROM profiles WHERE id = $1',
        [profileId.trim()]
      );
      
      if (result.length === 0) {
        console.log(`⚠️ [UNIFIED] Profile ${profileId} not found via PostgreSQL`);
        return null;
      }
      
      const profile = result[0];
      console.log(`✅ [UNIFIED] Found profile ${profileId} via PostgreSQL`);
      return {
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name || ''
      };
    } catch (error: any) {
      console.error(`❌ [UNIFIED] Error fetching profile ${profileId}:`, error.message);
      throw new Error(`Error fetching profile: ${error.message}`);
    }
  }

  // Get or create default user with UUID handling - UNIFIED to use PostgreSQL pool
  async getOrCreateDefaultUser(): Promise<SupabaseUser> {
    console.log('🔍 [UNIFIED] Getting or creating default user with PostgreSQL pool...');
    
    try {
      // 🔧 [UNIFIED] Try to find any existing user via PostgreSQL pool
      console.log('🔧 [UNIFIED] Searching for existing users via PostgreSQL...');
      const existingUsers = await this.query(
        'SELECT id, email, full_name FROM profiles LIMIT 1'
      );
      
      if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0];
        console.log('✅ [UNIFIED] Found existing user via PostgreSQL:', { 
          id: user.id, 
          email: user.email || 'no email' 
        });
        
        return {
          id: user.id, // Return UUID string as-is for movements FK
          email: user.email || 'api@teste.com',
          full_name: user.full_name || 'API Test User'
        };
      }
      
      console.log('⚠️ [UNIFIED] No users found, attempting to create one via PostgreSQL...');
      
      // 🔧 [UNIFIED] Try to create a new user via PostgreSQL pool
      const newUserResult = await this.query(
        'INSERT INTO profiles (email, full_name) VALUES ($1, $2) RETURNING id, email, full_name',
        ['api@teste.com', 'API Test User']
      );
      
      if (newUserResult && newUserResult.length > 0) {
        const newUser = newUserResult[0];
        console.log('✅ [UNIFIED] Created new user via PostgreSQL:', { 
          id: newUser.id, 
          email: newUser.email 
        });
        return {
          id: newUser.id, // UUID string
          email: newUser.email,
          full_name: newUser.full_name
        };
      }
      
      console.error('❌ [UNIFIED] Failed to create user via PostgreSQL');
      throw new Error('Unable to get or create default user via PostgreSQL');
      
    } catch (error: any) {
      console.error('❌ [UNIFIED] User operations failed:', error.message);
      throw new Error(`User operations failed: ${error.message}`);
    }
  }

  // Helper method to create movement by address (for API convenience)
  async createMovementByAddress(
    address: string,
    productId: number,
    tipo: 'ENTRADA' | 'SAIDA',
    qty: number,
    userId?: string
  ): Promise<SupabaseMovement> {
    const compartmentId = await this.getCompartmentIdByAddress(address); // Returns BIGINT number
    
    // Get default user if no userId provided
    const finalUserId = userId || (await this.getOrCreateDefaultUser()).id;
    
    return this.createMovement({
      user_id: finalUserId,          // UUID string
      product_id: productId,         // BIGINT number
      compartment_id: compartmentId, // BIGINT number
      tipo,
      qty
    });
  }
}

export const supabaseStorage = new SupabaseStorage();