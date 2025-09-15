import { createClient } from '@supabase/supabase-js';
import { 
  type Profile, type InsertProfile,
  type Product, type InsertProduct,
  type Compartment, type InsertCompartment,
  type Stock, type InsertStock,
  type Movement, type InsertMovement,
  type CompartmentWithStock, type MovementWithDetails
} from "@shared/schema";
import { randomUUID } from "crypto";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Storage interface with all CRUD methods needed
export interface IStorage {
  // Profile methods
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  getAllProfiles(): Promise<Profile[]>;
  
  // Product methods
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  searchProducts(term: string): Promise<Product[]>;
  findProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getCategories(): Promise<string[]>;
  getSubcategories(category?: string): Promise<string[]>;
  getDepartments(): Promise<string[]>;
  
  // Compartment methods
  getAllCompartments(): Promise<Compartment[]>;
  getCompartment(id: string): Promise<Compartment | undefined>;
  getCompartmentByAddress(address: string): Promise<Compartment | undefined>;
  getCompartmentWithStock(id: string): Promise<CompartmentWithStock | undefined>;
  getAllCompartmentsWithStock(): Promise<CompartmentWithStock[]>;
  createCompartment(compartment: InsertCompartment): Promise<Compartment>;
  
  // Stock methods
  getAllStock(): Promise<Stock[]>;
  getStockByCompartment(compartmentId: string): Promise<Stock[]>;
  getStockByProduct(productId: string): Promise<Stock[]>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(id: string, quantity: number): Promise<Stock>;
  deleteStock(id: string): Promise<void>;
  getStockByCompartmentAndProduct(compartmentId: string, productId: string): Promise<Stock | undefined>;
  
  // Movement methods
  getAllMovements(): Promise<MovementWithDetails[]>;
  getMovementsByCompartment(compartmentId: string): Promise<MovementWithDetails[]>;
  getMovementsByProduct(productId: string): Promise<MovementWithDetails[]>;
  getMovementsByUser(userId: string): Promise<MovementWithDetails[]>;
  createMovement(movement: InsertMovement): Promise<Movement>;
  getMovementsByDateRange(startDate: Date, endDate: Date): Promise<MovementWithDetails[]>;
  getMovementsByFilters(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    productId?: string;
    compartmentId?: string;
    userId?: string;
  }): Promise<MovementWithDetails[]>;
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile>;
  private products: Map<string, Product>;
  private compartments: Map<string, Compartment>;
  private stock: Map<string, Stock>;
  private movements: Map<string, Movement>;

  constructor() {
    this.profiles = new Map();
    this.products = new Map();
    this.compartments = new Map();
    this.stock = new Map();
    this.movements = new Map();
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create a default profile for authentication
    const defaultProfile: Profile = {
      id: randomUUID(),
      email: "admin@supermarket.com",
      full_name: "Administrator",
      created_at: new Date()
    };
    this.profiles.set(defaultProfile.id, defaultProfile);

    // Initialize compartments (150 total: 5 corridors x 3 rows x 10 columns)
    for (let corredor = 1; corredor <= 5; corredor++) {
      for (const linha of ['A', 'B', 'C']) {
        for (let coluna = 1; coluna <= 10; coluna++) {
          const address = `${corredor}${linha}${coluna}`;
          const compartment: Compartment = {
            id: randomUUID(),
            address,
            corredor,
            linha,
            coluna,
            created_at: new Date()
          };
          this.compartments.set(compartment.id, compartment);
        }
      }
    }
  }

  // Profile methods
  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.email === email);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = randomUUID();
    const profile: Profile = { 
      ...insertProfile, 
      id, 
      created_at: new Date() 
    };
    this.profiles.set(id, profile);
    return profile;
  }

  async getAllProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }

  // Product methods
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async searchProducts(term: string): Promise<Product[]> {
    const searchTerm = term.toLowerCase();
    return Array.from(this.products.values()).filter(p => 
      p.produto.toLowerCase().includes(searchTerm) ||
      p.codigo_produto.toLowerCase().includes(searchTerm) ||
      p.codigo_barras.toLowerCase().includes(searchTerm)
    );
  }

  async findProductByCode(code: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(p => 
      p.codigo_barras === code || p.codigo_produto === code
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { 
      ...insertProduct, 
      id, 
      created_at: new Date(), 
      updated_at: new Date() 
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) throw new Error('Product not found');
    
    const updated: Product = { 
      ...existing, 
      ...productData, 
      updated_at: new Date() 
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products.delete(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.categoria === category);
  }

  async getCategories(): Promise<string[]> {
    const categories = new Set(Array.from(this.products.values()).map(p => p.categoria));
    return Array.from(categories);
  }

  async getSubcategories(category?: string): Promise<string[]> {
    let products = Array.from(this.products.values());
    if (category) {
      products = products.filter(p => p.categoria === category);
    }
    const subcategories = new Set(products.map(p => p.subcategoria));
    return Array.from(subcategories);
  }

  async getDepartments(): Promise<string[]> {
    const departments = new Set(Array.from(this.products.values()).map(p => p.departamento));
    return Array.from(departments);
  }

  // Compartment methods
  async getAllCompartments(): Promise<Compartment[]> {
    return Array.from(this.compartments.values());
  }

  async getCompartment(id: string): Promise<Compartment | undefined> {
    return this.compartments.get(id);
  }

  async getCompartmentByAddress(address: string): Promise<Compartment | undefined> {
    return Array.from(this.compartments.values()).find(c => c.address === address);
  }

  async getCompartmentWithStock(id: string): Promise<CompartmentWithStock | undefined> {
    const compartment = this.compartments.get(id);
    if (!compartment) return undefined;

    const compartmentStock = Array.from(this.stock.values())
      .filter(s => s.compartment_id === id)
      .map(s => {
        const product = this.products.get(s.product_id);
        return { ...s, products: product! };
      });

    return { ...compartment, stock: compartmentStock };
  }

  async getAllCompartmentsWithStock(): Promise<CompartmentWithStock[]> {
    const compartments = Array.from(this.compartments.values());
    return Promise.all(
      compartments.map(async (c) => {
        const withStock = await this.getCompartmentWithStock(c.id);
        return withStock!;
      })
    );
  }

  async createCompartment(insertCompartment: InsertCompartment): Promise<Compartment> {
    const id = randomUUID();
    const compartment: Compartment = { 
      ...insertCompartment, 
      id, 
      created_at: new Date() 
    };
    this.compartments.set(id, compartment);
    return compartment;
  }

  // Stock methods
  async getAllStock(): Promise<Stock[]> {
    return Array.from(this.stock.values());
  }

  async getStockByCompartment(compartmentId: string): Promise<Stock[]> {
    return Array.from(this.stock.values()).filter(s => s.compartment_id === compartmentId);
  }

  async getStockByProduct(productId: string): Promise<Stock[]> {
    return Array.from(this.stock.values()).filter(s => s.product_id === productId);
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const id = randomUUID();
    const stock: Stock = { 
      ...insertStock, 
      id, 
      created_at: new Date(), 
      updated_at: new Date() 
    };
    this.stock.set(id, stock);
    return stock;
  }

  async updateStock(id: string, quantity: number): Promise<Stock> {
    const existing = this.stock.get(id);
    if (!existing) throw new Error('Stock not found');
    
    const updated: Stock = { 
      ...existing, 
      quantity, 
      updated_at: new Date() 
    };
    this.stock.set(id, updated);
    return updated;
  }

  async deleteStock(id: string): Promise<void> {
    this.stock.delete(id);
  }

  async getStockByCompartmentAndProduct(compartmentId: string, productId: string): Promise<Stock | undefined> {
    return Array.from(this.stock.values()).find(s => 
      s.compartment_id === compartmentId && s.product_id === productId
    );
  }

  // Movement methods
  async getAllMovements(): Promise<MovementWithDetails[]> {
    return Array.from(this.movements.values()).map(m => this.enrichMovement(m));
  }

  async getMovementsByCompartment(compartmentId: string): Promise<MovementWithDetails[]> {
    return Array.from(this.movements.values())
      .filter(m => m.compartment_id === compartmentId)
      .map(m => this.enrichMovement(m));
  }

  async getMovementsByProduct(productId: string): Promise<MovementWithDetails[]> {
    return Array.from(this.movements.values())
      .filter(m => m.product_id === productId)
      .map(m => this.enrichMovement(m));
  }

  async getMovementsByUser(userId: string): Promise<MovementWithDetails[]> {
    return Array.from(this.movements.values())
      .filter(m => m.user_id === userId)
      .map(m => this.enrichMovement(m));
  }

  async createMovement(insertMovement: InsertMovement): Promise<Movement> {
    const id = randomUUID();
    const movement: Movement = { 
      ...insertMovement, 
      id, 
      timestamp: new Date() 
    };
    this.movements.set(id, movement);
    return movement;
  }

  async getMovementsByDateRange(startDate: Date, endDate: Date): Promise<MovementWithDetails[]> {
    return Array.from(this.movements.values())
      .filter(m => m.timestamp >= startDate && m.timestamp <= endDate)
      .map(m => this.enrichMovement(m));
  }

  async getMovementsByFilters(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    productId?: string;
    compartmentId?: string;
    userId?: string;
  }): Promise<MovementWithDetails[]> {
    let movements = Array.from(this.movements.values());

    if (filters.startDate) {
      movements = movements.filter(m => m.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      movements = movements.filter(m => m.timestamp <= filters.endDate!);
    }
    if (filters.type) {
      movements = movements.filter(m => m.tipo === filters.type);
    }
    if (filters.productId) {
      movements = movements.filter(m => m.product_id === filters.productId);
    }
    if (filters.compartmentId) {
      movements = movements.filter(m => m.compartment_id === filters.compartmentId);
    }
    if (filters.userId) {
      movements = movements.filter(m => m.user_id === filters.userId);
    }

    return movements.map(m => this.enrichMovement(m));
  }

  private enrichMovement(movement: Movement): MovementWithDetails {
    const product = this.products.get(movement.product_id)!;
    const compartment = this.compartments.get(movement.compartment_id)!;
    const profile = this.profiles.get(movement.user_id)!;
    
    return {
      ...movement,
      products: product,
      compartments: compartment,
      profiles: profile
    };
  }
}

export const storage = new MemStorage();
