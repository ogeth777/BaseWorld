import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, DoubleSide } from 'three';

export function SpaceAirdrop({ data, onClaim }: { data: any, onClaim: () => void }) {
    const crateRef = useRef<any>();
    
    const position = useMemo(() => {
        if (!data) return new Vector3(0,0,0);
        
        let theta, phi;
        
        if (data.position) {
            // Server synced position
            theta = data.position.theta;
            phi = data.position.phi;
        } else {
            // Fallback (should not happen if server is updated)
            theta = Math.random() * Math.PI * 2;
            phi = Math.acos(2 * Math.random() - 1);
        }
        
        const r = 10; // Orbit radius (Earth is 7)
        return new Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }, [data]);

    useFrame((state) => {
        if (!crateRef.current) return;
        
        // Float animation
        crateRef.current.rotation.x += 0.01;
        crateRef.current.rotation.y += 0.01;
        
        const t = state.clock.elapsedTime;
        // Bobbing relative to group
        crateRef.current.position.y = Math.sin(t * 2) * 0.2;
    });

    if (!data) return null;

    return (
        <group position={position} lookAt={new Vector3(0,0,0)}>
             {/* Beacon Beam - Infinite line to help find it */}
            <mesh rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 50, 8]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.4} depthWrite={false} side={DoubleSide} />
            </mesh>
            
            <mesh ref={crateRef} onClick={(e) => {
                e.stopPropagation();
                onClaim();
            }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#ffcc00" emissive="#ff8800" emissiveIntensity={0.8} />
            </mesh>
            
            <Html distanceFactor={15}>
                <div style={{ 
                    color: '#ffcc00', 
                    fontWeight: 'bold', 
                    background: 'rgba(0,0,0,0.8)', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '2px solid #ffcc00',
                    pointerEvents: 'none',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    transform: 'translate3d(-50%, -50%, 0)'
                }}>
                    📦 SUPPLY DROP<br/>
                    <span style={{fontSize: '0.8em'}}>CLICK TO CLAIM</span>
                </div>
            </Html>
        </group>
    );
}
