/* Provider-neutral follow-up rules. No messages are sent by this module. */
(function(root){
 'use strict';
 const channels=['manual','instagram','telegram','email','whatsapp'];
 function isDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===value;}
 function addDays(value,days){if(!isDate(value))throw Error('Некорректная дата');const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
 function lastVisit(client,asOf){return (client.visits||[]).map(v=>v.date).filter(date=>isDate(date)&&date<=asOf).sort().at(-1)||null;}
 function dueDate(client,asOf){if(client.remindersEnabled===false)return null;const last=lastVisit(client,asOf);if(isDate(client.followUpDate)&&(!last||client.followUpDate>last))return client.followUpDate;return last?addDays(last,client.followUpDays??42):null;}
 function daysBetween(a,b){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);}
 function info(client,asOf){const last=lastVisit(client,asOf),due=dueDate(client,asOf);return {last,due,isDue:!!due&&due<=asOf,daysSince:last?daysBetween(last,asOf):null,daysOverdue:due?Math.max(0,daysBetween(due,asOf)):0};}
 function message(client){const name=client.name.trim().split(/\s+/)[0];return `Здравствуйте, ${name}! Это SayYes. Возможно, уже пора обновить окрашивание. Хотите подобрать удобное время для следующего визита?`;}
 function integrationDraft(client,channel,asOf){if(!channels.includes(channel)||channel==='manual')throw Error('Выберите канал отправки');const due=dueDate(client,asOf);const recipient={instagram:client.instagram,telegram:client.telegram,email:client.email,whatsapp:client.phone}[channel]||'';return {schemaVersion:1,type:'client.follow_up',clientId:client.id,channel,recipient,dueDate:due,text:message(client),consent:client.reminderConsent===true,idempotencyKey:`${client.id}:${due||'unscheduled'}:${channel}`,status:'draft',readyForProvider:!!due&&!!recipient.trim()&&client.reminderConsent===true};}
 root.SayYesReminders=Object.freeze({channels,isDate,addDays,lastVisit,dueDate,info,message,integrationDraft});
})(globalThis);
