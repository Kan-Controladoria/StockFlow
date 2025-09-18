import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabaseStorage } from "./supabaseStorage";

export async function registerRoutes(app: Express): Promise<Server> {

  // SECURITY: bloqueia rotas de debug em produção
  app.use('/api/debug', (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.log(`🔍 [DEBUG MODE] Debug route accessed: ${req.path}`);
    next();
  });

  // ========== PROFILES ==========
  app.get("/api/profiles", async (req, res) => {
    try {
      const profiles = await supabaseStorage.getAllProfiles();
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    res.json({
      id: req.params.id,
      nome: "Usuário Teste",
      email: "teste@superkan.com",
      role: "user"
    });
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      const { email, full_name } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "email é obrigatório" });
      }
      const profile = await supabaseStorage.createUser({
        email: email.trim(),
        full_name: full_name ? full_name.trim() : ""
      });
      res.status(201).json(profile);
    } catch (error: any) {
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        return res.status(409).json({ error: "Email já existe" });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // ========== PRODUCTS ==========
  app.get("/api/products", async (req, res) => {
    try {
      const { search } = req.query;
      const products = search
        ? await supabaseStorage.searchProducts(search as string)
        : await supabaseStorage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const product = await supabaseStorage.getProduct(productId);
      if (!product) return res.status(404).json({ error: "Produto não encontrado" });
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = await supabaseStorage.createProduct({
        codigo_barras: req.body.codigo_barras || "DEFAULT_BARCODE",
        produto: req.body.produto || req.body.nome,
        codigo_produto: req.body.codigo_produto || req.body.codigo,
        departamento: req.body.departamento,
        categoria: req.body.categoria,
        subcategoria: req.body.subcategoria
      });
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
      const updated = await supabaseStorage.updateProduct(id, req.body);
      if (!updated) return res.status(404).json({ error: "Produto não encontrado" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
      const deleted = await supabaseStorage.deleteProduct(id);
      if (!deleted) return res.status(404).json({ error: "Produto não encontrado" });
      res.json({ message: "Produto deletado", id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== COMPARTMENTS ==========
  app.get("/api/compartments", async (req, res) => {
    try {
      const compartments = await supabaseStorage.getAllCompartments();
      res.json(compartments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/compartments", async (req, res) => {
    try {
      const { corredor, linha, coluna } = req.body;
      if (!corredor || !linha || !coluna) {
        return res.status(400).json({ error: "Campos obrigatórios: corredor, linha, coluna" });
      }
      const address = `${corredor}${linha}${coluna}`;
      const compartment = await supabaseStorage.createCompartment({ corredor, linha, coluna, address });
      res.status(201).json(compartment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== STOCK ==========
  app.get("/api/stock", async (req, res) => {
    try {
      const { productId, compartmentId } = req.query;
      if (productId) {
        const qty = await supabaseStorage.getProductStock(parseInt(productId as string, 10));
        return res.json({ product_id: productId, quantity: qty });
      }
      if (compartmentId) {
        const stock = await supabaseStorage.getCompartmentStock(parseInt(compartmentId as string, 10));
        return res.json(stock);
      }
      const all = await supabaseStorage.getAllStock();
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock", async (req, res) => {
    try {
      const { compartment_id, product_id, quantity } = req.body;
      if (!compartment_id || !product_id || quantity === undefined) {
        return res.status(400).json({ error: "Campos obrigatórios: compartment_id, product_id, quantity" });
      }
      const stock = await supabaseStorage.createStock({ compartment_id, product_id, quantity });
      res.status(201).json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/stock/:id", async (req, res) => {
    try {
      const stockId = parseInt(req.params.id, 10);
      const { quantity } = req.body;
      const updated = await supabaseStorage.updateStockQuantity(stockId, quantity);
      if (!updated) return res.status(404).json({ error: "Registro não encontrado" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock/:id", async (req, res) => {
    try {
      const stockId = parseInt(req.params.id, 10);
      const deleted = await supabaseStorage.deleteStock(stockId);
      if (!deleted) return res.status(404).json({ error: "Registro não encontrado" });
      res.json({ message: "Registro deletado", id: stockId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MOVEMENTS ==========
  app.get("/api/movements", async (req, res) => {
    try {
      const filters = req.query;
      const movements = await supabaseStorage.getMovements(filters);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/movements", async (req, res) => {
    try {
      const movement = await supabaseStorage.createMovement(req.body);
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== REPORTS ==========
  app.get("/api/reports/stats", async (req, res) => {
    try {
      const stats = await supabaseStorage.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return createServer(app);
}
