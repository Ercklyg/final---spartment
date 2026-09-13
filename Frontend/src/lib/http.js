const base=(import.meta.env.VITE_API_URL||'/api').replace(/\/$/,'');

// Auth credentials are HttpOnly cookies; no token is read or supplied by JavaScript.
export async function browserRequest(path,options={}) {
  let response,data;
  try {
    response=await fetch(base+path,{...options,credentials:'include',cache:'no-store',
      signal:options.signal||(path.startsWith('/auth/')?AbortSignal.timeout(15000):undefined),
      headers:{'Content-Type':'application/json','X-Spartment-Request':'1',...options.headers}});
    data=await response.json();
  }catch(error){
    if(error.name==='AbortError')throw error;
    if(error.name==='TimeoutError')throw new Error('The account request timed out. Please retry.',{cause:error});
    throw new Error('Unable to reach the backend. Make sure the backend server is running.',{cause:error});
  }
  if(!response.ok){const error=new Error(data.error||'Request failed.');error.status=response.status;error.code=data.code;throw error;}
  return data;
}
