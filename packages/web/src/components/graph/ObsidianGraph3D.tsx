import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MintGraphEdge, MintGraphNode } from "../../types/graph";
import type { AgentGraphTraversal } from "../../types/telemetry";
import { ZoomIn, ZoomOut, RotateCcw, Compass, Activity, ShieldCheck, Database, Layers } from "lucide-react";

export interface ObsidianGraph3DProps {
  data: {
    nodes: MintGraphNode[];
    edges: MintGraphEdge[];
  };
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  activeTraversals?: AgentGraphTraversal[];
  focusNodeId?: string | null;
}

interface SimNode3D {
  id: string;
  label: string;
  sublabel?: string;
  type: MintGraphNode["type"];
  status?: string;
  metadata?: Record<string, any>;
  x: number;
  y: number;
  z: number;
  cluster: "orchestrator" | "inventory" | "purchasing" | "logistics" | "governance";
  mesh?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  sprite?: THREE.Sprite;
}

/**
 * Genera un sprite 2D de alta resolución (billboard) para que los nombres de los agentes
 * sean 100% nítidos, legibles y de alto contraste desde cualquier ángulo de la cámara.
 */
function createBillboardSprite(title: string, subtitle?: string, isHub = false): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Fondo de tarjeta con contraste verificado (Dark Emerald / Panel)
    ctx.fillStyle = isHub ? "rgba(11, 16, 14, 0.98)" : "rgba(17, 25, 21, 0.95)";
    ctx.strokeStyle = isHub ? "#9DE342" : "#2BB656";
    ctx.lineWidth = isHub ? 4 : 2.5;

    const x = 12, y = 12, w = 488, h = 116, r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glow suave de borde
    ctx.shadowColor = isHub ? "rgba(157, 227, 66, 0.5)" : "rgba(43, 182, 86, 0.4)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Indicador circular de estado (verde esmeralda o lima)
    ctx.fillStyle = isHub ? "#9DE342" : "#2BB656";
    ctx.beginPath();
    ctx.arc(52, 70, 11, 0, Math.PI * 2);
    ctx.fill();

    // Título del Nodo (Blanco de alto contraste #EEF2EC)
    ctx.fillStyle = "#EEF2EC";
    ctx.font = isHub ? "bold 34px Figtree, system-ui, sans-serif" : "bold 30px Figtree, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 80, subtitle ? 54 : 70);

    // Subtítulo / Rol (Gris secundario #AEBCB2 en mono)
    if (subtitle) {
      ctx.fillStyle = isHub ? "#9DE342" : "#AEBCB2";
      ctx.font = "600 20px 'IBM Plex Mono', monospace";
      ctx.fillText(subtitle.slice(0, 32), 80, 88);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(isHub ? 160 : 130, isHub ? 44 : 35, 1);
  return sprite;
}

export const ObsidianGraph3D: React.FC<ObsidianGraph3DProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  activeTraversals = [],
  focusNodeId,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode3D | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(false);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const nodesMapRef = useRef<Map<string, SimNode3D>>(new Map());

  // 1. Clasificación topológica de nodos por constelaciones tridimensionales
  const simNodes = useMemo(() => {
    const rawNodes = data.nodes;
    const nodesMap = new Map<string, SimNode3D>();

    // Centros espaciales 3D (Arquitectura Galáctica Obsidian de Mint)
    const clusterCenters = {
      orchestrator: { x: 0, y: 0, z: 0 },
      inventory: { x: -380, y: 180, z: -200 },
      purchasing: { x: -380, y: -180, z: 200 },
      logistics: { x: 380, y: -140, z: -180 },
      governance: { x: 380, y: 180, z: 180 },
    };

    let invSkuIdx = 0;
    let compSkuIdx = 0;
    let logIdx = 0;
    let govIdx = 0;

    rawNodes.forEach((node) => {
      let cluster: SimNode3D["cluster"] = "inventory";
      let center = clusterCenters.inventory;
      let offset = { x: 0, y: 0, z: 0 };

      if (node.id === "agent_orchestrator") {
        cluster = "orchestrator";
        center = clusterCenters.orchestrator;
      } else if (node.id === "agent_inventario" || node.type === "warehouse") {
        cluster = "inventory";
        center = clusterCenters.inventory;
        if (node.type === "warehouse") {
          const angle = Math.random() * Math.PI * 2;
          const r = 110 + Math.random() * 40;
          offset = {
            x: Math.cos(angle) * r,
            y: (Math.random() - 0.5) * 80,
            z: Math.sin(angle) * r,
          };
        }
      } else if (node.id === "agent_compras" || node.type === "supplier") {
        cluster = "purchasing";
        center = clusterCenters.purchasing;
        if (node.type === "supplier") {
          const angle = Math.random() * Math.PI * 2;
          const r = 120 + Math.random() * 50;
          offset = {
            x: Math.cos(angle) * r,
            y: (Math.random() - 0.5) * 90,
            z: Math.sin(angle) * r,
          };
        }
      } else if (node.id === "agent_logistica") {
        cluster = "logistics";
        center = clusterCenters.logistics;
      } else if (node.id === "agent_auditoria" || node.type === "decision" || node.type === "purchase_order") {
        cluster = "governance";
        center = clusterCenters.governance;
        const angle = Math.random() * Math.PI * 2;
        const r = 90 + (govIdx++ % 12) * 16;
        offset = {
          x: Math.cos(angle) * r,
          y: Math.sin(angle * 1.5) * 60,
          z: Math.sin(angle) * r,
        };
      } else if (node.type === "sku") {
        const isLowStock = node.status === "warning";
        if (isLowStock) {
          cluster = "purchasing";
          center = clusterCenters.purchasing;
          const phi = 2.399963;
          const angle = compSkuIdx * phi;
          const r = 90 + Math.sqrt(compSkuIdx) * 26;
          compSkuIdx++;
          offset = {
            x: Math.cos(angle) * r,
            y: ((compSkuIdx % 5) - 2) * 28,
            z: Math.sin(angle) * r,
          };
        } else {
          cluster = "inventory";
          center = clusterCenters.inventory;
          const phi = 2.399963;
          const angle = invSkuIdx * phi;
          const r = 90 + Math.sqrt(invSkuIdx) * 26;
          invSkuIdx++;
          offset = {
            x: Math.cos(angle) * r,
            y: ((invSkuIdx % 5) - 2) * 28,
            z: Math.sin(angle) * r,
          };
        }
      } else {
        cluster = "logistics";
        center = clusterCenters.logistics;
        const angle = Math.random() * Math.PI * 2;
        const r = 90 + (logIdx++ % 8) * 20;
        offset = {
          x: Math.cos(angle) * r,
          y: (Math.random() - 0.5) * 60,
          z: Math.sin(angle) * r,
        };
      }

      nodesMap.set(node.id, {
        id: node.id,
        label: node.label,
        sublabel: node.sublabel,
        type: node.type,
        status: node.status,
        metadata: node.metadata,
        cluster,
        x: center.x + offset.x,
        y: center.y + offset.y,
        z: center.z + offset.z,
      });
    });

    return nodesMap;
}, [data.nodes]);

// 2. Inicialización del motor Three.js (Obsidian 3D Canvas)
useEffect(() => {
  const container = mountRef.current;
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width <= 0 || height <= 0) return;

  // Escena y Niebla espacial Mint (#090D0B)
  const scene = new THREE.Scene();
  sceneRef.current = scene;
  scene.background = new THREE.Color(0x090d0b);
  scene.fog = new THREE.FogExp2(0x090d0b, 0.00035);

  // Cámara de perspectiva amplia
  const camera = new THREE.PerspectiveCamera(50, width / height, 10, 5000);
  camera.position.set(0, 280, 1050);
  cameraRef.current = camera;

  // Renderizador WebGL de alto rendimiento
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x090d0b, 1);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // Controles de órbita 3D suaves
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 160;
  controls.maxDistance = 3000;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.6;
  controlsRef.current = controls;

  // Iluminación ambiental y direccional suave (sin glare blanco que ciegue los textos)
  const ambientLight = new THREE.AmbientLight(0x15251b, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xa0e0b0, 0.35);
  dirLight.position.set(400, 800, 400);
  scene.add(dirLight);

  // Luz esmeralda potente en el orquestador central
  const centerPoint = new THREE.PointLight(0x2bb656, 3.2, 900);
  centerPoint.position.set(0, 0, 0);
  scene.add(centerPoint);

  // Cuadrícula espacial tridimensional tenue (oscura, sin reflejos blancos)
  const gridHelper = new THREE.GridHelper(2000, 40, 0x153624, 0x0c1611);
  gridHelper.position.y = -380;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.12;
  scene.add(gridHelper);

  // Geometrías y Materiales compartidos
  const sphereGeoOrchestrator = new THREE.SphereGeometry(22, 28, 28);
  const sphereGeoAgent = new THREE.SphereGeometry(17, 24, 24);
  const sphereGeoWarehouse = new THREE.SphereGeometry(11, 16, 16);
  const sphereGeoSupplier = new THREE.SphereGeometry(10, 16, 16);
  const sphereGeoDecision = new THREE.SphereGeometry(9, 14, 14);
  const sphereGeoSku = new THREE.SphereGeometry(7, 12, 12);
  const haloGeo = new THREE.SphereGeometry(28, 16, 16);

  const matOrchestrator = new THREE.MeshStandardMaterial({
    color: 0x2bb656,
    emissive: 0x1f7a38,
    roughness: 0.15,
    metalness: 0.4,
  });
  const matAgent = new THREE.MeshStandardMaterial({
    color: 0x2bb656,
    emissive: 0x145228,
    roughness: 0.2,
    metalness: 0.3,
  });
  const matWarehouse = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0f5249,
    roughness: 0.25,
    metalness: 0.2,
  });
  const matSupplier = new THREE.MeshStandardMaterial({
    color: 0x9aa9bc,
    emissive: 0x263442,
    roughness: 0.3,
    metalness: 0.2,
  });
  const matDecision = new THREE.MeshStandardMaterial({
    color: 0x9aa2ff,
    emissive: 0x262b66,
    roughness: 0.25,
    metalness: 0.3,
  });
  const matSkuNormal = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0f5249,
    roughness: 0.4,
  });
  const matSkuWarning = new THREE.MeshStandardMaterial({
    color: 0xf5b544,
    emissive: 0x66440f,
    roughness: 0.3,
  });
  const matHalo = new THREE.MeshBasicMaterial({
    color: 0x2bb656,
    transparent: true,
    opacity: 0.18,
    wireframe: true,
  });

  // Anillos orbitales giratorios alrededor del Orquestador Central
  const ringGeoInner = new THREE.RingGeometry(34, 35.5, 48);
  const ringGeoOuter = new THREE.RingGeometry(48, 49.5, 48);
  const matRing = new THREE.MeshBasicMaterial({
    color: 0x2bb656,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
  });
  const innerRingMesh = new THREE.Mesh(ringGeoInner, matRing);
  const outerRingMesh = new THREE.Mesh(ringGeoOuter, matRing);
  innerRingMesh.rotation.x = Math.PI / 3;
  outerRingMesh.rotation.y = Math.PI / 4;
  scene.add(innerRingMesh);
  scene.add(outerRingMesh);

  // 3. Montar Nodos 3D y Carteles Billboard Nítidos
  const meshesGroup = new THREE.Group();
  scene.add(meshesGroup);
  const meshesMap = new Map<string, THREE.Mesh>();
  const spritesGroup = new THREE.Group();
  scene.add(spritesGroup);

  simNodes.forEach((node) => {
    let geo = sphereGeoSku;
    let mat = node.status === "warning" ? matSkuWarning : matSkuNormal;

      if (node.id === "agent_orchestrator") {
        geo = sphereGeoOrchestrator;
        mat = matOrchestrator;
      } else if (node.type === "agent") {
        geo = sphereGeoAgent;
        mat = matAgent;
      } else if (node.type === "warehouse") {
        geo = sphereGeoWarehouse;
        mat = matWarehouse;
      } else if (node.type === "supplier") {
        geo = sphereGeoSupplier;
        mat = matSupplier;
      } else if (node.type === "decision" || node.type === "purchase_order") {
        geo = sphereGeoDecision;
        mat = matDecision;
      }

      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData = { id: node.id };
      meshesGroup.add(mesh);
      meshesMap.set(node.id, mesh);
      node.mesh = mesh;

        // Halo envolvente para todos los agentes
        if (node.type === "agent" || node.id === "agent_orchestrator") {
          const halo = new THREE.Mesh(haloGeo, matHalo);
          halo.position.set(node.x, node.y, node.z);
          scene.add(halo);
          node.haloMesh = halo;

          // Cartel flotante billboard de alta resolución para lectura permanente
          const isHub = node.id === "agent_orchestrator";
          const sprite = createBillboardSprite(node.label, node.sublabel, isHub);
          sprite.position.set(node.x, node.y + (isHub ? 38 : 32), node.z);
          spritesGroup.add(sprite);
          node.sprite = sprite;
        }
      });

  nodesMapRef.current = simNodes;

    // 4. Montar Conexiones Aristas (Líneas Regulares vs. Arterias Troncales del Orquestador)
    const normalLineMat = new THREE.LineBasicMaterial({
      color: 0x26342c,
      transparent: true,
      opacity: 0.22,
    });
      const trunkLineMat = new THREE.LineBasicMaterial({
        color: 0x2bb656,
        transparent: true,
        opacity: 0.88,
        linewidth: 2,
      });

      const normalEdgePositions: number[] = [];
      const trunkEdgePositions: number[] = [];
      const specialistAgentTargets: THREE.Vector3[] = [];

      // Identificar agentes especialistas para garantizar conexiones troncales
      const orchestratorNode = simNodes.get("agent_orchestrator");
      const specialistAgentNodes = Array.from(simNodes.values()).filter(
        (n) => (n.type === "agent" && n.id !== "agent_orchestrator") || n.id.startsWith("agent_")
      );

      // Registrar destinos para pulsos de datos animados
      if(orchestratorNode) {
        specialistAgentNodes.forEach((agentNode) => {
          specialistAgentTargets.push(new THREE.Vector3(agentNode.x, agentNode.y, agentNode.z));
          trunkEdgePositions.push(
            orchestratorNode.x, orchestratorNode.y, orchestratorNode.z,
            agentNode.x, agentNode.y, agentNode.z
          );
        });
      }

    data.edges.forEach((edge) => {
        const s = simNodes.get(edge.source);
        const t = simNodes.get(edge.target);
        if (s && t) {
          const isTrunk =
            s.id === "agent_orchestrator" ||
            t.id === "agent_orchestrator" ||
            s.type === "agent" && t.type === "agent";

          if (isTrunk) {
            trunkEdgePositions.push(s.x, s.y, s.z, t.x, t.y, t.z);
          } else {
            normalEdgePositions.push(s.x, s.y, s.z, t.x, t.y, t.z);
          }
        }
      });

      // Malla de líneas normales
      const normalLinesGeo = new THREE.BufferGeometry();
      normalLinesGeo.setAttribute("position", new THREE.Float32BufferAttribute(normalEdgePositions, 3));
      const normalLinesMesh = new THREE.LineSegments(normalLinesGeo, normalLineMat);
      scene.add(normalLinesMesh);

      // Malla de arterias troncales del orquestador (verde brillante destacado)
      const trunkLinesGeo = new THREE.BufferGeometry();
      trunkLinesGeo.setAttribute("position", new THREE.Float32BufferAttribute(trunkEdgePositions, 3));
      const trunkLinesMesh = new THREE.LineSegments(trunkLinesGeo, trunkLineMat);
      scene.add(trunkLinesMesh);

      // 5. Pulsos de Energía / Telemetría en Vivo (Motes que viajan por las arterias del Orquestador)
      const motesGroup = new THREE.Group();
      scene.add(motesGroup);
      const moteGeo = new THREE.SphereGeometry(2.6, 8, 8);
      const moteMat = new THREE.MeshBasicMaterial({ color: 0x9de342 });

      const activeMotes: { mesh: THREE.Mesh; target: THREE.Vector3; offset: number; speed: number }[] = [];
    if(orchestratorNode) {
      specialistAgentTargets.forEach((targetPos, idx) => {
        // 2 motes por arteria para flujo visual continuo
        for (let i = 0; i < 2; i++) {
          const moteMesh = new THREE.Mesh(moteGeo, moteMat);
          motesGroup.add(moteMesh);
          activeMotes.push({
            mesh: moteMesh,
            target: targetPos,
            offset: (i * 0.5) + (idx * 0.15),
            speed: 0.35,
          });
        }
      });
    }

    // 6. Raycasting e Interacción (Hover y Click)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      setMousePos({ x: event.clientX, y: event.clientY });

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshesGroup.children);

      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.id;
        const hitNode = simNodes.get(hitId) || null;
        setHoveredNode(hitNode);
        container.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        container.style.cursor = "default";
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshesGroup.children);
      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.id;
        if (hitId && onSelectNode) {
          onSelectNode(hitId);
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);

    // 7. Bucle de Renderizado y Animación Fluida
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      controls.update();

      // Rotación suave de los anillos orbitales del Orquestador
      innerRingMesh.rotation.z = elapsedTime * 0.25;
      outerRingMesh.rotation.z = -elapsedTime * 0.18;

      // Animación de halos en agentes
      simNodes.forEach((n) => {
        if (n.haloMesh) {
          const s = 1 + Math.sin(elapsedTime * 2 + n.x * 0.01) * 0.08;
          n.haloMesh.scale.set(s, s, s);
          n.haloMesh.rotation.y += 0.004;
        }
      });

      // Animación de motes de energía a lo largo de las arterias del Orquestador
      const centerVec = new THREE.Vector3(0, 0, 0);
      activeMotes.forEach((mote) => {
        const progress = (elapsedTime * mote.speed + mote.offset) % 1;
        mote.mesh.position.lerpVectors(centerVec, mote.target, progress);
        const scale = Math.sin(progress * Math.PI) * 1.2 + 0.3;
        mote.mesh.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return() => {
    cancelAnimationFrame(animId);
    window.removeEventListener("resize", handleResize);
    container.removeEventListener("mousemove", handleMouseMove);
    container.removeEventListener("click", handleClick);
    controls.dispose();
    renderer.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
}, [simNodes, data.edges, autoRotate, onSelectNode]);

// Enfocar nodo cuando cambia focusNodeId
useEffect(() => {
  if (!focusNodeId || !controlsRef.current || !cameraRef.current) return;
  const target = nodesMapRef.current.get(focusNodeId);
  if (target) {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    controls.target.set(target.x, target.y, target.z);
    camera.position.set(target.x, target.y + 110, target.z + 280);
    controls.update();
  }
}, [focusNodeId]);

return (
    <div className="relative w-full h-full min-h-[460px] rounded-container overflow-hidden bg-canvas select-none">
      <div ref={mountRef} className="w-full h-full" />

        {/* Indicador de Modo Telemetría 3D (Arriba Izquierda) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-control bg-panel border border-border shadow-popover">
          <Activity className="w-3.5 h-3.5 text-brand animate-pulse" />
          <span className="text-caption font-mono uppercase tracking-wider text-secondary">
            Obsidian 3D · Arterias Autónomas Activas
          </span>
        </div>

        {/* Controles de Cámara 3D (Estilo Obsidian Pro) */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-control bg-panel border border-border shadow-popover">
          <button
            type="button"
            onClick={() => {
              if (controlsRef.current && cameraRef.current) {
                cameraRef.current.position.set(0, 280, 1050);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
              }
            }}
            className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
            title="Restablecer vista 3D"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.multiplyScalar(0.85);
                controlsRef.current.update();
              }
            }}
            className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.multiplyScalar(1.15);
                controlsRef.current.update();
              }
            }}
            className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border my-auto mx-0.5" />

          <button
            type="button"
            onClick={() => {
              setAutoRotate((prev) => {
                if (controlsRef.current) {
                  controlsRef.current.autoRotate = !prev;
                }
                return !prev;
              });
            }}
            className={`p-1.5 rounded-control transition-colors ${autoRotate
                ? "bg-brand/20 text-brand border border-brand/30"
                : "text-secondary hover:text-primary hover:bg-raised"
              }`}
            title={autoRotate ? "Detener rotación orbital" : "Activar rotación orbital automática"}
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Tooltip Flotante de Alto Contraste (Fondo Sólido Oscuro #111915, Borde Esmeralda, Texto Blanco Nítido) */}
        {hoveredNode && (
          <div
            className="fixed pointer-events-none z-50 px-3.5 py-2.5 rounded-card border shadow-2xl transition-all"
            style={{
              backgroundColor: "#111915",
              borderColor: hoveredNode.id === "agent_orchestrator" ? "#9DE342" : "#2BB656",
              boxShadow: "0 12px 32px rgba(0,0,0,0.8), 0 0 16px rgba(43,182,86,0.2)",
              left: mousePos.x + 16,
              top: mousePos.y - 16,
              minWidth: "220px",
            }}
          >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block animate-pulse shrink-0"
                  style={{
                    backgroundColor:
                      hoveredNode.id === "agent_orchestrator" || hoveredNode.type === "agent"
                        ? "#2BB656"
                        : hoveredNode.type === "warehouse"
                          ? "#2DD4BF"
                          : hoveredNode.status === "warning"
                            ? "#F5B544"
                            : "#9AA2FF",
                  }}
                />
                <span className="font-semibold text-body tracking-tight text-primary truncate">
                  {hoveredNode.label}
                </span>
              </div>

                <div className="flex items-center gap-2 mt-1 font-mono text-caption text-secondary">
                  <span
                    className="uppercase text-[10px] px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: "#0B100E",
                      borderColor: "#26342C",
                      color: hoveredNode.id === "agent_orchestrator" ? "#9DE342" : "#2BB656",
                    }}
                  >
                    {hoveredNode.type}
                  </span>
                  <span>Constelación: {hoveredNode.cluster}</span>
                </div>

                {hoveredNode.sublabel && (
                  <div className="mt-1.5 text-caption text-muted truncate max-w-xs">
                    {hoveredNode.sublabel}
                  </div>
                )}

                {hoveredNode.metadata && (
                  <div className="mt-2 pt-1.5 border-t border-border text-caption font-mono space-y-0.5 text-secondary">
                    {hoveredNode.metadata.role && (
                      <div className="flex justify-between">
                        <span className="text-muted">Rol:</span>
                        <span className="text-primary font-medium">{hoveredNode.metadata.role}</span>
                      </div>
                    )}
                    {hoveredNode.metadata.city && (
                      <div className="flex justify-between">
                        <span className="text-muted">Ciudad:</span>
                        <span className="text-primary font-medium">{hoveredNode.metadata.city}</span>
                      </div>
                    )}
                    {hoveredNode.metadata.status && (
                      <div className="flex justify-between">
                        <span className="text-muted">Estado:</span>
                        <span className="text-state-ok font-medium">{hoveredNode.metadata.status}</span>
                      </div>
                    )}
                    {hoveredNode.id === "agent_orchestrator" && (
                      <div className="flex justify-between">
                        <span className="text-muted">Topología:</span>
                        <span className="text-brand font-medium">Hub Central Activo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
      )}
            </div>
            );
};
