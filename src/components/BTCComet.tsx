import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Trail, Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';

// 5 minutes in milliseconds
const RESPAWN_TIME = 5 * 60 * 1000; 

export function BTCComet() {
  const meshRef = useRef<THREE.Group>(null);
  const [isActive, setIsActive] = useState(true);
  const [nextSpawnTime, setNextSpawnTime] = useState(0);

  // Initial spawn configuration
  const startPos = useMemo(() => new THREE.Vector3(-40, 25, -20), []);
  const endPos = useMemo(() => new THREE.Vector3(40, -15, 20), []);
  const direction = useMemo(() => new THREE.Vector3().subVectors(endPos, startPos).normalize(), [startPos, endPos]);
  
  // Speed factor (Slow and majestic)
  const speed = 0.08; 

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
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;

      // Check if out of bounds (past the end position approximately)
      if (meshRef.current.position.x > 45) {
        setIsActive(false);
        setNextSpawnTime(Date.now() + RESPAWN_TIME);
        // Hide it far away
        meshRef.current.position.set(1000, 1000, 1000); 
      }
    }
  });

  // If not active, render nothing (or render off-screen handled by logic above)
  // We keep it mounted but hidden to maintain state, or we could return null.
  // Returning null unmounts components which might clear Trail. 
  // Let's stick to hiding it via position logic for smoother trail handling if we loop, 
  // but since we wait 5 mins, unmounting is fine. 
  // However, useFrame needs the component mounted. So we keep it mounted.

  return (
    <group ref={meshRef} position={startPos} visible={isActive}>
      {/* Long Majestic Tail */}
      <Trail
        width={6} // Wider tail
        length={25} // Much longer tail for "comet" look
        color={new THREE.Color("#ff6600")} // Deep fire orange
        attenuation={(t) => t * t} // Quadratic fade for smooth tail
      >
        <Trail
            width={3}
            length={15}
            color={new THREE.Color("#ffaa00")} // Inner brighter core
            attenuation={(t) => t}
        >
            {/* The BTC Coin Head */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
            <group>
                {/* Glowing Core */}
                <mesh>
                    <sphereGeometry args={[0.8, 32, 32]} />
                    <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
                </mesh>
                
                {/* Coin Body */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
                <meshStandardMaterial 
                    color="#f7931a" 
                    metalness={0.9} 
                    roughness={0.1} 
                    emissive="#f7931a"
                    emissiveIntensity={0.8}
                />
                </mesh>

                {/* B Symbols */}
                <Text
                position={[0, 0, 0.06]}
                fontSize={0.9}
                font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                >
                ₿
                </Text>
                <Text
                position={[0, 0, -0.06]}
                rotation={[0, Math.PI, 0]}
                fontSize={0.9}
                font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                >
                ₿
                </Text>
            </group>
            </Float>
        </Trail>
      </Trail>

      {/* Outer Dust/Gas Cloud (The Coma) */}
      <Sparkles 
        count={200}
        scale={6} // Large area
        size={6}
        speed={0.2}
        opacity={0.5}
        color="#ff4500"
        noise={2}
      />
      
      {/* Trailing Debris */}
      <Sparkles 
        count={100}
        scale={[2, 2, 20]} // Long trail of sparkles
        position={[0, 0, -5]} // Behind the head
        size={3}
        speed={0.5}
        opacity={0.6}
        color="#ffd700"
      />

      {/* Intense Light Source */}
      <pointLight color="#ffaa00" intensity={5} distance={20} decay={2} />
    </group>
  );
}
