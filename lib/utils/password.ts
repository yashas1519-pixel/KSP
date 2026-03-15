import { randomBytes } from "crypto";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SPECIALS = "@#$%&*";
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIALS;

/**
 * Securely pick a random character from a character set using crypto.randomBytes.
 */
function secureRandomChar(chars: string): string {
  const randomByte = randomBytes(1)[0];
  return chars[randomByte % chars.length];
}

/**
 * Generates a cryptographically secure 12-character password.
 * Guarantees at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character.
 *
 * @returns A strong random password (e.g. "Ksp@7xMn2#Rq")
 */
export function generatePassword(): string {
  const PASSWORD_LENGTH = 12;

  // Guarantee at least one character from each required set
  const guaranteed: string[] = [
    secureRandomChar(UPPERCASE),
    secureRandomChar(LOWERCASE),
    secureRandomChar(DIGITS),
    secureRandomChar(SPECIALS),
  ];

  // Fill remaining slots from the full character set
  for (let i = guaranteed.length; i < PASSWORD_LENGTH; i++) {
    guaranteed.push(secureRandomChar(ALL_CHARS));
  }

  // Shuffle using Fisher-Yates with crypto.randomBytes
  for (let i = guaranteed.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [guaranteed[i], guaranteed[j]] = [guaranteed[j], guaranteed[i]];
  }

  return guaranteed.join("");
}
