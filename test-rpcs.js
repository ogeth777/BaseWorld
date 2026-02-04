import axios from 'axios';

const rpcs = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  'https://base-sepolia.publicnode.com',
  'https://base-sepolia.blockpi.network/v1/rpc/public',
  'https://base-sepolia.gateway.tenderly.co',
  'https://1rpc.io/base-sepolia',
  'https://base-sepolia.drpc.org',
  'https://public.stackup.sh/api/v1/node/base-sepolia'
];

async function checkRpc(url) {
  try {
    const start = Date.now();
    const response = await axios.post(url, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    }, { timeout: 5000 });
    
    const duration = Date.now() - start;
    if (response.data && response.data.result) {
      console.log(`✅ ${url} - OK (${duration}ms)`);
      return { url, duration, status: 'ok' };
    } else {
      console.log(`❌ ${url} - Invalid response`);
      return { url, duration, status: 'error' };
    }
  } catch (error) {
    console.log(`❌ ${url} - Error: ${error.message}`);
    return { url, duration: 0, status: 'error' };
  }
}

async function main() {
  console.log('Testing RPC endpoints...');
  const results = await Promise.all(rpcs.map(checkRpc));
  const working = results.filter(r => r.status === 'ok').sort((a, b) => a.duration - b.duration);
  
  console.log('\n--- Working RPCs (Sorted by speed) ---');
  working.forEach(r => console.log(`${r.url} (${r.duration}ms)`));
}

main();