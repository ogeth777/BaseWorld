import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail, Sparkles, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// 5 minutes in milliseconds
const RESPAWN_TIME = 5 * 60 * 1000; 

export function BTCComet() {
  const meshRef = useRef<THREE.Group>(null);
  const [isActive, setIsActive] = useState(true);
  const [nextSpawnTime, setNextSpawnTime] = useState(0);

  // Load BTC Texture
  const texture = useTexture('/btc.png');

  // Initial spawn configuration
  const startPos = useMemo(() => new THREE.Vector3(-40, 25, -20), []);
  const endPos = useMemo(() => new THREE.Vector3(40, -15, 20), []);
  const direction = useMemo(() => new THREE.Vector3().subVectors(endPos, startPos).normalize(), [startPos, endPos]);
  
  // Speed factor (Even Slower and majestic)
  const speed = 0.02; 

  useFrame((state) => {
    const now = Date.now();

    // Check if we need to respawn
    if (!isActive && now >= nextSpawnTime) {
      setIsActive(true);
      if (meshRef.current) {
        meshRef.current.position.copy(startPos);
        // Reset trails if possible or just teleport
      }
    }

    if (isActive && meshRef.current) {
      // Move along the path
      meshRef.current.position.addScaledVector(direction, speed);
      
      // Rotate slowly
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;

      // Check if out of bounds (past the end position approximately)
      if (meshRef.current.position.x > 45) {
        setIsActive(false);
        setNextSpawnTime(Date.now() + RESPAWN_TIME);
        // Hide it far away
        meshRef.current.position.set(1000, 1000, 1000); 
      }
    }
  });

  return (
    <group ref={meshRef} position={startPos} visible={isActive}>
      {/* Long Majestic Tail */}
      <Trail
        width={8} // Wider tail
        length={30} // Much longer tail for "comet" look
        color={new THREE.Color("#ff6600")} // Deep fire orange
        attenuation={(t) => t * t} // Quadratic fade for smooth tail
      >
        <Trail
            width={4}
            length={20}
            color={new THREE.Color("#ffaa00")} // Inner brighter core
            attenuation={(t) => t}
        >
            {/* The BTC Coin Head */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
            <group>
                {/* Glowing Core */}
                <mesh>
                    <sphereGeometry args={[0.9, 32, 32]} />
                    <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} />
                </mesh>
                
                {/* Coin Body */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
                  <meshStandardMaterial 
                      color="#f7931a" 
                      metalness={0.9} 
                      roughness={0.1} 
                  />
                </mesh>

                {/* Front Face with Texture */}
                <mesh position={[0, 0, 0.06]}>
                    <circleGeometry args={[0.7, 32]} />
                    <meshBasicMaterial map={texture} transparent />
                </mesh>

                {/* Back Face with Texture */}
                <mesh position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]}>
                    <circleGeometry args={[0.7, 32]} />
                    <meshBasicMaterial map={texture} transparent />
                </mesh>
            </group>
            </Float>
        </Trail>
      </Trail>

      {/* Outer Dust/Gas Cloud (The Coma) */}
      <Sparkles 
        count={300}
        scale={8} // Large area
        size={8}
        speed={0.1}
        opacity={0.5}
        color="#ff4500"
        noise={2}
      />
      
      {/* Trailing Debris */}
      <Sparkles 
        count={150}
        scale={[3, 3, 25]} // Long trail of sparkles
        position={[0, 0, -6]} // Behind the head
        size={4}
        speed={0.3}
        opacity={0.6}
        color="#ffd700"
      />

      {/* Intense Light Source */}
      <pointLight color="#ffaa00" intensity={5} distance={20} decay={2} />
    </group>
  );
}
