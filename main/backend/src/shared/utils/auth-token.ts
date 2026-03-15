import crypto from "crypto";

import { env } from "../../config/env";

type TokenPayload = {
  sub: string;
  exp: number;
};

type AuthTokenVerificationResult =
  | {
      valid: true;
      userId: string;
      expiresAt: string;
    }
  | {
      valid: false;
    };

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(unsignedToken: string): string {
  return crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(unsignedToken)
    .digest("base64url");
}

export function createAuthToken(userId: string): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + env.authTokenTtlSeconds;
  const payload: TokenPayload = {
    sub: userId,
    exp,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyAuthToken(token: string): AuthTokenVerificationResult {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return { valid: false };
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as TokenPayload;
    if (
      typeof parsed.sub !== "string" ||
      !parsed.sub ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: parsed.sub,
      expiresAt: new Date(parsed.exp * 1000).toISOString(),
    };
  } catch {
    return { valid: false };
  }
}
