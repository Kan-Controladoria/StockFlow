import express, { Request, Response } from "express";
import { createProduct, listProducts } from "./supabaseStorage";

const router = express.Router();

// ✅ Criar produto
router.post("/products", async (req: Request, res: Response) => {
  try {
    const { codigo_produto, produto, codigo_barras, departamento, categoria, subcategoria } = req.body;

    // validação mínima
    if (!codigo_produto || !produto) {
      return res.status(400).json({
        error: "Os campos 'codigo_produto' e 'produto' são obrigatórios."
      });
    }

    const newProduct = await createProduct({
      codigo_produto,
      produto,
      codigo_barras,
      departamento,
      categoria,
      subcategoria
    });

    return res.status(201).json(newProduct);
  } catch (err: any) {
    console.error("❌ Erro na rota POST /products:", err.message);
    return res.status(500).json({ error: "Erro interno ao criar produto." });
  }
});

// ✅ Listar produtos
router.get("/products", async (_req: Request, res: Response) => {
  try {
    const products = await listProducts();
    return res.json(products);
  } catch (err: any) {
    console.error("❌ Erro na rota GET /products:", err.message);
    return res.status(500).json({ error: "Erro interno ao listar produtos." });
  }
});

export default router;
