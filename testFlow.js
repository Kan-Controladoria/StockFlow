import fetch from "node-fetch";

const BASE_URL = "https://stock-flow-controladoriasu.replit.app";

async function runTest() {
  console.log("=== INICIANDO TESTE COMPLETO ===");

  try {
    // 1. Criar produto
    const productRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode: "999999999",
        code: "TST001",
        name: "Produto Teste Automático",
        department: "bebidas",
        category: "Refrigerantes",
        subcategory: "cola",
      }),
    });

    if (!productRes.ok) {
      console.error("❌ Erro ao criar produto:", productRes.status);
      return;
    }

    const product = await productRes.json();
    console.log("✅ Produto criado:", product);

    // 2. Registrar entrada (10 unidades no compartimento 1A1)
    const entryRes = await fetch(`${BASE_URL}/api/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id,
        compartment: "1A1",
        quantity: 10,
        type: "entrada",
      }),
    });

    const entry = await entryRes.json();
    console.log("📦 Entrada registrada:", entry);

    // 3. Registrar saída (4 unidades no mesmo compartimento)
    const exitRes = await fetch(`${BASE_URL}/api/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id,
        compartment: "1A1",
        quantity: 4,
        type: "saida",
      }),
    });

    const exit = await exitRes.json();
    console.log("📤 Saída registrada:", exit);

    // 4. Listar movimentos
    const movementsRes = await fetch(`${BASE_URL}/api/movements`);
    const movements = await movementsRes.json();
    console.log("📑 Relatório de movimentos:", movements);

  } catch (err) {
    console.error("❌ Erro durante o teste:", err.message);
  }

  console.log("=== TESTE FINALIZADO ===");
}

runTest();
