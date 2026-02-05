import { Sparkles, Cloud, Stars } from '@react-three/drei';

export function SpaceEnvironment() {
  return (
    <group>
      {/* Distant Stars - already in App, adding more density/layers */}
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* Colorful Nebula Clouds - Temporarily disabled to prevent crash
      <Cloud opacity={0.3} speed={0.2} width={50} depth={5} segments={20} position={[20, 0, -20]} color="#4000ff" />
      <Cloud opacity={0.3} speed={0.2} width={50} depth={5} segments={20} position={[-20, 10, -30]} color="#00ffff" />
      */}
      
      {/* Floating Sparkles (Space Dust) */}
      <Sparkles 
        count={200} 
        scale={25} 
        size={2} 
        speed={0.2} 
        opacity={0.5} 
        color="#ffffff"
        raycast={() => null}
      />
    </group>
  );
}
