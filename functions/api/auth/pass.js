import bcrypt from "bcryptjs";

const password = "Lukisun123@";

const hashedPassword = await bcrypt.hash(password, 10);
console.log("Hashed Password:", hashedPassword);
