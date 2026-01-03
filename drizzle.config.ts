import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  // 👉 আপনার schema file যেখানে আছে
  schema: "./src/shared/schema.ts",

  // 👉 migration output folder
  out: "./drizzle",
  dialect: "mysql",

  // 👉 DB connection
  dbCredentials: {
     url: process.env.DATABASE_URL as string || "mysql://utente:password@localhost:3306/projectpro"
  },

  // optional but recommended
  strict: true,
  verbose: true,
});
