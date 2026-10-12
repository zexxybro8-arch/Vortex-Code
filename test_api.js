async function test() {
  const url = 'https://developers.freefirecommunity.com/api/v1/info?region=ind&uid=665951869';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': 'ffc_mv45arvq_opu2yrz2xb2daxq1oyrwc',
      'User-Agent': 'VortexCode-App/1.0 (+https://ais-dev-dzehrlebsl6cucyvoooabo-53259780002.asia-southeast1.run.app)',
    },
  });
  console.log('Status:', response.status);
  console.log('Body:', await response.text());
}

test();
