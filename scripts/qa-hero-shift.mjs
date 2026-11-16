// Measures whether the hero text moves when the board switches between its two views.
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE);
const [base,...rest]=process.argv.slice(2);const engines=rest.includes('--webkit')?{chromium,webkit}:{chromium};
const sizes=[[1920,1080],[1440,900],[1280,720],[1100,800],[1024,768],[900,700],[768,1024],[390,844],[320,568]];
let worst=0;const rows=[];
for(const [name,type] of Object.entries(engines)){
  const browser=await type.launch();
  for(const [width,height] of sizes){
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto(base,{waitUntil:'networkidle'});
    const read=()=>page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round((r.top+scrollY)*10)/10,Math.round(r.left*10)/10,Math.round(r.height*10)/10]};return {h1:box('.hero h1'),question:box('.hero-question'),button:box('.hero-copy .button'),art:box('.hero-art'),hero:box('.hero'),doc:document.documentElement.scrollHeight}});
    const a=await read();
    await page.getByRole('button',{name:'After the deal',exact:true}).click();await page.waitForTimeout(250);
    const b=await read();
    await page.getByRole('button',{name:'Ownership',exact:true}).click();await page.waitForTimeout(250);
    const c=await read();
    const move=Math.max(...['h1','question','button'].flatMap(k=>[Math.abs(a[k][0]-b[k][0]),Math.abs(a[k][1]-b[k][1]),Math.abs(a[k][0]-c[k][0])]));
    worst=Math.max(worst,move);
    rows.push(`${name} ${width}x${height}: text moves ${move}px; art height ${a.art[2]} -> ${b.art[2]}; hero ${a.hero[2]} -> ${b.hero[2]}; page ${a.doc} -> ${b.doc}`);
    await page.close();
  }
  await browser.close();
}
console.log(rows.join('\n'));console.log('worst text movement',worst);
if(rest.includes('--assert')&&worst>0.5){console.error('Hero text moved');process.exit(1);}
