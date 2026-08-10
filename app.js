const K='carcargo_state_v1',townOrder=['Amagá','Fredonia','Venecia','Ciudad Bolívar','Andes','Jardín'];
let st=JSON.parse(localStorage.getItem(K)||'null')||{route:{status:'sin_iniciar'},clients:[]};
st.history=Array.isArray(st.history)?st.history:[];
let active=null,statusSel='pendiente',deferred=null;
const $=id=>document.getElementById(id);
const el={
  mc:$('mc'),md:$('md'),mp:$('mp'),mu:$('mu'),routeState:$('routeState'),towns:$('towns'),filter:$('filter'),
  routeList:$('routeList'),clientList:$('clientList'),tbody:$('tbody'),form:$('form'),id:$('id'),name:$('name'),
  town:$('town'),address:$('address'),eta:$('eta'),boxes:$('boxes'),baskets:$('baskets'),phone:$('phone'),note:$('note'),
  formTitle:$('formTitle'),cancel:$('cancel'),modal:$('modal'),closeModal:$('closeModal'),mTitle:$('mTitle'),mMeta:$('mMeta'),
  receiver:$('receiver'),actual:$('actual'),obs:$('obs'),gpsText:$('gpsText'),photo:$('photo'),gps:$('gps'),msg:$('msg'),
  saveDelivery:$('saveDelivery'),start:$('start'),finish:$('finish'),csv:$('csv'),print:$('print'),backup:$('backup'),
  restore:$('restore'),sig:$('sig'),clearSig:$('clearSig'),install:$('install')
};
const save=()=>localStorage.setItem(K,JSON.stringify(st));
const status=c=>c.delivery?.status||'pendiente';
const lab=s=>({pendiente:'Pendiente',en_ruta:'En ruta',entregado:'Entregado',retraso:'Retraso',novedad:'Novedad'}[s]||s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function card(c,del=false){
  return `<div class="item"><div class="row"><div><h3>${esc(c.name)}</h3><p>${esc(c.town)} · ${esc(c.address||'Sin dirección')} · ETA ${esc(c.eta||'—')}</p><p>${c.boxes} cajas · ${c.baskets} canastillas</p></div><span class="tag">${lab(status(c))}</span></div><div class="actions"><button data-open="${c.id}">Abrir entrega</button><button class="alt" data-edit="${c.id}">Editar</button>${del?`<button class="alt" data-del="${c.id}">Eliminar</button>`:''}</div></div>`;
}
function render(){
  el.mc.textContent=st.clients.length;
  el.md.textContent=st.clients.filter(c=>status(c)==='entregado').length;
  el.mp.textContent=st.clients.filter(c=>status(c)!=='entregado').length;
  el.mu.textContent=st.clients.reduce((a,c)=>a+(+c.boxes||0)+(+c.baskets||0),0);
  el.routeState.textContent=st.route.status==='en_curso'?'Ruta en curso':st.route.status==='cerrada'?'Ruta cerrada':'Sin iniciar';
  el.towns.innerHTML=townOrder.map(t=>{let g=st.clients.filter(c=>c.town===t),d=g.filter(c=>status(c)==='entregado').length;return `<div class="townrow"><b>${t}</b><div>${g.length} clientes · ${d}/${g.length} entregados</div></div>`}).join('');
  let f=el.filter.value,ls=st.clients.filter(c=>f==='all'||c.town===f).sort((a,b)=>(a.eta||'').localeCompare(b.eta||''));
  el.routeList.innerHTML=ls.map(c=>card(c)).join('')||'<p>Sin clientes.</p>';
  el.clientList.innerHTML=st.clients.map(c=>card(c,true)).join('')||'<p>Sin clientes.</p>';
  el.tbody.innerHTML=st.clients.map(c=>{let d=c.delivery||{};return `<tr><td>${esc(c.name)}</td><td>${esc(c.town)}</td><td>${esc(c.eta)}</td><td>${c.boxes}</td><td>${c.baskets}</td><td>${lab(status(c))}</td><td>${esc(d.receiver||'')}</td><td>${esc(d.actual||'')}</td><td>${d.loc?d.loc.lat.toFixed(5)+','+d.loc.lng.toFixed(5):''}</td><td>${esc(d.obs||'')}</td></tr>`}).join('');
  bind();
}
function bind(){
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDelivery(b.dataset.open));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(confirm('¿Eliminar cliente?')){
      st.clients=st.clients.filter(c=>c.id!==b.dataset.del);save();render();
    }
  });
}

el.form.addEventListener('submit',e=>{
  e.preventDefault();
  const obj={
    id:el.id.value||crypto.randomUUID(),
    name:el.name.value.trim(),
    town:el.town.value,
    address:el.address.value.trim(),
    eta:el.eta.value,
    boxes:+el.boxes.value||0,
    baskets:+el.baskets.value||0,
    phone:el.phone.value.trim(),
    note:el.note.value.trim(),
    delivery:{}
  };
  let i=st.clients.findIndex(c=>c.id===obj.id);
  if(i>=0)obj.delivery=st.clients[i].delivery||{};
  if(i>=0)st.clients[i]=obj; else st.clients.push(obj);
  save();
  el.form.reset();
  el.eta.value='08:00';el.boxes.value=1;el.baskets.value=0;el.id.value='';
  el.formTitle.textContent='Agregar cliente';
  render();
  show('ruta');
});
el.cancel.onclick=()=>{
  el.form.reset();el.id.value='';el.eta.value='08:00';el.boxes.value=1;el.baskets.value=0;el.formTitle.textContent='Agregar cliente';
};

function edit(x){
  let c=st.clients.find(z=>z.id===x); if(!c)return;
  el.id.value=c.id;el.name.value=c.name;el.town.value=c.town;el.address.value=c.address;el.eta.value=c.eta;
  el.boxes.value=c.boxes;el.baskets.value=c.baskets;el.phone.value=c.phone;el.note.value=c.note;
  el.formTitle.textContent='Editar cliente';show('clientes');
}
function openDelivery(x){
  active=x;let c=st.clients.find(z=>z.id===x);if(!c)return;let d=c.delivery||{};
  statusSel=status(c);el.mTitle.textContent=c.name;el.mMeta.textContent=`${c.town} · ${c.boxes} cajas · ${c.baskets} canastillas`;
  el.receiver.value=d.receiver||'';el.actual.value=d.actual||new Date().toTimeString().slice(0,5);el.obs.value=d.obs||'';el.photo.value='';
  el.gpsText.textContent=d.loc?`${d.loc.lat.toFixed(5)}, ${d.loc.lng.toFixed(5)}`:'Sin ubicación';
  let old=document.getElementById('savedPhoto');if(old)old.remove();if(d.photo){let im=document.createElement('img');im.id='savedPhoto';im.src=d.photo;im.style='max-width:100%;margin-top:8px;border-radius:12px';el.photo.parentElement.appendChild(im);}
  el.modal.hidden=false;setTimeout(()=>restoreSig(d.sig),20);
}
function closeDelivery(){el.modal.hidden=true;active=null;el.msg.textContent=''}
el.closeModal.addEventListener('click',closeDelivery);
el.modal.addEventListener('click',e=>{if(e.target===el.modal)closeDelivery()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.modal.hidden)closeDelivery()});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{statusSel=b.dataset.s;el.msg.textContent='Estado: '+lab(statusSel)});

el.gps.onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{
  let c=st.clients.find(z=>z.id===active);if(!c)return;c.delivery=c.delivery||{};
  c.delivery.loc={lat:p.coords.latitude,lng:p.coords.longitude};
  el.gpsText.textContent=`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`;el.msg.textContent='GPS capturado';
},e=>el.msg.textContent=e.message,{enableHighAccuracy:true,timeout:12000}):el.msg.textContent='GPS no disponible';

el.saveDelivery.onclick=async()=>{
  let c=st.clients.find(z=>z.id===active);if(!c)return;c.delivery=c.delivery||{};
  Object.assign(c.delivery,{status:statusSel,receiver:el.receiver.value.trim(),actual:el.actual.value,obs:el.obs.value.trim(),savedAt:new Date().toISOString(),sig:el.sig.toDataURL()});
  if(el.photo.files[0])c.delivery.photo=await readFile(el.photo.files[0]);
  save();render();el.msg.textContent='Entrega guardada';
};

el.start.onclick=()=>{if(st.route.status==='cerrada'){nuevaRuta()}else{st.route={status:'en_curso',startedAt:new Date().toISOString()};save();render()}};
el.finish.onclick=()=>{st.route.status='cerrada';st.route.finishedAt=new Date().toISOString();save();render()};
function nuevaRuta(){if(st.route.status==='cerrada'){st.history.push({route:JSON.parse(JSON.stringify(st.route)),clients:JSON.parse(JSON.stringify(st.clients))});st.clients=st.clients.map(c=>{let n={...c};delete n.delivery;return n})}st.route={status:'en_curso',startedAt:new Date().toISOString()};save();render();}
el.filter.onchange=render;
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.tab));
function show(x){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===x));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id===x));
}

el.csv.onclick=()=>download('reporte_car_cargo.csv',[['Cliente','Municipio','Direccion','ETA','Cajas','Canastillas','Estado','Recibe','Hora','Lat','Lng','Observacion'],...st.clients.map(c=>{let d=c.delivery||{};return [c.name,c.town,c.address,c.eta,c.boxes,c.baskets,lab(status(c)),d.receiver||'',d.actual||'',d.loc?.lat||'',d.loc?.lng||'',d.obs||'']})].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
el.print.onclick=()=>{show('reporte');setTimeout(()=>window.print(),100)};
el.backup.onclick=()=>download('respaldo_car_cargo.json',JSON.stringify(st,null,2),'application/json');
el.restore.onchange=async e=>{const f=e.target.files[0];if(!f)return;const anterior=localStorage.getItem(K);try{const txt=await f.text();const data=JSON.parse(txt);if(!data||!Array.isArray(data.clients))throw new Error('Formato de respaldo no válido');localStorage.removeItem(K);localStorage.setItem(K,JSON.stringify(data));st=data;render();alert('Respaldo importado correctamente');}catch(err){if(anterior)localStorage.setItem(K,anterior);alert('Error al importar: '+err.message)}e.target.value='';};
function download(n,d,t){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:t}));a.download=n;a.click()}
function readFile(f){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const max=1200;let w=img.width,h=img.height;if(w>h&&w>max){h=Math.round(h*max/w);w=max}else if(h>=w&&h>max){w=Math.round(w*max/h);h=max}const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',0.65))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(f)})}

let ctx=el.sig.getContext('2d'),draw=false;ctx.lineWidth=3;ctx.lineCap='round';
function p(e){let r=el.sig.getBoundingClientRect(),q=e.touches?e.touches[0]:e;return{x:(q.clientX-r.left)*el.sig.width/r.width,y:(q.clientY-r.top)*el.sig.height/r.height}}
function dn(e){draw=true;let q=p(e);ctx.beginPath();ctx.moveTo(q.x,q.y);e.preventDefault()}
function mv(e){if(!draw)return;let q=p(e);ctx.lineTo(q.x,q.y);ctx.stroke();e.preventDefault()}
['mousedown','touchstart'].forEach(v=>el.sig.addEventListener(v,dn,{passive:false}));
['mousemove','touchmove'].forEach(v=>el.sig.addEventListener(v,mv,{passive:false}));
['mouseup','mouseleave','touchend'].forEach(v=>el.sig.addEventListener(v,()=>draw=false));
el.clearSig.onclick=()=>ctx.clearRect(0,0,el.sig.width,el.sig.height);
function restoreSig(src){ctx.clearRect(0,0,el.sig.width,el.sig.height);if(!src)return;let i=new Image;i.onload=()=>ctx.drawImage(i,0,0,el.sig.width,el.sig.height);i.src=src}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;el.install.hidden=false});
el.install.onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;el.install.hidden=true}};

el.modal.hidden=true;
render();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js?v=7').then(reg=>reg.update()).catch(()=>{});}
