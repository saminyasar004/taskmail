import { defineConfig } from "prisma/config";
import "dotenv/config";

// Prisma v7 requires connection config in this file rather than in schema.prisma.
// The adapter is used for both Migrate and runtime queries.
export default defineConfig({
  migrate: {
    async adapter() {
      const { Pool } = await import("pg");
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPg(pool);
    },
  },
});
