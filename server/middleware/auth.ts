import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const jwtSecret = process.env.JWT_SECRET || "dev-secret";

export function authenticate(req: Request & { auth?: any }, res: Response, next: NextFunction) {
  const auth = req.headers?.authorization as string | undefined;
  if (!auth) return res.status(401).json({ error: "Missing Authorization header" });
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "Invalid Authorization header format" });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    (req as any).auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request & { auth?: any }, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== "admin") return res.status(403).json({ error: "Admin privileges required" });
  next();
}
