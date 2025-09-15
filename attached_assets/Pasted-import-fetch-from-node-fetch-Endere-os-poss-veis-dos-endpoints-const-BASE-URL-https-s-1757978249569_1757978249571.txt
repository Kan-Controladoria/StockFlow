import fetch from "node-fetch";

// 🔹 Endereços possíveis dos endpoints
const BASE_URL = "https://stock-flow-controladoriasu.replit.app";
const ENDPOINTS = {
  products: ["/api/products", "/products"],
  movements: ["/api/movements", "/movements"],
};

// Produtos fictícios
const produtos = [
  { code: "P001", name: "Produto Teste 1", corredor: "1A1" },
  { code: "P002", name: "Produto Teste 2", corredor: "2A1" },
  { code: "P003", name: "Produto Teste 3", corredor: "3A1" },
  { code: "P004", name: "Produto Teste 4", corredor: "4A1" },
  { code: "P005", name: "Produto Teste 5", corredor: "5A1" },
];

// Função auxiliar: tenta um endpoint, se falhar testa o próximo
async function tryFetch(endpoints, options) {
  for (let path of endpoints) {
    const url = `${BASE_URL}${path}`;
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        console.log(`⚠️ Erro ${res.status} em ${url}`);
        continue; // tenta o próximo endpoint
      }
      return await res.json();
    } catch (err) {
      console.log(`❌ Falha em ${url}: ${err.message}`);
    }
  }
  return null; // todos falharam
}

async function runTest() {
  console.log("=== INICIANDO TESTE COMPLETO ===");

  const resultados = [];

  for (let p of produtos) {
    console.log(`\n🔹 Testando ${p.name} (${p.corredor})`);

    // 1. Criar produto
    const produtoCriado = await tryFetch(ENDPOINTS.products, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode: p.code,
        code: p.code,
        name: p.name,
        department: "bebidas",
        category: "teste",
        subcategory: "teste",
      }),
    });

    if (!produtoCriado) {
      console.log(`❌ Não consegui criar ${p.name}`);
      continue;
    }

    console.log(`✅ Produto criado: ${p.name}`, produtoCriado);

    const productId = produtoCriado.id || produtoCriado.product?.id;
    if (!productId) {
      console.log(`⚠️ ID não encontrado para ${p.name}`);
      continue;
    }

    // 2. Entrada de 100 unidades
    await tryFetch(ENDPOINTS.movements, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        compartment_id: p.corredor,
        qty: 100,
        type: "entrada",
      }),
    });
    console.log(`📦 Entrada registrada: 100 unidades em ${p.corredor}`);

    // 3. Saída de 30 unidades
    await tryFetch(ENDPOINTS.movements, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        compartment_id: p.corredor,
        qty: 30,
        type: "saida",
      }),
    });
    console.log(`🚚 Saída registrada: 30 unidades em ${p.corredor}`);

    // 4. Consulta saldo (tentando GET)
    let saldoData = null;
    for (let path of ENDPOINTS.movements) {
      try {
        const res = await fetch(`${BASE_URL}${path}/${productId}`);
        if (res.ok) {
          saldoData = await res.json();
          break;
        }
      } catch (err) {
        console.log(`❌ Erro ao consultar saldo em ${path}: ${err.message}`);
      }
    }

    resultados.push({
      produto: p.name,
      corredor: p.corredor,
      saldoEsperado: 70,
      saldoReal: saldoData?.saldo ?? "Não retornado",
    });
  }

  console.log("\n=== RELATÓRIO FINAL ===");
  resultados.forEach(r => {
    console.log(
      `🛒 ${r.produto} | Corredor: ${r.corredor} | Esperado: ${r.saldoEsperado} | Real: ${r.saldoReal}`
    );
  });

  console.log("\n=== TESTE FINALIZADO ===");
}

runTest();
