import { Effect, Context, Layer } from "effect";

export class SignatureValidationError {
  readonly _tag = "SignatureValidationError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export interface DiscordSignatureVerifier {
  readonly verify: (
    body: string,
    signature: string,
    timestamp: string,
    publicKey: string
  ) => Effect.Effect<boolean, SignatureValidationError>;
}

export const DiscordSignatureVerifier = Context.GenericTag<DiscordSignatureVerifier>("@services/DiscordSignatureVerifier");

export const DiscordSignatureVerifierLive = Layer.succeed(
  DiscordSignatureVerifier,
  {
    verify: (body, signature, timestamp, publicKey) =>
      Effect.tryPromise({
        try: async () => {
          if (!signature || !timestamp || !publicKey) {
            return false;
          }

          const hexToBytes = (hex: string) => {
            const cleanHex = hex.trim();
            if (cleanHex.length % 2 !== 0) {
              throw new Error("Invalid hex string length");
            }
            const bytes = new Uint8Array(cleanHex.length / 2);
            for (let i = 0; i < bytes.length; i++) {
              bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
            }
            return bytes;
          };

          const keyBytes = hexToBytes(publicKey);
          const sigBytes = hexToBytes(signature);

          const key = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "Ed25519" },
            false,
            ["verify"]
          );

          const encoder = new TextEncoder();
          const data = encoder.encode(timestamp + body);

          return await crypto.subtle.verify("Ed25519", key, sigBytes, data);
        },
        catch: (error) => new SignatureValidationError(`Signature verification failed: ${error}`, error)
      })
  }
);
