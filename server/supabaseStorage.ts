import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'backend-api' } }
});

// Verify service key is correct by checking JWT payload
try {
  const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString());
  if (payload.role !== 'service_role') {
    console.error('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY does not have service_role privileges');
    console.error('Current role:', payload.role);
    console.error('Please verify you are using the correct service_role key from Supabase Settings > API');
  } else {
    console.log('✅ Service role key verified successfully');
  }
} catch (error) {
  console.error('⚠️  Could not verify service key format:', error);
}

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
  
  // BIGINT validation for product and compartment IDs
  private isValidBigIntId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }
  
  // Simple address to BIGINT compartment ID mapping
  async getCompartmentIdByAddress(address: string): Promise<number> {
    console.log(`🔍 Looking up compartment BIGINT for address: ${address}`);
    
    // BIGINT mapping for compartments.id BIGINT schema
    const addressMapping: Record<string, number> = {
      '1A1': 1,
      '1A2': 2, 
      '1A3': 3,
      '1A4': 9,
      '1A5': 10
    };
    
    if (addressMapping[address]) {
      const compartmentId = addressMapping[address];
      console.log(`✅ Found compartment BIGINT: ${compartmentId}`);
      return compartmentId;
    }
    
    console.error(`❌ Address not found: ${address}`);
    console.error(`📋 Available addresses: ${Object.keys(addressMapping).join(', ')}`);
    throw new Error(`Compartment not found for address: ${address}`);
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
  
  // Compartment methods
  async getAllCompartments(): Promise<any[]> {
    // Use minimal select to avoid schema issues
    const { data, error } = await supabase
      .from('compartments')
      .select('id, corredor, linha, coluna')
      .order('id');
    
    if (error) throw new Error(`Error fetching compartments: ${error.message}`);
    
    // Add synthetic address field using corredor+linha+coluna
    const dataWithAddress = (data || []).map(compartment => ({
      ...compartment,
      address: `${compartment.corredor}${compartment.linha}${compartment.coluna}`
    }));
    
    return dataWithAddress;
  }

  // Product methods
  async getAllProducts(): Promise<SupabaseProduct[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Error fetching products: ${error.message}`);
    return data || [];
  }

  async getProduct(id: number): Promise<SupabaseProduct | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error fetching product: ${error.message}`);
    }
    return data;
  }

  async findProductByCode(codigo: string): Promise<SupabaseProduct | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('codigo_produto', codigo)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding product by code: ${error.message}`);
    }
    return data;
  }

  async createProduct(product: Omit<SupabaseProduct, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseProduct> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    if (error) throw new Error(`Error creating product: ${error.message}`);
    return data;
  }

  async searchProducts(term: string): Promise<SupabaseProduct[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`produto.ilike.%${term}%,codigo_produto.ilike.%${term}%`);
    
    if (error) throw new Error(`Error searching products: ${error.message}`);
    return data || [];
  }

  // Movement methods
  async getAllMovements(): Promise<SupabaseMovement[]> {
    const { data, error } = await supabase
      .schema('public')
      .from('movements')
      .select('id, user_id, product_id, compartment_id, tipo, qty')
      .order('id', { ascending: false });
    
    if (error) throw new Error(`Error fetching movements: ${error.message}`);
    return data || [];
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
      const { data, error } = await supabase
        .from('movements')
        .insert(movementData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Successfully created movement with BIGINT IDs:', data);
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
    const { data, error } = await supabase
      .schema('public')
      .from('movements')
      .select('id, user_id, product_id, compartment_id, tipo, qty')
      .eq('product_id', productId)
      .order('id', { ascending: false });
    
    if (error) throw new Error(`Error fetching movements by product: ${error.message}`);
    return data || [];
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

  // User methods - Fixed to use correct profiles table
  async createUser(user: Omit<SupabaseUser, 'id'>): Promise<SupabaseUser> {
    const { data, error } = await supabase
      .from('profiles')  // Use correct table name
      .insert(user)
      .select()
      .single();
    
    if (error) throw new Error(`Error creating user: ${error.message}`);
    return data;
  }

  // Get or create default user with UUID handling
  async getOrCreateDefaultUser(): Promise<SupabaseUser> {
    console.log('🔍 Getting or creating default user...');
    
    try {
      // Try to find any existing user
      const { data: existingUsers, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0];
        console.log('✅ Found existing user:', { id: user.id, email: user.email || 'no email' });
        
        return {
          id: user.id, // Return UUID string as-is for movements FK
          email: user.email || 'api@teste.com',
          full_name: user.full_name || 'API Test User'
        };
      }
      
      console.log('⚠️ No users found, attempting to create one...');
      
      // Try to create a new user
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          email: 'api@teste.com',
          full_name: 'API Test User'
        })
        .select()
        .single();
      
      if (newUser && !createError) {
        console.log('✅ Created new user:', { id: newUser.id, email: newUser.email });
        return {
          id: newUser.id, // UUID string
          email: newUser.email,
          full_name: newUser.full_name
        };
      }
      
      console.error('❌ Failed to create user:', createError?.message);
      throw new Error('Unable to get or create default user');
      
    } catch (error: any) {
      console.error('❌ User operations failed:', error.message);
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