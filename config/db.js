const sql = require("mssql/msnodesqlv8");

const config = {
  server: "LAPTOP-S3PLL4C2\\SQLEXPRESS", // hoặc TENMAY\\SQLEXPRESS
  database: "UserRoleDB",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
  connectionString:
    "Driver={ODBC Driver 17 for SQL Server};Server=LAPTOP-S3PLL4C2\\SQLEXPRESS;Database=UserRoleDB;Trusted_Connection=Yes;",
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = {
  sql,
  pool,
  poolConnect,
};