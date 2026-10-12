const { getDb } = require('./server/db');

async function test() {
  const db = await getDb();
  const res = db.exec("PRAGMA table_info(products);");
  console.log('Columns:', res[0]?.values);
}

test();
