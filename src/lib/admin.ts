export const ADMIN_EMAILS = [
  "llclucas3@gmail.com",
  process.env.ADMIN_EMAIL,
].filter(Boolean) as string[];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === email.toLowerCase());
}
