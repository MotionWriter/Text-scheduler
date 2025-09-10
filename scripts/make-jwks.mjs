#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicKey } from "node:crypto";
import { importPKCS8, importSPKI, exportJWK, calculateJwkThumbprint } from "jose";

// Usage: node scripts/make-jwks.mjs <private_pkcs8.pem> <output_jwks.json>
const [, , privateKeyPath = "private_pkcs8.pem", outputPath = "jwks.json"] = process.argv;

try {
  const pem = readFileSync(privateKeyPath, "utf8");

  // Validate and import as RS256 PKCS8
  await importPKCS8(pem, "RS256");

  // Derive public key from the private key PEM
  const publicPem = createPublicKey(pem).export({ type: "spki", format: "pem" });
  const publicKey = await importSPKI(publicPem.toString(), "RS256");

  // Convert public key to JWK and add metadata
  const jwk = await exportJWK(publicKey);
  const kid = await calculateJwkThumbprint(jwk, "sha256");
  const jwks = {
    keys: [
      {
        ...jwk,
        use: "sig",
        alg: "RS256",
        kid,
      },
    ],
  };

  writeFileSync(outputPath, JSON.stringify(jwks));
  console.log(`Wrote ${outputPath} with kid=${kid}`);
} catch (err) {
  console.error("Failed to generate JWKS:", err?.message ?? err);
  process.exit(1);
}

