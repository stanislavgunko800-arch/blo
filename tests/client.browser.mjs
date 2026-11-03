import {writeFile} from 'node:fs/promises';
const targets=await(await fetch('http://localhost:9222/json')).json();
const ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const check=async(expression,message)=>{if(!await ev(expression))throw Error(message);console.log('PASS '+message);};
await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:process.env.APP_URL||'http://localhost:3000'});await new Promise(r=>setTimeout(r,400));
const backup=await ev(`localStorage.getItem('formula-journal-v1')`);
try{
await ev(`localStorage.setItem('formula-journal-v1',JSON.stringify([{id:'profile-test',name:'Анна Тест',phone:'',notes:'Исходная заметка',visits:[{id:'visit-test',date:'2026-10-01',title:'Окрашивание',base:'7',formula:'7/1 — 30 г',oxide:'6%',time:'35 минут',notes:'Сохранить',before:'',after:''}]}]))`);await call('Page.reload');await new Promise(r=>setTimeout(r,300));
await check(`document.querySelector('.rating-value').textContent==='Без оценки'`,'Legacy clients load with no invented rating');
await ev(`document.querySelector('[data-rating="5"]').click()`);
await check(`JSON.parse(localStorage.getItem('formula-journal-v1'))[0].rating===5&&document.querySelectorAll('.star-button.filled').length===5`,'Colorful star rating saves immediately');
await ev(`document.querySelector('#editClient').click()`);
await check(`document.querySelector('#clientDialogTitle').textContent==='Редактировать клиента'&&document.querySelector('#clientForm [name=notes]').value==='Исходная заметка'&&document.querySelector('#clientForm [name=rating]:checked').value==='5'`,'Client editor prefilled');
await ev(`(()=>{const f=document.querySelector('#clientForm');f.elements.name.value='Анна Обновлённая';f.elements.phone.value='+7 (999) 123-45-67';f.elements.instagram.value='@anna.color';f.elements.telegram.value='https://t.me/anna_master';f.elements.social.value='VK: vk.com/anna_beauty';f.elements.notes.value='Новая заметка';f.requestSubmit()})()`);
await check(`(()=>{const c=JSON.parse(localStorage.getItem('formula-journal-v1'))[0];return c.id==='profile-test'&&c.name==='Анна Обновлённая'&&c.rating===5&&c.visits.length===1&&c.visits[0].id==='visit-test'&&c.visits[0].formula==='7/1 — 30 г';})()`,'Client edit preserves history, id and rating');
await call('Page.reload');await new Promise(r=>setTimeout(r,300));
await check(`document.querySelector('.client-contacts').textContent.includes('@anna.color')&&document.querySelector('.rating-value').textContent==='5 / 5'`,'Contacts and rating persist after reload');
for(const query of ['9991234567','@anna.color','https://instagram.com/anna.color/','anna_master','vk.com/anna_beauty','обновлённая']){await ev(`document.querySelector('#search').value=${JSON.stringify(query)};document.querySelector('#search').dispatchEvent(new Event('input'))`);await check(`document.querySelectorAll('.client').length===1`,'Search '+query);}
await ev(`document.querySelector('#allClients').click();document.querySelector('#editClient').click();document.querySelector('#clientForm [name=name]').value='Не сохранять';document.querySelector('#clientDialog').close()`);await new Promise(r=>setTimeout(r,100));
await check(`JSON.parse(localStorage.getItem('formula-journal-v1'))[0].name==='Анна Обновлённая'`,'Cancel discards client edits');
await ev(`document.querySelector('#editClient').click();document.querySelector('#clientForm [name=phone]').value='000';window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('QuotaExceededError')};document.querySelector('#clientForm').requestSubmit()`);
await check(`document.querySelector('#clientDialog').open&&JSON.parse(localStorage.getItem('formula-journal-v1'))[0].phone==='+7 (999) 123-45-67'`,'Failed save preserves client data');
await ev(`Storage.prototype.setItem=window.originalSetItem;document.querySelector('#clientDialog').close()`);await new Promise(r=>setTimeout(r,100));
await ev(`document.querySelector('[data-clear-rating]').click()`);
await check(`JSON.parse(localStorage.getItem('formula-journal-v1'))[0].rating===0`,'Rating can be reset');
await ev(`document.querySelector('#addClient').click();const f=document.querySelector('#clientForm');f.elements.name.value='Новый клиент';f.elements.instagram.value='@new_client';f.querySelector('[name=rating][value="3"]').click();f.requestSubmit()`);
await check(`JSON.parse(localStorage.getItem('formula-journal-v1')).length===2&&document.querySelector('.rating-value').textContent==='3 / 5'`,'New client supports contacts and rating');
await ev(`(()=>{document.querySelector('#editClient').click();const f=document.querySelector('#clientForm');f.elements.instagram.value='<img src=x onerror=alert(1)>';f.requestSubmit()})()`);
await check(`document.querySelector('.client-contacts').textContent.includes('<img')&&!document.querySelector('.client-contacts img')`,'Contact values render safely as text');
await ev(`window.exported=null;const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='application/json')window.exported=blob;return create(blob);};document.querySelector('#export').click()`);await new Promise(r=>setTimeout(r,200));
await check(`(async()=>{const c=JSON.parse(await window.exported.text())[1];return c.rating===3&&c.instagram==='<img src=x onerror=alert(1)>';})()`,'Export includes rating and contacts');
await ev(`(async()=>{const dt=new DataTransfer();dt.items.add(new File([await window.exported.text()],'backup.json',{type:'application/json'}));const input=document.querySelector('#import');input.files=dt.files;window.confirm=()=>true;input.dispatchEvent(new Event('change'));})()`);await new Promise(r=>setTimeout(r,200));
await check(`JSON.parse(localStorage.getItem('formula-journal-v1'))[1].rating===3&&document.querySelector('#toast').textContent==='Журнал восстановлен'`,'Import restores contacts and rating');
await ev(`document.querySelector('[data-rating="4"]').click();document.querySelector('#toast').style.display='none'`);let shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/workspace/artifacts/sayyes-rating-desktop.png',Buffer.from(shot.data,'base64'));
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,200));await check('document.documentElement.scrollWidth<=390','Rating and contacts fit mobile');shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/workspace/artifacts/sayyes-rating-mobile.png',Buffer.from(shot.data,'base64'));
}finally{await ev(`(()=>{if(window.originalSetItem)Storage.prototype.setItem=window.originalSetItem;localStorage.setItem('formula-journal-v1',${JSON.stringify(backup)});})()`);await call('Page.reload');ws.close();}
