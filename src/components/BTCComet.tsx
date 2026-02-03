import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Trail, Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';

export function BTCComet() {
  const meshRef = useRef<THREE.Group>(null);
  // Initial position: high up, random X/Z
  const [position, setPosition] = useState(() => new THREE.Vector3(
    (Math.random() - 0.5) * 10,
    15,
    (Math.random() - 0.5) * 5 - 5 // Slightly behind Earth
  ));
  
  // Velocity vector (down and slightly random sideways)
  const [velocity] = useState(() => new THREE.Vector3(
    (Math.random() - 0.5) * 0.05,
    -0.1 - Math.random() * 0.05, // Downward speed
    0
  ));

  useFrame(() => {
    if (meshRef.current) {
      // Update position
      meshRef.current.position.add(velocity);
      
      // Rotate the coin
      meshRef.current.rotation.y += 0.05;
      meshRef.current.rotation.x += 0.02;

      // Reset if too low
      if (meshRef.current.position.y < -15) {
        meshRef.current.position.set(
          (Math.random() - 0.5) * 15,
          15 + Math.random() * 5,
          (Math.random() - 0.5) * 10
        );
        // Reset trail? Trail handles discontinuities automatically usually, or we might see a streak across screen. 
        // With Drei Trail, large jumps might cause a line. 
        // Ideally we'd unmount/remount or fade out, but for now instant teleport is okay or we can fade.
      }
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* The Fire Trail */}
      <Trail
        width={2} // Width of the trail
        length={8} // Length of the trail
        color={new THREE.Color("#ff4500")} // Orange-Red
        attenuation={(t) => t * t} // Trail gets thinner
      >
        {/* The BTC Coin */}
        <Float speed={5} rotationIntensity={2} floatIntensity={0}>
          <group>
            {/* Gold Coin Base */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
              <meshStandardMaterial 
                color="#f7931a" 
                metalness={0.8} 
                roughness={0.2} 
                emissive="#f7931a"
                emissiveIntensity={0.5}
              />
            </mesh>
            {/* The B Symbol */}
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.8}
              font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff" // Standard font
              anchorX="center"
              anchorY="middle"
              color="#ffffff"
            >
              ₿
            </Text>
             <Text
              position={[0, 0, -0.06]}
              rotation={[0, Math.PI, 0]}
              fontSize={0.8}
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

      {/* Fire Particles/Sparks */}
      <Sparkles 
        count={50}
        scale={2}
        size={4}
        speed={0.4}
        opacity={0.8}
        color="#ffa500"
        noise={1} // Organic movement
      />
      {/* Inner bright core glow */}
      <pointLight color="#ff8800" intensity={2} distance={5} />
    </group>
  );
}
