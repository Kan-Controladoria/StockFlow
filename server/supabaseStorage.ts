import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
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
  id: number;             // Integer serial ID as per mixed-type schema
  codigo_barras: string;  // Required field in serial ID schema
  produto: string;        // tabela products usa 'produto'
  codigo_produto: string; // tabela products usa 'codigo_produto'
  departamento: string;
  categoria: string;
  subcategoria: string;
  created_at: string;
}

export interface SupabaseMovement {
  id: number;             // Integer serial ID
  product_id: number;     // Integer (references products.id)
  compartment_id: string; // UUID string (references compartments.id)
  tipo: 'ENTRADA' | 'SAIDA';
  qty: number;           // tabela movements usa 'qty'
  timestamp: string;     // tabela movements usa 'timestamp' ao invés de 'created_at'
}

export interface SupabaseUser {
  id: number;
  email: string;
  nome: string;
}

export class SupabaseStorage {
  // Expose supabase client for startup validation
  public readonly supabase = supabase;
  // Product methods
  async getAllProducts(): Promise<SupabaseProduct[]> {
    const { data, error } = await supabase
      .from('products')  // usando tabela correta com serial IDs
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Error fetching products: ${error.message}`);
    return data || [];
  }

  async getProduct(id: number): Promise<SupabaseProduct | null> {
    const { data, error } = await supabase
      .from('products')  // usando tabela correta com serial IDs
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
      .from('products')  // usando tabela correta com serial IDs
      .select('*')
      .eq('codigo_produto', codigo)  // campo 'codigo_produto' na tabela products
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding product by code: ${error.message}`);
    }
    return data;
  }

  async createProduct(product: Omit<SupabaseProduct, 'id' | 'created_at'>): Promise<SupabaseProduct> {
    const { data, error } = await supabase
      .from('products')  // usando tabela correta com serial IDs
      .insert(product)
      .select()
      .single();
    
    if (error) throw new Error(`Error creating product: ${error.message}`);
    return data;
  }

  async searchProducts(term: string): Promise<SupabaseProduct[]> {
    const { data, error } = await supabase
      .from('products')  // usando tabela correta com serial IDs
      .select('*')
      .or(`produto.ilike.%${term}%,codigo_produto.ilike.%${term}%`);  // campos da tabela products
    
    if (error) throw new Error(`Error searching products: ${error.message}`);
    return data || [];
  }

  // Movement methods
  async getAllMovements(): Promise<SupabaseMovement[]> {
    const { data, error } = await supabase
      .schema('public')
      .from('movements')  // usando tabela correta com serial IDs
      .select('*')
      .order('timestamp', { ascending: false });  // campo 'timestamp' na tabela movements
    
    if (error) throw new Error(`Error fetching movements: ${error.message}`);
    return data || [];
  }

  async createMovement(movement: Omit<SupabaseMovement, 'id' | 'timestamp'>): Promise<SupabaseMovement> {
    const { data, error } = await supabase
      .schema('public')
      .from('movements')  // usando tabela correta com serial IDs
      .insert(movement)
      .select()
      .single();
    
    if (error) throw new Error(`Error creating movement: ${error.message}`);
    return data;
  }

  async getMovementsByProduct(productId: number): Promise<SupabaseMovement[]> {
    const { data, error } = await supabase
      .schema('public')
      .from('movements')  // usando tabela correta com serial IDs
      .select('*')
      .eq('product_id', productId)  // campo 'product_id' da tabela movements
      .order('timestamp', { ascending: false });  // campo 'timestamp' na tabela movements
    
    if (error) throw new Error(`Error fetching movements by product: ${error.message}`);
    return data || [];
  }

  async getProductStock(productId: number): Promise<number> {
    const movements = await this.getMovementsByProduct(productId);
    
    let stock = 0;
    for (const movement of movements) {
      if (movement.tipo === 'ENTRADA') {
        stock += movement.qty;  // campo 'qty' da tabela movements
      } else if (movement.tipo === 'SAIDA') {
        stock -= movement.qty;  // campo 'qty' da tabela movements
      }
    }
    
    return Math.max(0, stock);
  }

  // User methods
  async createUser(user: Omit<SupabaseUser, 'id'>): Promise<SupabaseUser> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert(user)
      .select()
      .single();
    
    if (error) throw new Error(`Error creating user: ${error.message}`);
    return data;
  }

  async getOrCreateDefaultUser(): Promise<SupabaseUser> {
    // Hardcode default user to bypass schema conflicts
    const defaultUser: SupabaseUser = {
      id: 1,
      email: 'api@teste.com',
      nome: 'API Test User'
    };
    
    return defaultUser;
  }

  // Helper method to get compartment ID by address
  async getCompartmentIdByAddress(address: string): Promise<string | null> {
    // Use live Supabase lookup for UUID compartment IDs
    try {
      const queryResult = await supabase
        .schema('public')
        .from('compartments')
        .select('id')
        .eq('address', address)
        .single();
      
      if (!queryResult.error && queryResult.data) {
        return queryResult.data.id; // Returns UUID string
      }
      
      console.warn('Compartment lookup failed:', queryResult.error?.message);
    } catch (e) {
      console.warn('Compartment lookup exception:', e);
    }
    
    return null; // Never throw - return null if not found
  }
}

export const supabaseStorage = new SupabaseStorage();