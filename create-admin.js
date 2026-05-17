// Script to create admin users with properly hashed passwords
// Run with: node create-admin.js <student_id> <password> <name>
// Example: node create-admin.js admin002 MySecurePassword! "John Doe"

import bcrypt from "bcryptjs";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const studentId = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

async function createAdmin() {
  if (!studentId || !password || !name) {
    console.log("Usage: node create-admin.js <student_id> <password> <name>");
    console.log("Example: node create-admin.js admin002 MySecurePassword! 'John Doe'");
    process.exit(1);
  }

  console.log(`Creating admin user: ${studentId}`);
  console.log(`Name: ${name}`);

  // Hash the password with bcrypt (10 rounds, same as in registration)
  console.log("Hashing password...");
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Password hashed successfully!");

  const department = "Administration";
  const degree = "Master";
  const year = 2024;
  const gender = "male";

  // SQL to insert the user
  const sql = `INSERT INTO users (student_id, password, name, department, degree, year, gender, role, is_approved) VALUES ('${studentId}', '${hashedPassword}', '${name}', '${department}', '${degree}', ${year}, '${gender}', 'admin', TRUE);`;

  console.log("\nExecuting SQL on LOCAL database...");
  console.log("SQL:", sql);

  try {
    // Write SQL to a temp file
    const fs = await import('fs');
    fs.writeFileSync('temp-admin.sql', sql);

    // Execute with wrangler
    const { stdout, stderr } = await execPromise(
      'wrangler d1 execute pickleball-courts --file=./temp-admin.sql --local'
    );
    
    console.log("\n✓ Admin user created successfully on LOCAL database!");
    console.log("\nYou can now login with:");
    console.log(`  Student ID: ${studentId}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: admin`);

    // Clean up temp file
    fs.unlinkSync('temp-admin.sql');

  } catch (error) {
    console.error("\n✗ Error creating admin user:", error.message);
    
    // Clean up temp file if it exists
    try {
      const fs = await import('fs');
      if (fs.existsSync('temp-admin.sql')) {
        fs.unlinkSync('temp-admin.sql');
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

createAdmin();
