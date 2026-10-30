export class Input{
  constructor(){this.keys=new Set();this.touch=new Set();this.enabled=false;
    window.addEventListener('keydown',event=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code) && this.enabled)event.preventDefault();
      this.keys.add(event.code);
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.code));
    window.addEventListener('blur',()=>this.clear());
    window.addEventListener('contextmenu',event=>{if(event.target.closest?.('.touch-pad,[data-drive]'))event.preventDefault();});
    document.addEventListener('selectstart',event=>{if(event.target.closest?.('.touch-pad,[data-drive]'))event.preventDefault();});
    document.addEventListener('dragstart',event=>{if(event.target.closest?.('.touch-pad,[data-drive]'))event.preventDefault();});
  }
  get left(){return this.enabled && (this.keys.has('KeyA')||this.keys.has('ArrowLeft')||this.touch.has('left'));}
  get right(){return this.enabled && (this.keys.has('KeyD')||this.keys.has('ArrowRight')||this.touch.has('right'));}
  get gas(){return this.enabled && (this.keys.has('KeyW')||this.keys.has('ArrowUp')||this.touch.has('gas'));}
  get brake(){return this.enabled && (this.keys.has('KeyS')||this.keys.has('ArrowDown')||this.keys.has('Space')||this.touch.has('brake'));}
  clear(){this.keys.clear();this.touch.clear();}
  setActive(value){this.enabled=value;if(!value)this.clear();}
  bindTouch(container){
    container.querySelectorAll('[data-drive]').forEach(el=>{
      const action=el.dataset.drive;
      el.addEventListener('contextmenu',e=>e.preventDefault());
      el.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
      el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);this.touch.add(action);el.classList.add('down');});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>{this.touch.delete(action);el.classList.remove('down');});
    });
  }
}
