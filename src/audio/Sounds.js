export class Sounds{
  constructor(){this.ctx=null;this.enabled=true;this.volume=.55;}
  configure(settings){this.enabled=settings.sound;this.volume=settings.volume;if(this.engineGain)this.engineGain.gain.setTargetAtTime(this.enabled?this.engineLevel*this.volume:0,this.ctx.currentTime,.12);}
  updateEngine(speed=0,throttle=0,active=true){
    if(!this.ctx||this.ctx.state!=='running')return;
    if(!this.engineOsc){
      this.engineOsc=this.ctx.createOscillator();
      this.engineOsc.type='sawtooth';
      this.engineFilter=this.ctx.createBiquadFilter();
      this.engineFilter.type='lowpass';
      this.engineGain=this.ctx.createGain();
      this.engineGain.gain.value=0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
    }
    const t=this.ctx.currentTime,s=Math.max(0,Math.min(70,speed));
    this.engineLevel=active?.018+.015*Math.min(1,throttle):0;
    this.engineGain.gain.setTargetAtTime(this.enabled?this.engineLevel*this.volume:0,t,.13);
    this.engineOsc.frequency.setTargetAtTime(61+s*2.8+throttle*32,t,.08);
    this.engineFilter.frequency.setTargetAtTime(165+s*13+throttle*160,t,.10);
  }
  play(type='click'){
    if(!this.enabled)return;
    try{
      if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      if(this.ctx.state==='suspended')this.ctx.resume();
      const now=this.ctx.currentTime;const tones=type==='reward'?[660,880,1060]:type==='pickup'?[440,650]:type==='error'?[170,130]:type==='crash'?[95,66,43]:[500];
      tones.forEach((freq,i)=>{
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,now+i*.07);
        gain.gain.setValueAtTime(.0001,now+i*.07);gain.gain.exponentialRampToValueAtTime(.06*this.volume,now+i*.07+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.07+.18);
        osc.connect(gain).connect(this.ctx.destination);osc.start(now+i*.07);osc.stop(now+i*.07+.2);
      });
    }catch{}
  }
}
