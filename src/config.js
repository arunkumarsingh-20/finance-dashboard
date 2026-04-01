const { z } = require("zod");

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DB_FILE: z.string().default("finance.sqlite"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET too short"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("*")
});

const env = envSchema.parse(process.env);

module.exports = env;
