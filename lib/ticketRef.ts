const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"; // no I, O to avoid confusion
export function generateTicketRef(): string {
  return Array.from({ length: 10 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}
export function formatTicketRef(ref: string): string {
  return `EOCON-${ref}`;
}
