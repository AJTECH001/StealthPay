#!/usr/bin/env node
/**
 * Run db_schema.sql against the database.
 * Uses .env for DATABASE_URL (same as the backend).
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL must be set in .env");
  process.exit(1);
}

const schemaPath = path.join(__dirname, "db_schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");

const pool = new Pool({ connectionString: databaseUrl });

pool
  .query(sql)
  .then(() => {
    console.log("✅ Database schema applied successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error applying schema:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
