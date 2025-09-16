import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  id: string;
  produto: string;
  codigo_produto: string;
  departamento: string;
  categoria: string;
  subcategoria: string;
  created_at: string;
}

export interface SupabaseMovement {
  id: string;
  product_id: string;
  compartment_id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  qty: number;
  created_at: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  nome: string;
}

export class SupabaseStorage {
  // Product methods
  async getAllProducts(): Promise<SupabaseProduct[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Error fetching products: ${error.message}`);
    return data || [];
  }

  async getProduct(id: string): Promise<SupabaseProduct | null> {
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

  async createProduct(product: Omit<SupabaseProduct, 'id' | 'created_at'>): Promise<SupabaseProduct> {
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
      .from('movements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Error fetching movements: ${error.message}`);
    return data || [];
  }

  async createMovement(movement: Omit<SupabaseMovement, 'id' | 'created_at'>): Promise<SupabaseMovement> {
    const { data, error } = await supabase
      .from('movements')
      .insert(movement)
      .select()
      .single();
    
    if (error) throw new Error(`Error creating movement: ${error.message}`);
    return data;
  }

  async getMovementsByProduct(productId: string): Promise<SupabaseMovement[]> {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Error fetching movements by product: ${error.message}`);
    return data || [];
  }

  async getProductStock(productId: string): Promise<number> {
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
    // Try to get existing default user
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'api@teste.com')
      .single();
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create default user
    return this.createUser({
      email: 'api@teste.com',
      nome: 'API Test User'
    });
  }
}

export const supabaseStorage = new SupabaseStorage();