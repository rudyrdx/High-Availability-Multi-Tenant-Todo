// scripts/test-validation.js
import request from 'supertest';
import app from '../app.js';

async function test() {
  const res = await request(app)
    .post('/api/tenant/lookup')
    .send({});

  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  process.exit(0);
}

test();
