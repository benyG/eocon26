"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type CheckinAuthState = "loading" | "allowed" | "denied";

export function useCheckinAuth() {
  const [state, setState] = useState<CheckinAuthState>("loading");
  const [userName, setUserName] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/checkin/access")
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || "Admin");
          setState("allowed");
        } else if (res.status === 401) {
          router.replace("/admin/login?redirect=/checkin");
        } else {
          setState("denied");
        }
      })
      .catch(() => setState("denied"));
  }, [router]);

  return { state, userName };
}
