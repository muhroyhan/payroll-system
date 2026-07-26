// Consumed by sequelize-cli only (db:migrate, db:seed) — see .sequelizerc.
// The NestJS app itself connects via src/config/database.config.ts + SequelizeModule.
// quiet: true — suppress the dotenv "injected env" log line (and its
// promotional tip text) when running sequelize-cli commands.
require('dotenv').config({ quiet: true });

const base = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
};

module.exports = {
  development: base,
  test: { ...base, database: `${process.env.DB_DATABASE}_test` },
  production: base,
};
