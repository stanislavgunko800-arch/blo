import {writeFile} from 'node:fs/promises';
const targets=await(await fetch((process.env.CDP_URL||'http://localhost:9223')+'/json')).json();
const ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const check=async(expression,message)=>{if(!await ev(expression))throw Error(message);console.log('PASS '+message);};
await call('Page.enable');await call('Page.navigate',{url:process.env.APP_URL||'http://localhost:3012'});await new Promise(r=>setTimeout(r,400));
const backup=await ev(`localStorage.getItem('formula-journal-v1')`);
try{
await check(`!document.querySelector('#page-home').hidden&&document.querySelector('#page-clients').hidden&&document.querySelector('#page-settings').hidden`,'Home is the entry page');
await ev(`document.querySelector('[data-go=clients]').click()`);await new Promise(r=>setTimeout(r,100));
await check(`!document.querySelector('#page-clients').hidden&&document.querySelector('#detail').textContent.includes('Выберите клиента')`,'Client list starts without a random open card');
await ev(`document.querySelector('.client').click()`);await check(`!!document.querySelector('#editClient')`,'Choosing a client opens their card');
await ev(`document.querySelector('[data-page=home]').click()`);await new Promise(r=>setTimeout(r,100));
await ev(`document.querySelector('#homeAddClient').click();document.querySelector('#clientForm [name=name]').value='Тест навигации';document.querySelector('#clientForm').requestSubmit()`);await new Promise(r=>setTimeout(r,150));
await check(`location.hash==='#clients'&&!document.querySelector('#page-clients').hidden&&document.querySelector('.profile h2').textContent==='Тест навигации'`,'Home quick action creates client and opens their card');
await ev(`document.querySelector('#addVisit').click()`);await check(`!document.querySelector('.voice-section').open`,'Voice entry is optional and collapsed');
await ev(`document.querySelector('#visitForm [name=title]').value='Тест';document.querySelector('#visitForm [name=formula]').value='7/1 — 30 г';document.querySelector('#visitForm').requestSubmit()`);await new Promise(r=>setTimeout(r,150));await check(`document.querySelectorAll('.visit').length===1`,'Manual coloring still saves');
await ev(`document.querySelector('[data-page=reminders]').click()`);await new Promise(r=>setTimeout(r,100));await check(`!document.querySelector('#page-reminders').hidden&&document.querySelector('#page-clients').hidden&&document.querySelector('#followupOverview').open`,'Reminders have a separate page');
await ev(`document.querySelector('[data-page=settings]').click()`);await new Promise(r=>setTimeout(r,100));await check(`!document.querySelector('#page-settings').hidden&&document.querySelector('#export').getClientRects().length>0`,'Backup controls available in settings');
await call('Page.reload');await new Promise(r=>setTimeout(r,300));await check(`!document.querySelector('#page-settings').hidden`,'Reload restores current section');
await ev(`history.back()`);await new Promise(r=>setTimeout(r,150));await check(`!document.querySelector('#page-reminders').hidden`,'Browser Back navigates sections');
await ev(`document.querySelector('#openDueClients').click()`);await new Promise(r=>setTimeout(r,100));await check(`!document.querySelector('#page-clients').hidden&&document.querySelector('#dueOnly').getAttribute('aria-pressed')==='true'`,'Reminder page opens filtered clients');
await ev(`document.querySelector('[data-page=home]').click();document.querySelector('#toast').style.display='none'`);await new Promise(r=>setTimeout(r,100));await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});let shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/workspace/artifacts/sayyes-home-structured.png',Buffer.from(shot.data,'base64'));
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,100));await check(`document.documentElement.scrollWidth<=390&&[...document.querySelectorAll('[data-page]')].every(x=>x.getClientRects().length>0)`,'All four navigation buttons available on phone');shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/workspace/artifacts/sayyes-home-structured-mobile.png',Buffer.from(shot.data,'base64'));
}finally{await ev(`localStorage.setItem('formula-journal-v1',${JSON.stringify(backup)})`);await call('Page.reload');ws.close();}
