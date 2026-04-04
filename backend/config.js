const { z } = require("zod");

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_SSL: z.preprocess(
    (val) => (val === "true" || val === "1" || val === true),
    z.boolean().default(false)
  ),
  JWT_SECRET: z.string().min(8, "JWT_SECRET too short"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("*")
});

const env = envSchema.parse(process.env);

module.exports = env;