import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000/api"; // pode ser 3000 ou 3001, já te explico como checar

async function runTest() {
  try {
    console.log("=== INICIANDO TESTE COMPLETO ===");

    // 1. Criar produto
    const productRes = await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode: "999999999",
        code: "TST001",
        name: "Produto Teste Automático",
        department: "bebidas",
        category: "refrigerantes",
        subcategory: "cola",
      }),
    });
    const product = await productRes.json();
    console.log("✅ Produto criado:", product);

    // 2. Registrar entrada (10 unidades no compartimento 1A1)
    const entryRes = await fetch(`${BASE_URL}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id,
        quantity: 10,
        code: "1A1",
        type: "entrada",
      }),
    });
    const entry = await entryRes.json();
    console.log("✅ Entrada registrada:", entry);

    // 3. Registrar saída (4 unidades do mesmo compartimento)
    const exitRes = await fetch(`${BASE_URL}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id,
        quantity: 4,
        code: "1A1",
        type: "saida",
      }),
    });
    const exit = await exitRes.json();
    console.log("✅ Saída registrada:", exit);

    // 4. Consultar movimentos do produto
    const movementsRes = await fetch(
      `${BASE_URL}/movements?product_id=${product.id}`,
    );
    const movements = await movementsRes.json();
    console.log("📊 Movimentos registrados:", movements);

    // 5. Calcular saldo final
    const saldo = movements.reduce((acc, mov) => {
      return mov.type === "entrada" ? acc + mov.quantity : acc - mov.quantity;
    }, 0);

    console.log("📌 SALDO FINAL DO PRODUTO:", product.name, "=", saldo);

    console.log("=== TESTE CONCLUÍDO ===");
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  }
}

runTest();
