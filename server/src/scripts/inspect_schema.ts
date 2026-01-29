import pool from '../db';

async function inspect() {
    try {
        console.log('--- TASKS ---');
        const tasks = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position");
        console.table(tasks.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
