import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseStorage } from "./supabaseStorage";
import { 
  insertProductSchema, 
  insertCompartmentSchema, 
  insertStockSchema, 
  insertMovementSchema,
  insertProfileSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication/Profile routes
  app.get("/api/profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllProfiles();
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      const validatedData = insertProfileSchema.parse(req.body);
      const profile = await storage.createProfile(validatedData);
      res.status(201).json(profile);
    } catch (error: any) {
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

  app.get("/api/products/search/:code", async (req, res) => {
    try {
      const product = await supabaseStorage.findProductByCode(req.params.code);
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
      const product = await supabaseStorage.getProduct(req.params.id);
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
      // Atualização via Supabase - implementar se necessário
      res.status(501).json({ error: 'Update not implemented with Supabase yet' });
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      // Exclusão via Supabase - implementar se necessário
      res.status(501).json({ error: 'Delete not implemented with Supabase yet' });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Compartment routes
  app.get("/api/compartments", async (req, res) => {
    try {
      const compartments = await storage.getAllCompartments();
      res.json(compartments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/compartments/with-stock", async (req, res) => {
    try {
      const compartments = await storage.getAllCompartmentsWithStock();
      res.json(compartments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/compartments/:id", async (req, res) => {
    try {
      const compartment = await storage.getCompartmentWithStock(req.params.id);
      if (!compartment) {
        return res.status(404).json({ error: "Compartment not found" });
      }
      res.json(compartment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/compartments", async (req, res) => {
    try {
      const validatedData = insertCompartmentSchema.parse(req.body);
      const compartment = await storage.createCompartment(validatedData);
      res.status(201).json(compartment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stock routes
  app.get("/api/stock", async (req, res) => {
    try {
      const { compartmentId, productId } = req.query;
      
      if (compartmentId && productId) {
        const stock = await storage.getStockByCompartmentAndProduct(
          compartmentId as string, 
          productId as string
        );
        res.json(stock);
      } else if (compartmentId) {
        const stock = await storage.getStockByCompartment(compartmentId as string);
        res.json(stock);
      } else if (productId) {
        const stock = await storage.getStockByProduct(productId as string);
        res.json(stock);
      } else {
        const stock = await storage.getAllStock();
        res.json(stock);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock", async (req, res) => {
    try {
      const validatedData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(validatedData);
      res.status(201).json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/stock/:id", async (req, res) => {
    try {
      const { quantity } = req.body;
      if (typeof quantity !== 'number') {
        return res.status(400).json({ error: "Quantity must be a number" });
      }
      const stock = await storage.updateStock(req.params.id, quantity);
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock/:id", async (req, res) => {
    try {
      await storage.deleteStock(req.params.id);
      res.status(204).send();
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

      if (startDate || endDate || type || productId || compartmentId || userId) {
        const filters: any = {};
        if (startDate) filters.startDate = new Date(startDate as string);
        if (endDate) filters.endDate = new Date(endDate as string);
        if (type) filters.type = type;
        if (productId) filters.productId = productId;
        if (compartmentId) filters.compartmentId = compartmentId;
        if (userId) filters.userId = userId;

        const movements = await storage.getMovementsByFilters(filters);
        res.json(movements);
      } else {
        const movements = await storage.getAllMovements();
        res.json(movements);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/compartment/:id", async (req, res) => {
    try {
      const movements = await storage.getMovementsByCompartment(req.params.id);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/product/:id", async (req, res) => {
    try {
      const movements = await storage.getMovementsByProduct(req.params.id);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/user/:id", async (req, res) => {
    try {
      const movements = await storage.getMovementsByUser(req.params.id);
      res.json(movements);
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
      
      // Convert compartment address to UUID
      const compartmentUuid = await supabaseStorage.getCompartmentIdByAddress(finalAddress);
      if (!compartmentUuid) {
        return res.status(400).json({ error: `Compartment with address '${finalAddress}' not found` });
      }
      
      // Get or create default user for movements (since user_id is required)
      const defaultUser = await supabaseStorage.getOrCreateDefaultUser();
      
      // Map fields to Supabase movements table structure
      const movementData = {
        user_id: user_id || defaultUser.id,      // Required field in movements table
        product_id: product_id,                  // 'product_id' na tabela movements
        compartment_id: compartmentUuid,         // UUID do compartimento
        tipo: finalTipo,
        qty: finalQuantity                       // 'qty' na tabela movements
      };
      
      const movement = await supabaseStorage.createMovement(movementData);
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stock/Balance endpoint for compatibility with external scripts
  app.get("/api/movements/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      
      // Get product stock from Supabase movements
      const totalStock = await supabaseStorage.getProductStock(productId);
      
      res.json({
        product_id: productId,
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
      const products = await storage.getAllProducts();
      const stock = await storage.getAllStock();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const movements = await storage.getMovementsByDateRange(thirtyDaysAgo, new Date());

      const compartmentsWithStock = new Set(stock.map(s => s.compartment_id)).size;

      const stats = {
        totalProducts: products.length,
        compartmentsWithStock,
        monthlyMovements: movements.length
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/stock", async (req, res) => {
    try {
      const { corridor, department } = req.query;
      
      // Get all stock with related data
      const compartments = await storage.getAllCompartmentsWithStock();
      
      let filteredData: any[] = [];
      compartments.forEach(compartment => {
        compartment.stock.forEach(stockItem => {
          filteredData.push({
            ...stockItem,
            compartments: compartment,
            products: stockItem.products
          });
        });
      });

      // Apply filters
      if (corridor && corridor !== 'all') {
        filteredData = filteredData.filter(item => 
          item.compartments.corredor === parseInt(corridor as string)
        );
      }

      if (department && department !== 'all') {
        filteredData = filteredData.filter(item => 
          item.products.departamento === department
        );
      }

      res.json(filteredData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
