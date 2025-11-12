// Simple confetti/graffiti spark effect used on lead send
export default {
  init(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.particles = [];
    this.animating = false;
  },
  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  shoot(n = 90) {
    for (let i=0;i<n;i++){
      this.particles.push({
        x: Math.random()*this.canvas.width,
        y: -10 - Math.random()*400,
        vx: (Math.random()-0.5)*2,
        vy: 1 + Math.random()*3,
        size: 4 + Math.random()*10,
        color: `hsl(${Math.random()*360},80%,60%)`,
        life: 80 + Math.random()*120,
        rot: Math.random()*Math.PI*2
      });
    }
    if (!this.animating) this.loop();
  },
  loop() {
    this.animating = true;
    const ctx = this.ctx;
    const canvas = this.canvas;
    const that = this;
    (function frame(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for (let i=that.particles.length-1;i>=0;i--){
        const p = that.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.life--;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
        ctx.restore();
        if (p.y > canvas.height + 50 || p.life <= 0) that.particles.splice(i,1);
      }
      if (that.particles.length) requestAnimationFrame(frame); else that.animating = false;
    })();
  }
};
