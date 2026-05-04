"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface SignatureVerificationBadgeProps {
  cisId: string;
  signedAt: Date | null;
  dataUrl: string | null;
  seal: string | null;
}

export function SignatureVerificationBadge({
  cisId,
  signedAt,
  dataUrl,
  seal,
}: SignatureVerificationBadgeProps) {
  const [verified, setVerified] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only verify on client side to avoid hydration mismatch
    async function verifySignature() {
      try {
        const res = await fetch(`/api/cis/${cisId}/verify-signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedAt, dataUrl, seal }),
        });
        const data = await res.json();
        setVerified(data.verified);
      } catch {
        setVerified(false);
      }
    }

    if (signedAt && dataUrl && seal) {
      verifySignature();
    }
  }, [cisId, signedAt, dataUrl, seal]);

  // Don't render verification status during SSR to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  if (!seal) {
    return null;
  }

  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
      <ShieldCheck className="h-3 w-3" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
      <ShieldAlert className="h-3 w-3" />
      Seal mismatch
    </span>
  );
}
