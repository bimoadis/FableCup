/**
 * Minimal Phantom connector. No wallet-adapter dependency: for an MVP
 * the injected provider API is enough and keeps the bundle small.
 * Upgrade path: @solana/wallet-adapter-react (see DEVELOPER-BRIEF.md).
 */

type PhantomProvider = {
  isPhantom?: boolean;
  connect: (opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
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

export function shortAddress(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}
