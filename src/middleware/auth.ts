import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload | null;
    }
  }
}

export function requireAuth(expectedIssuer?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Missing Authorization header" });
      }

      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, expectedIssuer);

      req.auth = payload;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
  };
}
