import pool from '../db';
import fs from 'fs';
import path from 'path';

const seed = async () => {
    try {
        const sqlPath = path.join(__dirname, 'seed_dummies.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running seed script...');
        await pool.query(sql);
        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await pool.end();
    }
};

seed();
