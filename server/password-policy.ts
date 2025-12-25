import bcrypt from "bcrypt";

const COMMON_PASSWORDS = new Set(
  [
    "password",
    "123456",
    "123456789",
    "qwerty",
    "111111",
    "letmein",
    "dragon",
    "baseball",
    "iloveyou",
    "admin123",
    "reader123",
  ].map((pwd) => pwd.toLowerCase()),
);

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyError";
  }
}

export function assertPasswordMeetsPolicy(password: string, username?: string) {
  if (typeof password !== "string" || password.trim().length === 0) {
    throw new PasswordPolicyError("Password is required");
  }

  if (password.length < 12) {
    throw new PasswordPolicyError("Password must be at least 12 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    throw new PasswordPolicyError("Password must include at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    throw new PasswordPolicyError("Password must include at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    throw new PasswordPolicyError("Password must include at least one number");
  }

  if (!/[!@#$%^&*()[\]_\-+=~`{}|:;"'<>,.?/\\]/.test(password)) {
    throw new PasswordPolicyError("Password must include at least one special character");
  }

  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    throw new PasswordPolicyError("Password cannot contain the username");
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new PasswordPolicyError("Password is too common");
  }
}

export async function assertPasswordRotation(
  candidatePassword: string,
  existingHash?: string | null,
) {
  if (!candidatePassword || !existingHash) {
    return;
  }

  const matches = await bcrypt.compare(candidatePassword, existingHash);
  if (matches) {
    throw new PasswordPolicyError("New password must be different from the previous password");
  }
}
