export class Sounds{
  constructor(){this.ctx=null;this.enabled=true;this.volume=.55;}
  configure(settings){this.enabled=settings.sound;this.volume=settings.volume;}
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
