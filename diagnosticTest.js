import fetch from 'node-fetch';

const BASE_URL = 'https://stock-flow-controladoriasu.replit.app';

async function diagnoseProblem() {
  console.log('🔍 DIAGNÓSTICO DO PROBLEMA COM COMPARTIMENTO 3B7\n');
  
  try {
    // Test 1: Get all compartments and check for 3B7
    console.log('📋 TESTE 1: Verificar se 3B7 está na lista de compartimentos');
    const compartmentsResponse = await fetch(`${BASE_URL}/api/compartments`);
    const compartments = await compartmentsResponse.json();
    
    const compartment3B7 = compartments.find(c => c.address === '3B7');
    console.log(`✅ 3B7 encontrado na lista: ${!!compartment3B7}`);
    if (compartment3B7) {
      console.log(`📊 Dados: ID=${compartment3B7.id}, corredor=${compartment3B7.corredor}, linha=${compartment3B7.linha}, coluna=${compartment3B7.coluna}`);
    }
    
    // Test 2: Direct compartment lookup by ID
    if (compartment3B7) {
      console.log('\n📋 TESTE 2: Buscar compartimento pelo ID');
      const byIdResponse = await fetch(`${BASE_URL}/api/compartments/${compartment3B7.id}`);
      console.log(`Status: ${byIdResponse.status}`);
      if (byIdResponse.ok) {
        const byIdData = await byIdResponse.json();
        console.log(`✅ Compartimento encontrado por ID: ${byIdData.address}`);
      }
    }
    
    // Test 3: Test simpler movement creation
    console.log('\n📋 TESTE 3: Teste movimento simplificado');
    const testProduct = compartments.length > 0 ? { id: 999999 } : null; // Fake product for testing
    
    const movementData = {
      product_id: 999999,
      compartment_address: '3B7',
      tipo: 'ENTRADA',
      qty: 1
    };
    
    console.log('🔧 Dados do movimento:', movementData);
    const movementResponse = await fetch(`${BASE_URL}/api/movements/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movementData)
    });
    
    console.log(`📈 Status da resposta: ${movementResponse.status}`);
    const movementResult = await movementResponse.text();
    console.log(`📄 Resposta:`, movementResult);
    
    // Test 4: Check backend logs by looking at debug info
    console.log('\n📋 TESTE 4: Debug info do backend');
    const debugResponse = await fetch(`${BASE_URL}/api/debug/supabase`);
    const debugData = await debugResponse.json();
    console.log('🔧 Debug info:', debugData);
    
    console.log('\n='.repeat(60));
    console.log('📝 CONCLUSÃO:');
    console.log(`• Compartimento 3B7 existe: ${!!compartment3B7}`);
    console.log(`• Movimento teste status: ${movementResponse?.status || 'N/A'}`);
    console.log(`• Conexão Supabase: ${debugData?.connectionTest || 'N/A'}`);
    
  } catch (error) {
    console.error('💥 Erro no diagnóstico:', error.message);
  }
}

diagnoseProblem();