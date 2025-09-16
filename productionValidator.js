#!/usr/bin/env node

/**
 * SCRIPT DE VALIDAÇÃO PARA PRODUÇÃO - STOCKFLOW
 * 
 * Este script testa todos os endpoints do backend StockFlow
 * para garantir que funcionem corretamente em produção.
 * 
 * Uso:
 * node productionValidator.js [URL_BASE]
 * 
 * Exemplo:
 * node productionValidator.js http://localhost:5000
 * node productionValidator.js https://sua-url-de-producao.replit.app
 */

import fetch from 'node-fetch';

// Configuração
const BASE_URL = process.argv[2] || 'http://localhost:5000';
const TIMEOUT_MS = 10000;

console.log(`🚀 VALIDAÇÃO DE PRODUÇÃO - STOCKFLOW`);
console.log(`📍 URL Base: ${BASE_URL}`);
console.log(`⏰ Timeout: ${TIMEOUT_MS}ms`);
console.log(`\n========================================\n`);

// Lista de endpoints para testar
const ENDPOINTS = [
  {
    name: 'Debug Supabase',
    url: '/api/debug/supabase',
    method: 'GET',
    validateResponse: (data) => {
      return data.urlHost && data.projectRef && data.connectionTest === 'success';
    }
  },
  {
    name: 'Products (Lista)',
    url: '/api/products',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data) && data.length > 0 && data[0].id && typeof data[0].id === 'number';
    }
  },
  {
    name: 'Compartments (Lista)',
    url: '/api/compartments',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data) && data.length > 0 && data[0].id && typeof data[0].id === 'number';
    }
  },
  {
    name: 'Movements (Lista)',
    url: '/api/movements',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data);
    }
  },
  {
    name: 'Stock (Lista)',
    url: '/api/stock',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data);
    }
  },
  {
    name: 'Profiles (Lista)',
    url: '/api/profiles',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data) && data.length > 0 && data[0].id && typeof data[0].id === 'string';
    }
  },
  {
    name: 'Product Categories',
    url: '/api/products/categories',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data);
    }
  },
  {
    name: 'Product Departments',
    url: '/api/products/departments',
    method: 'GET',
    validateResponse: (data) => {
      return Array.isArray(data);
    }
  }
];

// Função para fazer requisição com timeout
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Função para testar um endpoint
async function testEndpoint(endpoint) {
  const fullUrl = `${BASE_URL}${endpoint.url}`;
  const startTime = Date.now();

  try {
    console.log(`⏳ Testando: ${endpoint.name}`);
    console.log(`   URL: ${fullUrl}`);

    const response = await fetchWithTimeout(fullUrl, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    
    let data;
    let dataValidation = false;

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
      
      if (endpoint.validateResponse) {
        dataValidation = endpoint.validateResponse(data);
      } else {
        dataValidation = true;
      }
    } catch (parseError) {
      console.log(`   ❌ Erro ao parsear JSON: ${parseError.message}`);
      dataValidation = false;
    }

    const success = statusCode === 200 && dataValidation;

    console.log(`   Status: ${statusCode} ${success ? '✅' : '❌'}`);
    console.log(`   Tempo: ${responseTime}ms`);
    
    if (!dataValidation && statusCode === 200) {
      console.log(`   ⚠️  Validação de dados falhou`);
    }
    
    if (data && endpoint.name === 'Debug Supabase') {
      console.log(`   🔧 Supabase Host: ${data.urlHost}`);
      console.log(`   🔧 Project Ref: ${data.projectRef}`);
      console.log(`   🔧 Product Count: ${data.productCount}`);
      console.log(`   🔧 Connection: ${data.connectionTest}`);
    }

    if (data && endpoint.name === 'Products (Lista)' && data.length > 0) {
      console.log(`   📊 Total Products: ${data.length}`);
      console.log(`   📊 Sample Product ID: ${data[0].id} (${typeof data[0].id})`);
    }

    if (data && endpoint.name === 'Movements (Lista)' && data.length > 0) {
      console.log(`   📊 Total Movements: ${data.length}`);
      console.log(`   📊 Sample Movement: ${data[0].user_id} (${typeof data[0].user_id}) -> Product ${data[0].product_id} (${typeof data[0].product_id})`);
    }

    console.log('');

    return {
      name: endpoint.name,
      success,
      statusCode,
      responseTime,
      dataValid: dataValidation,
      error: null
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.log(`   ❌ ERRO: ${error.message}`);
    console.log(`   Tempo: ${responseTime}ms`);
    console.log('');

    return {
      name: endpoint.name,
      success: false,
      statusCode: 0,
      responseTime,
      dataValid: false,
      error: error.message
    };
  }
}

// Função principal
async function main() {
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Pequena pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Relatório final
  console.log(`========================================`);
  console.log(`📋 RELATÓRIO FINAL - VALIDAÇÃO DE PRODUÇÃO`);
  console.log(`========================================\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Endpoints funcionando: ${successful.length}/${results.length}`);
  console.log(`❌ Endpoints com problema: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log(`\n🎉 ENDPOINTS OK:`);
    successful.forEach(r => {
      console.log(`   ✅ ${r.name} (${r.statusCode}, ${r.responseTime}ms)`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n🚨 ENDPOINTS COM PROBLEMA:`);
    failed.forEach(r => {
      console.log(`   ❌ ${r.name} (${r.statusCode}, ${r.error || 'Validação falhou'})`);
    });
  }

  // Tempo médio de resposta
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  console.log(`\n⏱️  Tempo médio de resposta: ${Math.round(avgResponseTime)}ms`);

  // Status geral
  const allWorking = failed.length === 0;
  console.log(`\n🎯 STATUS GERAL: ${allWorking ? '✅ TUDO FUNCIONANDO' : '❌ PROBLEMAS ENCONTRADOS'}`);
  
  if (allWorking) {
    console.log(`\n🚀 O StockFlow está PRONTO PARA PRODUÇÃO! 🚀`);
  } else {
    console.log(`\n🔧 Corrija os problemas acima antes de usar em produção.`);
  }

  console.log(`\n========================================`);
  
  // Exit code para CI/CD
  process.exit(allWorking ? 0 : 1);
}

// Executar validação
main().catch(error => {
  console.error('❌ Erro fatal na validação:', error);
  process.exit(1);
});