import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Application Card Data ────────────────────────────────────────────────────
export const CARDS = [
  {
    company: 'GOOGLE',
    role: 'Software Engineer',
    status: 'INTERVIEW',
    hoverLabel: 'NEXT STAGE',
    hoverText: 'Tomorrow · 10:30 AM',
    isHero: true,
    pos: [0.8, 0.2, 2.0],  // Primary focus
    rot: [0, -0.05, 0]
  },
  {
    company: 'MICROSOFT',
    role: 'Frontend Engineer',
    status: 'APPLIED',
    hoverLabel: 'STATUS',
    hoverText: 'Applied 2 days ago',
    pos: [-1.2, 2.2, -0.5], // Top left support
    rot: [0.08, 0.12, -0.04]
  },
  {
    company: 'AMAZON',
    role: 'Full Stack Dev',
    status: 'TECHNICAL',
    hoverLabel: 'UPCOMING',
    hoverText: 'System Design · Next Week',
    pos: [2.5, -1.8, -0.2], // Bottom right support
    rot: [-0.05, -0.15, 0.05]
  },
  {
    company: 'META',
    role: 'Software Engineer',
    status: 'HR ROUND',
    hoverLabel: 'FEEDBACK',
    hoverText: 'Pending team fit',
    pos: [-2.6, -0.8, -2.5], // Far left back
    rot: [-0.08, 0.18, 0.05]
  },
  {
    company: 'LINEAR',
    role: 'Product Engineer',
    status: 'OFFER',
    hoverLabel: 'DEADLINE',
    hoverText: 'Accept by Friday',
    pos: [3.4, 1.8, -1.8],   // Far right back
    rot: [0.08, -0.22, -0.06]
  }
];

// ─── Application Card Component ───────────────────────────────────────────────
function AppCard({ data, index, hoveredIndex, setHoveredIndex }) {
  const groupRef = useRef();
  const frontMatRef = useRef();
  const hoverPanelRef = useRef();

  const clickedScale = useRef(1);
  const currentTint = useRef(new THREE.Color());
  const hoverOpacity = useRef(0);
  const hoverY = useRef(-1.0);

  const isHovered = hoveredIndex === index;

  // Primary Face Texture
  const texture = useMemo(() => {
    let cardBg = '#FFFFFF'; // Pure white
    let textColor = '#09090B';
    let metaColor = '#71717A';
    let statusColor = '#71717A';
    let borderColor = '#E4E4E7';

    if (data.company === 'GOOGLE') {
      cardBg = '#09090B';
      textColor = '#FFFFFF';
      metaColor = '#A1A1AA';
      statusColor = '#FFFFFF';
      borderColor = '#27272A';
    } else if (data.company === 'META') {
      cardBg = '#F4F4F5';
    } else if (data.company === 'LINEAR') {
      cardBg = '#FAFAFA';
    }

    if (isHovered) {
      statusColor = data.company === 'GOOGLE' ? '#FFFFFF' : '#09090B';
      if (data.company !== 'GOOGLE') {
        borderColor = '#09090B';
        cardBg = '#FFFFFF';
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = cardBg;
    ctx.fillRect(0, 0, 1024, 512);

    // Accent border line at top
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, 1024, 16);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 58px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.company, 80, 160);

    ctx.fillStyle = metaColor;
    ctx.font = '42px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.role, 80, 230);

    ctx.fillStyle = statusColor;
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillText('●  ' + data.status, 80, 420);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, [data, isHovered]);

  // Hover Info Panel Texture
  const hoverTex = useMemo(() => {
    let cardBg = '#FFFFFF';
    let textColor = '#09090B';
    let metaColor = '#71717A';
    let borderColor = '#E4E4E7';

    if (data.company === 'GOOGLE') {
      cardBg = '#09090B';
      textColor = '#FFFFFF';
      metaColor = '#A1A1AA';
      borderColor = '#27272A';
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = cardBg;
    ctx.fillRect(0, 0, 1024, 200);

    ctx.fillStyle = borderColor;
    ctx.fillRect(40, 0, 944, 2);

    ctx.fillStyle = metaColor;
    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.hoverLabel, 80, 70);

    ctx.fillStyle = textColor;
    ctx.font = '40px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.hoverText, 80, 140);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, [data]);

  const targetPos = useMemo(() => new THREE.Vector3(...data.pos), [data.pos]);
  const targetRot = useMemo(() => new THREE.Euler(...data.rot), [data.rot]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const tP = targetPos.clone();
    const tR = targetRot.clone();

    if (isHovered) {
      tP.z += 1.5;
      tP.y += 0.2;
      tR.x = state.mouse.y * 0.12;
      tR.y = state.mouse.x * 0.12;
      tR.z = 0;
    } else if (hoveredIndex !== null) {
      tP.z -= 0.6;
    }

    groupRef.current.position.lerp(tP, 0.08);
    const q = new THREE.Quaternion().setFromEuler(tR);
    groupRef.current.quaternion.slerp(q, 0.08);

    clickedScale.current = THREE.MathUtils.lerp(clickedScale.current, 1, 0.15);
    const baseScale = isHovered ? 1.06 : (hoveredIndex !== null ? 0.98 : 1.0);
    const targetScale = baseScale * clickedScale.current;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    if (hoveredIndex !== null && !isHovered) {
      currentTint.current.lerp(new THREE.Color('#E4E4E7'), 0.1);
    } else {
      currentTint.current.lerp(new THREE.Color('#FFFFFF'), 0.1);
    }
    if (frontMatRef.current) {
      frontMatRef.current.color.copy(currentTint.current);
    }

    const tOpacity = isHovered ? 1 : 0;
    const tY = isHovered ? -1.45 : -1.0;
    hoverOpacity.current = THREE.MathUtils.lerp(hoverOpacity.current, tOpacity, 0.12);
    hoverY.current = THREE.MathUtils.lerp(hoverY.current, tY, 0.12);

    if (hoverPanelRef.current) {
      hoverPanelRef.current.position.y = hoverY.current;
      hoverPanelRef.current.material.opacity = hoverOpacity.current;
      hoverPanelRef.current.visible = hoverOpacity.current > 0.01;
    }
  });

  return (
    <group
      ref={groupRef}
      position={data.pos}
      rotation={data.rot}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredIndex(index); }}
      onPointerOut={() => setHoveredIndex(null)}
      onPointerDown={(e) => { e.stopPropagation(); clickedScale.current = 0.95; }}
    >
      {/* Card Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.1, 0.08]} />
        <meshStandardMaterial
          color={
            data.company === 'GOOGLE' ? '#09090B' :
              data.company === 'META' ? '#F4F4F5' :
                data.company === 'LINEAR' ? '#FAFAFA' :
                  '#FFFFFF'
          }
          roughness={1.0}
          metalness={0}
        />
      </mesh>

      {/* Front Face */}
      <mesh position={[0, 0, 0.041]}>
        <planeGeometry args={[4.2, 2.1]} />
        <meshStandardMaterial
          ref={frontMatRef}
          map={texture}
          transparent={true}
          roughness={1.0}
          metalness={0}
        />
      </mesh>

      {/* Attached Hover Information Panel */}
      <mesh ref={hoverPanelRef} position={[0, -1.0, 0.035]}>
        <planeGeometry args={[4.2, 0.8]} />
        <meshStandardMaterial
          map={hoverTex}
          transparent
          opacity={0}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

// ─── Application Stack (Group) ────────────────────────────────────────────────
function ApplicationStack({ mouseRef, scrollRef, reducedMotion, hoveredIndex, setHoveredIndex, isMobile }) {
  const stackRef = useRef();
  const { size } = useThree();

  useFrame((state) => {
    if (!stackRef.current) return;

    const w = size.width;

    let targetX = 0;
    let targetY = 0;
    let targetScale = 1.0;

    if (w < 480) { // Mobile
      targetX = -0.4;
      targetY = -0.1;
      targetScale = 0.65;
    } else if (w < 768) { // Large mobile / Small tablet
      targetX = -0.4;
      targetY = -0.1;
      targetScale = 0.75;
    } else if (w < 1024) { // Tablet
      targetX = 2.0;
      targetY = -0.5;
      targetScale = 0.85;
    } else if (w < 1440) { // Regular Desktop
      targetX = 3;
      targetY = 0;
      targetScale = 0.95;
    } else { // Large Desktop
      targetX = 3.6;
      targetY = 0;
      targetScale = 1.05;
    }

    const scroll = scrollRef.current;
    
    stackRef.current.position.lerp(new THREE.Vector3(targetX, targetY - scroll * 15, 0), 0.05);
    const s = targetScale - scroll * 0.5;
    stackRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.05);

    if (!reducedMotion && !isMobile) {
      const pX = (mouseRef.current.x * 0.5) + (scroll * 1.5);
      const pY = (mouseRef.current.y * -0.5) - (scroll * 1.0);
      stackRef.current.rotation.y = THREE.MathUtils.lerp(stackRef.current.rotation.y, pX, 0.05);
      stackRef.current.rotation.x = THREE.MathUtils.lerp(stackRef.current.rotation.x, pY, 0.05);
    } else {
      stackRef.current.rotation.y = THREE.MathUtils.lerp(stackRef.current.rotation.y, scroll * 1.5, 0.05);
      stackRef.current.rotation.x = THREE.MathUtils.lerp(stackRef.current.rotation.x, -scroll * 1.0, 0.05);
    }
  });

  return (
    <group ref={stackRef}>
      {CARDS.map((card, i) => (
        <AppCard
          key={card.company}
          data={card}
          index={i}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
        />
      ))}
    </group>
  );
}

// ─── Environment ──────────────────────────────────────────────────────────────
function Environment({ reducedMotion }) {
  const particlesRef = useRef();

  const { positions } = useMemo(() => {
    const count = 40;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = Math.random() * -15 - 5;
    }
    return { positions: pos };
  }, []);

  useFrame((state) => {
    if (!reducedMotion && particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <>
      <color attach="background" args={['#FFFFFF']} />
      <fog attach="fog" args={['#FFFFFF', 10, 40]} />

      <ambientLight intensity={1.6} color="#ffffff" />
      <directionalLight
        position={[1, 4, 12]}
        intensity={0.7}
        color="#ffffff"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0001}
        shadow-radius={10}
      >
        <orthographicCamera attach="shadow-camera" args={[-25, 25, 25, -25, 0.1, 60]} />
      </directionalLight>
      <directionalLight position={[-8, -2, 4]} intensity={0.4} color="#FAFAFA" />

      {/* Physical shadow-receiving plane */}
      <mesh receiveShadow position={[0, 0, -3.8]}>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial color="#000000" transparent opacity={0.06} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={40} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color="#A1A1AA" transparent opacity={0.3} sizeAttenuation />
      </points>
    </>
  );
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
function CameraRig({ mouseRef, reducedMotion, hoveredIndex }) {
  useFrame((state) => {
    if (reducedMotion) return;
    const { x, y } = mouseRef.current;

    const targetX = x * 0.4;
    const targetY = y * 0.4;
    const targetZ = hoveredIndex !== null ? 9.5 : 10;

    state.camera.position.x += (targetX - state.camera.position.x) * 0.04;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.04;
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.04;

    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Exported Scene ───────────────────────────────────────────────────────────
export default function HeroScene({ mouseRef, scrollRef, reducedMotion, hoveredIndex, onHover, onLeave, isMobile }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 48, near: 0.1, far: 50 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
      shadows
    >
      <Environment reducedMotion={reducedMotion} />
      <ApplicationStack
        mouseRef={mouseRef}
        scrollRef={scrollRef}
        reducedMotion={reducedMotion}
        hoveredIndex={hoveredIndex}
        setHoveredIndex={(idx) => {
          if (idx !== null) onHover(idx);
          else onLeave();
        }}
        isMobile={isMobile}
      />
      <CameraRig
        mouseRef={mouseRef}
        reducedMotion={reducedMotion}
        hoveredIndex={hoveredIndex}
      />
    </Canvas>
  );
};
