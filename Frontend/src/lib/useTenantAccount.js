import { useEffect, useState } from "react";
import { api } from "./api.js";
import { loadTenantAccount } from "./tenantAccount.js";

export function useTenantAccount() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loadTenantAccount(api).then(data => { if (active) { setAccount(data); setError(""); } })
      .catch(error => { if (active) { setAccount(null); setError(error.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const retry = () => { setLoading(true); setAccount(null); setError(""); setRevision(value => value + 1); };
  return { account, error, loading, retry };
}
