import { Pool } from "pg";

let pool: Pool | null = null;
let initializationPromise: Promise<void> | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn("DATABASE_URL is not defined in environment variables. Falling back to local storage mocks.");
      return null;
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=") || connectionString.includes("supabase") || connectionString.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
    });

    // Start schema initialization and track its promise
    initializationPromise = initializeDbSchema(pool).catch((err) => {
      console.error("Failed to initialize PostgreSQL schema:", err);
      initializationPromise = null; // Reset on failure so it retries next time
      throw err;
    });
  }
  return pool;
}

async function initializeDbSchema(dbPool: Pool) {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    // 1. Companies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        admin_uid VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'trial',
        trial_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        subscription_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Products Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_lower VARCHAR(255) NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        quantity INTEGER NOT NULL,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes if they don't exist
    await client.query("CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(name_lower)");

    // 3. Sales Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(255) PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id)");

    // 4. Clients Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(255),
        address TEXT,
        total_spent DOUBLE PRECISION DEFAULT 0.0,
        orders_count INTEGER DEFAULT 0,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id)");

    // 5. Suppliers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(255),
        website VARCHAR(255),
        category VARCHAR(255),
        products_count INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 5,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id)");

    // 6. Activation Keys Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activation_keys (
        key VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'unused',
        used_by VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP
      );
    `);

    // 7. Super Admins Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        uid VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default super admin if empty
    const adminCheck = await client.query("SELECT COUNT(*) FROM super_admins");
    if (parseInt(adminCheck.rows[0].count, 10) === 0) {
      await client.query(
        "INSERT INTO super_admins (uid, email) VALUES ($1, $2)",
        ["sandbox-admin-uid", "admin@elena.saas"]
      );
      console.log("Default super admin seeded.");
    }

    await client.query("COMMIT");
    console.log("PostgreSQL schema successfully initialized/verified.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  const dbPool = getPool();
  if (!dbPool) {
    throw new Error("No database pool connection available.");
  }
  
  if (initializationPromise) {
    try {
      await initializationPromise;
    } catch (e) {
      console.error("Query blocked because schema initialization failed:", e);
    }
  }

  return dbPool.query(text, params);
}
