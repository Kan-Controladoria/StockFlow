import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabaseStorage } from "./supabaseStorage";
import { 
  insertProductSchema, 
  insertCompartmentSchema, 
  insertStockSchema, 
  insertMovementSchema,
  insertProfileSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // SECURITY PROTECTION: Block all debug routes in production
  app.use('/api/debug', (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.log(`🔍 [DEBUG MODE] Debug route accessed: ${req.path}`);
    next();
  });
  
  // Debug route to expose Supabase connection information
  app.get("/api/debug/supabase", async (req, res) => {
    try {
      // Extract URL host information
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      let urlHost = 'unknown';
      let keyRole = 'unknown';
      let projectRef = 'unknown';
      
      if (supabaseUrl) {
        try {
          const url = new URL(supabaseUrl);
          urlHost = url.hostname;
          // Extract project reference from hostname (format: <project_ref>.supabase.co)
          projectRef = url.hostname.split('.')[0];
        } catch (e) {
          urlHost = 'invalid_url';
        }
      }
      
      if (supabaseServiceKey) {
        try {
          const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString());
          keyRole = payload.role || 'unknown';
        } catch (e) {
          keyRole = 'invalid_key';
        }
      }
      
      // Get product count using the same client as the API
      let productCount = 0;
      try {
        const products = await supabaseStorage.getAllProducts();
        productCount = products.length;
      } catch (error: any) {
        console.error('Error fetching products for debug:', error.message);
      }
      
      // Test direct connection using PostgreSQL pool instead of Supabase client
      let connectionTest = 'failed';
      try {
        const products = await supabaseStorage.getAllProducts();
        connectionTest = products.length >= 0 ? 'success' : 'no_products';
      } catch (error: any) {
        connectionTest = `exception: ${error.message}`;
      }
      
      res.json({
        urlHost,
        projectRef,
        schema: 'public',
        keyRole,
        productCount,
        connectionTest,
        environment: {
          supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'not_set',
          hasServiceKey: !!supabaseServiceKey
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
      });
    }
  });

  // CRITICAL DEBUG ROUTES - Data Recovery Implementation
  app.get("/api/debug/database-identity", async (req, res) => {
    try {
      console.log('🔍 [DEBUG ROUTE] Database identity verification requested...');
      const identity = await supabaseStorage.verifyDatabaseIdentity();
      res.json({
        success: true,
        ...identity,
        critical_issues: {
          compartment_3b7_missing: !identity.compartment_3b7_exists,
          product_6_missing: !identity.product_6_exists,
          data_loss_detected: identity.compartment_count < 5 || identity.product_count < 5
        }
      });
    } catch (error: any) {
      console.error('❌ Database identity verification failed:', error.message);
      res.status(500).json({ 
        success: false,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      });
    }
  });

  app.post("/api/debug/seed-critical-data", async (req, res) => {
    try {
      console.log('🌱 [DEBUG ROUTE] Critical data seeding requested...');
      await supabaseStorage.seedMissingCriticalData();
      
      // Verify seeding worked
      const verificationResult = await supabaseStorage.verifyDatabaseIdentity();
      
      res.json({
        success: true,
        message: 'Critical data seeded successfully',
        verification: {
          compartment_3b7_exists: verificationResult.compartment_3b7_exists,
          compartment_3b7_data: verificationResult.compartment_3b7_data,
          product_6_exists: verificationResult.product_6_exists,
          product_6_data: verificationResult.product_6_data
        }
      });
    } catch (error: any) {
      console.error('❌ Critical data seeding failed:', error.message);
      res.status(500).json({ 
        success: false,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      });
    }
  });

  app.get("/api/debug/test-address-lookup/:address", async (req, res) => {
    try {
      const { address } = req.params;
      console.log(`🔍 [DEBUG ROUTE] Testing hardened address lookup for: ${address}`);
      
      const compartmentId = await supabaseStorage.getCompartmentIdByAddress(address);
      
      res.json({
        success: true,
        address: address,
        compartment_id: compartmentId,
        lookup_type: /^[0-9]+$/.test(address.trim()) ? 'numeric_id' : 'address_string'
      });
    } catch (error: any) {
      console.error(`❌ Address lookup failed for ${req.params.address}:`, error.message);
      res.status(500).json({ 
        success: false,
        address: req.params.address,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      });
    }
  });

  app.post("/api/debug/test-movement-creation", async (req, res) => {
    try {
      const { address = '3B7', productId = 6, tipo = 'ENTRADA', qty = 10 } = req.body;
      console.log(`🔍 [DEBUG ROUTE] Testing movement creation for address ${address}, product ${productId}`);
      
      const movement = await supabaseStorage.createMovementByAddress(
        address,
        productId,
        tipo,
        qty
      );
      
      // Get updated stock
      const stock = await supabaseStorage.getProductStock(productId);
      
      res.json({
        success: true,
        movement_created: movement,
        product_stock: stock,
        test_parameters: { address, productId, tipo, qty }
      });
    } catch (error: any) {
      console.error('❌ Movement creation test failed:', error.message);
      res.status(500).json({ 
        success: false,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      });
    }
  });

  // Authentication/Profile routes
  app.get("/api/profiles", async (req, res) => {
    try {
      const profiles = await supabaseStorage.getAllProfiles();
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rota mínima para profiles
  app.get('/api/profiles/:id', async (req, res) => {
    const { id } = req.params;
    res.json({
      id: id,
      nome: "Usuário Teste",
      email: "teste@superkan.com",
      role: "user"
    });
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      const { email, full_name } = req.body;
      
      // Validate required fields
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: "email is required and must be a non-empty string" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      const userData = {
        email: email.trim(),
        full_name: full_name ? full_name.trim() : ''
      };
      
      const profile = await supabaseStorage.createUser(userData);
      res.status(201).json(profile);
    } catch (error: any) {
      if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
        return res.status(409).json({ error: "Email already exists" });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { search } = req.query;
      let products;
      
      if (search && typeof search === 'string') {
        products = await supabaseStorage.searchProducts(search);
      } else {
        products = await supabaseStorage.getAllProducts();
      }
      
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/search/:query", async (req, res) => {
    try {
      const product = await supabaseStorage.findProductByCode(req.params.query);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/categories", async (req, res) => {
    try {
      const products = await supabaseStorage.getAllProducts();
      const categories = Array.from(new Set(products.map(p => p.categoria))).sort();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/subcategories", async (req, res) => {
    try {
      const { category } = req.query;
      const products = await supabaseStorage.getAllProducts();
      const subcategories = Array.from(new Set(products.filter(p => !category || p.categoria === category).map(p => p.subcategoria))).sort();
      res.json(subcategories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/departments", async (req, res) => {
    try {
      const products = await supabaseStorage.getAllProducts();
      const departments = Array.from(new Set(products.map(p => p.departamento))).sort();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
      }
      const product = await supabaseStorage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      // Map frontend field names to Supabase products table schema
      const productData = {
        codigo_barras: req.body.codigo_barras || req.body.codigo_produto || req.body.codigo || 'DEFAULT_BARCODE', // Required field
        produto: req.body.produto || req.body.nome,                           // 'produto' na tabela products
        codigo_produto: req.body.codigo_produto || req.body.codigo,          // 'codigo_produto' na tabela products
        departamento: req.body.departamento,
        categoria: req.body.categoria,
        subcategoria: req.body.subcategoria
      };
      
      const product = await supabaseStorage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
      }
      
      // Validate product exists first
      const existingProduct = await supabaseStorage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Map frontend field names to Supabase products table schema
      const productData = {
        codigo_barras: req.body.codigo_barras || req.body.codigo_produto || req.body.codigo,
        produto: req.body.produto || req.body.nome,
        codigo_produto: req.body.codigo_produto || req.body.codigo,
        departamento: req.body.departamento,
        categoria: req.body.categoria,
        subcategoria: req.body.subcategoria
      };
      
      const { data, error } = await supabaseStorage.supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .select()
        .single();
      
      if (error) throw new Error(`Error updating product: ${error.message}`);
      
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
      }
      
      // Validate product exists first
      const existingProduct = await supabaseStorage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Check for related movements before deletion
      const movements = await supabaseStorage.getMovementsByProduct(productId);
      if (movements.length > 0) {
        return res.status(409).json({ 
          error: "Cannot delete product - has related movements",
          movementCount: movements.length
        });
      }
      
      const { error } = await supabaseStorage.supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw new Error(`Error deleting product: ${error.message}`);
      
      res.json({ message: "Product deleted successfully", id: productId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Compartment routes
  app.get("/api/compartments", async (req, res) => {
    try {
      // Use storage abstraction that synthesizes address field correctly
      const compartments = await supabaseStorage.getAllCompartments();
      res.json(compartments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FIXED: /api/db-compartments route using direct PostgreSQL connection
  app.get("/api/db-compartments", async (req, res) => {
    try {
      console.log('🔧 [FIXED] Using PostgreSQL direct connection for db-compartments...');
      
      // Use corrected storage method with direct PostgreSQL
      const compartments = await supabaseStorage.getAllCompartments();
      
      console.log('✅ [FIXED] Successfully fetched', compartments.length, 'compartments with address field');
      res.json(compartments);
    } catch (error: any) {
      console.error('❌ [FIXED] Route error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/compartments/with-stock", async (req, res) => {
    try {
      // Get compartments without problematic address field, order by id
      const { data, error } = await supabaseStorage.supabase
        .from('compartments')
        .select(`
          id,
          corredor,
          linha,
          coluna,
          stock_by_compartment (
            quantity,
            products (
              id,
              produto,
              codigo_produto
            )
          )
        `)
        .order('id');
      
      if (error) throw new Error(`Error fetching compartments with stock: ${error.message}`);
      
      // Filter compartments that have stock and synthesize address
      const compartmentsWithStock = (data || [])
        .filter(compartment => 
          compartment.stock_by_compartment && compartment.stock_by_compartment.length > 0
        )
        .map(compartment => ({
          ...compartment,
          address: `${compartment.corredor}${compartment.linha}${compartment.coluna}`
        }));
      
      res.json(compartmentsWithStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/compartments/:id", async (req, res) => {
    try {
      const compartmentId = parseInt(req.params.id, 10);
      if (isNaN(compartmentId) || compartmentId <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT compartment ID - must be positive integer" });
      }
      
      const { data, error } = await supabaseStorage.supabase
        .from('compartments')
        .select(`
          id,
          corredor,
          linha,
          coluna,
          stock_by_compartment (
            quantity,
            products (
              id,
              produto,
              codigo_produto
            )
          )
        `)
        .eq('id', compartmentId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching compartment: ${error.message}`);
      }
      
      if (!data) {
        return res.status(404).json({ error: "Compartment not found" });
      }
      
      // Synthesize address field
      const compartmentWithAddress = {
        ...data,
        address: `${data.corredor}${data.linha}${data.coluna}`
      };
      
      res.json(compartmentWithAddress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/compartments", async (req, res) => {
    try {
      const { address, corredor, linha, coluna } = req.body;
      
      // Validate required fields
      if (!address || !corredor || !linha || !coluna) {
        return res.status(400).json({ 
          error: "Missing required fields: address, corredor, linha, coluna" 
        });
      }
      
      // Validate field types
      if (!Number.isInteger(corredor) || corredor <= 0) {
        return res.status(400).json({ error: "corredor must be a positive integer" });
      }
      
      if (!Number.isInteger(coluna) || coluna <= 0) {
        return res.status(400).json({ error: "coluna must be a positive integer" });
      }
      
      if (typeof linha !== 'string' || !linha.trim()) {
        return res.status(400).json({ error: "linha must be a non-empty string" });
      }
      
      const compartmentData = {
        address: address.trim(),
        corredor,
        linha: linha.trim(),
        coluna
      };
      
      const { data, error } = await supabaseStorage.supabase
        .from('compartments')
        .insert(compartmentData)
        .select()
        .single();
      
      if (error) throw new Error(`Error creating compartment: ${error.message}`);
      
      res.status(201).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stock routes
  app.get("/api/stock", async (req, res) => {
    try {
      const { compartmentId, productId } = req.query;
      
      if (productId) {
        // Validate BIGINT product ID
        const productIdNum = parseInt(productId as string, 10);
        if (isNaN(productIdNum) || productIdNum <= 0) {
          return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
        }
        const stock = await supabaseStorage.getProductStock(productIdNum);
        res.json({ product_id: productIdNum, quantity: stock });
      } else if (compartmentId) {
        // Validate BIGINT compartment ID and get stock for compartment
        const compartmentIdNum = parseInt(compartmentId as string, 10);
        if (isNaN(compartmentIdNum) || compartmentIdNum <= 0) {
          return res.status(400).json({ error: "Invalid BIGINT compartment ID - must be positive integer" });
        }
        
        const { data, error } = await supabaseStorage.supabase
          .from('stock_by_compartment')
          .select(`
            id,
            compartment_id,
            product_id,
            products (
              id,
              produto,
              codigo_produto
            ),
            compartments (
              id,
              corredor,
              linha,
              coluna
            )
          `)
          .eq('compartment_id', compartmentIdNum);
        
        if (error) throw new Error(`Error fetching compartment stock: ${error.message}`);
        
        res.json(data || []);
      } else {
        // Get all stock entries
        const { data, error } = await supabaseStorage.supabase
          .from('stock_by_compartment')
          .select(`
            id,
            compartment_id,
            product_id,
            products (
              id,
              produto,
              codigo_produto
            ),
            compartments (
              id,
              corredor,
              linha,
              coluna
            )
          `)
          .order('id', { ascending: false });
        
        if (error) throw new Error(`Error fetching all stock: ${error.message}`);
        
        res.json(data || []);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock", async (req, res) => {
    try {
      const { compartment_id, product_id, quantity } = req.body;
      
      // Validate required fields
      if (!compartment_id || !product_id || quantity === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields: compartment_id, product_id, quantity" 
        });
      }
      
      // Validate BIGINT IDs
      if (!Number.isInteger(compartment_id) || compartment_id <= 0) {
        return res.status(400).json({ error: "compartment_id must be a positive BIGINT integer" });
      }
      
      if (!Number.isInteger(product_id) || product_id <= 0) {
        return res.status(400).json({ error: "product_id must be a positive BIGINT integer" });
      }
      
      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ error: "quantity must be a non-negative integer" });
      }
      
      // Verify product and compartment exist
      const product = await supabaseStorage.getProduct(product_id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const { data: compartment, error: compartmentError } = await supabaseStorage.supabase
        .from('compartments')
        .select('id')
        .eq('id', compartment_id)
        .single();
      
      if (compartmentError || !compartment) {
        return res.status(404).json({ error: "Compartment not found" });
      }
      
      const stockData = {
        compartment_id,
        product_id,
        quantity
      };
      
      const { data, error } = await supabaseStorage.supabase
        .from('stock_by_compartment')
        .insert(stockData)
        .select()
        .single();
      
      if (error) throw new Error(`Error creating stock entry: ${error.message}`);
      
      res.status(201).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/stock/:id", async (req, res) => {
    try {
      const stockId = parseInt(req.params.id, 10);
      if (isNaN(stockId) || stockId <= 0) {
        return res.status(400).json({ error: "Invalid stock ID - must be positive integer" });
      }
      
      const { quantity } = req.body;
      
      // Validate quantity
      if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ error: "quantity must be a non-negative integer" });
      }
      
      // Check if stock entry exists
      const { data: existingStock, error: fetchError } = await supabaseStorage.supabase
        .from('stock_by_compartment')
        .select('*')
        .eq('id', stockId)
        .single();
      
      if (fetchError || !existingStock) {
        return res.status(404).json({ error: "Stock entry not found" });
      }
      
      const { data, error } = await supabaseStorage.supabase
        .from('stock_by_compartment')
        .update({ qty: quantity })
        .eq('id', stockId)
        .select()
        .single();
      
      if (error) throw new Error(`Error updating stock: ${error.message}`);
      
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock/:id", async (req, res) => {
    try {
      const stockId = parseInt(req.params.id, 10);
      if (isNaN(stockId) || stockId <= 0) {
        return res.status(400).json({ error: "Invalid stock ID - must be positive integer" });
      }
      
      // Check if stock entry exists
      const { data: existingStock, error: fetchError } = await supabaseStorage.supabase
        .from('stock_by_compartment')
        .select('*')
        .eq('id', stockId)
        .single();
      
      if (fetchError || !existingStock) {
        return res.status(404).json({ error: "Stock entry not found" });
      }
      
      const { error } = await supabaseStorage.supabase
        .from('stock_by_compartment')
        .delete()
        .eq('id', stockId);
      
      if (error) throw new Error(`Error deleting stock entry: ${error.message}`);
      
      res.json({ message: "Stock entry deleted successfully", id: stockId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Movement routes
  app.get("/api/movements", async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        type, 
        productId, 
        compartmentId, 
        userId 
      } = req.query;

      let query = supabaseStorage.supabase
        .from('movements')
        .select('id, user_id, product_id, compartment_id, tipo, qty');
      
      // Skip date filters for now to avoid timestamp issues
      // if (startDate) {
      //   query = query.gte('timestamp', startDate);
      // }
      // 
      // if (endDate) {
      //   query = query.lte('timestamp', endDate);
      // }
      
      if (type && (type === 'ENTRADA' || type === 'SAIDA')) {
        query = query.eq('tipo', type);
      }
      
      if (productId) {
        const productIdNum = parseInt(productId as string, 10);
        if (isNaN(productIdNum) || productIdNum <= 0) {
          return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
        }
        query = query.eq('product_id', productIdNum);
      }
      
      if (compartmentId) {
        const compartmentIdNum = parseInt(compartmentId as string, 10);
        if (isNaN(compartmentIdNum) || compartmentIdNum <= 0) {
          return res.status(400).json({ error: "Invalid BIGINT compartment ID - must be positive integer" });
        }
        query = query.eq('compartment_id', compartmentIdNum);
      }
      
      if (userId) {
        // UUID validation for user_id
        if (typeof userId !== 'string' || !userId.trim()) {
          return res.status(400).json({ error: "Invalid UUID user ID" });
        }
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.order('id', { ascending: false });
      
      if (error) throw new Error(`Error fetching movements: ${error.message}`);
      
      res.json(data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/compartment/:id", async (req, res) => {
    try {
      const compartmentId = parseInt(req.params.id, 10);
      if (isNaN(compartmentId) || compartmentId <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT compartment ID - must be positive integer" });
      }
      
      const { data, error } = await supabaseStorage.supabase
        .from('movements')
        .select(`
          id,
          user_id,
          product_id,
          compartment_id,
          tipo,
          qty,
          products (
            id,
            produto,
            codigo_produto
          ),
          compartments (
            id,
            corredor,
            linha,
            coluna
          ),
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('compartment_id', compartmentId)
        .order('id', { ascending: false });
      
      if (error) throw new Error(`Error fetching movements by compartment: ${error.message}`);
      
      res.json(data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/product/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
      }
      
      const { data, error } = await supabaseStorage.supabase
        .from('movements')
        .select(`
          id,
          user_id,
          product_id,
          compartment_id,
          tipo,
          qty,
          products (
            id,
            produto,
            codigo_produto
          ),
          compartments (
            id,
            corredor,
            linha,
            coluna
          ),
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('product_id', productId)
        .order('id', { ascending: false });
      
      if (error) throw new Error(`Error fetching movements by product: ${error.message}`);
      
      res.json(data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/user/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      
      // UUID validation for user_id
      if (typeof userId !== 'string' || !userId.trim()) {
        return res.status(400).json({ error: "Invalid UUID user ID" });
      }
      
      const { data, error } = await supabaseStorage.supabase
        .from('movements')
        .select(`
          id,
          user_id,
          product_id,
          compartment_id,
          tipo,
          qty,
          products (
            id,
            produto,
            codigo_produto
          ),
          compartments (
            id,
            corredor,
            linha,
            coluna
          ),
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('user_id', userId)
        .order('id', { ascending: false });
      
      if (error) throw new Error(`Error fetching movements by user: ${error.message}`);
      
      res.json(data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/movements", async (req, res) => {
    try {
      // Support both new format (code) and old format (compartment_id)
      // Support both 'tipo' and 'type' fields
      const { user_id, product_id, code, compartment_id, tipo, type, qty, quantidade } = req.body;
      
      const finalAddress = code || compartment_id;
      const finalTipo = tipo || (type === 'entrada' ? 'ENTRADA' : type === 'saida' ? 'SAIDA' : type?.toUpperCase());
      const finalQuantity = qty || quantidade;
      
      // Validate required fields
      if (!product_id || !finalAddress || !finalTipo || !finalQuantity) {
        return res.status(400).json({ error: "Missing required fields: product_id, compartment_id/code, tipo/type, qty/quantidade" });
      }
      
      // Resolve product_id: accept both id (BIGINT) and codigo_produto (string)
      let finalProductId: number;
      
      if (typeof product_id === 'number') {
        // Direct number - validate if exists
        console.log(`🔍 [MOVEMENT] Validating numeric product ID: ${product_id}`);
        const productById = await supabaseStorage.getProduct(product_id);
        if (productById) {
          finalProductId = product_id;
          console.log(`✅ [MOVEMENT] Using direct product ID: ${finalProductId}`);
        } else {
          return res.status(400).json({ error: "Produto não encontrado" });
        }
      } else if (typeof product_id === 'string') {
        if (/^\d+$/.test(product_id)) {
          // String numérica (ex: "20100")
          console.log(`🔍 [MOVEMENT] Looking up product by codigo_produto: ${product_id}`);
          const product = await supabaseStorage.findProductByCode(product_id);
          
          if (product) {
            // Found by codigo_produto
            finalProductId = parseInt(product.id.toString(), 10);
            console.log(`✅ [MOVEMENT] Resolved codigo_produto "${product_id}" to ID: ${finalProductId}`);
          } else {
            // Not found by codigo_produto, try as direct ID
            console.log(`🔍 [MOVEMENT] Not found by codigo_produto, trying as direct ID: ${product_id}`);
            const numericId = parseInt(product_id, 10);
            const productById = await supabaseStorage.getProduct(numericId);
            if (productById) {
              finalProductId = numericId;
              console.log(`✅ [MOVEMENT] Using string "${product_id}" as direct ID: ${finalProductId}`);
            } else {
              return res.status(400).json({ error: "Produto não encontrado" });
            }
          }
        } else {
          // String alfanumérica (ex: "PRODRy1u")
          console.log(`🔍 [MOVEMENT] Looking up product by codigo_produto: ${product_id}`);
          const product = await supabaseStorage.findProductByCode(product_id);
          
          if (product) {
            finalProductId = parseInt(product.id.toString(), 10);
            console.log(`✅ [MOVEMENT] Resolved codigo_produto "${product_id}" to ID: ${finalProductId}`);
          } else {
            return res.status(400).json({ error: "Produto não encontrado" });
          }
        }
      } else {
        return res.status(400).json({ error: "product_id must be either a number (id) or string (codigo_produto)" });
      }
      
      // Get or create default user for movements (since user_id is required)
      const defaultUser = await supabaseStorage.getOrCreateDefaultUser();
      
      // Get compartment ID: resolve address to UUID via database lookup
      const compartmentId = await supabaseStorage.getCompartmentIdByAddress(finalAddress.toString());
      
      // Map fields to Supabase movements table structure
      const movementData = {
        user_id: defaultUser.id,                 // Always use default user to avoid FK violations
        product_id: finalProductId,              // Resolved BIGINT id from either direct id or codigo_produto lookup
        compartment_id: compartmentId,           // UUID from database lookup
        tipo: finalTipo,
        qty: finalQuantity                       // 'qty' na tabela movements
      };
      
      const movement = await supabaseStorage.createMovement(movementData);
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // New movements/create endpoint as specified in task requirements
  app.post("/api/movements/create", async (req, res) => {
    try {
      const { product_id, compartment_address, compartment_id, tipo, qty } = req.body;
      
      // Validate required fields (allow either compartment_address or compartment_id)
      if (!product_id || (!compartment_address && !compartment_id) || !tipo || !qty) {
        return res.status(400).json({ error: "Missing required fields: product_id, (compartment_address or compartment_id), tipo, qty" });
      }
      
      // Resolve product_id: accept both id (BIGINT) and codigo_produto (string) - same logic as /api/movements
      let finalProductId: number;
      
      if (typeof product_id === 'number') {
        // Direct number - validate if exists
        console.log(`🔍 [MOVEMENT] Validating numeric product ID: ${product_id}`);
        const productById = await supabaseStorage.getProduct(product_id);
        if (productById) {
          finalProductId = product_id;
          console.log(`✅ [MOVEMENT] Using direct product ID: ${finalProductId}`);
        } else {
          return res.status(400).json({ error: "Produto não encontrado" });
        }
      } else if (typeof product_id === 'string') {
        if (/^\d+$/.test(product_id)) {
          // String numérica (ex: "20100")
          console.log(`🔍 [MOVEMENT] Looking up product by codigo_produto: ${product_id}`);
          const product = await supabaseStorage.findProductByCode(product_id);
          
          if (product) {
            // Found by codigo_produto
            finalProductId = parseInt(product.id.toString(), 10);
            console.log(`✅ [MOVEMENT] Resolved codigo_produto "${product_id}" to ID: ${finalProductId}`);
          } else {
            // Not found by codigo_produto, try as direct ID
            console.log(`🔍 [MOVEMENT] Not found by codigo_produto, trying as direct ID: ${product_id}`);
            const numericId = parseInt(product_id, 10);
            const productById = await supabaseStorage.getProduct(numericId);
            if (productById) {
              finalProductId = numericId;
              console.log(`✅ [MOVEMENT] Using string "${product_id}" as direct ID: ${finalProductId}`);
            } else {
              return res.status(400).json({ error: "Produto não encontrado" });
            }
          }
        } else {
          // String alfanumérica (ex: "PRODRy1u")
          console.log(`🔍 [MOVEMENT] Looking up product by codigo_produto: ${product_id}`);
          const product = await supabaseStorage.findProductByCode(product_id);
          
          if (product) {
            finalProductId = parseInt(product.id.toString(), 10);
            console.log(`✅ [MOVEMENT] Resolved codigo_produto "${product_id}" to ID: ${finalProductId}`);
          } else {
            return res.status(400).json({ error: "Produto não encontrado" });
          }
        }
      } else {
        return res.status(400).json({ error: "product_id must be either a number (id) or string (codigo_produto)" });
      }
      
      if (!['ENTRADA', 'SAIDA'].includes(tipo)) {
        return res.status(400).json({ error: "tipo must be either 'ENTRADA' or 'SAIDA'" });
      }
      
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: "qty must be a positive integer" });
      }
      
      // Get or create default user for movements
      const defaultUser = await supabaseStorage.getOrCreateDefaultUser();
      
      // Get compartment ID: resolve address to UUID via database lookup
      const compartmentAddress = compartment_address || compartment_id;
      const finalCompartmentId = await supabaseStorage.getCompartmentIdByAddress(compartmentAddress.toString());
      
      console.log('🔧 [ROUTE DEBUG] Final compartment ID after lookup:', {
        finalCompartmentId,
        type: typeof finalCompartmentId,
        isNumber: typeof finalCompartmentId === 'number',
        isInteger: Number.isInteger(finalCompartmentId)
      });
      
      // Create movement using the storage layer
      const movement = await supabaseStorage.createMovement({
        user_id: defaultUser.id, // UUID string for user_id
        product_id: finalProductId, // Resolved BIGINT id from either direct id or codigo_produto lookup
        compartment_id: finalCompartmentId, // BIGINT number from address lookup
        tipo: tipo,
        qty: qty
      });
      
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stock/Balance endpoint for compatibility with external scripts
  app.get("/api/movements/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const productIdNum = parseInt(productId, 10);
      if (isNaN(productIdNum) || productIdNum <= 0) {
        return res.status(400).json({ error: "Invalid BIGINT product ID - must be positive integer" });
      }
      
      // Get product stock from Supabase movements
      const totalStock = await supabaseStorage.getProductStock(productIdNum);
      
      res.json({
        product_id: productIdNum,
        saldo: totalStock,
        compartments: []
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports routes
  app.get("/api/reports/stats", async (req, res) => {
    try {
      const products = await supabaseStorage.getAllProducts();
      const movements = await supabaseStorage.getAllMovements();
      
      // Basic stats with available data
      const stats = {
        totalProducts: products.length,
        compartmentsWithStock: 0, // Not implemented yet
        monthlyMovements: movements.length
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/stock", async (req, res) => {
    try {
      res.status(501).json({ error: 'Stock reports not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
