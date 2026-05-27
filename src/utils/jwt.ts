import { jwtVerify, SignJWT } from "jose";
import { getAllSecretVersions } from "../config/jwt";

export type JwtPayload = {
  sub: string;
  role?: string;
  iss?: string;
  exp?: number;
  [k: string]: any;
};

export async function verifyJwt(token: string, expectedIss?: string): Promise<JwtPayload> {
  const versions = await getAllSecretVersions("JWT_SECRET");

  const encoder = new TextEncoder();

  // Try each active secret
  for (const v of versions.filter((x) => x.active)) {
    try {
      const { payload } = await jwtVerify(token, encoder.encode(v.secret), { issuer: expectedIss });
      return payload as JwtPayload;
    } catch (err) {
      // try next
    }
  }

  // If none succeeded, throw
  throw new Error("Invalid token");
}

export async function signJwt(payload: object, secret: string, options?: { expiresInSec?: number; issuer?: string }) {
  const encoder = new TextEncoder();
  const exp = options?.expiresInSec ? Math.floor(Date.now() / 1000) + options.expiresInSec : undefined;

  let jwt = new SignJWT(payload as any).setProtectedHeader({ alg: "HS256" });
  if (options?.issuer) jwt = jwt.setIssuer(options.issuer);
  if (exp) jwt = jwt.setExpirationTime(exp);

  return jwt.sign(encoder.encode(secret));
}
