// Script to create admin users with properly hashed passwords.
// Run with: node create-admin.js <student_id> <password> <name>
// Example: node create-admin.js admin002 MySecurePassword! "John Doe"
import bcrypt from "bcryptjs";
import { exec } from "child_process";
import fs from "fs";
import util from "util";

const execPromise = util.promisify(exec);
const tempFile = "temp-admin.sql";

const studentId = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function createAdmin() {
  if (!studentId || !password || !name) {
    console.log("Usage: node create-admin.js <student_id> <password> <name>");
    console.log("Example: node create-admin.js admin002 MySecurePassword! 'John Doe'");
    process.exit(1);
  }

  console.log(`Creating admin user: ${studentId}`);
  console.log(`Name: ${name}`);

  console.log("Hashing password...");
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Password hashed successfully.");

  const department = "Administration";
  const degree = "Master";
  const year = 2024;
  const gender = "male";

  const sql = `INSERT INTO users (student_id, password, name, department, degree, year, gender, role, is_approved) VALUES (${sqlString(studentId)}, ${sqlString(hashedPassword)}, ${sqlString(name)}, ${sqlString(department)}, ${sqlString(degree)}, ${year}, ${sqlString(gender)}, 'admin', TRUE);`;

  console.log("\nExecuting SQL on LOCAL database...");

  try {
    fs.writeFileSync(tempFile, sql);
    await execPromise(`wrangler d1 execute pickleball-courts --file=./${tempFile} --local`);

    console.log("\nAdmin user created successfully on LOCAL database.");
    console.log(`  Student ID: ${studentId}`);
    console.log("  Role: admin");
  } catch (error) {
    console.error("\nError creating admin user:", error.message);
    process.exitCode = 1;
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

createAdmin();
