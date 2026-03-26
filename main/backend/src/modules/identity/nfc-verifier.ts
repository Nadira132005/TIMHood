import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

import { env } from "../../config/env";
import { HttpError } from "../../shared/utils/http-error";

const execFileAsync = promisify(execFile);

type RawLdsFile = {
  byteLength: number;
  base64: string;
  sha256: string;
};

type ActiveAuthenticationProof = {
  supported?: boolean;
  performed?: boolean;
  verifiedByChip?: boolean;
  status?: string;
  challenge?: string;
  response?: string;
  publicKey?: string;
  publicKeyAlgorithm?: string;
  digestAlgorithm?: string;
  signatureAlgorithm?: string;
  signatureAlgorithmOid?: string;
  signatureAlgorithmMnemonic?: string;
  error?: string;
};

export type NfcEvidencePayload = {
  dg1?: RawLdsFile;
  dg2?: RawLdsFile;
  dg15?: RawLdsFile & {
    publicKey?: string;
    publicKeyAlgorithm?: string;
    publicKeyFormat?: string;
  };
  sod?: {
    available: boolean;
    raw?: RawLdsFile;
    digestAlgorithm?: string;
    signerDigestAlgorithm?: string;
    digestEncryptionAlgorithm?: string;
    dataGroupHashes?: Record<string, string>;
    documentSigningCertificate?: string;
    error?: string;
  };
  activeAuthentication?: ActiveAuthenticationProof;
  timingsMs?: Record<string, number>;
};

type VerificationRequest = {
  challengeBase64: string;
  evidence: NfcEvidencePayload;
};

export type VerificationResult = {
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  issuingState?: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  photoBase64?: string;
  passiveAuth: {
    hashVerified: boolean;
    sodSignatureVerified: boolean;
    cscaTrusted: boolean;
    digestAlgorithm: string;
    documentSigningCertificateSubject?: string;
    documentSigningCertificateIssuer?: string;
  };
  activeAuth: {
    challengeMatched: boolean;
    signatureVerified: boolean;
    publicKeyAlgorithm?: string;
    digestAlgorithm?: string;
    signatureAlgorithm?: string;
  };
};

const NONCE_TTL_MS = 5 * 60 * 1000;
const nonceStore = new Map<string, { challengeBase64: string; expiresAt: number }>();

const backendRoot = path.resolve(__dirname, "../../..");
const javaSrcPath = path.join(
  backendRoot,
  "src",
  "modules",
  "identity",
  "java",
  "NfcEvidenceVerifier.java",
);
const javaBuildDir = path.join(backendRoot, ".cache", "nfc-java");
const javaClassPath = path.join(javaBuildDir, "NfcEvidenceVerifier.class");
const javaLibDir = path.join(backendRoot, "vendor", "java");
const jmrtdJarPath = path.join(javaLibDir, "jmrtd-0.7.42.jar");
const bcprovJarPath = path.join(javaLibDir, "bcprov-jdk18on-1.79.jar");

function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [key, value] of nonceStore.entries()) {
    if (value.expiresAt <= now) {
      nonceStore.delete(key);
    }
  }
}

async function ensureJavaVerifierCompiled(): Promise<void> {
  try {
    await fs.access(javaClassPath);
    return;
  } catch {
    // fall through
  }

  await fs.mkdir(javaBuildDir, { recursive: true });
  await execFileAsync("javac", [
    "-cp",
    `${jmrtdJarPath}:${bcprovJarPath}`,
    "-d",
    javaBuildDir,
    javaSrcPath,
  ]);
}

async function writeTempBinary(prefix: string, base64: string): Promise<string> {
  const filePath = path.join(
    os.tmpdir(),
    `${prefix}-${crypto.randomUUID().replace(/-/g, "")}.bin`,
  );
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return filePath;
}

function ensureRawFile(
  raw: RawLdsFile | undefined,
  fieldName: string,
): RawLdsFile {
  if (!raw?.base64) {
    throw new HttpError(400, `${fieldName} base64 evidence is required`);
  }
  return raw;
}

export const nfcVerifier = {
  issueChallenge() {
    cleanupExpiredNonces();

    const challengeBase64 = crypto.randomBytes(8).toString("base64");
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

    nonceStore.set(challengeId, {
      challengeBase64,
      expiresAt: Date.now() + NONCE_TTL_MS,
    });

    return {
      challengeId,
      challengeBase64,
      expiresAt,
    };
  },

  consumeChallenge(challengeId: string): string {
    cleanupExpiredNonces();

    const entry = nonceStore.get(challengeId);
    if (!entry) {
      throw new HttpError(400, "Challenge is missing, expired, or already used");
    }

    nonceStore.delete(challengeId);
    return entry.challengeBase64;
  },

  async verifyEvidence(request: VerificationRequest): Promise<VerificationResult> {
    const dg1 = ensureRawFile(request.evidence.dg1, "DG1");
    const dg2 = ensureRawFile(request.evidence.dg2, "DG2");
    const dg15 = ensureRawFile(request.evidence.dg15, "DG15");
    const sod = ensureRawFile(request.evidence.sod?.raw, "EF.SOD");
    const activeAuthentication = request.evidence.activeAuthentication;

    if (!activeAuthentication?.performed || !activeAuthentication.response) {
      throw new HttpError(400, "Active authentication proof is required");
    }

    if (activeAuthentication.challenge !== request.challengeBase64) {
      throw new HttpError(400, "AA challenge mismatch");
    }

    await ensureJavaVerifierCompiled();

    const tempPaths = await Promise.all([
      writeTempBinary("dg1", dg1.base64),
      writeTempBinary("dg2", dg2.base64),
      writeTempBinary("dg15", dg15.base64),
      writeTempBinary("sod", sod.base64),
    ]);

    try {
      const { stdout } = await execFileAsync("java", [
        "-cp",
        `${javaBuildDir}:${jmrtdJarPath}:${bcprovJarPath}`,
        "NfcEvidenceVerifier",
        "--dg1",
        tempPaths[0],
        "--dg2",
        tempPaths[1],
        "--dg15",
        tempPaths[2],
        "--sod",
        tempPaths[3],
        "--challenge",
        request.challengeBase64,
        "--aa-response",
        activeAuthentication.response,
        "--aa-digest",
        activeAuthentication.digestAlgorithm || "",
        "--aa-signature",
        activeAuthentication.signatureAlgorithm || "",
        "--aa-signature-oid",
        activeAuthentication.signatureAlgorithmOid || "",
        "--csca",
        env.cscaCertsPath || "",
      ]);

      const parsed = JSON.parse(stdout) as VerificationResult & {
        error?: string;
      };

      if (parsed.error) {
        throw new HttpError(400, parsed.error);
      }

      if (!parsed.passiveAuth.hashVerified || !parsed.passiveAuth.sodSignatureVerified) {
        throw new HttpError(400, "Passive authentication failed");
      }

      if (!parsed.activeAuth.challengeMatched || !parsed.activeAuth.signatureVerified) {
        throw new HttpError(400, "Active authentication failed");
      }

      return parsed;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Failed to verify NFC evidence";
      throw new HttpError(400, message);
    } finally {
      await Promise.all(tempPaths.map((tempPath) => fs.rm(tempPath, { force: true })));
    }
  },
};
