import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: path.join("backend", ".env") });

export default defineConfig({
  schema: path.join("backend", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("backend", "prisma", "migrations"),
    seed: "npm --prefix backend run seed",
  },
});
