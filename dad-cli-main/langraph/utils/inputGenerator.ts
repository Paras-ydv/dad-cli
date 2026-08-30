export interface InputContext {
  actionId: string;
  elementType?: string;
  placeholder?: string;
  label?: string;
  name?: string;
}

const EMAIL_PATTERNS = ["test@example.com", "user@domain.org", "admin@site.net"];
const NAME_PATTERNS = ["John Doe", "Jane Smith", "Test User"];
const PHONE_PATTERNS = ["555-0123", "123-456-7890", "+1-555-0199"];
const PASSWORD_PATTERNS = ["TestPass123!", "SecureP@ss1", "Demo123$"];

/** Pick a random entry from a non-empty list. */
function pick(values: readonly string[], fallback: string): string {
  return values[Math.floor(Math.random() * values.length)] ?? fallback;
}

export function generateIntelligentInput(context: InputContext): string {
  const { actionId, elementType, placeholder, label, name } = context;
  
  const combined = `${actionId} ${elementType} ${placeholder} ${label} ${name}`.toLowerCase();
  
  if (combined.includes("email") || combined.includes("mail")) {
    return pick(EMAIL_PATTERNS, "test@example.com");
  }
  
  if (combined.includes("password") || combined.includes("pass")) {
    return pick(PASSWORD_PATTERNS, "TestPass123!");
  }
  
  if (combined.includes("phone") || combined.includes("tel")) {
    return pick(PHONE_PATTERNS, "555-0123");
  }
  
  if (combined.includes("name") || combined.includes("user")) {
    return pick(NAME_PATTERNS, "John Doe");
  }
  
  if (combined.includes("search") || combined.includes("query")) {
    return "test search query";
  }
  
  if (combined.includes("number") || combined.includes("age") || combined.includes("count")) {
    return String(Math.floor(Math.random() * 100) + 1);
  }
  
  // Default intelligent fallback
  return placeholder || "test input";
}