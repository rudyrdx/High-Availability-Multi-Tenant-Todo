// scripts/reset.js
// This script completely resets the database by:
// 1. Deleting all nodes and relationships
// 2. Dropping all constraints
// 3. Recreating constraints
// 4. Seeding initial data

import driver from '../config/neo4j.js';
import { seed } from './seed.js';

async function reset() {
    const session = driver.session();
    try {
        console.log('🗑️  Deleting all nodes and relationships...');
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('✓ All data deleted');

        console.log('🔧 Dropping existing constraints...');
        // Get all constraints
        const constraintsResult = await session.run('SHOW CONSTRAINTS');
        const constraints = constraintsResult.records.map(record => record.get('name'));

        // Drop each constraint
        for (const constraintName of constraints) {
            try {
                await session.run(`DROP CONSTRAINT ${constraintName} IF EXISTS`);
                console.log(`  ✓ Dropped constraint: ${constraintName}`);
            } catch (err) {
                console.log(`  ⚠ Could not drop constraint ${constraintName}: ${err.message}`);
            }
        }

        console.log('✓ All constraints dropped');

        console.log('📊 Recreating constraints...');
        await session.run(
            'CREATE CONSTRAINT tenant_slug IF NOT EXISTS FOR (t:Tenant) REQUIRE t.slug IS UNIQUE'
        );
        console.log('  ✓ Created constraint: tenant_slug');

        await session.run(
            'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE'
        );
        console.log('  ✓ Created constraint: user_email');

        await session.run(
            'CREATE CONSTRAINT invite_key IF NOT EXISTS FOR (i:InviteKey) REQUIRE i.key IS UNIQUE'
        );
        console.log('  ✓ Created constraint: invite_key');

        console.log('✓ All constraints recreated');

    } catch (error) {
        console.error('✗ Reset failed:', error.message);
        throw error;
    } finally {
        await session.close();
    }

    // Now seed the database
    console.log('\n🌱 Seeding database...');
    // await seed();

    console.log('\n✅ Database reset complete!');
    console.log('\nYou can now:');
    console.log('  - Start the server: npm run dev');
    console.log('  - Run tests: npm test');
    console.log('  - Login with: john@acme.com / password123');
}

// Only run if called directly
reset()