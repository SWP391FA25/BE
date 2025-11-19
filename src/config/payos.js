const { PayOS } = require('@payos/node');

/**
 * PayOS Configuration
 * Document: https://payos.vn/docs/
 */

// Khởi tạo PayOS với credentials thật (dùng object config)
const payOS = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || '37482cbe-9308-4536-b21e-2699f77816d6',
    apiKey: process.env.PAYOS_API_KEY || '4c2be057-5e02-43cb-9863-96cbcf201fe8',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || '8763a53c46f58e6b4b1a94443adcd7ced0c0f46e1bf3196efdac0398684f983d'
});

console.log('✅ PayOS initialized successfully');

module.exports = payOS;

