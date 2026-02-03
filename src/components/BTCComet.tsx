import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// 5 minutes in milliseconds
const RESPAWN_TIME = 5 * 60 * 1000; 

export function BTCComet() {
  const meshRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const [isActive, setIsActive] = useState(true);
  const [nextSpawnTime, setNextSpawnTime] = useState(0);

  // Load BTC Texture
  const texture = useTexture('/btc.png');

  // Initial spawn configuration
  // Spawns high up and far away, moves diagonally down across the screen
  const startPos = useMemo(() => new THREE.Vector3(-50, 30, -30), []);
  const endPos = useMemo(() => new THREE.Vector3(50, -20, 30), []);
  
  // Normalized direction vector for linear motion
  const direction = useMemo(() => new THREE.Vector3().subVectors(endPos, startPos).normalize(), [startPos, endPos]);
  
  // Random rotation axis for tumbling effect
  const rotationAxis = useMemo(() => new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(), []);

  // Speed factor (Steady linear motion)
  const speed = 0.05; 

  useFrame((state, delta) => {
    const now = Date.now();

    // Check if we need to respawn
    if (!isActive && now >= nextSpawnTime) {
      setIsActive(true);
      if (meshRef.current) {
        meshRef.current.position.copy(startPos);
      }
    }

    if (isActive && meshRef.current) {
      // 1. LINEAR MOTION (No wobbling/floating)
      // Moves exactly along the vector from start to end
      meshRef.current.position.addScaledVector(direction, speed);
      
      // 2. REALISTIC TUMBLING (Rotation)
      // Rotates around a fixed axis like a real object in space
      if (bodyRef.current) {
        bodyRef.current.rotateOnAxis(rotationAxis, 0.01);
      }

      // Check if out of bounds
      if (meshRef.current.position.x > 60) {
        setIsActive(false);
        setNextSpawnTime(Date.now() + RESPAWN_TIME);
        meshRef.current.position.set(1000, 1000, 1000); 
      }
    }
  });

  return (
    <group ref={meshRef} position={startPos} visible={isActive}>
      {/* 
        TRAIL: Represents the tail of the comet/meteor.
        In space, tails point away from the sun, but for visual effect
        we usually make them trail behind the movement.
      */}
      <Trail
        width={6} 
        length={12} 
        color={new THREE.Color("#ff5500")} 
        attenuation={(t) => t * t}
      >
        <group>
           {/* 
             METEORITE BODY 
             Using Icosahedron for a slightly rocky but round shape.
             Flat shading gives it a low-poly space rock look.
           */}
           <mesh ref={bodyRef}>
             <icosahedronGeometry args={[1.2, 1]} /> {/* Radius 1.2, Detail 1 (Rocky round) */}
             <meshStandardMaterial 
               map={texture}
               color="#ffaa00"
               roughness={0.8}
               metalness={0.2}
               flatShading={true} // Makes it look like a rock face
               emissive="#ff4400"
               emissiveIntensity={0.2}
             />
           </mesh>
        </group>
      </Trail>

      {/* FIRE/PLASMA SHEATH (The burning atmosphere effect) */}
      <Sparkles 
        count={200}
        scale={4}
        size={6}
        speed={0.4}
        opacity={0.8}
        color="#ffaa00"
        noise={1} // Chaotic motion like fire
      />
      
      {/* DEBRIS TRAIL */}
      <Sparkles 
        count={100}
        scale={[2, 2, 15]} // Long narrow trail behind
        position={[-direction.x * 5, -direction.y * 5, -direction.z * 5]} // Offset behind
        size={3}
        speed={0} // Relative to container
        opacity={0.5}
        color="#884400"
      />

      {/* LIGHT SOURCE (The meteor glows) */}
      <pointLight color="#ff6600" intensity={8} distance={25} decay={2} />
    </group>
  );
}
