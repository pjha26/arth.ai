import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "./.env.local") });

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
