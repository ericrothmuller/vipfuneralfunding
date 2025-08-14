import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export function getUserFromCookie() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; email: string };
    return payload;
  } catch {
    return null;
  }
}
