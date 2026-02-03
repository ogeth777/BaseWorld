import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

const WORDS = ["BASE", "LFG", "WAGMI", "ONCHAIN", "BUILD", "🔵"];

function FloatingText({ position, text }: { position: [number, number, number], text: string }) {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <Text
        position={position}
        fontSize={0.5}
        color="#0052FF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {text}
      </Text>
    </Float>
  );
}


export function SpaceDebris() {
  const items = useMemo(() => {
    const temp = [];
    // Random text
    for (let i = 0; i < 20; i++) {
      const phi = Math.acos(-1 + (2 * i) / 20);
      const theta = Math.sqrt(20 * Math.PI) * phi;
      const r = 8 + Math.random() * 4; // Distance 8-12
      
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);
      
      temp.push({
        id: i,
        pos: [x, y, z] as [number, number, number],
        type: 'text',
        content: WORDS[Math.floor(Math.random() * WORDS.length)]
      });
    }
    return temp;
  }, []);

  return (
    <group>
      {items.map((item) => (
        <FloatingText key={item.id} position={item.pos} text={item.content} />
      ))}
    </group>
  );
}
