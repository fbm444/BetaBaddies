import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import database from '../services/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running API Monitoring migration...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '../../db/migrations/create_api_monitoring_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Test connection
    await database.query('SELECT NOW()');
    console.log('✅ Connected to database');
    
    // Run the migration
    console.log('📝 Executing migration SQL...');
    await database.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 API monitoring tables created:');
    console.log('   - api_services');
    console.log('   - api_usage_logs');
    console.log('   - api_error_logs');
    console.log('   - api_quotas');
    console.log('   - api_response_times');
    console.log('   - api_alerts');
    console.log('   - api_usage_reports');
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await database.close().catch(() => {});
    process.exit(1);
  }
}

runMigration();

