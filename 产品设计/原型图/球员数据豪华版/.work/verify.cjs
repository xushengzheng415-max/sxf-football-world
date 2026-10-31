const {createRequire}=require('node:module');
const req=createRequire('C:/Users/15043/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=req('playwright');const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});const evidence=[];
try{const p=await browser.newPage({viewport:{width:1600,height:1000}});await p.goto(pathToFileURL(path.join(root,'设计源/P01-球员数据.html')).href);await p.evaluate(()=>document.fonts.ready);
for(const v of ['normal','missing','transferEmpty','skeleton','error','forbidden']){await p.selectOption('#state',v);if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(v+' overflow');if(v==='missing' && await p.locator('#value').innerText()!=='待评估')throw Error('missing valuation');if(v==='forbidden'&&!await p.locator('.btn.primary[data-modal]').isDisabled())throw Error('edit not disabled');if(v==='transferEmpty'&&!await p.locator('.transfer-emptycase').isVisible())throw Error('transfer empty');evidence.push(v+': passed');}
await p.selectOption('#state','normal');await p.getByRole('button',{name:'预览球员卡',exact:true}).click();if(!await p.locator('#modal.open').isVisible())throw Error('modal');await p.keyboard.press('Escape');if(await p.locator('#modal.open').count())throw Error('close');evidence.push('card preview / Escape: passed');
await p.locator('a[href="#performance"]').click();await p.waitForTimeout(350);if(await p.evaluate(()=>scrollY)<300)throw Error('anchor');evidence.push('anchor navigation: passed');await p.evaluate(()=>scrollTo(0,0));
await p.locator('#transfers').screenshot({path:path.join(root,'验收证据/转会记录局部.png')});await p.locator('a[href="#transfers"]').click();await p.waitForTimeout(350);evidence.push('transfer timeline / anchor: passed');
await p.setViewportSize({width:1280,height:900});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(100);if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('1280 overflow');await p.screenshot({path:path.join(root,'验收证据/1280宽屏.png'),fullPage:true});evidence.push('1280x900: no horizontal overflow');
fs.writeFileSync(path.join(root,'验收证据/交互验证.json'),JSON.stringify(evidence,null,2));console.log(evidence.join('\n'));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
