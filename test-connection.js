// test-connection.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        console.log('📊 Database:', mongoose.connection.name);
        
        // សាកល្បងបង្កើត Collection
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('📋 Collections:', collections.map(c => c.name).join(', ') || 'None');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();