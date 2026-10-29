import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Box, Building2, LoaderCircle, Maximize2, Minus, MousePointer2, Plus, RotateCcw, X } from 'lucide-react';
import buildingPreview from '../../assets/main-building-miniature.png';
import buildingTwoPreview from '../../assets/building-2-miniature.png';
import buildingThreePreview from '../../assets/building-3-miniature.png';
import './BuildingViewer.css';

const views = [['overview', 'Overview'], ['front', 'Front'], ['side', 'Side'], ['rear', 'Rear'], ['top', 'Top']];
const buildings = {
  main: { name: 'Main Building', subtitle: 'Exterior miniature · 2 floors', preview: buildingPreview, alt: 'Miniature of Main Building with blue walls, a silver roof, balcony and gated parking', note: 'Photo-based miniature. Proportions are approximate.' },
  building2: { name: 'Building 2', subtitle: '6 rooms · 2 floors · 13 m² each', preview: buildingTwoPreview, alt: 'Concept miniature of Building 2 with blue walls, a flat gray roof and silver balcony railings', note: 'Concept miniature based on room details; exterior design is illustrative.' },
  building3: { name: 'Building 3', subtitle: '4 rooms · 1 floor · 14 m² each', preview: buildingThreePreview, alt: 'Concept miniature of single-storey Building 3 with light orange walls, a gable roof and an open veranda without railings', note: 'Concept miniature based on room details; exterior design is illustrative.' },
};

export default function BuildingViewer({ compact = false, building = 'main' }) {
  const details = buildings[building] || buildings.main;
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const helpId = `${instanceId}-help`;
  const hostRef = useRef(null);
  const dialogRef = useRef(null);
  const viewerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState('overview');
  const [expanded, setExpanded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!preference) return;
    const changed = event => setReducedMotion(event.matches);
    preference.addEventListener('change', changed);
    return () => preference.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    // Compact viewers are used on the public landing page. Keep their preview
    // lightweight and load Three.js only after an explicit visitor action.
    if (compact || reducedMotion) return;
    const activate = () => {
      setStatus('loading');
      setActive(true);
    };
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(activate);
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      activate();
    }, { rootMargin: '0px' });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [compact, reducedMotion]);

  useEffect(() => {
    if (!active) return;
    let current = true;
    let viewer;
    import('./buildingScene.js').then(({ createBuildingViewer }) => {
      if (!current) return;
      viewer = createBuildingViewer(hostRef.current, () => setView('custom'), () => setStatus('error'), { building, name: details.name, helpId });
      viewerRef.current = viewer;
      setStatus('ready');
    }).catch(() => { if (current) setStatus('error'); });
    return () => {
      current = false;
      viewer?.dispose();
      viewerRef.current = null;
    };
  }, [active, attempt, building, details.name, helpId]);

  const ready = status === 'ready';
  function loadModel() {
    setStatus('loading');
    setActive(true);
    setView('overview');
    setAttempt(previous => previous + 1);
  }
  function chooseView(next) {
    viewerRef.current?.setView(next);
    setView(next);
  }
  function rotate(direction) {
    viewerRef.current?.rotate(direction * Math.PI / 8);
    setView('custom');
  }
  function toggleExpanded() {
    const dialog = dialogRef.current;
    if (expanded) {
      dialog.close();
      dialog.show();
      setExpanded(false);
    }
    else {
      dialog.close();
      dialog.showModal();
      setExpanded(true);
    }
  }

  return <section id={building === 'main' ? 'building-tour' : `building-tour-${building}`} className={`building-tour ${compact ? 'building-tour-compact' : ''}`} aria-labelledby={compact ? undefined : titleId} aria-label={compact ? `${details.name} 3D tour` : undefined}>
    {!compact && <div className="building-tour-heading">
      <div>
        <p className="building-tour-eyebrow"><Box size={14} aria-hidden="true" />Explore before you visit</p>
        <h2 id={titleId}>A new perspective on home.</h2>
        <p>Explore a miniature of {details.name} from every angle.</p>
      </div>
      <span className="building-tour-chip"><Building2 size={15} aria-hidden="true" />{details.name} · {building === 'building3' ? '1 floor' : '2 floors'}</span>
    </div>}

    <dialog ref={dialogRef} open onCancel={event => { event.preventDefault(); toggleExpanded(); }} className={`building-viewer ${expanded ? 'building-viewer-expanded' : ''}`} aria-label={`${details.name} interactive 3D viewer`}>
      <div className="building-viewer-toolbar">
        <div className="building-viewer-title"><span><Box size={19} aria-hidden="true" /></span><div><strong>{details.name}</strong><small>{details.subtitle}</small></div></div>
        <button type="button" className="building-icon-button" aria-label={expanded ? 'Close expanded viewer' : 'Expand building viewer'} onClick={toggleExpanded}>{expanded ? <X size={18} /> : <Maximize2 size={17} />}</button>
      </div>

      <div className="building-viewport">
        <div ref={hostRef} className="building-canvas" />
        {!active && <div className="building-viewer-cover">
          {details.preview && <img src={details.preview} alt={details.alt} loading="lazy" />}
          {(compact || reducedMotion) && <button type="button" onClick={loadModel} className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-slate-950/85 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">Load interactive 3D view</button>}
        </div>}
        {status === 'loading' && <div className="building-viewer-message" role="status"><LoaderCircle className="animate-spin" size={26} /><strong>Building your view…</strong></div>}
        {status === 'error' && <div className="building-viewer-message" role="alert"><Box size={28} /><strong>The 3D view couldn’t load.</strong><p>Try again or use a browser with 3D graphics enabled.</p><button type="button" onClick={loadModel}>Try again</button></div>}
        {ready && <>
          <span className="building-model-badge"><span />Miniature view</span>
          <div className="building-view-tools">
            <button type="button" className="building-icon-button" aria-label="Zoom in" onClick={() => viewerRef.current?.zoom(0.85)}><Plus size={18} /></button>
            <button type="button" className="building-icon-button" aria-label="Zoom out" onClick={() => viewerRef.current?.zoom(1.15)}><Minus size={18} /></button>
            <span />
            <button type="button" className="building-icon-button" aria-label="Reset building view" onClick={() => chooseView('overview')}><RotateCcw size={17} /></button>
          </div>
          <div className="building-rotate-tools" role="group" aria-label="Rotate building">
            <button type="button" className="building-icon-button" aria-label="Rotate building left" onClick={() => rotate(-1)}><ArrowLeft size={16} /></button>
            <span><MousePointer2 size={13} />Drag to rotate</span>
            <button type="button" className="building-icon-button" aria-label="Rotate building right" onClick={() => rotate(1)}><ArrowRight size={16} /></button>
          </div>
        </>}
      </div>

      <div className="building-viewer-bottom">
        <div className="building-presets" role="group" aria-label="Building viewpoints">
          {views.map(([key, title]) => <button key={key} type="button" disabled={!ready} aria-pressed={view === key} onClick={() => chooseView(key)}>{title}</button>)}
        </div>
      </div>
      <div className="building-viewer-caption">
        <p id={helpId}>Drag to rotate · Scroll or pinch to zoom · Arrow keys when the model is focused</p>
        <p>{details.note}</p>
      </div>
    </dialog>
  </section>;
}
