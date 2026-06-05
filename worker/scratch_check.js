import pkg from "@prisma/client/index.js";
const { PrismaClient } = pkg;
import dotenv from "dotenv";
import path from "url";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fs.realpathSync(path.fileURLToPath(import.meta.url) + "/..");

dotenv.config({ path: __dirname + "/../.env.local" });

const prisma = new PrismaClient();

async function run() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        reports: true,
        leads: true
      }
    });
    console.log(`Found ${companies.length} companies:`);
    for (const company of companies) {
      console.log(`- Company: ${company.name} (${company.domain})`);
      console.log(`  Leads:`, company.leads.map(l => l.email));
      console.log(`  Reports:`, company.reports.map(r => ({ id: r.id, status: r.status, score: r.score })));
    }
  } catch (err) {
    console.error("Error checking DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
