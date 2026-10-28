import './PageSkeleton.css';

export function SkeletonBlock({className='',style}) {
  return <span aria-hidden="true" className={'skeleton-block '+className} style={style}/>;
}
const repeat=(count,render)=>Array.from({length:count},(_,index)=>render(index));
function Lines() {
  return <div className="skeleton-lines"><SkeletonBlock className="skeleton-line skeleton-wide"/><SkeletonBlock className="skeleton-line skeleton-medium"/></div>;
}
function Cards({rooms=false,count=3}) {
  return <div className={'skeleton-cards'+(rooms?' skeleton-room-cards':'')}>{repeat(count,index=><div className="skeleton-panel" key={index}>
    {rooms?<SkeletonBlock className="skeleton-image"/>:<SkeletonBlock className="skeleton-avatar"/>}
    <Lines/><SkeletonBlock className="skeleton-value"/><SkeletonBlock className="skeleton-line skeleton-medium"/>
    {rooms&&<SkeletonBlock className="skeleton-input"/>}
  </div>)}</div>;
}
function Table({rows=5}) {
  return <div className="skeleton-panel"><Lines/><div className="skeleton-table">{repeat(rows,index=><div className="skeleton-row" key={index}>{repeat(4,column=><SkeletonBlock key={column} className="skeleton-line"/>)}</div>)}</div></div>;
}
function Form({fields=4}) {
  return <div className="skeleton-panel"><Lines/><div className="skeleton-fields">{repeat(fields,index=><div className="skeleton-lines" key={index}><SkeletonBlock className="skeleton-line skeleton-medium"/><SkeletonBlock className="skeleton-input"/></div>)}</div><SkeletonBlock className="skeleton-button"/></div>;
}
function Chart() {
  return <div className="skeleton-panel"><Lines/><div className="skeleton-chart">{[42,65,50,82,62,92].map((height,index)=><SkeletonBlock key={index} className="skeleton-bar" style={{height:height+'%'}}/>)}</div></div>;
}
function Analytics() {
  return <div className="skeleton-analytics">
    <div className="skeleton-columns"><Chart/><Table rows={4}/></div>
  </div>;
}
function Content({variant}) {
  switch(variant){
    case 'rooms': return <Cards rooms count={6}/>;
    case 'tenants': return <Cards count={6}/>;
    case 'form': case 'account': return <Form/>;
    case 'password': return <Form fields={2}/>;
    case 'bill': return <div className="skeleton-panel"><Lines/><SkeletonBlock className="skeleton-value"/><Lines/></div>;
    case 'list': return <div className="skeleton-list">{repeat(3,index=><div className="skeleton-list-item" key={index}><SkeletonBlock className="skeleton-avatar"/><Lines/></div>)}</div>;
    case 'table': return <Table rows={4}/>;
    case 'billing': return <><Form/><Cards count={4}/><Table/></>;
    case 'tenant-billing': return <><Cards/><Table/><Table rows={3}/></>;
    case 'analytics': return <Analytics/>;
    case 'auth': return <div className="skeleton-auth"><div className="skeleton-auth-intro"><SkeletonBlock className="skeleton-title"/><Lines/><SkeletonBlock className="skeleton-image"/></div><Form fields={2}/></div>;
    default: return <><Cards/><div className="skeleton-columns"><Table rows={4}/><Chart/></div><Table rows={3}/></>;
  }
}
export default function PageSkeleton({variant='dashboard',label='Loading page...',fullPage=false}) {
  return <div role="status" aria-label={label} aria-busy="true" className={'page-skeleton'+(fullPage?' skeleton-full-page':'')}>
    <span className="skeleton-sr-only">{label}</span>
    <div aria-hidden="true" className="skeleton-content"><Content variant={variant}/></div>
  </div>;
}
