export function validatePhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}
