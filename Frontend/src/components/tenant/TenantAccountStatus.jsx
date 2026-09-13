import PageSkeleton from "../PageSkeleton.jsx";
export default function TenantAccountStatus({ loading, error, retry, variant='account' }) {
  if (loading) return <PageSkeleton variant={variant} label="Loading your account..."/>;
  if (error) return <p role="alert" className="py-6 text-rose-700">{error} <button onClick={retry} className="underline">Retry</button></p>;
  return null;
}
