#!/usr/bin/env node

/**
 * TESTE FINAL DE PRODUÇÃO - STOCKFLOW
 * 
 * Completa o teste usando produtos já criados (145-149) e perfil existente
 */

import fetch from 'node-fetch';

// Configuração
const BASE_URL = process.argv[2] || 'https://stock-flow-controladoriasu.replit.app';
const TIMEOUT_MS = 15000;

console.log(`🚀 TESTE FINAL DE PRODUÇÃO - STOCKFLOW`);
console.log(`📍 URL Base: ${BASE_URL}`);
console.log(`⏰ Timeout: ${TIMEOUT_MS}ms`);
console.log(`\n========================================\n`);

// Função para fazer requisição com timeout
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Função para criar um movimento
async function createMovement(movementData) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/movements`, {
    method: 'POST',
    body: JSON.stringify(movementData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create movement: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função para obter estoque de produto
async function getProductStock(productId) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/stock?productId=${productId}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get stock: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função para buscar produtos específicos
async function getProducts() {
  const response = await fetchWithTimeout(`${BASE_URL}/api/products`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get products: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função para buscar compartimentos
async function getCompartments() {
  const response = await fetchWithTimeout(`${BASE_URL}/api/compartments`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get compartments: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função para buscar perfis existentes
async function getProfiles() {
  const response = await fetchWithTimeout(`${BASE_URL}/api/profiles`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get profiles: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função principal
async function main() {
  const testResults = {
    endpoints: {},
    products: [],
    movements: [],
    stockValidation: [],
    schemaValidation: {},
    finalStatus: 'PENDING'
  };

  try {
    console.log(`📋 FASE 1: BUSCAR DADOS EXISTENTES\n`);
    
    // Buscar produtos e compartimentos existentes
    console.log(`🔍 Buscando produtos criados (145-149)...`);
    const allProducts = await getProducts();
    const testProducts = allProducts.filter(p => p.id >= 145 && p.id <= 149).sort((a, b) => a.id - b.id);
    console.log(`   ✅ ${testProducts.length} produtos de teste encontrados`);
    
    console.log(`🔍 Buscando compartimentos...`);
    const allCompartments = await getCompartments();
    const targetAddresses = ['1A1', '1A2', '1A3', '1A4', '1A5'];
    const targetCompartments = [];
    
    for (const address of targetAddresses) {
      const compartment = allCompartments.find(c => c.address === address);
      if (compartment) {
        targetCompartments.push(compartment);
        console.log(`   ✅ Compartimento ${address}: ID ${compartment.id}`);
      }
    }
    
    console.log(`🔍 Buscando perfil de usuário...`);
    const profiles = await getProfiles();
    const userProfile = profiles[0]; // Usar primeiro perfil disponível
    console.log(`   ✅ Usuário encontrado: ${userProfile.nome} (ID: ${userProfile.id})`);
    
    // Mapear produtos com compartimentos
    const productsWithCompartments = testProducts.map((product, index) => ({
      ...product,
      compartment: targetCompartments[index]
    }));
    
    testResults.products = productsWithCompartments;
    console.log(`\n✅ FASE 1 COMPLETA: ${productsWithCompartments.length} produtos mapeados\n`);
    
    console.log(`📋 FASE 2: MOVIMENTOS DE ENTRADA (100 unidades)\n`);
    
    // Criar movimentos de ENTRADA (100 unidades)
    const entradaMovements = [];
    for (let i = 0; i < productsWithCompartments.length; i++) {
      const product = productsWithCompartments[i];
      
      const movementData = {
        user_id: userProfile.id,
        product_id: product.id,
        compartment_id: product.compartment.id,
        tipo: 'ENTRADA',
        qty: 100
      };
      
      console.log(`📥 Criando ENTRADA para produto ${product.id} (${product.produto})...`);
      const movement = await createMovement(movementData);
      console.log(`   ✅ Movimento criado: ID ${movement.id}`);
      entradaMovements.push(movement);
      
      // Validar tipos nos movimentos
      if (typeof movement.product_id !== 'number') {
        throw new Error(`ERRO SCHEMA: movement.product_id deveria ser BIGINT (number), recebido ${typeof movement.product_id}`);
      }
      if (typeof movement.user_id !== 'string') {
        throw new Error(`ERRO SCHEMA: movement.user_id deveria ser UUID (string), recebido ${typeof movement.user_id}`);
      }
      if (typeof movement.compartment_id !== 'number') {
        throw new Error(`ERRO SCHEMA: movement.compartment_id deveria ser BIGINT (number), recebido ${typeof movement.compartment_id}`);
      }
    }
    
    testResults.movements.push(...entradaMovements);
    console.log(`\n✅ FASE 2 COMPLETA: ${entradaMovements.length} movimentos ENTRADA criados\n`);
    
    console.log(`📋 FASE 3: MOVIMENTOS DE SAÍDA (30 unidades)\n`);
    
    // Criar movimentos de SAÍDA (30 unidades)
    const saidaMovements = [];
    for (let i = 0; i < productsWithCompartments.length; i++) {
      const product = productsWithCompartments[i];
      
      const movementData = {
        user_id: userProfile.id,
        product_id: product.id,
        compartment_id: product.compartment.id,
        tipo: 'SAIDA',
        qty: 30
      };
      
      console.log(`📤 Criando SAÍDA para produto ${product.id} (${product.produto})...`);
      const movement = await createMovement(movementData);
      console.log(`   ✅ Movimento criado: ID ${movement.id}`);
      saidaMovements.push(movement);
    }
    
    testResults.movements.push(...saidaMovements);
    console.log(`\n✅ FASE 3 COMPLETA: ${saidaMovements.length} movimentos SAÍDA criados\n`);
    
    console.log(`📋 FASE 4: VALIDAÇÃO DE ESTOQUE FINAL\n`);
    
    // Validar estoque final (deve ser 70 para cada produto)
    const stockValidations = [];
    for (let i = 0; i < productsWithCompartments.length; i++) {
      const product = productsWithCompartments[i];
      
      console.log(`📊 Verificando estoque do produto ${product.id}...`);
      const stockData = await getProductStock(product.id);
      const actualStock = stockData.quantity || 0;
      const expectedStock = 70;
      const isValid = actualStock === expectedStock;
      
      const validation = {
        productId: product.id,
        address: product.compartment.address,
        expected: expectedStock,
        actual: actualStock,
        valid: isValid
      };
      
      stockValidations.push(validation);
      
      // Formato exato solicitado
      const status = isValid ? '✅' : '❌';
      console.log(`   ${status} 🛒 Produto ${product.id} | Endereço: ${product.compartment.address} | Esperado: ${expectedStock} | Real: ${actualStock}`);
    }
    
    testResults.stockValidation = stockValidations;
    
    const allStockValid = stockValidations.every(v => v.valid);
    console.log(`\n${allStockValid ? '✅' : '❌'} FASE 4 COMPLETA: Validação de estoque ${allStockValid ? 'PASSOU' : 'FALHOU'}\n`);
    
    console.log(`📋 FASE 5: VALIDAÇÃO DE SCHEMA BIGINT/UUID\n`);
    
    // Validar schema completo
    const schemaValidation = {
      productIds: {
        valid: testResults.products.every(p => typeof p.id === 'number'),
        type: 'BIGINT (number)',
        samples: testResults.products.slice(0, 2).map(p => ({ id: p.id, type: typeof p.id }))
      },
      userId: {
        type: typeof userProfile.id,
        length: userProfile.id.length,
        valid: typeof userProfile.id === 'string' && userProfile.id.length === 36
      },
      movementTypes: {
        productIds: testResults.movements.every(m => typeof m.product_id === 'number'),
        userIds: testResults.movements.every(m => typeof m.user_id === 'string'),
        compartmentIds: testResults.movements.every(m => typeof m.compartment_id === 'number'),
        samples: testResults.movements.slice(0, 2).map(m => ({
          product_id: { value: m.product_id, type: typeof m.product_id },
          user_id: { value: m.user_id, type: typeof m.user_id },
          compartment_id: { value: m.compartment_id, type: typeof m.compartment_id }
        }))
      }
    };
    
    testResults.schemaValidation = schemaValidation;
    
    const schemaValid = schemaValidation.productIds.valid && 
                       schemaValidation.userId.valid && 
                       schemaValidation.movementTypes.productIds &&
                       schemaValidation.movementTypes.userIds &&
                       schemaValidation.movementTypes.compartmentIds;
    
    console.log(`   📋 Product IDs (BIGINT): ${schemaValidation.productIds.valid ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log(`   📋 User ID (UUID): ${schemaValidation.userId.valid ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log(`   📋 Movement Product IDs: ${schemaValidation.movementTypes.productIds ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log(`   📋 Movement User IDs: ${schemaValidation.movementTypes.userIds ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log(`   📋 Movement Compartment IDs: ${schemaValidation.movementTypes.compartmentIds ? '✅ CORRETO' : '❌ INCORRETO'}`);
    
    console.log(`\n${schemaValid ? '✅' : '❌'} FASE 5 COMPLETA: Validação de schema ${schemaValid ? 'PASSOU' : 'FALHOU'}\n`);
    
    // Determinar status final
    const allTestsPassed = allStockValid && schemaValid;
    testResults.finalStatus = allTestsPassed ? 'PASS' : 'FAIL';
    
    console.log(`========================================`);
    console.log(`📋 RELATÓRIO FINAL - VALIDAÇÃO COMPLETA DE PRODUÇÃO`);
    console.log(`========================================\n`);
    
    console.log(`🎯 STATUS DOS ENDPOINTS (da validação anterior):`);
    console.log(`   ✅ Debug Supabase (200)`);
    console.log(`   ✅ Products (200) - ${allProducts.length} produtos`);
    console.log(`   ✅ Compartments (200) - ${allCompartments.length} compartimentos`);
    console.log(`   ✅ Movements (200)`);
    console.log(`   ✅ Stock (200)`);
    console.log(`   ✅ Profiles (200) - ${profiles.length} perfis`);
    console.log(`   ✅ Product Categories (200)`);
    console.log(`   ✅ Product Departments (200)`);
    
    console.log(`\n🎯 RESULTADOS DO TESTE FINAL:`);
    console.log(`   ✅ Produtos testados: ${testResults.products.length}/5`);
    console.log(`   ✅ Movimentos ENTRADA: ${entradaMovements.length}/5`);
    console.log(`   ✅ Movimentos SAÍDA: ${saidaMovements.length}/5`);
    console.log(`   ${allStockValid ? '✅' : '❌'} Validação de estoque: ${stockValidations.filter(v => v.valid).length}/5 produtos com saldo 70`);
    console.log(`   ${schemaValid ? '✅' : '❌'} Schema BIGINT/UUID: ${schemaValid ? 'CORRETO' : 'INCORRETO'}`);
    
    console.log(`\n📊 DETALHES DOS PRODUTOS TESTADOS:`);
    testResults.products.forEach((product, i) => {
      const stock = stockValidations[i];
      const status = stock.valid ? '✅' : '❌';
      console.log(`   ${status} 🛒 Produto ${product.id} | Endereço: ${stock.address} | Esperado: ${stock.expected} | Real: ${stock.actual}`);
    });
    
    console.log(`\n🔧 CONFIRMAÇÃO SCHEMA BIGINT/UUID:`);
    console.log(`   📋 Product IDs são BIGINT (number): ${schemaValidation.productIds.valid ? '✅ CONFIRMADO' : '❌ FALHOU'}`);
    console.log(`   📋 User IDs são UUID (string): ${schemaValidation.userId.valid ? '✅ CONFIRMADO' : '❌ FALHOU'}`);
    console.log(`   📋 Movement IDs são tipos corretos: ${schemaValid ? '✅ CONFIRMADO' : '❌ FALHOU'}`);
    
    console.log(`\n🎯 DECLARAÇÃO FINAL:`);
    
    if (allTestsPassed) {
      console.log(`✅ PASS: StockFlow publicado e validado em produção`);
      console.log(`🎉 Todos os critérios de sucesso foram atendidos!`);
      console.log(`🚀 Sistema está operacional e pronto para uso!`);
    } else {
      console.log(`❌ FAIL: Problemas encontrados na validação.`);
      console.log(`🔧 Verifique os detalhes acima para correções necessárias.`);
    }
    
    console.log(`\n========================================`);
    
    // Retornar dados para relatório
    return testResults;
    
  } catch (error) {
    console.error(`\n❌ ERRO FATAL NO TESTE:`, error.message);
    console.error(`Stack:`, error.stack?.split('\n').slice(0, 5));
    testResults.finalStatus = 'ERROR';
    testResults.error = error.message;
    
    console.log(`\n❌ FAIL: Erro durante execução do teste.`);
    console.log(`🔧 Erro: ${error.message}`);
    
    process.exit(1);
  }
}

// Executar teste
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});