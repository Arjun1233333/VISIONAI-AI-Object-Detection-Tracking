import React, { useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Stars, Sparkles, TorusKnot, MeshDistortMaterial } from "@react-three/drei";
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowRight, Boxes, BrainCircuit,
  CheckCircle2, ChevronRight, CircleHelp, Cpu, Crosshair, Database, FileImage,
  FileVideo, Gauge, Layers3, LoaderCircle, Radar, RefreshCw, Scan, ShieldCheck,
  Sparkles as SparklesIcon, UploadCloud, Video, X, Zap
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";
const CHART_COLORS = ["#4cebd0", "#5798ff", "#b28aff", "#ffbd69", "#ff6e91", "#67d7ff", "#c7f36b"];

function NeuralCore() {
  const core = useRef();
  const rings = useRef();
  useFrame((state, delta) => {
    if (core.current) {
      core.current.rotation.y += delta * 0.22;
      core.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.24) * 0.12;
    }
    if (rings.current) rings.current.rotation.z -= delta * 0.12;
  });
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 2, 4]} intensity={3.2} color="#4cebd0" />
      <pointLight position={[-3, -2, -2]} intensity={2.1} color="#4b80ff" />
      <Float speed={1.6} rotationIntensity={0.22} floatIntensity={0.5}>
        <group ref={core}>
          <mesh>
            <icosahedronGeometry args={[1.02, 2]} />
            <MeshDistortMaterial color="#112c42" emissive="#0b8c83" emissiveIntensity={0.65} roughness={0.18} metalness={0.7} distort={0.18} speed={1.8} wireframe />
          </mesh>
          <mesh scale={0.62}>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial color="#2de5c1" emissive="#11b99e" emissiveIntensity={1.5} metalness={0.65} roughness={0.18} />
          </mesh>
          <mesh scale={0.31}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#d7fff8" />
          </mesh>
        </group>
      </Float>
      <group ref={rings}>
        <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
          <torusGeometry args={[1.55, 0.008, 8, 160]} />
          <meshBasicMaterial color="#3ce5ca" transparent opacity={0.65} />
        </mesh>
        <mesh rotation={[0.7, Math.PI / 3, 0.8]}>
          <torusGeometry args={[1.78, 0.006, 8, 160]} />
          <meshBasicMaterial color="#4b8cff" transparent opacity={0.55} />
        </mesh>
      </group>
      <Float speed={0.8} floatIntensity={0.9}>
        <TorusKnot args={[0.13, 0.035, 80, 12]} position={[1.55, 0.7, 0.2]}>
          <meshStandardMaterial color="#64f5d9" emissive="#19cbb1" emissiveIntensity={1.3} metalness={0.7} roughness={0.2} />
        </TorusKnot>
      </Float>
      <Sparkles count={80} scale={5} size={2} speed={0.35} color="#4cebd0" />
      <Stars radius={45} depth={20} count={450} factor={2} saturation={0.5} fade speed={0.5} />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.45} />
    </>
  );
}

function NeuralScene() {
  return <Canvas camera={{ position: [0, 0, 5.8], fov: 44 }} dpr={[1, 1.7]}><NeuralCore /></Canvas>;
}

function MetricCard({ icon: Icon, label, value, detail, tone = "teal" }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-head"><span className="metric-icon"><Icon size={16} /></span><span className="metric-label">{label}</span><span className="metric-live" /></div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function EmptyChart({ title }) {
  return <div className="chart-empty"><Radar size={25} /><strong>{title}</strong><span>Run an inference to populate live analytics.</span></div>;
}

export default function App() {
  const fileInput = useRef(null);
  const [mode, setMode] = useState("Image");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [confidence, setConfidence] = useState(0.35);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeNav, setActiveNav] = useState("Overview");
  const [backendStatus, setBackendStatus] = useState("checking");

  const checkBackend = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error("offline");
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  React.useEffect(() => { checkBackend(); }, [checkBackend]);

  const onChooseFile = (chosen) => {
    if (!chosen) return;
    const isVideo = chosen.type.startsWith("video/");
    const allowed = mode === "Video" ? isVideo : chosen.type.startsWith("image/");
    if (!allowed) {
      setError(mode === "Video" ? "Choose a video file (MP4, AVI, MOV or MKV)." : "Choose an image file (JPG, PNG or WEBP).");
      return;
    }
    if (mode === "Video" && chosen.size > 100 * 1024 * 1024) {
      setError("Video is larger than 100 MB. Choose a smaller file.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    setError("");
    setResult(null);
  };

  const changeMode = (next) => {
    setMode(next);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setResult(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const runDetection = async () => {
    if (!file) {
      setError(`Select an ${mode === "Video" ? "video" : "image"} first.`);
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const endpoint = mode === "Video" ? "/track-video" : "/detect";
      const response = await fetch(`${API_BASE}${endpoint}?confidence=${confidence}`, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.error || `Request failed (${response.status})`);
      setResult({ ...data, mode, _completedAt: Date.now() });
      setActiveNav("Analytics");
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (err) {
      setError(`${err.message || "Could not complete inference."} Check that the VISIONAI backend is running on port 8000.`);
      checkBackend();
    } finally {
      setLoading(false);
    }
  };

  const clearWorkspace = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setResult(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const isVideoResult = result?.mode === "Video";
  const counts = result?.counts || result?.tracked_objects_by_class || {};
  const classData = Object.entries(counts).map(([name, value]) => ({ name, count: Number(value) || 0 })).sort((a, b) => b.count - a.count);
  const detections = Array.isArray(result?.detections) ? result.detections : [];
  const confidenceData = useMemo(() => {
    const buckets = [{ name: "High · 80%+", value: 0, fill: "#4cebd0" }, { name: "Medium · 50–79%", value: 0, fill: "#5798ff" }, { name: "Low · <50%", value: 0, fill: "#ffbd69" }];
    detections.forEach((item) => {
      const value = Number(item.confidence ?? 0);
      const percentage = value <= 1 ? value * 100 : value;
      if (percentage >= 80) buckets[0].value += 1;
      else if (percentage >= 50) buckets[1].value += 1;
      else buckets[2].value += 1;
    });
    return buckets.filter((item) => item.value > 0);
  }, [detections]);
  const totalObjects = Number(result?.total_objects ?? result?.total_tracks ?? detections.length ?? 0);
  const classCount = classData.length;
  const averageConfidence = detections.length
    ? (detections.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / detections.length * (Number(detections[0]?.confidence) <= 1 ? 100 : 1)).toFixed(1)
    : result?.mean_confidence != null ? (Number(result.mean_confidence) * (Number(result.mean_confidence) <= 1 ? 100 : 1)).toFixed(1) : "—";
  const processingTime = result?.processing_time != null ? `${Number(result.processing_time).toFixed(2)}s` : result?.inference_time != null ? `${Number(result.inference_time).toFixed(2)}s` : "—";
  const annotatedImage = result?.annotated_image || result?.image_url || "";
  const annotatedVideo = result?.annotated_video_url ? (result.annotated_video_url.startsWith("http") ? result.annotated_video_url : `${API_BASE}${result.annotated_video_url.startsWith("/") ? "" : "/"}${result.annotated_video_url}`) : "";

  const navItems = [
    { label: "Overview", icon: Layers3, href: "#overview" },
    { label: "Detection Lab", icon: Scan, href: "#workspace" },
    { label: "Analytics", icon: Activity, href: "#analytics" },
    { label: "Results", icon: Boxes, href: "#results" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveNav("Overview")}>
          <span className="brand-mark"><BrainCircuit size={23} /></span>
          <span><strong>VISION<span>AI</span></strong><small>PERCEPTION SYSTEMS</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="navigation">
          {navItems.map(({ label, icon: Icon, href }) => (
            <a key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} href={href} onClick={() => setActiveNav(label)}>
              <Icon size={17} /><span>{label}</span><ChevronRight className="nav-chevron" size={14} />
            </a>
          ))}
        </nav>
        <div className="nav-caption system-caption">SYSTEM</div>
        <div className="system-card">
          <span className={`system-orb ${backendStatus}`}><span /></span>
          <div><strong>Inference API</strong><small>{backendStatus === "online" ? "Connected · port 8000" : backendStatus === "offline" ? "Backend unreachable" : "Checking connection..."}</small></div>
          <button className="refresh-button" title="Check backend" onClick={checkBackend}><RefreshCw size={13} /></button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-avatar">VA</div>
          <div><strong>VISIONAI CORE</strong><small>YOLO · BYTETRACK</small></div>
          <span className="version-pill">v1.0</span>
        </div>
        <div className="sidebar-foot">NEURAL PERCEPTION <span>●</span> ONLINE</div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>VISIONAI</span><ChevronRight size={13} /><strong>{activeNav.toUpperCase()}</strong></div>
          <div className="topbar-right"><span className="secure-pill"><ShieldCheck size={13} /> LOCAL INFERENCE</span><span className="top-avatar">A</span></div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> COMPUTER VISION / CONTROL DECK</div>
            <h1>See beyond <span>the frame.</span></h1>
            <p>Real-time visual intelligence for detection, tracking, and scene understanding.</p>
            <div className="hero-tags"><span><span className="tag-dot" /> YOLO DETECTOR</span><span><Zap size={12} /> GPU-READY PIPELINE</span><span><ShieldCheck size={12} /> PRIVATE BY DESIGN</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-label"><span className="pulse-dot" /> NEURAL CORE <small>LIVE</small></div>
            <div className="scene"><NeuralScene /></div>
            <div className="orbit-label orbit-label-one"><Crosshair size={12} /> FEATURE MAP <b>ACTIVE</b></div>
            <div className="orbit-label orbit-label-two"><Activity size={12} /> SIGNAL <b>STABLE</b></div>
            <div className="scene-index">CORE_01 / 3D</div>
          </div>
          <div className="hero-bottom-line"><span>VISION SYSTEM / 01</span><span>MODEL STATE <b>{backendStatus === "online" ? "READY" : "STANDBY"}</b></span></div>
        </section>

        <section className="metrics-grid" aria-label="System metrics">
          <MetricCard icon={Crosshair} label="OBJECTS DETECTED" value={result ? totalObjects.toLocaleString() : "—"} detail={result ? "From latest inference" : "Awaiting first inference"} />
          <MetricCard icon={Boxes} label="OBJECT CLASSES" value={result ? classCount : "—"} detail={result ? "Unique labels identified" : "Class map not populated"} tone="blue" />
          <MetricCard icon={Gauge} label="MEAN CONFIDENCE" value={result ? `${averageConfidence}${averageConfidence === "—" ? "" : "%"}` : "—"} detail={result ? "Detection confidence" : "Confidence not calculated"} tone="violet" />
          <MetricCard icon={Cpu} label="PROCESSING TIME" value={result ? processingTime : "—"} detail={result ? "Latest completed run" : "Ready for inference"} tone="amber" />
        </section>

        <section className="workspace-grid" id="workspace">
          <article className="panel detection-panel">
            <div className="panel-heading">
              <div><div className="section-kicker"><span /> 01 / VISUAL INPUT</div><h2>Detection Lab</h2><p>Feed a frame or clip into the perception pipeline.</p></div>
              <span className="panel-index">LAB_01</span>
            </div>
            <div className="mode-switch">
              <button className={mode === "Image" ? "mode active" : "mode"} onClick={() => changeMode("Image")}><FileImage size={15} /> Image detection</button>
              <button className={mode === "Video" ? "mode active" : "mode"} onClick={() => changeMode("Video")}><FileVideo size={15} /> Video tracking</button>
            </div>
            <input ref={fileInput} className="hidden-input" type="file" accept={mode === "Image" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/avi,video/quicktime,video/x-matroska,.mkv,.avi,.mov,.mp4"} onChange={(event) => onChooseFile(event.target.files?.[0])} />
            <div className={`dropzone ${preview ? "has-preview" : ""}`} onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onChooseFile(event.dataTransfer.files?.[0]); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInput.current?.click(); }}>
              {preview ? (
                <>
                  <button className="clear-file" aria-label="Remove selected file" onClick={(event) => { event.stopPropagation(); clearWorkspace(); }}><X size={14} /></button>
                  {mode === "Image" ? <img className="preview-media" src={preview} alt="Selected input preview" /> : <video className="preview-media" src={preview} controls muted onClick={(event) => event.stopPropagation()} />}
                  <div className="preview-meta"><strong>{file?.name}</strong><span>{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ""}</span></div>
                </>
              ) : (
                <><div className="drop-icon"><UploadCloud size={25} /></div><strong>Drop your {mode.toLowerCase()} here</strong><p>or <span>browse files</span> from your device</p><div className="file-types">{mode === "Image" ? "PNG / JPG / WEBP" : "MP4 / AVI / MOV / MKV"} <i>·</i> {mode === "Video" ? "MAX 100 MB" : "LOCAL PROCESSING"}</div></>
              )}
            </div>
            <div className="confidence-control">
              <div className="confidence-label"><label htmlFor="confidence">CONFIDENCE THRESHOLD</label><strong>{Math.round(confidence * 100)}%</strong></div>
              <input id="confidence" type="range" min="0.1" max="0.9" step="0.05" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
              <div className="range-hints"><span>MORE DETECTIONS</span><span>HIGHER CERTAINTY</span></div>
            </div>
            <button className="analyze-button" disabled={loading || !file} onClick={runDetection}>
              {loading ? <><LoaderCircle className="spin-icon" size={17} /> PROCESSING SCENE...</> : <><SparklesIcon size={16} /> {mode === "Image" ? "RUN OBJECT DETECTION" : "RUN OBJECT TRACKING"} <ArrowRight size={16} /></>}
            </button>
            {loading && <div className="loading-panel"><div className="loading-pulse"><Activity size={18} /></div><div><strong>Inference in progress</strong><p>Preparing visual features and running the model. Large clips may take a little longer.</p></div></div>}
            {error && <div className="feedback-message error-message"><AlertCircle size={16} /><span>{error}</span></div>}
            {result && !error && <div className="feedback-message success-message"><CheckCircle2 size={16} /><span>Inference complete. Analytics below reflect the latest result.</span></div>}
            <div className="privacy-note"><ShieldCheck size={13} /> Files are sent to your local VISIONAI backend.</div>
          </article>

          <article className="panel model-panel">
            <div className="panel-heading">
              <div><div className="section-kicker"><span /> 02 / MODEL INTELLIGENCE</div><h2>Perception engine</h2><p>Live view of the visual processing architecture.</p></div>
              <span className={`status-chip ${backendStatus}`}><span /> {backendStatus === "online" ? "SYSTEM READY" : backendStatus === "offline" ? "API OFFLINE" : "CONNECTING"}</span>
            </div>
            <div className="model-visual"><div className="model-grid" /><div className="model-glow" /><div className="model-rings"><span /><span /><span /></div><div className="model-core"><BrainCircuit size={40} strokeWidth={1.2} /></div><div className="model-node node-a"><Scan size={14} /><span>INPUT</span></div><div className="model-node node-b"><Database size={14} /><span>FEATURES</span></div><div className="model-node node-c"><Crosshair size={14} /><span>DETECT</span></div><div className="model-coordinate">X: 0.842<br />Y: 0.126<br />Z: 0.674</div><div className="model-footer">NEURAL FIELD / ACTIVE VISUALIZATION</div></div>
            <div className="pipeline-title"><span>INFERENCE PIPELINE</span><span>03 STAGES</span></div>
            <div className="pipeline">
              <div className="pipeline-step"><span className="pipeline-number">01</span><div><strong>Pre-processing</strong><small>Image normalization</small></div><CheckCircle2 size={15} /></div>
              <div className="pipeline-connector" />
              <div className="pipeline-step"><span className="pipeline-number">02</span><div><strong>YOLO inference</strong><small>Object localization</small></div><span className="pipeline-active">CORE</span></div>
              <div className="pipeline-connector" />
              <div className="pipeline-step"><span className="pipeline-number">03</span><div><strong>{mode === "Video" ? "ByteTrack association" : "NMS + confidence filter"}</strong><small>{mode === "Video" ? "Temporal object IDs" : "Final detections"}</small></div><CheckCircle2 size={15} /></div>
            </div>
          </article>
        </section>

        <section className="analytics-section" id="analytics">
          <div className="section-title-row"><div><div className="section-kicker"><span /> 03 / INTELLIGENCE REPORT</div><h2>Analytics <span>Lab</span></h2><p>Interrogate the latest model output with live, data-driven visualizations.</p></div><div className="report-badge"><Activity size={14} /> {result ? "LIVE RESULT DATA" : "AWAITING DATA"}</div></div>
          <div className="analytics-grid">
            <article className="panel chart-panel">
              <div className="chart-heading"><div><h3>Class distribution</h3><p>Objects detected by category</p></div><span className="chart-unit">COUNT</span></div>
              {classData.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={classData.slice(0, 8)} margin={{ top: 8, right: 8, left: -22, bottom: 5 }}><CartesianGrid stroke="#203448" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#8196ac", fontSize: 10 }} axisLine={{ stroke: "#263c50" }} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#71879e", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0c1b2b", border: "1px solid #29465c", borderRadius: 9, color: "#e8f4ff", fontSize: 12 }} cursor={{ fill: "#173044" }} /><Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={42}>{classData.slice(0, 8).map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyChart title="No class data yet" />}
              {classData.length > 8 && <div className="chart-footnote">Showing top 8 of {classData.length} detected classes.</div>}
            </article>
            <article className="panel chart-panel">
              <div className="chart-heading"><div><h3>Confidence distribution</h3><p>Detection certainty profile</p></div><span className="chart-unit">QUALITY</span></div>
              {confidenceData.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height={205}><PieChart><Pie data={confidenceData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={83} paddingAngle={4} stroke="none">{confidenceData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Pie><Tooltip contentStyle={{ background: "#0c1b2b", border: "1px solid #29465c", borderRadius: 9, color: "#e8f4ff", fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{detections.length}</strong><span>DETECTIONS</span></div></div><div className="confidence-legend">{confidenceData.map((entry) => <div key={entry.name}><span className="legend-swatch" style={{ background: entry.fill }} /><span>{entry.name}</span><strong>{entry.value}</strong></div>)}</div></> : <EmptyChart title="No confidence data yet" />}
              {isVideoResult && <div className="chart-footnote">Confidence breakdown is available when per-detection confidence values are returned by the API.</div>}
            </article>
          </div>
          <div className="analytics-bottom">
            <article className="panel class-list-panel"><div className="chart-heading"><div><h3>Detected classes</h3><p>Ranked by object count</p></div><span className="chart-unit">{classCount} CLASSES</span></div>
              {classData.length ? <div className="class-list">{classData.slice(0, 7).map((item, index) => <div className="class-list-item" key={item.name}><div className="class-name"><span className="class-rank">{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong></div><div className="class-progress"><span style={{ width: `${Math.max(3, item.count / Math.max(...classData.map((entry) => entry.count), 1) * 100)}%`, background: CHART_COLORS[index % CHART_COLORS.length] }} /></div><b>{item.count}</b></div>)}</div> : <EmptyChart title="Class list will appear here" />}
            </article>
            <article className="panel telemetry-panel"><div className="chart-heading"><div><h3>Run telemetry</h3><p>Latest inference summary</p></div><span className="telemetry-icon"><Gauge size={16} /></span></div>
              <div className="telemetry-list"><div><span>Processing mode</span><strong>{result ? result.mode.toUpperCase() : mode.toUpperCase()}</strong></div><div><span>Confidence threshold</span><strong>{Math.round(confidence * 100)}%</strong></div><div><span>Objects returned</span><strong>{result ? totalObjects.toLocaleString() : "—"}</strong></div><div><span>Unique classes</span><strong>{result ? classCount : "—"}</strong></div><div><span>Input asset</span><strong className="telemetry-file">{file?.name || "No current file"}</strong></div><div><span>API status</span><strong className={backendStatus === "online" ? "text-green" : "text-amber"}>{backendStatus.toUpperCase()}</strong></div></div>
              <button className="secondary-button" onClick={() => { setActiveNav("Detection Lab"); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); }}><RefreshCw size={14} /> Configure next run</button>
            </article>
          </div>
        </section>

        <section className="results-section" id="results">
          <div className="section-title-row"><div><div className="section-kicker"><span /> 04 / OUTPUT INSPECTOR</div><h2>Inference <span>results</span></h2><p>Review annotated media and the latest detection records.</p></div>{result && <button className="secondary-button" onClick={clearWorkspace}><X size={14} /> Clear results</button>}</div>
          {!result ? <div className="panel empty-results-panel"><div className="empty-result-icon"><Scan size={25} /></div><div><strong>Nothing to inspect yet</strong><p>Upload an image or video and run the model. Annotated output and detection details will appear here.</p></div><button className="secondary-button" onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })}>Open Detection Lab <ArrowRight size={14} /></button></div> : (
            <div className="results-grid">
              <article className="panel output-panel"><div className="chart-heading"><div><h3>Annotated output</h3><p>{file?.name || "Latest processed asset"}</p></div><span className="status-chip online"><span /> COMPLETE</span></div>
                {isVideoResult ? (annotatedVideo ? <video className="annotated-video" src={annotatedVideo} controls /> : <div className="output-placeholder"><Video size={26} /><strong>Video processed</strong><span>The backend did not return an annotated video URL.</span></div>) : annotatedImage ? <img className="annotated-image" src={annotatedImage} alt="YOLO annotated detection output" /> : <div className="output-placeholder"><FileImage size={26} /><strong>Detection complete</strong><span>The backend did not return an annotated image.</span></div>}
                {annotatedVideo && <a className="download-link" href={annotatedVideo} download><ArrowDownToLine size={15} /> Download annotated video</a>}
                <div className="output-stats"><div><span>OBJECTS</span><strong>{totalObjects}</strong></div><div><span>CLASSES</span><strong>{classCount}</strong></div><div><span>THRESHOLD</span><strong>{Math.round(confidence * 100)}%</strong></div></div>
              </article>
              <article className="panel records-panel"><div className="chart-heading"><div><h3>Detection records</h3><p>Labels and model confidence</p></div><span className="chart-unit">{detections.length} ROWS</span></div>
                {detections.length ? <div className="table-wrap"><table className="detections-table"><thead><tr><th>OBJECT</th><th>CONFIDENCE</th><th>LEVEL</th></tr></thead><tbody>{detections.slice(0, 60).map((item, index) => { const raw = Number(item.confidence || 0); const pct = raw <= 1 ? raw * 100 : raw; return <tr key={`${item.label || item.class_name || "object"}-${index}`}><td><span className="table-object"><span className="table-object-dot" />{item.label || item.class_name || `Class ${item.class_id ?? "?"}`}</span></td><td>{pct.toFixed(1)}%</td><td><span className={`confidence-level ${pct >= 80 ? "high" : pct >= 50 ? "medium" : "low"}`}>{pct >= 80 ? "HIGH" : pct >= 50 ? "MEDIUM" : "LOW"}</span></td></tr>; })}</tbody></table></div> : <div className="records-empty"><Boxes size={22} /><span>{isVideoResult ? "Video summary returned. Per-frame detection records are not exposed by this API response." : "No objects passed the current confidence threshold."}</span></div>}
                {detections.length > 60 && <p className="table-note">Showing first 60 detections to keep the interface responsive.</p>}
              </article>
            </div>
          )}
        </section>

        <footer className="page-footer"><span>VISIONAI <b>·</b> VISUAL INTELLIGENCE PLATFORM</span><span><span className="footer-live" /> LOCAL SYSTEM / {backendStatus.toUpperCase()}</span><span>BUILT FOR PERCEPTION</span></footer>
      </main>
    </div>
  );
}
