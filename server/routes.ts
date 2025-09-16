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
  
  // Authentication/Profile routes
  app.get("/api/profiles", async (req, res) => {
    try {
      res.status(501).json({ error: 'Profiles not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      res.status(501).json({ error: 'Profile lookup not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      res.status(501).json({ error: 'Profile creation not implemented with Supabase yet' });
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
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ error: "Invalid product ID" });
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
      // Atualização via Supabase - implementar se necessário
      res.status(501).json({ error: 'Update not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      // Exclusão via Supabase - implementar se necessário
      res.status(501).json({ error: 'Delete not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Compartment routes
  app.get("/api/compartments", async (req, res) => {
    try {
      res.status(501).json({ error: 'Compartments not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/compartments/with-stock", async (req, res) => {
    try {
      res.status(501).json({ error: 'Compartments with stock not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/compartments/:id", async (req, res) => {
    try {
      res.status(501).json({ error: 'Compartment lookup not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/compartments", async (req, res) => {
    try {
      res.status(501).json({ error: 'Compartment creation not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stock routes
  app.get("/api/stock", async (req, res) => {
    try {
      const { compartmentId, productId } = req.query;
      
      if (productId) {
        // Use Supabase method for product stock
        const productIdNum = parseInt(productId as string, 10);
        if (isNaN(productIdNum)) {
          return res.status(400).json({ error: "Invalid product ID" });
        }
        const stock = await supabaseStorage.getProductStock(productIdNum);
        res.json({ product_id: productId, quantity: stock });
      } else {
        res.status(501).json({ error: 'Stock queries not implemented with Supabase yet' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock", async (req, res) => {
    try {
      res.status(501).json({ error: 'Stock creation not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/stock/:id", async (req, res) => {
    try {
      res.status(501).json({ error: 'Stock update not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock/:id", async (req, res) => {
    try {
      res.status(501).json({ error: 'Stock deletion not implemented with Supabase yet' });
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
        res.status(501).json({ error: 'Filtered movements not implemented with Supabase yet' });
      } else {
        const movements = await supabaseStorage.getAllMovements();
        res.json(movements);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/compartment/:id", async (req, res) => {
    try {
      res.status(501).json({ error: 'Movements by compartment not implemented with Supabase yet' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/product/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }
      const movements = await supabaseStorage.getMovementsByProduct(productId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/movements/user/:id", async (req, res) => {
    try {
      res.status(501).json({ error: 'Movements by user not implemented with Supabase yet' });
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
      const productIdNum = parseInt(productId, 10);
      if (isNaN(productIdNum)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }
      
      // Get product stock from Supabase movements
      const totalStock = await supabaseStorage.getProductStock(productIdNum);
      
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
