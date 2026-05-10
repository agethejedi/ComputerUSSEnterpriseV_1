import { useState, useEffect, useRef, useCallback } from "react";
import { NASA_MODELS, DEFAULT_MODEL, findNasaModel } from "./nasaModels.js";

// ============================================================
// CONSTANTS
// ============================================================

const ACCENT = "#67E8F9";
const ACCENT_GREEN = "#34D399";
const ACCENT_PURPLE = "#A78BFA";
const ACCENT_AMBER = "#FBBF24";

const GESTURE_LABELS = {
  None: "STANDBY",
  Open_Palm: "RELEASE",
  Closed_Fist: "GRAB",
  Pinch: "PINCH",
  Thumb_Up: "CONFIRM",
  Pointing_Up: "POINT",
  Victory: "SCALE",
  ILoveYou: "RESET",
};

// ============================================================
// CDN LOADERS (lazy, cached)
// ============================================================

let threePromise = null;
function loadThree() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;
  threePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => resolve(window.THREE);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return threePromise;
}

let gltfLoaderPromise = null;
function loadGLTFLoader() {
  if (window.THREE?.GLTFLoader) return Promise.resolve(window.THREE.GLTFLoader);
  if (gltfLoaderPromise) return gltfLoaderPromise;
  gltfLoaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    // Use a CDN-hosted GLTFLoader compatible with r128
    s.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
    s.onload = () => resolve(window.THREE.GLTFLoader);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gltfLoaderPromise;
}

let mediapipePromise = null;
function loadMediaPipe() {
  if (window.GestureRecognizer) return Promise.resolve(window);
  if (mediapipePromise) return mediapipePromise;
  mediapipePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.type = "module";
    s.textContent = `
      import { GestureRecognizer, FilesetResolver, DrawingUtils }
        from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
      window.GestureRecognizer = GestureRecognizer;
      window.FilesetResolver = FilesetResolver;
      window.DrawingUtils = DrawingUtils;
      window.mediaPipeReady = true;
      window.dispatchEvent(new Event("mediapipe-ready"));
    `;
    document.head.appendChild(s);
    window.addEventListener("mediapipe-ready", () => resolve(window), { once: true });
    setTimeout(() => reject(new Error("MediaPipe load timeout")), 30000);
  });
  return mediapipePromise;
}

// ============================================================
// THREE.JS SCENE MANAGER
// ============================================================

class HoloScene {
  constructor(canvas, width, height) {
    const THREE = window.THREE;
    this.THREE = THREE;
    this.width = width;
    this.height = height;
    this.currentObject = null;
    this.isDragging = false;
    this.lastPinchPos = null;
    this.autoRotate = true;

    // Renderer — transparent background so webcam shows through
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.001, 1000);
    this.camera.position.set(0, 0, 3);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404080, 2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x67E8F9, 3);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xA78BFA, 1.5);
    rimLight.position.set(-5, -3, -5);
    this.scene.add(rimLight);

    // Pivot group — all models attach to this for gesture-driven rotation
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    // Start render loop
    this.animating = true;
    this.animate();
  }

  animate() {
    if (!this.animating) return;
    requestAnimationFrame(() => this.animate());
    // Slow auto-rotate when not being manipulated
    if (this.autoRotate && !this.isDragging && this.pivot) {
      this.pivot.rotation.y += 0.003;
    }
    this.renderer.render(this.scene, this.camera);
  }

  // Load a GLTF model by URL
  async loadGLTF(url, scale = 1) {
    const THREE = this.THREE;
    await loadGLTFLoader();
    return new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          this.clearCurrentObject();
          const model = gltf.scene;

          // Add to scene first so world transforms are computed correctly
          this.pivot.add(model);

          // Force matrix update so Box3 gets accurate bounds
          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);

          // Guard against degenerate models (zero size before textures load)
          if (maxDim > 0 && isFinite(maxDim)) {
            const targetSize = 2.2;
            const scaleF = targetSize / maxDim;
            model.scale.setScalar(scaleF);
            // Re-compute center after scaling
            model.updateMatrixWorld(true);
            const box2 = new THREE.Box3().setFromObject(model);
            const center2 = box2.getCenter(new THREE.Vector3());
            // Offset model so it's centered at origin
            model.position.set(-center2.x, -center2.y, -center2.z);
          }

          // Apply subtle holographic emissive tint
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat) => {
                if (mat.emissive) {
                  mat.emissive.set(0x0a1a2e);
                  mat.emissiveIntensity = 0.2;
                }
              });
            }
          });

          this.currentObject = model;
          resolve(model);
        },
        undefined,
        (err) => {
          // Remove from pivot if load failed after adding
          if (this.pivot.children.length > 0) {
            const last = this.pivot.children[this.pivot.children.length - 1];
            this.pivot.remove(last);
          }
          reject(err);
        }
      );
    });
  }

  // Create the default sci-fi wireframe dodecahedron
  loadWireframe() {
    const THREE = this.THREE;
    this.clearCurrentObject();

    const group = new THREE.Group();

    // Core dodecahedron
    const geo = new THREE.DodecahedronGeometry(0.8, 0);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x67E8F9,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const core = new THREE.Mesh(geo, wireMat);
    group.add(core);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0a2a4a,
      transparent: true,
      opacity: 0.6,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    // Outer shell rings
    const ringGeo = new THREE.TorusGeometry(1.1, 0.008, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xA78BFA,
      transparent: true,
      opacity: 0.5,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo.clone(), ringMat.clone());
    ring2.rotation.x = Math.PI / 4;
    ring2.rotation.y = Math.PI / 3;
    group.add(ring2);

    // Orbit particles
    const particleGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0x34D399 });
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat);
      const angle = (i / 8) * Math.PI * 2;
      p.position.set(Math.cos(angle) * 1.1, 0, Math.sin(angle) * 1.1);
      group.add(p);
    }

    // Animate rings independently
    const tick = () => {
      if (!this.animating) return;
      requestAnimationFrame(tick);
      ring1.rotation.z += 0.008;
      ring2.rotation.z -= 0.005;
    };
    tick();

    this.pivot.add(group);
    this.currentObject = group;
    return group;
  }

  // Load an image as a floating textured plane
  loadImage(src) {
    const THREE = this.THREE;
    this.clearCurrentObject();
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      loader.load(
        src,
        (texture) => {
          const aspect = texture.image.width / texture.image.height;
          const w = 2.5;
          const h = w / aspect;
          const geo = new THREE.PlaneGeometry(w, h);
          const mat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
          });
          const plane = new THREE.Mesh(geo, mat);
          // Subtle frame border
          const frameGeo = new THREE.EdgesGeometry(geo);
          const frameMat = new THREE.LineBasicMaterial({ color: 0x67E8F9, linewidth: 2 });
          const frame = new THREE.LineSegments(frameGeo, frameMat);
          plane.add(frame);
          this.pivot.add(plane);
          this.currentObject = plane;
          resolve(plane);
        },
        undefined,
        reject
      );
    });
  }

  clearCurrentObject() {
    if (this.currentObject) {
      this.pivot.remove(this.currentObject);
      this.currentObject = null;
    }
    this.pivot.rotation.set(0, 0, 0);
    this.autoRotate = true;
  }

  // Gesture-driven manipulation
  applyGesture(gesture, handLandmarks) {
    if (!this.pivot || !handLandmarks || handLandmarks.length === 0) return;
    const THREE = this.THREE;
    const hand = handLandmarks[0];

    // Pinch detection: distance between thumb tip (4) and index tip (8)
    const thumbTip = hand[4];
    const indexTip = hand[8];
    if (!thumbTip || !indexTip) return;

    const pinchDist = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2)
    );
    const isPinching = pinchDist < 0.06;

    // Wrist position (landmark 0) drives rotation
    const wrist = hand[0];
    const midX = (thumbTip.x + indexTip.x) / 2;
    const midY = (thumbTip.y + indexTip.y) / 2;

    if (isPinching) {
      this.autoRotate = false;
      this.isDragging = true;

      if (this.lastPinchPos) {
        const dx = midX - this.lastPinchPos.x;
        const dy = midY - this.lastPinchPos.y;
        // Horizontal drag → Y-axis rotation
        this.pivot.rotation.y += dx * 4;
        // Vertical drag → X-axis rotation
        this.pivot.rotation.x += dy * 4;
      }
      this.lastPinchPos = { x: midX, y: midY };
    } else {
      this.isDragging = false;
      this.lastPinchPos = null;
    }

    // Two-hand scaling
    if (handLandmarks.length === 2) {
      const hand2 = handLandmarks[1];
      const wrist2 = hand2[0];
      if (wrist && wrist2) {
        const spread = Math.sqrt(
          Math.pow(wrist.x - wrist2.x, 2) +
          Math.pow(wrist.y - wrist2.y, 2)
        );
        if (this._lastSpread != null) {
          const delta = spread - this._lastSpread;
          const newScale = Math.max(0.3, Math.min(3.0, this.pivot.scale.x + delta * 2));
          this.pivot.scale.setScalar(newScale);
        }
        this._lastSpread = spread;
      }
    } else {
      this._lastSpread = null;
    }
  }

  // Voice command manipulation
  voiceCommand(action, value) {
    if (!this.pivot) return;
    switch (action) {
      case "rotate_left":  this.pivot.rotation.y -= 0.5; break;
      case "rotate_right": this.pivot.rotation.y += 0.5; break;
      case "rotate_up":    this.pivot.rotation.x -= 0.5; break;
      case "rotate_down":  this.pivot.rotation.x += 0.5; break;
      case "zoom_in":      this.pivot.scale.multiplyScalar(1.3); break;
      case "zoom_out":     this.pivot.scale.multiplyScalar(0.77); break;
      case "reset":
        this.pivot.rotation.set(0, 0, 0);
        this.pivot.scale.setScalar(1);
        this.autoRotate = true;
        break;
      default: break;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    this.animating = false;
    this.renderer.dispose();
  }
}

// ============================================================
// HOLOGRAPHIC PANEL COMPONENT
// ============================================================

export default function HolographicPanel({ onVoiceCommand, externalCommand }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | initializing | ready | loading | error
  const [currentModel, setCurrentModel] = useState(null);
  const [gesture, setGesture] = useState("None");
  const [handCount, setHandCount] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [mediapiipeReady, setMediapipeReady] = useState(false);
  const [threeReady, setThreeReady] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const landmarkCanvasRef = useRef(null);
  const sceneRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const gestureLoopRef = useRef(null);
  const lastGestureTime = useRef(0);

  // ── Initialize Three.js scene ────────────────────────────────────────────
  const initThree = useCallback(async () => {
    if (!threeCanvasRef.current) return;
    await loadThree();
    const rect = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
    const scene = new HoloScene(threeCanvasRef.current, rect.width, rect.height);
    sceneRef.current = scene;
    scene.loadWireframe();
    setCurrentModel(DEFAULT_MODEL);
    setThreeReady(true);
  }, []);

  // ── Initialize MediaPipe ─────────────────────────────────────────────────
  const initMediaPipe = useCallback(async () => {
    try {
      setLoadingMsg("Loading hand tracking model…");
      await loadMediaPipe();
      const vision = await window.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const recognizer = await window.GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      gestureRecognizerRef.current = recognizer;
      setMediapipeReady(true);
      setLoadingMsg("");
    } catch (err) {
      console.warn("MediaPipe init failed:", err);
      setLoadingMsg("Hand tracking unavailable — voice commands still work.");
    }
  }, []);

  // ── Start webcam ─────────────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      setErrorMsg("Camera access denied. Please allow camera permissions and try again.");
      return false;
    }
  }, []);

  // ── Gesture recognition loop ─────────────────────────────────────────────
  const startGestureLoop = useCallback(() => {
    if (!gestureRecognizerRef.current || !videoRef.current) return;

    const loop = () => {
      gestureLoopRef.current = requestAnimationFrame(loop);
      if (
        videoRef.current?.readyState !== 4 ||
        !gestureRecognizerRef.current
      ) return;

      const now = performance.now();
      // Run at ~20fps to save CPU
      if (now - lastGestureTime.current < 50) return;
      lastGestureTime.current = now;

      try {
        const results = gestureRecognizerRef.current.recognizeForVideo(
          videoRef.current,
          now
        );

        const gestures = results.gestures || [];
        const landmarks = results.landmarks || [];

        setHandCount(landmarks.length);

        if (gestures.length > 0) {
          const g = gestures[0][0]?.categoryName || "None";
          setGesture(g);
        } else {
          setGesture("None");
        }

        // Apply gestures to Three.js scene
        if (sceneRef.current && landmarks.length > 0) {
          sceneRef.current.applyGesture(
            gestures[0]?.[0]?.categoryName || "None",
            landmarks
          );
        }

        // Draw landmarks on overlay canvas
        drawLandmarks(results, landmarks);
      } catch {}
    };

    gestureLoopRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Draw hand landmarks ──────────────────────────────────────────────────
  const drawLandmarks = useCallback((results, landmarks) => {
    const canvas = landmarkCanvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) return;

    landmarks.forEach((hand) => {
      // Draw connections
      const connections = [
        [0,1],[1,2],[2,3],[3,4],       // thumb
        [0,5],[5,6],[6,7],[7,8],       // index
        [0,9],[9,10],[10,11],[11,12],  // middle
        [0,13],[13,14],[14,15],[15,16],// ring
        [0,17],[17,18],[18,19],[19,20],// pinky
        [5,9],[9,13],[13,17],          // palm
      ];

      ctx.strokeStyle = `${ACCENT}80`;
      ctx.lineWidth = 1.5;
      connections.forEach(([a, b]) => {
        const pa = hand[a];
        const pb = hand[b];
        if (!pa || !pb) return;
        ctx.beginPath();
        ctx.moveTo((1 - pa.x) * canvas.width, pa.y * canvas.height);
        ctx.lineTo((1 - pb.x) * canvas.width, pb.y * canvas.height);
        ctx.stroke();
      });

      // Draw keypoints
      hand.forEach((lm, i) => {
        const x = (1 - lm.x) * canvas.width;
        const y = lm.y * canvas.height;
        const isTip = [4, 8, 12, 16, 20].includes(i);
        ctx.beginPath();
        ctx.arc(x, y, isTip ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? ACCENT : `${ACCENT}99`;
        ctx.fill();
      });
    });
  }, []);

  // ── Activation flow ──────────────────────────────────────────────────────
  const activate = useCallback(async () => {
    setIsExpanded(true);
    setStatus("initializing");
    setErrorMsg("");

    const camOk = await startWebcam();
    if (!camOk) { setStatus("error"); return; }

    await initThree();
    await initMediaPipe();
    startGestureLoop();
    setStatus("ready");
  }, [startWebcam, initThree, initMediaPipe, startGestureLoop]);

  const deactivate = useCallback(() => {
    // Stop gesture loop
    if (gestureLoopRef.current) cancelAnimationFrame(gestureLoopRef.current);
    // Stop webcam
    webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    // Destroy Three.js
    sceneRef.current?.destroy();
    sceneRef.current = null;
    setIsExpanded(false);
    setStatus("idle");
    setThreeReady(false);
    setMediapipeReady(false);
    setCurrentModel(null);
    setGesture("None");
    setHandCount(0);
  }, []);

  // ── Load NASA model ──────────────────────────────────────────────────────
  const loadNasaModel = useCallback(async (modelDef) => {
    if (!sceneRef.current) return { ok: false, error: "Scene not initialized" };
    setLoadingMsg(`Loading ${modelDef.name}…`);
    setCurrentModel(modelDef);
    try {
      await sceneRef.current.loadGLTF(modelDef.url, modelDef.scale || 1);
      setLoadingMsg("");
      return { ok: true };
    } catch (err) {
      // Try fallback URL
      if (modelDef.fallbackUrl) {
        try {
          await sceneRef.current.loadGLTF(modelDef.fallbackUrl, modelDef.scale || 1);
          setLoadingMsg("");
          return { ok: true };
        } catch {}
      }
      // Fall back to wireframe
      sceneRef.current.loadWireframe();
      setCurrentModel(DEFAULT_MODEL);
      setLoadingMsg("");
      return { ok: false, error: `Could not load ${modelDef.name} model. Showing default.` };
    }
  }, []);

  // ── Load image ───────────────────────────────────────────────────────────
  const loadImage = useCallback(async (src, label) => {
    if (!sceneRef.current) return;
    setLoadingMsg(`Loading image${label ? ": " + label : ""}…`);
    try {
      await sceneRef.current.loadImage(src);
      setCurrentModel({ id: "image", name: label || "Image", category: "image", description: label || "Image loaded." });
      setLoadingMsg("");
    } catch {
      setLoadingMsg("Failed to load image.");
      setTimeout(() => setLoadingMsg(""), 3000);
    }
  }, []);

  // ── Handle drag-and-drop files ───────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      loadImage(url, file.name);
    } else if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
      const url = URL.createObjectURL(file);
      setLoadingMsg(`Loading ${file.name}…`);
      sceneRef.current?.loadGLTF(url, 1).then(() => {
        setCurrentModel({ id: "custom", name: file.name, category: "custom", description: "Custom 3D model loaded." });
        setLoadingMsg("");
      }).catch(() => setLoadingMsg("Failed to load model."));
    }
  }, [loadImage]);

  // ── External commands from JARVIS voice system ───────────────────────────
  useEffect(() => {
    if (!externalCommand) return;
    const { action, payload } = externalCommand;

    switch (action) {
      case "activate":
        if (!isExpanded) activate();
        break;
      case "deactivate":
        if (isExpanded) deactivate();
        break;
      case "load_nasa_model": {
        const model = findNasaModel(payload);
        if (model && isExpanded) {
          loadNasaModel(model);
        }
        break;
      }
      case "load_wireframe":
        if (isExpanded && sceneRef.current) {
          sceneRef.current.loadWireframe();
          setCurrentModel(DEFAULT_MODEL);
        }
        break;
      case "load_image":
        if (isExpanded && payload) loadImage(payload.url, payload.label);
        break;
      case "voice_manipulate":
        if (isExpanded && sceneRef.current) {
          sceneRef.current.voiceCommand(payload);
        }
        break;
      default: break;
    }
  }, [externalCommand, isExpanded, activate, deactivate, loadNasaModel, loadImage]);

  // ── Resize handler ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isExpanded) return;
    const observer = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && sceneRef.current) sceneRef.current.resize(rect.width, rect.height);
      if (landmarkCanvasRef.current && rect) {
        landmarkCanvasRef.current.width = rect.width;
        landmarkCanvasRef.current.height = rect.height;
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isExpanded]);

  // ── ESC to close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && isExpanded) deactivate(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded, deactivate]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => deactivate(), []);

  // ============================================================
  // RENDER — COLLAPSED STATE
  // ============================================================
  if (!isExpanded) {
    return (
      <div
        className="relative bg-slate-950/40 backdrop-blur-sm cursor-pointer group transition-all duration-300"
        style={{ border: `1px solid ${ACCENT}33` }}
        onClick={activate}
      >
        {/* Corner brackets */}
        {["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r",
          "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((cls, i) => (
          <div key={i} className={`absolute w-3 h-3 ${cls}`} style={{ borderColor: ACCENT }} />
        ))}

        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: `${ACCENT}22`, background: `${ACCENT}08` }}>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1 h-1 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
            <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: ACCENT }}>HOLOGRAPHIC INTERFACE</span>
          </div>
          <span className="text-[9px] tracking-[0.2em] opacity-50" style={{ color: ACCENT }}>HOL.01</span>
        </div>

        <div className="p-4 flex flex-col items-center gap-3">
          {/* Preview SVG */}
          <svg viewBox="-60 -60 120 120" className="w-28 h-28 opacity-70 group-hover:opacity-100 transition-opacity">
            <circle cx="0" cy="0" r="40" fill="none" stroke={ACCENT} strokeWidth="0.5" opacity="0.4"
              style={{ animation: "spin 8s linear infinite", transformOrigin: "center" }} />
            <polygon points="0,-35 30,17 -30,17" fill="none" stroke={ACCENT} strokeWidth="1" opacity="0.6" />
            <polygon points="0,35 30,-17 -30,-17" fill="none" stroke={ACCENT_PURPLE} strokeWidth="1" opacity="0.6" />
            <circle cx="0" cy="0" r="8" fill="none" stroke={ACCENT} strokeWidth="1.5" />
            <circle cx="0" cy="0" r="3" fill={ACCENT} opacity="0.8" style={{ animation: "corePulse 2s ease-in-out infinite" }} />
          </svg>

          <button
            className="px-5 py-2 text-[10px] tracking-[0.3em] uppercase border transition-all duration-300"
            style={{
              borderColor: ACCENT,
              color: ACCENT,
              background: `${ACCENT}10`,
              boxShadow: `0 0 20px ${ACCENT}30`,
            }}
          >
            ▶ ACTIVATE
          </button>

          <div className="text-[9px] tracking-[0.15em] opacity-40 text-center" style={{ color: ACCENT }}>
            3D · PHOTOS · NASA MODELS · HAND TRACKING
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER — EXPANDED (FULL SCREEN)
  // ============================================================
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#020617" }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
    >
      {/* ── TOP HUD BAR ── */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${ACCENT}22`, background: "#020617ee" }}>
        <div className="flex items-center gap-6">
          <span className="text-[10px] tracking-[0.3em]" style={{ color: ACCENT }}>
            ● HOLOGRAPHIC INTERFACE // ACTIVE
          </span>
          {currentModel && (
            <span className="text-[10px] tracking-[0.2em] opacity-70" style={{ color: ACCENT }}>
              {currentModel.name.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[10px] tracking-[0.2em]" style={{ color: handCount > 0 ? ACCENT_GREEN : "#64748B" }}>
            {handCount > 0 ? `${handCount} HAND${handCount > 1 ? "S" : ""} DETECTED` : "NO HANDS DETECTED"}
          </span>
          <span className="text-[10px] tracking-[0.2em]" style={{ color: gesture !== "None" ? ACCENT_AMBER : "#64748B" }}>
            {GESTURE_LABELS[gesture] || gesture}
          </span>
          <button
            onClick={deactivate}
            className="px-4 py-1.5 text-[10px] tracking-[0.25em] uppercase border transition-all"
            style={{ borderColor: "#FB7185", color: "#FB7185", background: "#FB718515" }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* ── MAIN VIEWPORT ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {/* Webcam feed — mirrored like a mirror */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", opacity: status === "ready" ? 0.85 : 0 }}
          playsInline
          muted
        />

        {/* Three.js canvas — transparent, composited on top */}
        <canvas
          ref={threeCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />

        {/* Hand landmark overlay */}
        <canvas
          ref={landmarkCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Drag-and-drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: `${ACCENT}15`, border: `2px dashed ${ACCENT}` }}>
            <div className="text-center">
              <div className="text-2xl tracking-[0.3em]" style={{ color: ACCENT }}>DROP TO LOAD</div>
              <div className="text-[11px] tracking-[0.2em] opacity-60 mt-2" style={{ color: ACCENT }}>IMAGE · GLB · GLTF</div>
            </div>
          </div>
        )}

        {/* Initializing overlay */}
        {status === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: "#020617ee" }}>
            <div className="text-[11px] tracking-[0.3em] uppercase" style={{ color: ACCENT }}>
              {loadingMsg || "INITIALIZING SYSTEMS…"}
            </div>
            <div className="flex gap-2">
              {["CAMERA", "3D ENGINE", "HAND TRACKING"].map((label, i) => (
                <div key={label} className="px-3 py-1 text-[9px] tracking-[0.2em]"
                  style={{ border: `1px solid ${ACCENT}44`, color: `${ACCENT}88` }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading model overlay */}
        {loadingMsg && status === "ready" && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-2 text-[10px] tracking-[0.2em]"
            style={{ background: "#020617cc", border: `1px solid ${ACCENT}44`, color: ACCENT }}>
            {loadingMsg}
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-8 py-4 text-center text-[11px] tracking-[0.2em]"
              style={{ background: "#020617ee", border: "1px solid #FB7185", color: "#FB7185" }}>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Corner HUD brackets */}
        {[
          "top-4 left-4 border-t-2 border-l-2",
          "top-4 right-4 border-t-2 border-r-2",
          "bottom-24 left-4 border-b-2 border-l-2",
          "bottom-24 right-4 border-b-2 border-r-2",
        ].map((cls, i) => (
          <div key={i} className={`absolute w-8 h-8 ${cls} pointer-events-none`}
            style={{ borderColor: `${ACCENT}60` }} />
        ))}

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-6 h-px" style={{ background: `${ACCENT}40` }} />
          <div className="h-6 w-px absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `${ACCENT}40` }} />
        </div>
      </div>

      {/* ── BOTTOM CONTROL BAR ── */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center justify-between gap-4"
        style={{ borderTop: `1px solid ${ACCENT}22`, background: "#020617ee" }}>

        {/* Model library — quick access buttons */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1">
          <span className="text-[9px] tracking-[0.2em] opacity-50 flex-shrink-0" style={{ color: ACCENT }}>LOAD:</span>
          <button onClick={() => { sceneRef.current?.loadWireframe(); setCurrentModel(DEFAULT_MODEL); }}
            className="px-2 py-0.5 text-[8px] tracking-[0.15em] flex-shrink-0 transition-all"
            style={{ border: `1px solid ${ACCENT}44`, color: `${ACCENT}88`, background: currentModel?.id === "wireframe" ? `${ACCENT}20` : "transparent" }}>
            CORE
          </button>
          {[
            { label: "ISS", id: "iss" },
            { label: "WEBB", id: "webb" },
            { label: "SLS", id: "sls" },
            { label: "PERSEVERANCE", id: "perseverance" },
            { label: "EARTH", id: "earth" },
            { label: "MARS", id: "mars" },
            { label: "SATURN", id: "saturn" },
            { label: "MOON", id: "moon" },
            { label: "HUBBLE", id: "hubble" },
            { label: "VOYAGER", id: "voyager" },
          ].map(({ label, id }) => {
            const model = NASA_MODELS.find((m) => m.id === id);
            return (
              <button
                key={id}
                onClick={() => model && loadNasaModel(model)}
                className="px-2 py-0.5 text-[8px] tracking-[0.15em] flex-shrink-0 transition-all"
                style={{
                  border: `1px solid ${ACCENT}44`,
                  color: currentModel?.id === id ? ACCENT : `${ACCENT}88`,
                  background: currentModel?.id === id ? `${ACCENT}20` : "transparent",
                }}
              >
                {label}
              </button>
            );
          })}
          {/* Photo upload */}
          <label className="px-2 py-0.5 text-[8px] tracking-[0.15em] flex-shrink-0 cursor-pointer transition-all"
            style={{ border: `1px solid ${ACCENT_PURPLE}44`, color: `${ACCENT_PURPLE}88` }}>
            + PHOTO
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadImage(URL.createObjectURL(file), file.name);
            }} />
          </label>
        </div>

        {/* Manipulation controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {[
            { label: "◀", action: "rotate_left" },
            { label: "▶", action: "rotate_right" },
            { label: "▲", action: "rotate_up" },
            { label: "▼", action: "rotate_down" },
            { label: "＋", action: "zoom_in" },
            { label: "－", action: "zoom_out" },
          ].map(({ label, action }) => (
            <button
              key={action}
              onClick={() => sceneRef.current?.voiceCommand(action)}
              className="w-7 h-7 text-[11px] flex items-center justify-center transition-all"
              style={{ border: `1px solid ${ACCENT}44`, color: `${ACCENT}88`, background: "transparent" }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => sceneRef.current?.voiceCommand("reset")}
            className="px-2 py-1 text-[8px] tracking-[0.15em] transition-all"
            style={{ border: `1px solid ${ACCENT_AMBER}44`, color: `${ACCENT_AMBER}88` }}
          >
            RESET
          </button>
        </div>

        {/* Instructions */}
        <div className="text-[8px] tracking-[0.15em] opacity-40 text-right flex-shrink-0" style={{ color: ACCENT }}>
          PINCH + DRAG TO ROTATE · TWO HANDS TO SCALE<br />
          DROP IMAGE OR GLB TO LOAD · ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JARVIS TOOL EXECUTOR HELPERS (called from JarvisBriefing)
// ============================================================

// Build the externalCommand object JARVIS sends to HolographicPanel
export function buildHoloCommand(toolName, input, findNasaModelFn) {
  switch (toolName) {
    case "activate_holographic":
      return { action: "activate" };
    case "deactivate_holographic":
      return { action: "deactivate" };
    case "load_holographic_model": {
      const modelQuery = input.model || "";
      const nasaModel = findNasaModelFn(modelQuery);
      if (nasaModel) return { action: "load_nasa_model", payload: modelQuery };
      return { action: "load_wireframe" };
    }
    case "manipulate_holographic":
      return { action: "voice_manipulate", payload: input.action };
    case "load_holographic_image":
      return { action: "load_image", payload: { url: input.url, label: input.label } };
    default:
      return null;
  }
}
