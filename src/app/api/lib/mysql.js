import "server-only";
import mysql from "mysql2/promise";

const globalForMysql = globalThis;

const db =
  globalForMysql.__instagramMysqlPool ||
  mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: Number(process.env.DATABASE_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForMysql.__instagramMysqlPool = db;
}

export default db;
