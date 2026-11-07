import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
await import("./index.js");
