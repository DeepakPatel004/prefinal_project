import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running blockchain columns migration...');
    
    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, 'sql', 'add_blockchain_columns.sql'),
      'utf8'
    );

    // Execute the SQL
    await pool.query(sql);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();