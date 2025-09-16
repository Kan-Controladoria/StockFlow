#!/usr/bin/env node

/**
 * TESTE COMPLETO DE PRODUÇÃO - STOCKFLOW (CORRIGIDO)
 * 
 * Este script executa o teste completo com 5 produtos:
 * - Cria 5 produtos em endereços específicos
 * - Adiciona 100 unidades (ENTRADA)
 * - Remove 30 unidades (SAÍDA)
 * - Verifica saldo final = 70
 * - Valida tipos BIGINT/UUID
 */

import fetch from 'node-fetch';

// Configuração
const BASE_URL = process.argv[2] || 'https://stock-flow-controladoriasu.replit.app';
const TIMEOUT_MS = 15000;

console.log(`🚀 TESTE COMPLETO DE PRODUÇÃO - STOCKFLOW`);
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

// Função para criar um produto
async function createProduct(productData) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/products`, {
    method: 'POST',
    body: JSON.stringify(productData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create product: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função para criar um perfil de usuário
async function createProfile(profileData) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/profiles`, {
    method: 'POST',
    body: JSON.stringify(profileData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create profile: ${response.status} - ${error}`);
  }
  
  return await response.json();
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

// Função para buscar compartimentos existentes
async function getCompartments() {
  const response = await fetchWithTimeout(`${BASE_URL}/api/compartments`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get compartments: ${response.status} - ${error}`);
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
    console.log(`📋 FASE 1: BUSCAR COMPARTIMENTOS EXISTENTES\n`);
    
    // Buscar compartimentos existentes primeiro
    console.log(`📦 Buscando compartimentos existentes...`);
    const existingCompartments = await getCompartments();
    console.log(`   ✅ ${existingCompartments.length} compartimentos encontrados`);
    
    // Buscar compartimentos com endereços 1A1 a 1A5
    const targetAddresses = ['1A1', '1A2', '1A3', '1A4', '1A5'];
    const targetCompartments = [];
    
    for (const address of targetAddresses) {
      const compartment = existingCompartments.find(c => c.address === address);
      if (compartment) {
        targetCompartments.push(compartment);
        console.log(`   ✅ Compartimento ${address} encontrado: ID ${compartment.id}`);
      } else {
        console.log(`   ⚠️  Compartimento ${address} não encontrado`);
      }
    }
    
    if (targetCompartments.length < 5) {
      throw new Error(`Apenas ${targetCompartments.length}/5 compartimentos necessários encontrados. Execute uma inicialização de dados primeiro.`);
    }
    
    console.log(`\n✅ FASE 1 COMPLETA: ${targetCompartments.length} compartimentos disponíveis\n`);
    
    console.log(`📋 FASE 2: CRIAÇÃO DE PRODUTOS DE TESTE\n`);
    
    // Criar 5 produtos de teste
    const createdProducts = [];
    
    for (let i = 0; i < 5; i++) {
      const compartment = targetCompartments[i];
      
      // Criar produto
      const productData = {
        codigo_barras: `TESTE${Date.now()}${i}`,
        produto: `Produto Teste ${i + 1}`,
        codigo_produto: `TEST-${i + 1}`,
        departamento: 'TESTE',
        categoria: 'TESTE',
        subcategoria: 'VALIDACAO'
      };
      
      console.log(`🛒 Criando produto ${i + 1}...`);
      const product = await createProduct(productData);
      console.log(`   ✅ Produto criado: ID ${product.id} (${typeof product.id})`);
      createdProducts.push({ ...product, compartment });
      
      // Validar tipo BIGINT do product.id
      if (typeof product.id !== 'number' || !Number.isInteger(product.id)) {
        throw new Error(`ERRO SCHEMA: product.id deveria ser BIGINT (number), recebido ${typeof product.id}`);
      }
    }
    
    testResults.products = createdProducts;
    console.log(`\n✅ FASE 2 COMPLETA: ${createdProducts.length} produtos criados\n`);
    
    console.log(`📋 FASE 3: CRIAÇÃO DE PERFIL DE USUÁRIO\n`);
    
    // Criar perfil de usuário para os movimentos
    let userProfile;
    try {
      const profileData = {
        email: `teste.producao.${Date.now()}@stockflow.com`,
        full_name: 'Usuario Teste Producao'
      };
      
      console.log(`👤 Criando perfil de usuário...`);
      userProfile = await createProfile(profileData);
      console.log(`   ✅ Perfil criado: ID ${userProfile.id} (${typeof userProfile.id})`);
      
      // Validar tipo UUID do user.id
      if (typeof userProfile.id !== 'string' || userProfile.id.length !== 36) {
        throw new Error(`ERRO SCHEMA: user.id deveria ser UUID (string 36 chars), recebido ${typeof userProfile.id} (${userProfile.id.length} chars)`);
      }
    } catch (error) {
      if (error.message.includes('409') || error.message.includes('already exists')) {
        console.log(`   ⚠️  Email já existe, buscando perfil existente...`);
        const response = await fetchWithTimeout(`${BASE_URL}/api/profiles`);
        const profiles = await response.json();
        userProfile = profiles[0]; // Usar primeiro perfil disponível
        console.log(`   ℹ️  Usando perfil existente: ID ${userProfile.id}`);
      } else {
        throw error;
      }
    }
    
    testResults.schemaValidation.userId = {
      type: typeof userProfile.id,
      length: userProfile.id.length,
      valid: typeof userProfile.id === 'string' && userProfile.id.length === 36
    };
    
    console.log(`\n✅ FASE 3 COMPLETA: Perfil ${userProfile.id} disponível\n`);
    
    console.log(`📋 FASE 4: MOVIMENTOS DE ENTRADA (100 unidades)\n`);
    
    // Fase 4: Criar movimentos de ENTRADA (100 unidades para cada produto)
    const entradaMovements = [];
    for (let i = 0; i < createdProducts.length; i++) {
      const product = createdProducts[i];
      
      // Usar campos corretos do schema: 'tipo' e 'qty'
      const movementData = {
        user_id: userProfile.id,
        product_id: product.id,
        compartment_id: product.compartment.id,
        tipo: 'ENTRADA', // Campo correto do schema
        qty: 100 // Campo correto do schema
      };
      
      console.log(`📥 Criando movimento ENTRADA para produto ${product.id}...`);
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
    console.log(`\n✅ FASE 4 COMPLETA: ${entradaMovements.length} movimentos ENTRADA criados\n`);
    
    console.log(`📋 FASE 5: MOVIMENTOS DE SAÍDA (30 unidades)\n`);
    
    // Fase 5: Criar movimentos de SAÍDA (30 unidades para cada produto)
    const saidaMovements = [];
    for (let i = 0; i < createdProducts.length; i++) {
      const product = createdProducts[i];
      
      // Usar campos corretos do schema: 'tipo' e 'qty'
      const movementData = {
        user_id: userProfile.id,
        product_id: product.id,
        compartment_id: product.compartment.id,
        tipo: 'SAIDA', // Campo correto do schema
        qty: 30 // Campo correto do schema
      };
      
      console.log(`📤 Criando movimento SAÍDA para produto ${product.id}...`);
      const movement = await createMovement(movementData);
      console.log(`   ✅ Movimento criado: ID ${movement.id}`);
      saidaMovements.push(movement);
    }
    
    testResults.movements.push(...saidaMovements);
    console.log(`\n✅ FASE 5 COMPLETA: ${saidaMovements.length} movimentos SAÍDA criados\n`);
    
    console.log(`📋 FASE 6: VALIDAÇÃO DE ESTOQUE FINAL\n`);
    
    // Fase 6: Validar estoque final (deve ser 70 para cada produto)
    const stockValidations = [];
    for (let i = 0; i < createdProducts.length; i++) {
      const product = createdProducts[i];
      
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
      
      const status = isValid ? '✅' : '❌';
      console.log(`   ${status} 🛒 Produto ${product.id} | Endereço: ${product.compartment.address} | Esperado: ${expectedStock} | Real: ${actualStock}`);
    }
    
    testResults.stockValidation = stockValidations;
    
    const allStockValid = stockValidations.every(v => v.valid);
    console.log(`\n${allStockValid ? '✅' : '❌'} FASE 6 COMPLETA: Validação de estoque ${allStockValid ? 'PASSOU' : 'FALHOU'}\n`);
    
    console.log(`📋 FASE 7: VALIDAÇÃO DE SCHEMA\n`);
    
    // Validar schema completo
    const schemaValidation = {
      productIds: {
        valid: testResults.products.every(p => typeof p.id === 'number'),
        type: 'BIGINT (number)',
        samples: testResults.products.slice(0, 2).map(p => ({ id: p.id, type: typeof p.id }))
      },
      userId: testResults.schemaValidation.userId,
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
    
    console.log(`   📋 Product IDs (BIGINT): ${schemaValidation.productIds.valid ? '✅' : '❌'}`);
    console.log(`   📋 User ID (UUID): ${schemaValidation.userId.valid ? '✅' : '❌'}`);
    console.log(`   📋 Movement Product IDs: ${schemaValidation.movementTypes.productIds ? '✅' : '❌'}`);
    console.log(`   📋 Movement User IDs: ${schemaValidation.movementTypes.userIds ? '✅' : '❌'}`);
    console.log(`   📋 Movement Compartment IDs: ${schemaValidation.movementTypes.compartmentIds ? '✅' : '❌'}`);
    
    console.log(`\n${schemaValid ? '✅' : '❌'} FASE 7 COMPLETA: Validação de schema ${schemaValid ? 'PASSOU' : 'FALHOU'}\n`);
    
    // Determinar status final
    const allTestsPassed = allStockValid && schemaValid;
    testResults.finalStatus = allTestsPassed ? 'PASS' : 'FAIL';
    
    console.log(`========================================`);
    console.log(`📋 RELATÓRIO FINAL - TESTE COMPLETO DE PRODUÇÃO`);
    console.log(`========================================\n`);
    
    console.log(`🎯 RESULTADOS DOS TESTES:`);
    console.log(`   ✅ Produtos criados: ${testResults.products.length}/5`);
    console.log(`   ✅ Movimentos ENTRADA: ${entradaMovements.length}/5`);
    console.log(`   ✅ Movimentos SAÍDA: ${saidaMovements.length}/5`);
    console.log(`   ${allStockValid ? '✅' : '❌'} Validação de estoque: ${stockValidations.filter(v => v.valid).length}/5`);
    console.log(`   ${schemaValid ? '✅' : '❌'} Validação de schema: ${schemaValid ? 'PASSOU' : 'FALHOU'}`);
    
    console.log(`\n📊 DETALHES DOS PRODUTOS:`);
    testResults.products.forEach((product, i) => {
      const stock = stockValidations[i];
      const status = stock.valid ? '✅' : '❌';
      console.log(`   ${status} 🛒 Produto ${product.id} | Endereço: ${stock.address} | Esperado: ${stock.expected} | Real: ${stock.actual}`);
    });
    
    console.log(`\n🔧 VALIDAÇÃO DE SCHEMA:`);
    console.log(`   📋 Product IDs (BIGINT): ${schemaValidation.productIds.valid ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log(`   📋 User IDs (UUID): ${schemaValidation.userId.valid ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log(`   📋 Movement Types: ${schemaValid ? '✅ TODOS CORRETOS' : '❌ PROBLEMAS ENCONTRADOS'}`);
    
    console.log(`\n🎯 STATUS FINAL: ${allTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allTestsPassed) {
      console.log(`\n🎉 PASS: StockFlow publicado e validado em produção! 🎉`);
      console.log(`🚀 Todos os testes passaram com sucesso!`);
    } else {
      console.log(`\n❌ FAIL: Problemas encontrados na validação.`);
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