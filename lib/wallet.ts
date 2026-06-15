/**
 * Minimal Phantom connector. No wallet-adapter dependency: for an MVP
 * the injected provider API is enough and keeps the bundle small.
 * Upgrade path: @solana/wallet-adapter-react (see DEVELOPER-BRIEF.md).
 */

import bs58 from "bs58";

type PhantomProvider = {
  isPhantom?: boolean;
  connect: (opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signMessage: (
    message: Uint8Array,
    encoding: string
  ) => Promise<{ signature: Uint8Array }>;
};

function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { solana?: PhantomProvider };
  return w.solana?.isPhantom ? w.solana : null;
}

export async function connectPhantom(): Promise<
  { ok: true; address: string } | { ok: false; error: string }
> {
  const provider = getProvider();
  if (!provider) {
    window.open("https://phantom.app/", "_blank", "noopener");
    return {
      ok: false,
      error: "Phantom not detected. Install it, then try again.",
    };
  }
  try {
    const res = await provider.connect();
    return { ok: true, address: res.publicKey.toString() };
  } catch {
    return { ok: false, error: "Connection was declined." };
  }
}

export async function signPhantomMessage(
  messageStr: string
): Promise<{ ok: true; signature: string } | { ok: false; error: string }> {
  const provider = getProvider();
  if (!provider) {
    return { ok: false, error: "Phantom wallet not found." };
  }
  try {
    const encodedMessage = new TextEncoder().encode(messageStr);
    const { signature } = await provider.signMessage(encodedMessage, "utf8");
    const signatureBase58 = bs58.encode(signature);
    return { ok: true, signature: signatureBase58 };
  } catch (err) {
    return {
      ok: false,
      error:
        "Signature request was declined: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}

export function shortAddress(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

