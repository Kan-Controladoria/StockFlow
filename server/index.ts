import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabaseStorage } from "./supabaseStorage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Startup validation to ensure correct Supabase project connection
async function validateSupabaseSchema() {
  try {
    log('🔍 Validating Supabase schema...');
    
    // Try to get a product to check if ID format is integer (serial IDs)
    const { data: products, error } = await supabaseStorage.supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (error) {
      throw new Error(`Failed to query products table: ${error.message}`);
    }

    // If we have products, check the ID format
    if (products && products.length > 0) {
      const firstProduct = products[0];
      const idType = typeof firstProduct.id;
      
      if (idType !== 'number') {
        throw new Error(
          `❌ WRONG SUPABASE PROJECT: products.id is '${idType}' with value '${firstProduct.id}', expected integer format\n` +
          `   This indicates connection to UUID-schema project instead of integer/serial schema.\n` +
          `   Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY point to the integer-schema project.\n` +
          `   Expected integer format: numeric values like 1, 2, 3, etc.`
        );
      }
    }

    // Test schema compatibility by attempting to create a test product with all required fields
    const testProduct = {
      codigo_barras: 'TEST_VALIDATION_BARCODE',
      codigo_produto: 'TEST_VALIDATION_CODE', 
      produto: 'SCHEMA_VALIDATION_TEST',
      departamento: 'TEST_DEPT',
      categoria: 'TEST_CAT',
      subcategoria: 'TEST_SUBCAT'
    };
    
    try {
      const { data: createdProduct, error: createError } = await supabaseStorage.supabase
        .from('products')
        .insert(testProduct)
        .select('id')
        .single();
      
      if (createError) {
        // Check specific error types
        if (createError.message.includes('codigo_barras') && createError.code === '42703') {
          throw new Error(
            `❌ SCHEMA MISMATCH: Column 'codigo_barras' missing in products table\n` +
            `   This indicates connection to incompatible project schema.\n` +
            `   Expected schema includes: codigo_barras, codigo_produto, produto, departamento, categoria, subcategoria`
          );
        }
        throw new Error(`Schema validation failed: ${createError.message}`);
      }
      
      // Clean up test product
      if (createdProduct?.id) {
        await supabaseStorage.supabase
          .from('products')
          .delete()
          .eq('id', createdProduct.id);
      }
      
      // Verify the created product has integer format ID
      const isInteger = typeof createdProduct.id === 'number' && Number.isInteger(createdProduct.id);
      
      if (!isInteger) {
        throw new Error(
          `❌ WRONG PROJECT CONFIRMED: Test product created with non-integer ID '${createdProduct.id}'\n` +
          `   Please update environment variables to point to the correct integer-schema Supabase project.`
        );
      }
      
    } catch (validationError: any) {
      throw validationError;
    }

    log('✅ Supabase schema validation passed - integer ID project confirmed');
    
  } catch (error: any) {
    log(`💥 STARTUP FAILED: ${error.message}`);
    process.exit(1);
  }
}

(async () => {
  await validateSupabaseSchema();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
