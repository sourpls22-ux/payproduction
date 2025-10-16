const WebSocket = require('ws');
const axios = require('axios');

function startAtlosWatcher() {
  const ws = new WebSocket('wss://api.atlos.io/gateway/socket/');

  ws.on('open', () => console.log('[ATLOS:WS] connected'));
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.type === 'payment:update' && msg?.data?.orderId) {
        console.log('[ATLOS:WS] payment:update', msg.data);
        // trigger local resync
        await axios.get(`https://kissblow.me/api/payments/resync?orderId=${encodeURIComponent(msg.data.orderId)}`);
      }
    } catch (e) {
      console.error('[ATLOS:WS] parse error', e);
    }
  });
  ws.on('close', () => console.log('[ATLOS:WS] closed'));
  ws.on('error', (e) => console.error('[ATLOS:WS] error', e));
  return ws;
}

module.exports = { startAtlosWatcher };
