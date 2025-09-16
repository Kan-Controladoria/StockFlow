import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, uuid, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Profiles table (linked to Supabase Auth users)
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  full_name: text("full_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Products table with 6 required fields
export const products = pgTable("products", {
  id: bigint("id", { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  codigo_barras: text("codigo_barras").notNull().unique(),
  codigo_produto: text("codigo_produto").notNull().unique(),
  produto: text("produto").notNull(),
  departamento: text("departamento").notNull(),
  categoria: text("categoria").notNull(),
  subcategoria: text("subcategoria").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Compartments table - 150 fixed compartments (5 corridors x 3 rows x 10 columns)
export const compartments = pgTable("compartments", {
  id: bigint("id", { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  address: text("address").notNull().unique(), // format: 1A1, 1A2, etc.
  corredor: integer("corredor").notNull(),
  linha: text("linha").notNull(), // A, B, C
  coluna: integer("coluna").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Stock by compartment table - tracks quantity of each product in each compartment
export const stock_by_compartment = pgTable("stock_by_compartment", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  compartment_id: bigint("compartment_id", { mode: 'number' }).notNull().references(() => compartments.id),
  product_id: bigint("product_id", { mode: 'number' }).notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Movements table - tracks all inventory movements (entries and exits)
export const movements = pgTable("movements", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => profiles.id),
  product_id: bigint("product_id", { mode: 'number' }).notNull().references(() => products.id),
  compartment_id: bigint("compartment_id", { mode: 'number' }).notNull().references(() => compartments.id),
  tipo: text("tipo", { enum: ["ENTRADA", "SAIDA"] }).notNull(),
  qty: integer("qty").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas for validation
export const insertProfileSchema = createInsertSchema(profiles).pick({
  email: true,
  full_name: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  codigo_barras: true,
  codigo_produto: true,
  produto: true,
  departamento: true,
  categoria: true,
  subcategoria: true,
});

export const insertCompartmentSchema = createInsertSchema(compartments).pick({
  address: true,
  corredor: true,
  linha: true,
  coluna: true,
});

export const insertStockSchema = createInsertSchema(stock_by_compartment).pick({
  compartment_id: true,
  product_id: true,
  quantity: true,
});

export const insertMovementSchema = createInsertSchema(movements).pick({
  user_id: true,
  product_id: true,
  compartment_id: true,
  tipo: true,
  qty: true,
});

// Types
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertCompartment = z.infer<typeof insertCompartmentSchema>;
export type Compartment = typeof compartments.$inferSelect;

export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stock_by_compartment.$inferSelect;

export type InsertMovement = z.infer<typeof insertMovementSchema>;
export type Movement = typeof movements.$inferSelect;

// Extended types for complex queries
export type ProductWithStock = Product & {
  stock?: Stock[]
};

export type CompartmentWithStock = Compartment & {
  stock: (Stock & {
    products: Product
  })[]
};

export type MovementWithDetails = Movement & {
  products: Product;
  compartments: Compartment;
  profiles: Profile;
};