/**
 * Seed script to populate database with initial data from 360Giving API
 * 
 * Usage: npm run seed
 */

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    const response = await fetch('http://localhost:3000/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ Seed completed successfully!');
      console.log(`   • Organisations synced: ${result.organisations_synced}`);
      console.log(`   • Grants synced: ${result.grants_synced}`);
    } else {
      console.error('\n❌ Seed failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Seed error:', error);
    console.error('\nMake sure the Next.js dev server is running on http://localhost:3000');
    process.exit(1);
  }
}

seedDatabase();
