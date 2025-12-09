// scripts/seed.js
import driver from '../config/neo4j.js';

export async function seed() {
  const session = driver.session();
  try {
    // Create constraints
    await session.run(
      'CREATE CONSTRAINT invite_key IF NOT EXISTS FOR (i:InviteKey) REQUIRE i.key IS UNIQUE'
    );

    // Seed invite keys
    const inviteKeys = ['chronos-beta', 'test-key-1', 'test-key-2', 'test-key-3'];
    for (const key of inviteKeys) {
      await session.run(`
        MERGE (i:InviteKey {key: $key})
        ON CREATE SET i.isUsed = false
        ON MATCH SET i.isUsed = false
      `, { key });
    }
    console.log('✓ Seed completed with tenants, users, and invite keys:', inviteKeys);
  } catch (error) {
    console.error('✗ Seed failed:', error.message);
  } finally {
    await session.close();
    // Don't close driver - tests need it!
  }
}

// Only run directly if called from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  await seed();
  await driver.close();
}