import { useRef, useMemo, useEffect, useState, useLayoutEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';

const COUNT = 79350; // 115 * 115 * 6
const RADIUS = 7;

// Helper to distribute points on a Cube Sphere for aligned tiles
function getCubeSpherePoints(radius: number) {
  const points = [];
  const quaternions = [];
  const resolution = 115;
  
  const faces = [
    { origin: new THREE.Vector3(1, 1, 1), right: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, -1, 0) }, // +Z
    { origin: new THREE.Vector3(-1, 1, -1), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, -1, 0) }, // -Z
    { origin: new THREE.Vector3(-1, 1, 1), right: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, -1, 0) }, // -X
    { origin: new THREE.Vector3(1, 1, -1), right: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, -1, 0) }, // +X
    { origin: new THREE.Vector3(-1, 1, 1), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, -1) }, // +Y
    { origin: new THREE.Vector3(-1, -1, -1), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, 1) }, // -Y
  ];

  // We need to generate faces carefully to match "Cube Sphere" projection
  // Standard normalized cube to sphere:
  // x' = x * sqrt(1 - y^2/2 - z^2/2 + y^2*z^2/3) ...
  
  // Simplified approach: Grid on cube faces, normalized
  
  // Let's use a simpler iteration over 6 faces
  // Face normals
  const directions = [
      new THREE.Vector3(0, 0, 1),  // Front
      new THREE.Vector3(0, 0, -1), // Back
      new THREE.Vector3(1, 0, 0),  // Right
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(0, 1, 0),  // Top
      new THREE.Vector3(0, -1, 0)  // Bottom
  ];

  const step = 2 / (resolution - 1);

  for (let face = 0; face < 6; face++) {
      for (let y = 0; y < resolution; y++) {
          for (let x = 0; x < resolution; x++) {
              const u = -1 + x * step;
              const v = -1 + y * step;
              
              const temp = new THREE.Vector3();
              const normal = directions[face];
              
              // Map 2D (u,v) to 3D point on cube face
              if (face === 0) temp.set(u, v, 1);
              else if (face === 1) temp.set(-u, v, -1);
              else if (face === 2) temp.set(1, v, -u);
              else if (face === 3) temp.set(-1, v, u);
              else if (face === 4) temp.set(u, 1, -v);
              else if (face === 5) temp.set(u, -1, v);
              
              temp.normalize(); // Project to sphere
              
              const pos = temp.clone().multiplyScalar(radius);
              points.push(pos);
              
              // Calculate rotation: look at center, but keep "up" aligned with grid
              const dummy = new THREE.Object3D();
              dummy.position.copy(pos);
              dummy.lookAt(0,0,0); 
              dummy.updateMatrix();
              quaternions.push(dummy.quaternion.clone());
          }
      }
  }

  return { points, quaternions };
}

interface EarthProps {
  onTileClick: (index: number) => void;
  paintedTiles: Int8Array | number[]; // 0 or 1
  endgame: boolean;
  graffiti: Map<number, string>;
}

export function Earth({ onTileClick, paintedTiles, endgame, graffiti }: EarthProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState<number | null>(null);

  // Load Earth Texture
  const [colorMap] = useLoader(TextureLoader, [
    '/earth.jpg'
  ]);

  // Generate Tile Positions
  const { points: positions, quaternions } = useMemo(() => {
    return getCubeSpherePoints(RADIUS + 0.05); 
  }, []);

  // Init InstancedMesh Matrix (Run Once)
  useEffect(() => {
    if (!meshRef.current) return;

    const tempObject = new THREE.Object3D();
    
    for (let i = 0; i < COUNT; i++) {
      tempObject.position.copy(positions[i]);
      tempObject.quaternion.copy(quaternions[i]);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    const paintedColor = new THREE.Color('#0052FF').convertSRGBToLinear().multiplyScalar(1.5); 
    const baseColor = new THREE.Color('#FFFFFF').convertSRGBToLinear(); // White base tiles
    
    for (let i = 0; i < COUNT; i++) {
        meshRef.current.setColorAt(i, baseColor);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    
  }, [positions, quaternions]);

  // Update Colors (Run on paint)
  useEffect(() => {
    if (!meshRef.current) return;
    
    const tempColor = new THREE.Color();
    const paintedColor = new THREE.Color('#0052FF').convertSRGBToLinear().multiplyScalar(1.5); // HDR Glow
    const baseColor = new THREE.Color('#FFFFFF').convertSRGBToLinear(); // White base tiles

    for (let i = 0; i < COUNT; i++) {
      if (paintedTiles[i] === 1) {
        meshRef.current.setColorAt(i, paintedColor);
      } else {
        meshRef.current.setColorAt(i, baseColor);
      }
    }
    
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [paintedTiles]);

  // Animation
  useFrame((state, delta) => {
    // Endgame pulse
    if (endgame && meshRef.current) {
        const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
        meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group>
      {/* Base Earth Sphere - Optimized Geometry */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshStandardMaterial map={colorMap} metalness={0.2} roughness={0.7} />
      </mesh>

      {/* Tiles */}
      <instancedMesh
        ref={meshRef}
        args={[null, null, COUNT]}
        frustumCulled={false}
        onPointerMove={(e) => {
            e.stopPropagation();
            // Debounce or check distance if needed, but simple ID check is usually fast enough
            if (hovered !== e.instanceId) {
                setHover(e.instanceId !== undefined ? e.instanceId : null);
            }
            document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
            setHover(null);
            document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
            e.stopPropagation();
            console.log('Tile clicked:', e.instanceId);
            if (e.instanceId !== undefined) onTileClick(e.instanceId);
        }}
      >
        {/* Unit plane, scaled by instance scale */}
        <planeGeometry args={[0.045, 0.045]} /> 
        <meshBasicMaterial  
            color="#FFFFFF"
            toneMapped={false}
            side={THREE.DoubleSide} 
        />
      </instancedMesh>
      
      {hovered !== null && (
         <group position={positions[hovered]} quaternion={quaternions[hovered]}>
             <mesh 
                scale={[1.1, 1.1, 1]} 
                raycast={() => null} // Ignore raycasting so it doesn't block the tile below
                position={[0, 0, 0.01]} // Slight offset to prevent Z-fighting
             >
                <planeGeometry args={[0.08, 0.08]} />
                <meshBasicMaterial color="#FF00FF" side={THREE.DoubleSide} />
             </mesh>
             {graffiti.has(hovered) && (
                 <Html distanceFactor={10} position={[0, 0, 0.1]} style={{ pointerEvents: 'none' }}>
                     <div style={{
                         background: 'rgba(0,0,0,0.8)',
                         color: '#fff',
                         padding: '4px 8px',
                         borderRadius: '4px',
                         whiteSpace: 'nowrap',
                         fontSize: '0.8rem',
                         border: '1px solid #FF00FF',
                         textShadow: '0 0 5px #FF00FF'
                     }}>
                         {graffiti.get(hovered)}
                     </div>
                 </Html>
             )}
         </group>
      )}

      {endgame && (
        <group rotation={[0,0,0]}>
        </group>
      )}
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
    </group>
  );
}
