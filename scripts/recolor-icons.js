const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function getAverageColor(png) {
  let r=0,g=0,b=0,c=0;
  for (let y=0;y<png.height;y++){
    for (let x=0;x<png.width;x++){
      const idx = (png.width*y + x) << 2;
      const alpha = png.data[idx+3]/255;
      if (alpha===0) continue;
      r += png.data[idx]*alpha;
      g += png.data[idx+1]*alpha;
      b += png.data[idx+2]*alpha;
      c += alpha;
    }
  }
  if (!c) return {r:0,g:0,b:0};
  return {r:Math.round(r/c), g:Math.round(g/c), b:Math.round(b/c)};
}

function tintImage(srcPath, outPath, target) {
  const buffer = fs.readFileSync(srcPath);
  const png = PNG.sync.read(buffer);
  for (let y=0;y<png.height;y++){
    for (let x=0;x<png.width;x++){
      const idx = (png.width*y + x) << 2;
      const alpha = png.data[idx+3]/255;
      if (alpha===0) continue;
      // Convert pixel to grayscale then blend towards target
      const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      const factor = lum/255; // preserves shading
      png.data[idx] = Math.round(target.r * factor);
      png.data[idx+1] = Math.round(target.g * factor);
      png.data[idx+2] = Math.round(target.b * factor);
    }
  }
  const out = PNG.sync.write(png);
  fs.writeFileSync(outPath, out);
}

(function main(){
  const iconsDir = path.join(__dirname,'..','icons');
  const src = path.join(iconsDir,'icon.png');
  if (!fs.existsSync(src)) return console.error('icon.png not found');
  const iconBuf = fs.readFileSync(src);
  const iconPng = PNG.sync.read(iconBuf);
  const avg = getAverageColor(iconPng);
  console.log('Target color:', avg);
  const targets = ['icon-192.png','icon-512.png','maskable-192.png','maskable-512.png','1x/icon-192.png'];
  targets.forEach(name => {
    const full = path.join(iconsDir,name);
    if (!fs.existsSync(full)) return console.warn(name+' missing, skipping');
    const outPath = full; // overwrite
    try { tintImage(full, outPath, avg); console.log('Recolored', name); } catch(e){ console.error('Failed', name, e); }
  });
})();
