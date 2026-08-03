const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const setupSqlPath = path.join(__dirname, '..', 'supabase_setup.sql');

async function loadSetupSql() {
  return fs.readFileSync(setupSqlPath, 'utf8');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = await loadSetupSql();
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Use POST to execute the Supabase setup SQL.',
      sqlPreview: sql,
      configured: Boolean(dbUrl),
      requiredEnvVars: ['SUPABASE_DB_URL or DATABASE_URL']
    });
  }

  if (!dbUrl) {
    return res.status(500).json({
      error: 'Missing database connection string. Set SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL in Vercel.'
    });
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    await client.query(sql);

    return res.status(200).json({
      success: true,
      message: 'Supabase database setup completed successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      hint: 'Ensure the database user has permission to create tables and policies.'
    });
  } finally {
    await client.end().catch(() => {});
  }
};
