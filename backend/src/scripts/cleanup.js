// scripts/cleanup.js
import driver from '../config/neo4j.js';

async function cleanup() {
  const session = driver.session();
  try {
    // Delete all nodes and relationships
    await session.run('MATCH (n) DETACH DELETE n');
    
    console.log('✓ Database cleaned');
  } catch (error) {
    console.error('✗ Cleanup failed:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

cleanup();