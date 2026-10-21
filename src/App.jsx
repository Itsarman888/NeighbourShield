import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { AlertTriangle, ArrowUpRight, BellRing, CheckCircle2, ChevronDown, Clock3, Crosshair, Flame, HeartPulse, MapPin, Menu, ShieldCheck, Siren, Waves, X } from "lucide-react";

const INDIA_CENTER = [22.9734, 78.6569];
const categories = ["Road hazard", "Medical help needed", "Fire / smoke", "Flooding", "Unsafe area", "Other"];
const severities = ["Low", "Medium", "High", "Critical"];
const categoryIcons = {
  "Road hazard": AlertTriangle, "Medical help needed": HeartPulse, "Fire / smoke": Flame,
  "Flooding": Waves, "Unsafe area": ShieldCheck, "Other": BellRing
};
const initialReports = [
  { id: "sample-1", category: "Road hazard", severity: "Medium", details: "Large pothole reported near the crossing. Please slow down and take care.", area: "Demo · Pune", lat: 18.5204, lng: 73.8567, created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(), sample: true },
  { id: "sample-2", category: "Flooding", severity: "High", details: "Waterlogging reported on the service road after heavy rain. Conditions are unverified.", area: "Demo · Mumbai", lat: 19.076, lng: 72.8777, created_at: new Date(Date.now() - 1000 * 60 * 43).toISOString(), sample: true },
  { id: "sample-3", category: "Unsafe area", severity: "Low", details: "Street light appears to be out on this stretch after sunset.", area: "Demo · Jaipur", lat: 26.9124, lng: 75.7873, created_at: new Date(Date.now() - 1000 * 60 * 88).toISOString(), sample: true }
];
function makeIcon(severity, selected = false) {
  const color = severity === "Critical" ? "#c63b32" : severity === "High" ? "#e87932" : severity === "Medium" ? "#d5a12a" : "#347c66";
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="marker-pin ${selected ? "marker-selected" : ""}" style="--pin:${color}"><span></span></div>`,
    iconSize: [30, 38], iconAnchor: [15, 34], popupAnchor: [0, -30]
  });
}
function MapClick({ onPick }) {
  useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}
function Recenter({ point }) {
  const map = useMap();
  useEffect(() => { if (point) map.flyTo(point, Math.max(map.getZoom(), 12), { duration: 0.65 }); }, [point, map]);
  return null;
}
function timeAgo(date) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}
function App() {
  const [reports, setReports] = useState([]);
  const [mode, setMode] = useState("demo");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All reports");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [form, setForm] = useState({ category: "Road hazard", severity: "Medium", details: "", area: "" });
  const [picked, setPicked] = useState([19.076, 72.8777]);

  useEffect(() => {
    let active = true;
    const local = () => {
      try { return JSON.parse(localStorage.getItem("neighbourshield-reports") || "[]"); } catch { return []; }
    };
    fetch("/api/health").then(r => r.ok ? r.json() : null).then(h => {
      if (active && h?.storage === "supabase") {
        setMode("cloud");
        return fetch("/api/reports").then(r => r.ok ? r.json() : Promise.reject()).then(data => {
          if (active) setReports([...(data.reports || []), ...initialReports]);
        });
      }
      if (active) { setMode("demo"); setReports([...local(), ...initialReports]); }
    }).catch(() => {
      if (active) { setMode("demo"); setReports([...local(), ...initialReports]); }
    });
    return () => { active = false; };
  }, []);

  const visibleReports = useMemo(() => reports.filter(r => filter === "All reports" || r.category === filter), [reports, filter]);
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const useMyLocation = () => {
    if (!navigator.geolocation) { setNotice("This browser does not support location. Click the map to place a pin."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        if (p[0] < 6 || p[0] > 38 || p[1] < 68 || p[1] > 98) { setNotice("This prototype currently accepts map pins in India. Click a location in India instead."); return; }
        setPicked(p); setSelected(p); setShowForm(true); setNotice("Location selected. Check the pin before submitting.");
      },
      () => setNotice("Location permission was not granted. You can click anywhere on the map to place a pin."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };
  const submitReport = async e => {
    e.preventDefault();
    if (!picked || picked[0] < 6 || picked[0] > 38 || picked[1] < 68 || picked[1] > 98) { setNotice("Choose a location inside India on the map."); return; }
    if (form.details.trim().length < 8) { setNotice("Please add at least 8 characters describing the issue."); return; }
    setSaving(true); setNotice("");
    const body = { ...form, details: form.details.trim(), area: form.area.trim(), lat: picked[0], lng: picked[1] };
    try {
      if (mode === "cloud") {
        const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not save report.");
        setReports(old => [result.report, ...old]);
      } else {
        const report = { ...body, id: `local-${Date.now()}`, created_at: new Date().toISOString(), local: true };
        const next = [report, ...reports.filter(r => r.local)];
        localStorage.setItem("neighbourshield-reports", JSON.stringify(next));
        setReports(old => [report, ...old]);
      }
      setSelected(picked); setShowForm(false);
      setForm({ category: "Road hazard", severity: "Medium", details: "", area: "" });
      setNotice(mode === "cloud" ? "Report shared with this community map." : "Report saved on this browser in demo mode.");
    } catch (err) { setNotice(err.message || "Could not save report. Please try again."); }
    finally { setSaving(false); }
  };

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="NeighbourShield home"><span className="brand-mark"><ShieldCheck size={22}/></span><span>neighbour<span className="brand-light">shield</span><small>COMMUNITY SAFETY NETWORK</small></span></a>
      <nav className="topnav"><a className="active" href="#map">Live map</a><a href="#reports">Community reports</a><a href="#how">How it works</a></nav>
      <div className="top-actions"><span className={`status-dot ${mode === "cloud" ? "online" : ""}`}></span><span className="mode-label">{mode === "cloud" ? "Shared map" : "Demo mode"}</span><button className="mobile-menu" onClick={() => setMobilePanel(!mobilePanel)} aria-label="Toggle menu">{mobilePanel ? <X/> : <Menu/>}</button><button className="btn btn-dark btn-small" onClick={() => { setShowForm(true); setNotice(""); }}><MapPin size={16}/> Report an issue</button></div>
    </header>
    {mobilePanel && <div className="mobile-nav"><a href="#map" onClick={() => setMobilePanel(false)}>Live map</a><a href="#reports" onClick={() => setMobilePanel(false)}>Community reports</a><a href="#how" onClick={() => setMobilePanel(false)}>How it works</a></div>}
    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"></span> LOCAL ALERTS. STRONGER COMMUNITIES.</div><h1>Look out for<br/><em>each other.</em></h1><p>A shared safety map for the places we call home. Pin a hazard, flag a concern, and help neighbours stay informed.</p><div className="hero-actions"><button className="btn btn-primary" onClick={() => { setShowForm(true); setNotice(""); }}><MapPin size={17}/> Pin a community alert <ArrowUpRight size={16}/></button><button className="btn btn-quiet" onClick={() => document.getElementById("map")?.scrollIntoView({ behavior: "smooth" })}>Explore the map <span>↓</span></button></div><div className="trust-row"><span><CheckCircle2 size={15}/> No sign-up required</span><span><Crosshair size={15}/> Pinpoint on map</span><span><ShieldCheck size={15}/> Community-powered</span></div></div>
        <div className="hero-art" aria-label="Community safety illustration"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-circle"><div className="house house-back"></div><div className="house house-front"><div className="roof"></div><div className="house-body"><div className="window"></div><div className="door"></div></div></div><div className="art-tree tree-one"></div><div className="art-tree tree-two"></div><div className="art-path"></div><div className="art-pin"><MapPin size={25}/></div><div className="float-card float-top"><span className="float-icon"><ShieldCheck size={16}/></span><span><b>Community first</b><small>Safety starts nearby</small></span></div><div className="float-card float-bottom"><span className="pulse"></span><span><b>Stay aware</b><small>Look out for one another</small></span></div></div><div className="art-spark spark-a">✳</div><div className="art-spark spark-b">✦</div></div>
      </section>
      <section className="safety-banner"><div className="safety-icon"><Siren size={23}/></div><div><strong>In an emergency, call 112 first.</strong><span>NeighbourShield does not dispatch emergency services. This community map is not monitored by official responders.</span></div><a href="tel:112" className="call-button">Call 112 <ArrowUpRight size={15}/></a></section>
      <section className="workspace" id="map">
        <div className="map-column"><div className="section-heading"><div><div className="eyebrow">COMMUNITY PULSE</div><h2>Safety around you<span className="heading-period">.</span></h2><p>Explore recent community reports across India.</p></div><div className="map-tools"><button className="btn btn-outline" onClick={useMyLocation}><Crosshair size={16}/> Use my location</button></div></div>
          <div className="map-frame"><MapContainer center={INDIA_CENTER} zoom={5} minZoom={4} maxZoom={18} scrollWheelZoom={true} className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapClick onPick={p => { if (p[0] >= 6 && p[0] <= 38 && p[1] >= 68 && p[1] <= 98) { setPicked(p); setSelected(p); setShowForm(true); setNotice("Pin placed. Add details to submit the report."); } else setNotice("Please choose a point inside India."); }}/><Recenter point={selected}/>{visibleReports.filter(r => !r.sample || reports.length < 30).map(r => <Marker key={r.id} position={[r.lat, r.lng]} icon={makeIcon(r.severity)}><Popup><div className="popup-content"><span className={`severity-pill severity-${r.severity.toLowerCase()}`}>{r.severity} priority</span><b>{r.category}</b><p>{r.details}</p><small>{r.area || "Community report"} · {timeAgo(r.created_at)}{r.sample ? " · sample" : ""}</small></div></Popup></Marker>)}{selected && <Marker position={selected} icon={L.divIcon({ className: "custom-marker", html: '<div class="draft-pin"><span></span></div>', iconSize: [28, 36], iconAnchor: [14, 32] })}><Popup>Selected report location</Popup></Marker>}</MapContainer><div className="map-legend"><span><i className="legend-dot critical"></i> Critical</span><span><i className="legend-dot high"></i> High</span><span><i className="legend-dot medium"></i> Medium</span><span><i className="legend-dot low"></i> Low</span></div><div className="map-hint"><MapPin size={14}/> Click the map to place a report pin</div></div>
          <div className="map-footnote"><span>Map data © OpenStreetMap contributors</span><span>Locations are user-submitted and unverified</span></div>
        </div>
        <aside className="reports-column" id="reports"><div className="reports-head"><div><div className="eyebrow">NEARBY SIGNALS</div><h2>Community reports <span className="count-badge">{visibleReports.length}</span></h2></div><button className="icon-btn" aria-label="Refresh reports" onClick={() => { if (mode === "cloud") fetch("/api/reports").then(r => r.json()).then(d => setReports([...(d.reports || []), ...initialReports])).catch(() => setNotice("Could not refresh reports.")); else setReports(old => [...old]); }}><Clock3 size={17}/></button></div>
          <div className="filter-wrap"><label htmlFor="category-filter">Filter by type</label><div className="select-wrap"><select id="category-filter" value={filter} onChange={e => setFilter(e.target.value)}><option>All reports</option>{categories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={15}/></div></div>
          <div className="report-list">{visibleReports.slice(0, 8).map(report => { const Icon = categoryIcons[report.category] || BellRing; return <article className="report-card" key={report.id}><div className={`report-icon icon-${report.severity.toLowerCase()}`}><Icon size={18}/></div><div className="report-content"><div className="report-title-row"><h3>{report.category}</h3><span className={`severity-pill severity-${report.severity.toLowerCase()}`}>{report.severity}</span></div><p>{report.details}</p><div className="report-meta"><span><MapPin size={12}/>{report.area || `${report.lat.toFixed(3)}, ${report.lng.toFixed(3)}`}</span><span><Clock3 size={12}/>{timeAgo(report.created_at)}</span></div>{report.sample && <span className="sample-tag">SAMPLE REPORT</span>}</div></article>; })}{visibleReports.length === 0 && <div className="empty-state"><ShieldCheck size={25}/><b>No reports in this filter</b><span>Try another category or add a community report.</span></div>}</div>
          <button className="btn btn-outline full-width" onClick={() => { setFilter("All reports"); document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" }); }}>View all categories <ArrowUpRight size={15}/></button>
          <div className="report-note"><AlertTriangle size={15}/><span>Reports are community-submitted and unverified. Use your judgement and contact official services for urgent help.</span></div>
        </aside>
      </section>
      <section className="how-section" id="how"><div className="eyebrow">SIMPLE BY DESIGN</div><h2>Small actions. Safer streets.</h2><p className="how-intro">A little local knowledge can make a difference when it is shared responsibly.</p><div className="how-grid"><article><span className="step-number">01</span><div className="step-icon"><MapPin/></div><h3>Pin the place</h3><p>Click the map or choose to use your location. Check the pin before posting.</p></article><article><span className="step-number">02</span><div className="step-icon"><BellRing/></div><h3>Share the signal</h3><p>Choose a category, urgency, and a brief description without naming people.</p></article><article><span className="step-number">03</span><div className="step-icon"><ShieldCheck/></div><h3>Stay informed</h3><p>Neighbours can view shared reports and make safer, more informed choices.</p></article></div></section>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><ShieldCheck size={20}/></span><span>neighbour<span className="brand-light">shield</span><small>COMMUNITY SAFETY NETWORK</small></span></a><p>Built for stronger neighbourhoods, together.</p><span className="footer-emergency">Immediate danger? <a href="tel:112">Call 112</a></span></footer>
    </main>
    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16}/></button></div>}
    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-header"><div><div className="eyebrow">COMMUNITY REPORT</div><h2 id="form-title">Pin an issue</h2><p>Share only what is useful. No account or email needed.</p></div><button className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close report form"><X/></button></div><form onSubmit={submitReport}><div className="form-grid"><div className="field"><label htmlFor="category">What is happening?</label><select id="category" value={form.category} onChange={e => update("category", e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div><div className="field"><label htmlFor="severity">Urgency level</label><select id="severity" value={form.severity} onChange={e => update("severity", e.target.value)}>{severities.map(s => <option key={s}>{s}</option>)}</select></div></div><div className="field"><label htmlFor="area">Area label <span>(optional)</span></label><input id="area" value={form.area} onChange={e => update("area", e.target.value)} maxLength={100} placeholder="e.g. Near Central Market"/></div><div className="field"><label htmlFor="details">What should neighbours know?</label><textarea id="details" value={form.details} onChange={e => update("details", e.target.value)} minLength={8} maxLength={500} required rows={4} placeholder="Briefly describe the hazard or help needed. Avoid names and personal details."/><div className="char-count">{form.details.length}/500</div></div><div className="location-summary"><MapPin size={17}/><div><b>Pin location selected</b><span>{picked[0].toFixed(5)}, {picked[1].toFixed(5)} · India map bounds</span></div><button type="button" onClick={() => { setShowForm(false); document.getElementById("map")?.scrollIntoView({ behavior: "smooth" }); setNotice("Click the map to move your report pin."); }}>Change</button></div><div className="form-warning"><AlertTriangle size={16}/><span>For immediate danger, call 112. Posting here does not alert emergency responders.</span></div><button className="btn btn-primary submit-btn" type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit community report"} <ArrowUpRight size={16}/></button><p className="privacy-note"><ShieldCheck size={13}/> No login, email, name, or phone number collected.</p></form></section></div>}
  </div>;
}
export default App;
