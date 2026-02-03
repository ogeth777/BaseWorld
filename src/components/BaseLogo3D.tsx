import { useRef, useState } from 'react';
import { Text, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function BaseLogo3D() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const colorMap = useTexture('/earth.jpg');

  const handleClick = (e: any) => {
    e.stopPropagation();
    window.open('https://www.base.org/', '_blank');
  };

  return (
    <group position={[8, 2, 0]}> {/* Positioned to the right */}
      {/* Label above */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#0052FF"
      >
        Base
      </Text>

      {/* Square Planet (Rounded Cube) */}
      <RoundedBox
        ref={meshRef}
        args={[1.5, 1.5, 1.5]} // Width, Height, Depth
        radius={0.1} // Rounded corners
        smoothness={4}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={handleClick}
      >
        <meshStandardMaterial
          map={colorMap}
          color="#0052FF"
          emissive="#0052FF"
          emissiveIntensity={hovered ? 0.5 : 0.1}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </RoundedBox>
      
      {/* Glow effect */}
      <pointLight color="#0052FF" intensity={2} distance={5} />
    </group>
  );
}
