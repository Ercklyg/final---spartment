import { randomUUID } from 'node:crypto';

export function slowRequestThreshold() {
  const configured=Number(process.env.SLOW_REQUEST_MS);
  return Number.isFinite(configured)&&configured>=100?configured:1500;
}

export function requestMonitoring(req,res,next) {
  const started=process.hrtime.bigint();
  req.requestId=randomUUID().slice(0,8).toUpperCase();
  res.setHeader('X-Request-ID',req.requestId);
  res.once('finish',()=>{
    const durationMs=Math.round(Number(process.hrtime.bigint()-started)/1_000_000);
    if(durationMs<slowRequestThreshold())return;
    console.warn('[slow-request]',{
      requestId:req.requestId,
      method:req.method,
      path:req.originalUrl,
      status:res.statusCode,
      durationMs,
    });
  });
  next();
}
