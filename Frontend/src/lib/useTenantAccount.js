import { useEffect, useState } from "react";
import { api } from "./api.js";
import { loadTenantAccount } from "./tenantAccount.js";

export function useTenantAccount() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadTenantAccount(api.withSignal(controller.signal,{force:revision>0})).then(data => { setAccount(data); setError(""); })
      .catch(error => { if(error?.name!=='AbortError'){setAccount(null);setError(error.message);} })
      .finally(() => { if(!controller.signal.aborted)setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const retry = () => { setLoading(true); setAccount(null); setError(""); setRevision(value => value + 1); };
  return { account, error, loading, retry };
}
