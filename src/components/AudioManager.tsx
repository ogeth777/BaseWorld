import { useEffect, useRef } from 'react';

export const soundManager = {
  ctx: null as AudioContext | null,
  osc: null as OscillatorNode | null,
  gain: null as GainNode | null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  },

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },

  playSuccess() {
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    
    // Arpeggio
    [440, 554, 659, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
        
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
    });
  },

  startAmbient() {
    this.init();
    if (!this.ctx || this.osc) return;

    // Deep drone
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    
    // Lowpass filter for "muffled space" sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    this.osc.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 50; // Low drone
    this.gain.gain.value = 0.05; // Quiet

    this.osc.start();
  },

  stopAmbient() {
    if (this.osc) {
      this.osc.stop();
      this.osc = null;
    }
  }
};

export function AudioManager() {
  // Logic is handled via the exported object, this component could be a toggle UI
  return null;
}
