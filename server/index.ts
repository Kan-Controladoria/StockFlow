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

    // Test schema compatibility using PostgreSQL pool methods instead of Supabase client
    log('🔍 Testing schema compatibility via PostgreSQL pool...');
    try {
      // Test basic product operations
      const existingProducts = await supabaseStorage.getAllProducts();
      log(`✅ Found ${existingProducts.length} existing products in PostgreSQL database`);
      
      // Test compartment operations  
      const existingCompartments = await supabaseStorage.getAllCompartments();
      log(`✅ Found ${existingCompartments.length} existing compartments in PostgreSQL database`);
      
      // Verify critical data or seed if missing
      log('🔍 Verifying critical data exists...');
      const identity = await supabaseStorage.verifyDatabaseIdentity();
      
      if (!identity.compartment_3b7_exists || !identity.product_6_exists) {
        log('⚠️ Critical data missing, seeding now...');
        await supabaseStorage.seedMissingCriticalData();
        log('✅ Critical data seeded successfully');
      } else {
        log('✅ Critical data verified - compartment 3B7 and product 6 exist');
      }
      
    } catch (testError: any) {
      throw new Error(`PostgreSQL schema validation failed: ${testError.message}`);
    }
    
    log('✅ PostgreSQL database schema validation completed - ready for operations');
    
    // Database schema info logging from storage layer (PostgreSQL pool)
    await supabaseStorage.logDatabaseSchema();
    
    log('✅ PostgreSQL database startup validation completed - ready for BIGINT compartment operations');
    
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
