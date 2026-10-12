
import https from 'node:https';

const options = {
  hostname: 'developers.freefirecommunity.com',
  path: '/api/v1/info?region=ind&uid=665951869',
  method: 'GET',
  headers: {
    'x-api-key': 'ffc_mv45arvq_opu2yrz2xb2daxq1oyrwc',
    'User-Agent': 'VortexCode-App/1.0 (+https://ais-dev-dzehrlebsl6cucyvoooabo-53259780002.asia-southeast1.run.app)',
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end();
