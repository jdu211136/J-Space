import fs from 'fs';
import path from 'path';
import pool from '../db';

const runMigration = async () => {
    try {
        const migrationPath = path.join(__dirname, '../migrations/002_file_uploads.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration 002...');
        await pool.query(migrationSql);
        console.log('Migration 002 completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

runMigration();
