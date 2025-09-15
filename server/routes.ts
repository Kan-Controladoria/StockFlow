import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
        products = await storage.searchProducts(search);
      } else {
        products = await storage.getAllProducts();
      }
      
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/search/:code", async (req, res) => {
    try {
      const product = await storage.findProductByCode(req.params.code);
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
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/subcategories", async (req, res) => {
    try {
      const { category } = req.query;
      const subcategories = await storage.getSubcategories(category as string);
      res.json(subcategories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
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
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, validatedData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
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
      const validatedData = insertMovementSchema.parse(req.body);
      
      // Handle stock update logic
      const existingStock = await storage.getStockByCompartmentAndProduct(
        validatedData.compartment_id, 
        validatedData.product_id
      );

      if (existingStock) {
        // Update existing stock
        const newQuantity = validatedData.tipo === 'ENTRADA' 
          ? existingStock.quantity + validatedData.qty
          : existingStock.quantity - validatedData.qty;

        if (newQuantity < 0) {
          return res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
        }

        if (newQuantity === 0) {
          await storage.deleteStock(existingStock.id);
        } else {
          await storage.updateStock(existingStock.id, newQuantity);
        }
      } else {
        // Create new stock entry (only for ENTRADA)
        if (validatedData.tipo === 'ENTRADA') {
          await storage.createStock({
            compartment_id: validatedData.compartment_id,
            product_id: validatedData.product_id,
            quantity: validatedData.qty,
          });
        } else {
          return res.status(400).json({ error: 'Produto não encontrado no compartimento' });
        }
      }

      // Create movement record
      const movement = await storage.createMovement(validatedData);
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
