// tests/globalTeardown.js
import driver from '../config/neo4j.js';

export default async function() {
  await driver.close();
}