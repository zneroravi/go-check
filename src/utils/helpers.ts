import { v4 as uuidv4 } from "uuid";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateShortCode(length: number): string {
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomValues[i] % CHARSET.length];
  }
  return result;
}

export function generateId(): string {
  return uuidv4();
}
