export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function validateStudentId(studentId) {
  if (!studentId || typeof studentId !== "string") {
    throw new ValidationError("Student ID is required", "studentId");
  }
  
  const trimmed = studentId.trim();
  
  if (trimmed.length < 4 || trimmed.length > 20) {
    throw new ValidationError(
      "Student ID must be between 4 and 20 characters",
      "studentId"
    );
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError(
      "Student ID can only contain letters, numbers, underscores, and hyphens",
      "studentId"
    );
  }
  
  return trimmed;
}

export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    throw new ValidationError("Password is required", "password");
  }
  
  if (password.length < 8) {
    throw new ValidationError(
      "Password must be at least 8 characters long",
      "password"
    );
  }
  
  if (password.length > 128) {
    throw new ValidationError(
      "Password must not exceed 128 characters",
      "password"
    );
  }
  
  let strength = 0;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  if (strength < 2) {
    throw new ValidationError(
      "Password must contain at least 2 of: lowercase, uppercase, numbers, or special characters",
      "password"
    );
  }
  
  return password;
}

export function validateName(name) {
  if (!name || typeof name !== "string") {
    throw new ValidationError("Name is required", "name");
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new ValidationError(
      "Name must be between 2 and 100 characters",
      "name"
    );
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    throw new ValidationError(
      "Name can only contain letters, spaces, hyphens, and apostrophes",
      "name"
    );
  }
  
  return trimmed;
}

export function validateDepartment(department) {
  if (!department || typeof department !== "string") {
    throw new ValidationError("Department is required", "department");
  }
  
  const trimmed = department.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new ValidationError(
      "Department must be between 2 and 100 characters",
      "department"
    );
  }
  
  return trimmed;
}

export function validateDegree(degree) {
  const validDegrees = ["Bachelor", "Master", "PhD"];
  
  if (!validDegrees.includes(degree)) {
    throw new ValidationError(
      `Degree must be one of: ${validDegrees.join(", ")}`,
      "degree"
    );
  }
  
  return degree;
}

export function validateYear(year) {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 10;
  const maxYear = currentYear + 1;
  
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  
  if (!yearNum || typeof yearNum !== "number" || isNaN(yearNum) || yearNum < minYear || yearNum > maxYear) {
    throw new ValidationError(
      `Year must be between ${minYear} and ${maxYear}`,
      "year"
    );
  }
  
  return yearNum;
}

export function validateGender(gender) {
  const validGenders = ["male", "female"];
  
  if (!validGenders.includes(gender)) {
    throw new ValidationError(
      `Gender must be one of: ${validGenders.join(", ")}`,
      "gender"
    );
  }
  
  return gender;
}

export function validateRegistrationData(data) {
  const errors = [];
  
  try {
    validateStudentId(data.studentId);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    validatePassword(data.password);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    validateName(data.name);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    validateDepartment(data.department);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    validateDegree(data.degree);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    validateYear(data.year);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    validateGender(data.gender);
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function sanitizeUserInput(input) {
  if (typeof input === "string") {
    return input.trim().replace(/[<>]/g, "");
  }
  return input;
}
