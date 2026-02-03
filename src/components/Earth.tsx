import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';

const COUNT = 40000;
const RADIUS = 5;

// Helper to distribute points on a sphere (Fibonacci Sphere)
function getFibonacciSpherePoints(samples: number, radius: number) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y); // Radius at y
    const theta = phi * i; // Golden angle increment

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
}

interface EarthProps {
  onTileClick: (index: number) => void;
  paintedTiles: Int8Array | number[]; // 0 or 1
  endgame: boolean;
}

export function Earth({ onTileClick, paintedTiles, endgame }: EarthProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState<number | null>(null);

  // Load Earth Texture
  const [colorMap] = useLoader(TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
  ]);

  // Generate Tile Positions
  const { positions, quaternions } = useMemo(() => {
    const points = getFibonacciSpherePoints(COUNT, RADIUS + 0.05); // Slightly above surface
    const quaternions = [];
    
    // Calculate rotation for each tile to face outwards
    const dummy = new THREE.Object3D();
    for (let i = 0; i < points.length; i++) {
      dummy.position.copy(points[i]);
      dummy.lookAt(0, 0, 0); // Look at center
      dummy.updateMatrix();
      quaternions.push(dummy.quaternion.clone());
    }
    
    return { positions: points, quaternions };
  }, []);

  // Update InstancedMesh
  useEffect(() => {
    if (!meshRef.current) return;

    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      tempObject.position.copy(positions[i]);
      tempObject.quaternion.copy(quaternions[i]);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Color logic
      if (paintedTiles[i] === 1) {
        tempColor.set('#0052FF'); // Base Blue
      } else {
        tempColor.set('#FFFFFF');
      }
      meshRef.current.setColorAt(i, tempColor);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [paintedTiles, positions, quaternions]);

  // Animation
  useFrame((state, delta) => {
    // Disable auto rotation
    // if (earthRef.current) {
    //   earthRef.current.rotation.y += delta * 0.05;
    // }
    // if (meshRef.current) {
    //   meshRef.current.rotation.y += delta * 0.05;
    // }
    
    // Endgame pulse
    if (endgame && meshRef.current) {
        const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
        meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group>
      {/* Base Earth Sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshStandardMaterial map={colorMap} metalness={0.2} roughness={0.7} />
      </mesh>

      {/* Atmosphere Glow (Simplified) */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial 
            color="#0052FF" 
            transparent 
            opacity={0.1} 
            side={THREE.BackSide}
        />
      </mesh>

      {/* Tiles */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, COUNT]}
        onPointerMove={(e) => {
            e.stopPropagation();
            setHover(e.instanceId !== undefined ? e.instanceId : null);
        }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => {
            e.stopPropagation();
            if (e.instanceId !== undefined) onTileClick(e.instanceId);
        }}
      >
        {/* Unit plane, scaled by instance scale */}
        <planeGeometry args={[0.07, 0.07]} /> 
        <meshBasicMaterial 
            side={THREE.DoubleSide} 
            transparent 
            opacity={0.8}
            toneMapped={false}
        />
      </instancedMesh>
      
      {hovered !== null && (
         <mesh position={positions[hovered]} quaternion={quaternions[hovered]} scale={[1.5, 1.5, 1]}>
            <planeGeometry args={[0.07, 0.07]} />
            <meshBasicMaterial color="#FF00FF" side={THREE.DoubleSide} />
         </mesh>
      )}

      {endgame && (
        <group rotation={[0,0,0]}>
             {/* Floating Text - Simplified as 3D text takes font loading. 
                 We'll assume user sees the UI text for now or add Text3D later. */}
        </group>
      )}
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
    </group>
  );
}
