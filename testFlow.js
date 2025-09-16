import fetch from "node-fetch";

// 🔹 Endereços dos endpoints (localhost para desenvolvimento)
const BASE_URL = "http://localhost:5000";
const ENDPOINTS = {
  products: ["/api/products"],
  movements: ["/api/movements"],
  compartments: ["/api/compartments"],
  profiles: ["/api/profiles"],
};

// User ID existente do sistema (obtido da API profiles)
const USER_ID = "c49a8014-fb46-4ff5-b307-349aae4cb723";

// Gerar códigos únicos para evitar conflitos de unique constraint
const timestamp = Date.now();
const produtos = [
  { code: `P001_${timestamp}`, name: "Produto Teste 1", compartment_address: "1A1" },
  { code: `P002_${timestamp}`, name: "Produto Teste 2", compartment_address: "1A2" },
  { code: `P003_${timestamp}`, name: "Produto Teste 3", compartment_address: "1A3" },
  { code: `P004_${timestamp}`, name: "Produto Teste 4", compartment_address: "1A4" },
  { code: `P005_${timestamp}`, name: "Produto Teste 5", compartment_address: "1A5" },
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
    console.log(`\n🔹 Testando ${p.name} (Compartimento: ${p.compartment_address})`);

    // 1. Criar produto com schema correto
    const produtoCriado = await tryFetch(ENDPOINTS.products, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo_barras: p.code,
        codigo_produto: p.code,
        produto: p.name,
        departamento: "bebidas",
        categoria: "teste",
        subcategoria: "teste",
      }),
    });

    if (!produtoCriado) {
      console.log(`❌ Não consegui criar ${p.name}`);
      continue;
    }

    console.log(`✅ Produto criado: ${p.name}`, produtoCriado);

    const productId = produtoCriado.id;
    if (!productId) {
      console.log(`⚠️ ID não encontrado para ${p.name}`);
      continue;
    }

    // 2. Entrada de 100 unidades (usando endereço de compartimento)
    const entradaResult = await tryFetch(ENDPOINTS.movements, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        product_id: productId,
        compartment_id: p.compartment_address, // Usa endereço que será convertido para BIGINT
        qty: 100,
        tipo: "ENTRADA",
      }),
    });
    
    if (entradaResult) {
      console.log(`📦 Entrada registrada: 100 unidades no compartimento ${p.compartment_address}`);
    } else {
      console.log(`❌ Falha na entrada de ${p.name}`);
    }

    // 3. Saída de 30 unidades (usando endereço de compartimento)
    const saidaResult = await tryFetch(ENDPOINTS.movements, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        product_id: productId,
        compartment_id: p.compartment_address, // Usa endereço que será convertido para BIGINT
        qty: 30,
        tipo: "SAIDA",
      }),
    });
    
    if (saidaResult) {
      console.log(`🚚 Saída registrada: 30 unidades do compartimento ${p.compartment_address}`);
    } else {
      console.log(`❌ Falha na saída de ${p.name}`);
    }

    // 4. Consulta saldo via API de stock
    let saldoData = null;
    try {
      const res = await fetch(`${BASE_URL}/api/stock?productId=${productId}`);
      if (res.ok) {
        saldoData = await res.json();
        console.log(`📊 Saldo atual de ${p.name}:`, saldoData);
      }
    } catch (err) {
      console.log(`❌ Erro ao consultar saldo: ${err.message}`);
    }

    resultados.push({
      produto: p.name,
      compartment_address: p.compartment_address,
      saldoEsperado: 70,
      saldoReal: saldoData?.quantity ?? "Não retornado",
    });
  }

  console.log("\n=== RELATÓRIO FINAL ===");
  resultados.forEach(r => {
    console.log(
      `🛒 ${r.produto} | Compartimento: ${r.compartment_address} | Esperado: ${r.saldoEsperado} | Real: ${r.saldoReal}`
    );
  });

  console.log("\n=== TESTE FINALIZADO ===");
}

runTest();
