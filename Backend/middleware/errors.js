export class HttpError extends Error {
  constructor(status,message,code){super(message);this.status=status;if(code)this.code=code;}
}
export function errorHandler(error,req,res,next) {
  if(res.headersSent)return next(error);
  const status=error.status || 500;
  const code=error instanceof HttpError?error.code:undefined;
  const publicMessages={
    auth_unavailable:'Authentication is temporarily unavailable. Please try again later.',
    recovery_email_unavailable:'Unable to send a reset email right now. Please try again later or contact your administrator.',
    recovery_storage_unavailable:'Password recovery storage is temporarily unavailable. Please retry.',
  };
  const message=status>=500
    ? Object.hasOwn(publicMessages,code)?publicMessages[code]:'Unable to complete the request. Please retry.'
    : error.message;
  res.status(status).json({error:message,...(code?{code}:{})});
}
