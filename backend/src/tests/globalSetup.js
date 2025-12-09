// tests/globalSetup.js
import driver from '../config/neo4j.js';
import { seed } from '../scripts/seed.js';

export default async function () {
  const session = driver.session();
  await session.run('MATCH (n) DETACH DELETE n'); // Clean first
  await session.close();

  await seed(); // Run existing seed
}