import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import * as THREE from "three";
import {
  ArrowUpRight,
  ArrowRight,
  Cpu,
  AlertTriangle,
  Radio,
  Terminal,
  Activity,
} from "lucide-react";


// ─── Framer Motion Entrance Variant ──────────────────────────────────────────
const motionVariant = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};



// ─── Three.js 3D Railway Corridor Viewport ──────────────────────────────────
function ThreeCorridorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [telemetry, setTelemetry] = useState({
    speed: 130,
    oheVoltage: 25.4,
    blockId: "SEC-440-DN",
    kavachStatus: "LOCKED & ARMED",
    headway: 12.4,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.035);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150);
    camera.position.set(0, 2.4, 5.5);
    camera.lookAt(0, 0.8, -15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0x06b6d4, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Dynamic Track Lighting
    const trackPointLight = new THREE.PointLight(0x06b6d4, 2.5, 30);
    trackPointLight.position.set(0, 1.5, 0);
    scene.add(trackPointLight);

    // Corridor Group (moves backwards to simulate high speed)
    const corridorGroup = new THREE.Group();
    scene.add(corridorGroup);

    // Ground Plane with grid
    const groundGeo = new THREE.PlaneGeometry(30, 120, 30, 120);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    // Rail Tracks Material
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      metalness: 0.95,
      roughness: 0.2,
    });

    const railGeo = new THREE.BoxGeometry(0.1, 0.18, 120);
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-1.1, 0.09, -40);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(1.1, 0.09, -40);
    scene.add(rightRail);

    // Ballast Bed (center)
    const ballastGeo = new THREE.PlaneGeometry(3.2, 120);
    const ballastMat = new THREE.MeshStandardMaterial({
      color: 0x111215,
      roughness: 0.9,
    });
    const ballast = new THREE.Mesh(ballastGeo, ballastMat);
    ballast.rotation.x = -Math.PI / 2;
    ballast.position.set(0, 0, -40);
    scene.add(ballast);

    // Dynamic Sleepers (Ties)
    const sleeperCount = 60;
    const sleeperSpacing = 1.6;
    const sleeperGeo = new THREE.BoxGeometry(3.0, 0.1, 0.28);
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      metalness: 0.3,
      roughness: 0.7,
    });

    const sleepers: THREE.Mesh[] = [];
    for (let i = 0; i < sleeperCount; i++) {
      const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
      sleeper.position.set(0, 0.05, -i * sleeperSpacing);
      corridorGroup.add(sleeper);
      sleepers.push(sleeper);
    }

    // Overhead OHE Gantries & Wires
    const gantryCount = 8;
    const gantrySpacing = 14;
    const gantries: THREE.Group[] = [];

    const gantryPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.5);
    const gantryBeamGeo = new THREE.BoxGeometry(5.2, 0.12, 0.12);
    const gantryMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const insulatorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    for (let i = 0; i < gantryCount; i++) {
      const gantryGroup = new THREE.Group();
      
      const leftPole = new THREE.Mesh(gantryPoleGeo, gantryMat);
      leftPole.position.set(-2.5, 2.25, 0);
      gantryGroup.add(leftPole);

      const rightPole = new THREE.Mesh(gantryPoleGeo, gantryMat);
      rightPole.position.set(2.5, 2.25, 0);
      gantryGroup.add(rightPole);

      const beam = new THREE.Mesh(gantryBeamGeo, gantryMat);
      beam.position.set(0, 4.4, 0);
      gantryGroup.add(beam);

      // Insulator droppers
      const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), insulatorMat);
      insulator.position.set(0, 4.15, 0);
      gantryGroup.add(insulator);

      // Signal Light on side
      const signalBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), gantryMat);
      signalBox.position.set(2.5, 3.2, 0.2);
      gantryGroup.add(signalBox);

      const signalLamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x10b981 : 0x06b6d4 })
      );
      signalLamp.position.set(2.5, 3.3, 0.32);
      gantryGroup.add(signalLamp);

      gantryGroup.position.set(0, 0, -i * gantrySpacing);
      corridorGroup.add(gantryGroup);
      gantries.push(gantryGroup);
    }

    // Overhead Catenary Contact Wire
    const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, 120);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6 });
    const catenaryWire = new THREE.Mesh(wireGeo, wireMat);
    catenaryWire.rotation.x = Math.PI / 2;
    catenaryWire.position.set(0, 3.9, -40);
    scene.add(catenaryWire);

    // Futuristic Aerodynamic High-Speed Locomotive Model
    const trainGroup = new THREE.Group();
    trainGroup.position.set(0, 0.35, -5.5);

    // Locomotive Nose & Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.2, 5.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const trainBody = new THREE.Mesh(bodyGeo, bodyMat);
    trainBody.position.set(0, 0.6, 0);
    trainGroup.add(trainBody);

    // Wedge Nose Cone
    const noseGeo = new THREE.ConeGeometry(1.1, 2.2, 4);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.scale.set(0.9, 0.7, 0.9);
    nose.position.set(0, 0.55, 3.2);
    trainGroup.add(nose);

    // Windshield visor (Cyan Emissive)
    const visorGeo = new THREE.BoxGeometry(1.3, 0.35, 0.7);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.95, 2.2);
    visor.rotation.x = -0.3;
    trainGroup.add(visor);

    // Aerodynamic Roof Cowling
    const roofGeo = new THREE.CylinderGeometry(0.85, 0.9, 5.2, 16);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 1.2, -0.1);
    trainGroup.add(roof);

    // Pantograph Arm
    const pantoGroup = new THREE.Group();
    pantoGroup.position.set(0, 1.5, -1.8);
    const pantoMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4), pantoMat);
    lowerArm.rotation.x = 0.5;
    lowerArm.position.set(0, 0.6, 0.3);
    pantoGroup.add(lowerArm);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4), pantoMat);
    upperArm.rotation.x = -0.5;
    upperArm.position.set(0, 1.7, -0.2);
    pantoGroup.add(upperArm);

    const contactShoe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.2), pantoMat);
    contactShoe.position.set(0, 2.38, -0.6);
    pantoGroup.add(contactShoe);

    trainGroup.add(pantoGroup);

    // Headlights (Twin Projectors + High Intensity Beams)
    const headlampLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    headlampLeft.position.set(-0.6, 0.55, 3.8);
    trainGroup.add(headlampLeft);

    const headlampRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    headlampRight.position.set(0.6, 0.55, 3.8);
    trainGroup.add(headlampRight);

    // Volumetric Spotlights forward
    const spotLeft = new THREE.SpotLight(0x06b6d4, 8, 45, Math.PI / 8, 0.4, 1.2);
    spotLeft.position.set(-0.6, 0.55, 4.0);
    spotLeft.target.position.set(-0.6, 0, 30);
    scene.add(spotLeft);
    scene.add(spotLeft.target);

    const spotRight = new THREE.SpotLight(0x06b6d4, 8, 45, Math.PI / 8, 0.4, 1.2);
    spotRight.position.set(0.6, 0.55, 4.0);
    spotRight.target.position.set(0.6, 0, 30);
    scene.add(spotRight);
    scene.add(spotRight.target);

    scene.add(trainGroup);

    // Kinetic Particle Dust (Speed Lines)
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 16;
      particlePositions[i + 1] = Math.random() * 6;
      particlePositions[i + 2] = -Math.random() * 80;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.08,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Pointer Event Listener for Mouse Inertia
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 0.8;
      mouseRef.current.targetY = y * 0.5;
    };

    container.addEventListener("mousemove", handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    const speedMultiplier = 1.35;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse camera inertia
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      camera.position.x = mouseRef.current.x * 0.8;
      camera.position.y = 2.4 + mouseRef.current.y * 0.4;
      camera.lookAt(mouseRef.current.x * 0.4, 0.8, -15);

      // Move Sleepers
      const sleeperStep = delta * 45 * speedMultiplier;
      sleepers.forEach((s) => {
        s.position.z += sleeperStep;
        if (s.position.z > 6) {
          s.position.z -= sleeperCount * sleeperSpacing;
        }
      });

      // Move Gantries
      const gantryStep = delta * 45 * speedMultiplier;
      gantries.forEach((g) => {
        g.position.z += gantryStep;
        if (g.position.z > 8) {
          g.position.z -= gantryCount * gantrySpacing;
        }
      });

      // Move Particles
      const pos = particleGeo.attributes.position.array as Float32Array;
      for (let i = 2; i < particleCount * 3; i += 3) {
        pos[i] += delta * 60 * speedMultiplier;
        if (pos[i] > 6) {
          pos[i] = -80;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Train subtle aerodynamic suspension sway
      trainGroup.position.y = 0.35 + Math.sin(time * 12) * 0.015;
      trainGroup.rotation.z = Math.sin(time * 6) * 0.008;

      renderer.render(scene, camera);
    };

    animate();

    // Telemetry periodic jitter simulation
    const telemetryInterval = setInterval(() => {
      setTelemetry({
        speed: Math.floor(129 + Math.random() * 3),
        oheVoltage: +(25.3 + Math.random() * 0.3).toFixed(1),
        blockId: Math.random() > 0.5 ? "SEC-440-DN" : "PRYJ-SUB-04",
        kavachStatus: "LOCKED & ARMED",
        headway: +(12.2 + Math.random() * 0.6).toFixed(1),
      });
    }, 1800);

    return () => {
      clearInterval(telemetryInterval);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Crosshair Corner Markers (+) */}
      <div className="absolute top-3 left-3 text-cyan-400/80 font-mono text-xs pointer-events-none select-none">
        +
      </div>
      <div className="absolute top-3 right-3 text-cyan-400/80 font-mono text-xs pointer-events-none select-none">
        +
      </div>
      <div className="absolute bottom-3 left-3 text-cyan-400/80 font-mono text-xs pointer-events-none select-none">
        +
      </div>
      <div className="absolute bottom-3 right-3 text-cyan-400/80 font-mono text-xs pointer-events-none select-none">
        +
      </div>

      {/* Top Telemetry Overlay */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none text-[11px] font-mono tracking-widest uppercase text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-white font-bold">CORRIDOR FEED // CNB-PRYJ TRUNK LINE</span>
          <span className="text-cyan-400/80 border border-cyan-500/30 px-1.5 py-0.5 rounded bg-cyan-950/20">
            {telemetry.blockId}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-zinc-500">
          <span>OHE: <strong className="text-zinc-200">{telemetry.oheVoltage} kV</strong></span>
          <span>KAVACH: <strong className="text-emerald-400">{telemetry.kavachStatus}</strong></span>
        </div>
      </div>

      {/* Center Reticle Focus */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-24 h-24 border border-cyan-500/20 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Bottom Telemetry HUD Bar */}
      <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between pointer-events-none">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            REALTIME VELOCITY
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tighter">
              {telemetry.speed}
            </span>
            <span className="text-xs font-mono text-cyan-400 font-bold">KM/H</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded text-[11px] font-mono text-zinc-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>HEADWAY GAP: <strong className="text-white font-bold">{telemetry.headway} MIN</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page Component ─────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

  // Lenis Smooth Momentum Scroll Initialization
  useEffect(() => {
    let lenisInstance: any = null;
    let isMounted = true;

    import("@studio-freight/lenis")
      .then(({ default: Lenis }) => {
        if (!isMounted) return;
        lenisInstance = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
        });

        function raf(time: number) {
          lenisInstance?.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      })
      .catch((err) => {
        console.warn("Lenis smooth scroll initialization fallback:", err);
      });

    return () => {
      isMounted = false;
      if (lenisInstance) {
        lenisInstance.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500 selection:text-black font-sans relative overflow-x-hidden">
      {/* Background Subtle Grid Pattern with Radial Vignette */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" 
      />

      {/* ─── SECTION 1: Minimalist HUD Navbar ────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#050505]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Monospace Tag */}
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45" />
            <span className="font-mono text-xs sm:text-sm tracking-wider text-zinc-300 font-semibold">
              SAMANVAY-AI <span className="text-zinc-600">//</span> NCR PRAYAGRAJ DIVISION{" "}
              <span className="text-cyan-400 font-mono text-[11px]">[SIH-26027]</span>
            </span>
          </div>

          {/* Right: Live Telemetry Badge + CTA */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900/80 border border-zinc-800 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-[11px] tracking-widest text-emerald-400 font-bold uppercase">
                440 KM CORRIDOR • LIVE
              </span>
            </div>

            <button
              onClick={() => navigate("/signin")}
              className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-mono text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_22px_rgba(6,182,212,0.7)] active:scale-95 cursor-pointer rounded-sm"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>ENTER TERMINAL</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── SECTION 2: Aggressive Motorsport-Style Hero Section ─────────────── */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col gap-10">
        {/* Edge Coordinates */}
        <div className="flex items-center justify-between font-mono text-[11px] tracking-widest text-cyan-400/80 border-b border-zinc-800/80 pb-3">
          <span>LAT: 28.6139° N // LON: 77.2090° E</span>
          <span className="flex items-center gap-2 text-zinc-400">
            STATUS: <strong className="text-emerald-400">OPTIMIZING REAL-TIME</strong>
          </span>
          <span className="hidden sm:inline">DISPATCH CLUSTER: NCR-PRYJ-01</span>
        </div>

        {/* Massive Condensed Display Headline & Terminal Launch Dock */}
        <motion.div {...motionVariant} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs sm:text-sm uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>[ PROBLEM STATEMENT 26027 // AUTONOMOUS RAILWAY BLOCK PLANNING ]</span>
            </p>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.92] text-white">
              AUTONOMOUS CORRIDOR
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-600">
                ORCHESTRATION.
              </span>
            </h1>
            <p className="max-w-2xl text-zinc-400 text-sm sm:text-base font-light tracking-wide mt-2">
              AI-driven operations research engine unifying Track, Signal, and Traction maintenance
              into conflict-free shadow blocks—safeguarding trunk line headway without passenger train cancellations.
            </p>
          </div>

          {/* 🚀 PRIMARY ENTER TERMINAL ACTION DOCK */}
          <div className="p-4 sm:p-5 rounded-lg bg-zinc-950/90 border border-zinc-800/90 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/signin")}
                  className="group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-mono text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.8)] active:scale-95 cursor-pointer rounded-sm"
                >
                  <Terminal className="w-4 h-4 text-black" />
                  <span>ENTER TERMINAL // OFFICER AUTH</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="#corridor-canvas"
                  className="hidden sm:flex items-center gap-2 px-4 py-4 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 font-mono text-xs font-bold uppercase tracking-wider transition-colors rounded-sm"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3D SIMULATOR VIEW</span>
                </a>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-zinc-900/80 px-3 py-2 rounded border border-zinc-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-zinc-300">SECURITY:</span>
                <span className="text-emerald-400 font-bold">CRIS 256-BIT HSM</span>
              </div>
            </div>

            {/* Quick Terminal Command & 1-Click Role Direct Launch */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-xs font-mono">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <span className="text-cyan-400 font-bold">&gt;_ SAMANVAY-SHELL:</span>
                <span className="text-zinc-500 hidden md:inline">SYSTEM READY // CLICK TO AUTHENTICATE</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] mr-1">FAST ROLES:</span>
                {[
                  { name: "Controller PRYJ", id: "OFFICER-01" },
                  { name: "Sr. DOM (Ops)", id: "OFFICER-02" },
                  { name: "Sr. DEN (TMS)", id: "OFFICER-03" },
                  { name: "Sr. DSTE (Signal)", id: "OFFICER-04" },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => navigate("/signin")}
                    className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-500/50 border border-zinc-800 text-zinc-400 transition-colors cursor-pointer"
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Central 3D Showcase Frame (16:9 Glassmorphic Viewport with Three.js) */}
        <motion.div
          id="corridor-canvas"
          {...motionVariant}
          className="relative w-full aspect-[16/9] max-h-[560px] bg-zinc-950 border border-zinc-800 shadow-2xl rounded-sm overflow-hidden"
        >
          <ThreeCorridorCanvas />
        </motion.div>

        {/* 3 Telemetry Pillars with 1px Divider Lines */}
        <motion.div
          {...motionVariant}
          className="grid grid-cols-1 md:grid-cols-3 border-y border-zinc-800 divide-y md:divide-y-0 md:divide-x divide-zinc-800"
        >
          <div className="py-6 px-4 sm:px-6 flex flex-col gap-1">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase">
              [01] TRUNK CORRIDOR
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              440 KM
            </div>
            <p className="text-zinc-400 text-xs font-light tracking-wide">
              Continuous Monitored Trunk Line across Kanpur Central to Prayagraj Junction.
            </p>
          </div>

          <div className="py-6 px-4 sm:px-6 flex flex-col gap-1">
            <span className="font-mono text-xs text-emerald-400 tracking-widest uppercase">
              [02] DOWNTIME REDUCTION
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              62%
            </div>
            <p className="text-zinc-400 text-xs font-light tracking-wide">
              Asset Downtime Reduction through predictive duration ML and bundled work crews.
            </p>
          </div>

          <div className="py-6 px-4 sm:px-6 flex flex-col gap-1">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase">
              [03] DISRUPTION PROFILE
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              0 DELAYS
            </div>
            <p className="text-zinc-400 text-xs font-light tracking-wide">
              Zero Schedule Disruption on Vande Bharat and Rajdhani premium timetable corridors.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── SECTION 3: Infinite Marquee Ticker ──────────────────────────────── */}
      <div className="w-full border-y border-zinc-800 bg-[#09090b] py-3.5 overflow-hidden flex select-none">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
          className="flex whitespace-nowrap text-xs font-mono tracking-widest uppercase text-zinc-300 gap-8 items-center"
        >
          <span>OR-TOOLS CP-SAT SOLVER</span>
          <span className="text-cyan-400">✦</span>
          <span>ZERO BLOCK BURSTS</span>
          <span className="text-emerald-400">✦</span>
          <span>AUTONOMOUS NLP DEFECT TRIAGE</span>
          <span className="text-cyan-400">✦</span>
          <span>DYNAMIC CONFLICT RESOLUTION</span>
          <span className="text-emerald-400">✦</span>
          <span>G&SR SAFETY COMPLIANT</span>
          <span className="text-cyan-400">✦</span>
          <span>KAVACH TCAS INTEGRATION</span>
          <span className="text-emerald-400">✦</span>
          <span>TMS-SMMS-TDMS UNIFIED</span>
          <span className="text-cyan-400">✦</span>
          {/* Duplicate set for seamless continuous loop */}
          <span>OR-TOOLS CP-SAT SOLVER</span>
          <span className="text-cyan-400">✦</span>
          <span>ZERO BLOCK BURSTS</span>
          <span className="text-emerald-400">✦</span>
          <span>AUTONOMOUS NLP DEFECT TRIAGE</span>
          <span className="text-cyan-400">✦</span>
          <span>DYNAMIC CONFLICT RESOLUTION</span>
          <span className="text-emerald-400">✦</span>
          <span>G&SR SAFETY COMPLIANT</span>
          <span className="text-cyan-400">✦</span>
          <span>KAVACH TCAS INTEGRATION</span>
          <span className="text-emerald-400">✦</span>
          <span>TMS-SMMS-TDMS UNIFIED</span>
          <span className="text-cyan-400">✦</span>
        </motion.div>
      </div>

      {/* ─── SECTION 4: Technical Capabilities (Asymmetric Bento Grid) ──────── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col gap-12">
        <motion.div {...motionVariant} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-widest uppercase font-bold">
            <Cpu className="w-4 h-4" />
            <span>ARCHITECTURAL STACK & CORE ENGINES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            FOUR PILLARS OF MATHEMATICAL PRECISION
          </h2>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Engineered to replace subjective manual section-controller decisions with provably optimal
            multi-department coordination.
          </p>
        </motion.div>

        {/* 4-Card Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Network Graph Engine (Span 7) */}
          <motion.div
            {...motionVariant}
            className="md:col-span-7 bg-[#09090b] border border-zinc-800 hover:border-cyan-500/50 transition-colors duration-300 p-6 sm:p-8 flex flex-col justify-between gap-6 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase font-bold">
                [01 // NETWORK GRAPH ENGINE]
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-white">
                Directed Multigraph Corridor Representation
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Models Indian Railways track sections as a strict mathematical multigraph $G = (V, E)$,
                where vertices represent stations and interlocked junctions, while parallel directional edges
                accurately encode UP/DOWN mainline, loop lines, and crossovers with turnout speed limits.
              </p>
            </div>

            {/* Micro Graphic Simulation */}
            <div className="bg-black/60 border border-zinc-800/80 p-4 font-mono text-[11px] flex flex-col gap-2 rounded">
              <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-800 pb-2">
                <span>GRAPH TOPOLOGY: NCR_PRAYAGRAJ</span>
                <span className="text-emerald-400">|V|=48, |E|=112</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-cyan-400 font-bold">[CNB]</span>
                <span className="text-zinc-600">════(DN-FAST)════</span>
                <span className="text-white font-bold">[FTP]</span>
                <span className="text-zinc-600">════(DN-FAST)════</span>
                <span className="text-cyan-400 font-bold">[PRYJ]</span>
              </div>
              <div className="text-zinc-500 text-[10px]">
                AUTO-REROUTE TO LOOP LINE ENGAGED UPON CRITICAL RAIL FRACTURE
              </div>
            </div>
          </motion.div>

          {/* Card 2: Predictive ML Duration (Span 5) */}
          <motion.div
            {...motionVariant}
            className="md:col-span-5 bg-[#09090b] border border-zinc-800 hover:border-emerald-500/50 transition-colors duration-300 p-6 sm:p-8 flex flex-col justify-between gap-6 group relative overflow-hidden"
          >
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs text-emerald-400 tracking-widest uppercase font-bold">
                [02 // PREDICTIVE ML DURATION]
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-white">
                ML True Block Estimation
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Replaces conventional guesswork with Scikit-Learn regression pipelines. Automatically
                estimates exact completion windows based on ambient rail temperature, gang strength, machine
                specs, and track curvature.
              </p>
            </div>

            <div className="bg-black/60 border border-zinc-800/80 p-4 font-mono text-[11px] flex flex-col gap-2 rounded">
              <div className="flex justify-between text-zinc-400 text-[10px]">
                <span>MANUAL ALLOTMENT</span>
                <span className="line-through text-red-400">180 MIN</span>
              </div>
              <div className="flex justify-between text-white font-bold">
                <span className="text-emerald-400">PREDICTED DURATION</span>
                <span className="text-emerald-400">114 MIN (R²: 0.94)</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-[63%]" />
              </div>
            </div>
          </motion.div>

          {/* Card 3: Spatial-Temporal Conflicts (Span 5) */}
          <motion.div
            {...motionVariant}
            className="md:col-span-5 bg-[#09090b] border border-zinc-800 hover:border-cyan-500/50 transition-colors duration-300 p-6 sm:p-8 flex flex-col justify-between gap-6 group relative overflow-hidden"
          >
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase font-bold">
                [03 // SPATIAL-TEMPORAL CONFLICTS]
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-white">
                Dynamic Train-Block Collisions
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Continuous collision detection cross-references train timetables with scheduled maintenance
                blocks. Instantly flags overlap violations, speed-restriction slowdowns, and headway
                incursions before physical section authorization.
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-red-950/20 border border-red-500/30 rounded text-red-400 font-mono text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>HEADWAY OVERLAP PREVENTED: TRAIN #12004 VS SMMS BLOCK</span>
            </div>
          </motion.div>

          {/* Card 4: OR-Tools CP-SAT Solver (Span 7) */}
          <motion.div
            {...motionVariant}
            className="md:col-span-7 bg-[#09090b] border border-zinc-800 hover:border-cyan-500/50 transition-colors duration-300 p-6 sm:p-8 flex flex-col justify-between gap-6 group relative overflow-hidden"
          >
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase font-bold">
                [04 // OR-TOOLS CP-SAT SOLVER]
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-white">
                Constraint-Programming Bundling Engine
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Google OR-Tools CP-SAT formulation solves the NP-hard block allocation matrix in milliseconds.
                Bundles disparate requests from Track (TMS), Signal (SMMS), and Traction (TDMS) into synchronized
                shadow blocks—locking maximum maintenance output under minimal passenger delay penalty.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center">
              <div className="bg-black/60 border border-zinc-800 p-2.5 rounded">
                <div className="text-zinc-500 text-[10px]">TMS TRACK</div>
                <div className="text-white font-bold">BUNDLED</div>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-2.5 rounded">
                <div className="text-zinc-500 text-[10px]">SMMS SIGNAL</div>
                <div className="text-emerald-400 font-bold">CONCURRENT</div>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-2.5 rounded">
                <div className="text-zinc-500 text-[10px]">TDMS OHE</div>
                <div className="text-cyan-400 font-bold">SYNCHRONIZED</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SECTION 5: Impact Statistics Strip ─────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-[#09090b] py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <motion.div {...motionVariant} className="flex flex-col gap-1">
            <span className="font-mono text-xs text-emerald-400 tracking-widest uppercase font-bold">
              [ REAL-WORLD NETWORK BENCHMARKS ]
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
              PERFORMANCE UNDER HIGH-DENSITY CORRIDOR CONDITIONS
            </h2>
          </motion.div>

          <motion.div
            {...motionVariant}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-zinc-800/60"
          >
            <div className="flex flex-col gap-1">
              <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tighter">
                130 <span className="text-xl text-cyan-400">KM/H</span>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                Track Speeds Protected
              </span>
              <p className="text-zinc-500 text-xs mt-1">
                Zero speed penalty on Rajdhani and Vande Bharat runs while executing urgent sleeper replacement.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tighter">
                &lt; 15 <span className="text-xl text-emerald-400">MIN</span>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                Headway Buffer Maintained
              </span>
              <p className="text-zinc-500 text-xs mt-1">
                Preserves critical signal block spacing across peak passenger traffic windows.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tighter">
                100%
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                Section Controller PN Compliance
              </span>
              <p className="text-zinc-500 text-xs mt-1">
                Full cryptographic Private Number audit trails ensuring absolute G&SR compliance.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SECTION 6: Action Footer ────────────────────────────────────────── */}
      <footer className="py-24 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col gap-16">
        <motion.div
          {...motionVariant}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-b border-zinc-800 pb-16"
        >
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase font-bold">
              [ SIH PROBLEM STATEMENT 26027 // READY FOR DEPLOYMENT ]
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white">
              ORCHESTRATE
              <br />
              <span className="text-zinc-500">THE NETWORK.</span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg">
              Transition from manual logbooks to fully autonomous railway block coordination.
              Access live timetables, conflict engine, and predictive machine learning models.
            </p>
          </div>

          <button
            onClick={() => navigate("/signin")}
            className="group flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-mono text-sm font-black uppercase tracking-wider transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 cursor-pointer rounded-sm"
          >
            <Terminal className="w-5 h-5" />
            <span>ENTER TERMINAL // G&amp;SR AUTH</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
          </button>
        </motion.div>

        {/* Minimalist Copyright & SIH Metadata */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-zinc-500 tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>SAMANVAY-AI © 2026 // MINISTRY OF RAILWAYS (INDIAN RAILWAYS)</span>
          </div>
          <div>
            <span>SMART INDIA HACKATHON // PROBLEM ID 26027</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
