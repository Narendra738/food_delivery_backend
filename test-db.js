import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

// Get URLs from command line arguments
const postgresUrl = process.argv[2];
const mongoUrl = process.argv[3];

if (!postgresUrl || !mongoUrl) {
    console.log('\n❌ Usage: node test-db.js "YOUR_POSTGRES_URL" "YOUR_MONGO_URL"');
    console.log('   (Wrap your URLs in quotes!)\n');
    process.exit(1);
}

console.log('\n🔍 Testing Database Connections...\n');

// 1. Test MongoDB
console.log('👉 Testing MongoDB...');
try {
    await mongoose.connect(mongoUrl);
    console.log('✅ MongoDB Connection Successful!');
    await mongoose.disconnect();
} catch (error) {
    console.error('❌ MongoDB Failed:', error.message);
}

// 2. Test PostgreSQL & Table Existence
console.log('\n👉 Testing PostgreSQL...');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: postgresUrl,
        },
    },
});

try {
    await prisma.$connect();
    console.log('✅ PostgreSQL Connection Successful!');

    // Check if User table exists by trying to count users
    try {
        const count = await prisma.user.count();
        console.log(`✅ Table 'User' exists! (Found ${count} users)`);
    } catch (error) {
        if (error.code === 'P2021') { // Table not found code
            console.error("❌ PostgreSQL Connected, but TABLES ARE MISSING!");
            console.error("   ⚠️  You MUST run the migration command to fix this.");
        } else {
            console.error('❌ Error checking tables:', error.message);
        }
    }

} catch (error) {
    console.error('❌ PostgreSQL Connection Failed:', error.message);
} finally {
    await prisma.$disconnect();
}
