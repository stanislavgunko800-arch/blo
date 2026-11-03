import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {readBody,aiRequest,structure} from './ai.mjs';
const files={'/reminders.js':['reminders.js','text/javascript; charset=utf-8'],'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
let busy=false;
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/')){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`){json(res,403,{error:'Запрос с другого сайта запрещён'});return;}
  if(path==='/api/status'&&req.method==='GET'){json(res,200,{configured:!!process.env.AI_API_KEY});return;}
  if(!['/api/transcribe','/api/structure'].includes(path)||req.method!=='POST'){json(res,404,{error:'Неизвестный запрос'});return;}
  if(!process.env.AI_API_KEY){json(res,503,{error:'ИИ ещё не подключён. Добавьте AI_API_KEY в настройки сервера. Запись можно прослушать или скачать.'});return;}
  if(busy){json(res,429,{error:'Предыдущая запись ещё обрабатывается. Попробуйте чуть позже.'});return;}
  busy=true;
  try{
   if(path==='/api/transcribe'){
    const mime=(req.headers['content-type']||'').split(';')[0];const extensions={'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','video/webm':'webm'};
    if(!extensions[mime]){json(res,415,{error:'Выберите аудио WebM, Ogg, MP3, M4A или WAV'});return;}
    const audio=await readBody(req,20*1024*1024);if(!audio.length){json(res,400,{error:'Запись пуста'});return;}
    const data=new FormData();data.append('file',new Blob([audio],{type:mime}),'voice.'+extensions[mime]);data.append('model',process.env.AI_AUDIO_MODEL||'whisper-1');data.append('language','ru');data.append('prompt','Запись колориста: формула окрашивания, номера оттенков, граммы, оксид, время выдержки.');
    const result=await aiRequest('audio/transcriptions',{method:'POST',body:data});if(typeof result.text!=='string'||!result.text.trim())throw Error('Не удалось разобрать речь. Попробуйте запись без фонового шума.');json(res,200,{text:result.text});
   }else{
    let body;try{body=JSON.parse((await readBody(req,64*1024)).toString());}catch(e){if(e.status)throw e;json(res,400,{error:'Некорректный текст'});return;}
    if(typeof body.text!=='string'||!body.text.trim()||body.text.length>16000){json(res,400,{error:'Введите текст длиной до 16 000 символов'});return;}
    json(res,200,{fields:await structure(body.text)});
   }
  }catch(e){json(res,e.status||502,{error:e.name==='TimeoutError'?'ИИ не ответил вовремя. Повторите запрос.':e.message==='fetch failed'?'Не удалось подключиться к ИИ. Проверьте доступ к api.openai.com.':e.message||'Ошибка обработки записи'});}finally{busy=false;}return;
 }
 const f=files[path];if(!f||req.method!=='GET'){res.writeHead(404);res.end('Not found');return;}
 try{res.writeHead(200,{'Content-Type':f[1],'X-Content-Type-Options':'nosniff'});res.end(await readFile(new URL(f[0],import.meta.url)));}catch{res.writeHead(500);res.end('Unable to read file');}
}).listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Formula listening on port '+(process.env.PORT||3000)));
