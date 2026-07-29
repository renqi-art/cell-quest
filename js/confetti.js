/* ====================================================================
 * confetti.js — 通关庆祝彩带喷发特效（全屏 overlay canvas，不挡点击）
 * 由 game.js 的 levelComplete() 调用：startConfetti()
 * ==================================================================== */
(function(){
  const canvas = document.getElementById('confetti-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let raf = null;
  let endTime = 0;

  const COLORS = ['#ff5252','#ffd740','#69f0ae','#40c4ff','#e040fb','#ff6e40','#b2ff59','#ff80ab'];

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  function makeParticle(x, y, burst){
    const color = COLORS[(Math.random()*COLORS.length)|0];
    if(burst){
      const a = Math.random()*Math.PI*2;
      const sp = 4 + Math.random()*9;
      return {
        x, y,
        vx: Math.cos(a)*sp,
        vy: Math.sin(a)*sp - 2,
        size: 4 + Math.random()*7,
        color,
        rot: Math.random()*Math.PI,
        vr: (Math.random()-0.5)*0.4,
        ribbon: Math.random() < 0.5,
        life: 1
      };
    }
    return {
      x,
      y: -20 - Math.random()*canvas.height*0.5,
      vx: (Math.random()-0.5)*4,
      vy: 2 + Math.random()*5,
      size: 4 + Math.random()*8,
      color,
      rot: Math.random()*Math.PI,
      vr: (Math.random()-0.5)*0.3,
      ribbon: Math.random() < 0.5,
      life: 1
    };
  }

  function startConfetti(durationMs){
    resize();
    particles = [];
    // 顶部飘落彩带
    for(let i=0;i<220;i++) particles.push(makeParticle(Math.random()*canvas.width, 0, false));
    // 中央喷发
    const cx = canvas.width/2, cy = canvas.height*0.32;
    for(let i=0;i<140;i++) particles.push(makeParticle(cx, cy, true));
    endTime = performance.now() + (durationMs || 3800);
    canvas.style.display = 'block';
    if(!raf) loop();
  }

  function loop(){
    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const p of particles){
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.99;
      p.rot += p.vr;
      if(now > endTime) p.life -= 0.02;
      if(p.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if(p.ribbon) ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    particles = particles.filter(p => p.life > 0 && p.y < canvas.height + 40);
    if(now < endTime || particles.length > 0){
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }

  function stopConfetti(){
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  }

  window.startConfetti = startConfetti;
  window.stopConfetti = stopConfetti;
})();
