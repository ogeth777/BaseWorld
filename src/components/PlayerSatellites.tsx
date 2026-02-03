import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';

function Satellite({ position, label, color, speed, radius }: { position: number, label: string, color: string, speed: number, radius: number }) {
    const ref = useRef<any>();
    
    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime * speed + position;
        ref.current.position.x = Math.cos(t) * radius;
        ref.current.position.z = Math.sin(t) * radius;
        // Wobbly orbit
        ref.current.position.y = Math.sin(t * 2) * 2;
        ref.current.rotation.y += 0.01;
    });

    return (
        <group ref={ref}>
             <mesh>
                <boxGeometry args={[0.3, 0.3, 0.8]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
             </mesh>
             {/* Solar panels */}
             <mesh position={[0.4, 0, 0]}>
                 <boxGeometry args={[0.5, 0.05, 0.3]} />
                 <meshStandardMaterial color="#222" />
             </mesh>
             <mesh position={[-0.4, 0, 0]}>
                 <boxGeometry args={[0.5, 0.05, 0.3]} />
                 <meshStandardMaterial color="#222" />
             </mesh>
             
             <Html position={[0, 0.5, 0]} distanceFactor={10}>
                <div style={{ 
                    color: color, 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold', 
                    background: 'rgba(0,0,0,0.6)', 
                    padding: '2px 5px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none'
                }}>
                    {label}
                </div>
             </Html>
        </group>
    );
}

export function PlayerSatellites({ players }: { players: any[] }) {
    if (!players || players.length === 0) return null;
    
    const top3 = players.slice(0, 3);
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

    return (
        <group>
            {top3.map((p, i) => (
                <Satellite 
                    key={p.address} 
                    position={i * 2} // Phase shift
                    label={`${p.address.slice(0,6)} (${p.score})`} 
                    color={colors[i]} 
                    speed={0.2 - (i * 0.05)} 
                    radius={9 + i} 
                />
            ))}
        </group>
    );
}
