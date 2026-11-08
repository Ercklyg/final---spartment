// Consume the fragment before React renders or makes any network request.
export const isEmailApprovalPage = window.location.pathname.replace(/\/$/, '') === '/approve-email-change';
export const emailApprovalToken = isEmailApprovalPage ? new URLSearchParams(window.location.hash.slice(1)).get('token') : null;
if (isEmailApprovalPage) window.history.replaceState(null, '', '/approve-email-change');
