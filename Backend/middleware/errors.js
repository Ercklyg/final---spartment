import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(status,message,code,options={}){
    super(message,{cause:options.cause});
    this.status=status;
    if(code)this.code=code;
    if(options.report)this.report=true;
  }
}

export const serviceError = (status,message,cause) =>
  new HttpError(status,message,'operation_failed',{cause,report:true});

export function errorHandler(error,req,res,next) {
  if(res.headersSent)return next(error);
  const status=error.status || 500;
  const code=error instanceof HttpError?error.code:undefined;
  const shouldReport=!(error instanceof HttpError)||error.report;
  const errorId=shouldReport?randomUUID().slice(0,8).toUpperCase():undefined;
  if(shouldReport)console.error('[request-error]',{
    errorId,requestId:req.requestId,method:req.method,path:req.originalUrl,status,
    name:error.cause?.name||error.name||'Error',
    providerCode:error.cause?.code||error.code||undefined,
  });
  const publicMessages={
    auth_unavailable:'Authentication is temporarily unavailable. Please try again later.',
    recovery_email_unavailable:'Unable to send a reset email right now. Please try again later or contact your administrator.',
    recovery_storage_unavailable:'Password recovery storage is temporarily unavailable. Please retry.',
  };
  const message=status>=500
    ? Object.hasOwn(publicMessages,code)?publicMessages[code]:'Unable to complete the request. Please retry.'
    : error.message;
  res.status(status).json({error:message,...(code?{code}:{}),...(errorId?{errorId}:{})});
}
