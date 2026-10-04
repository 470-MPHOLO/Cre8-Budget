var CATS=["Housing","Food","Transport","Bills","Health","Fun","Savings","Other"];
var S={cur:"M",txs:[],budgets:{},goals:[]},tab="ov",month=new Date().toISOString().slice(0,7);
S.rec=[];
/* Data layer: all storage goes through load()/save(). Swap these for a cloud DB later. */
var idb=null;
function openDB(){return new Promise(function(ok){try{var r=indexedDB.open("cre8budget",1);r.onupgradeneeded=function(){r.result.createObjectStore("kv")};r.onsuccess=function(){idb=r.result;ok()};r.onerror=function(){ok()}}catch(e){ok()}})}
function load(){return openDB().then(function(){return new Promise(function(ok){
  if(!idb){try{var x=localStorage.getItem("cre8budget");ok(x?JSON.parse(x):null)}catch(e){ok(null)}return}
  try{var q=idb.transaction("kv").objectStore("kv").get("state");q.onsuccess=function(){ok(q.result||null)};q.onerror=function(){ok(null)}}catch(e){ok(null)}})})}
function save(){try{if(idb)idb.transaction("kv","readwrite").objectStore("kv").put(JSON.parse(JSON.stringify(S)),"state");else localStorage.setItem("cre8budget",JSON.stringify(S))}catch(e){}}
function materialise(){var now=new Date().toISOString().slice(0,7),ch=false;S.rec.forEach(function(r){for(var m=r.start;m<=now;m=shift(m,1)){var id="rec_"+r.id+"_"+m;if(!S.txs.some(function(t){return t.id===id})){var d=m+"-"+String(Math.min(r.day,28)).padStart(2,"0");S.txs.push({id:id,type:r.type,amt:r.amt,cat:r.cat,date:d,note:r.note||r.cat,rec:1});ch=true}}});if(ch)save()}
function $(s){return document.querySelector(s)}
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function fmt(n){return S.cur+" "+Number(n).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function inMonth(m){return S.txs.filter(function(t){return t.date.slice(0,7)===m})}
function sums(m){var a=inMonth(m),i=0,e=0,by={};a.forEach(function(t){if(t.type==="in")i+=t.amt;else{e+=t.amt;by[t.cat]=(by[t.cat]||0)+t.amt}});return{i:i,e:e,by:by}}
function shift(m,d){var p=m.split("-"),x=new Date(+p[0],+p[1]-1+d,1);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")}
function bars(){
  var ms=[];for(var k=5;k>=0;k--)ms.push(shift(month,-k));
  var d=ms.map(function(m){var s=sums(m);return{m:m,i:s.i,e:s.e}});
  var mx=Math.max.apply(null,d.map(function(x){return Math.max(x.i,x.e)}).concat([1]));
  var h='<svg viewBox="0 0 420 150" width="100%" role="img" aria-label="Income and spending, last six months">';
  d.forEach(function(x,n){var bx=n*70+12,hi=x.i/mx*105,he=x.e/mx*105;
    h+='<rect x="'+bx+'" y="'+(120-hi)+'" width="22" height="'+hi+'" rx="3" fill="var(--acc)"/><rect x="'+(bx+26)+'" y="'+(120-he)+'" width="22" height="'+he+'" rx="3" fill="var(--warn)"/><text x="'+(bx+24)+'" y="140" text-anchor="middle">'+x.m.slice(2)+'</text>'});
  return h+'</svg><div class="leg"><span><b style="background:var(--acc)"></b>Income</span><span><b style="background:var(--warn)"></b>Spending</span></div>'}
function budgetRows(m){
  var s=sums(m),keys=Object.keys(S.budgets).filter(function(c){return S.budgets[c]>0});
  if(!keys.length)return'<div class="empty">No budgets yet. Set a monthly limit in the Budgets tab.</div>';
  return keys.map(function(c){var l=S.budgets[c],u=s.by[c]||0,p=Math.min(100,u/l*100),cl=u>l?"over":p>=80?"warn":"";
    return'<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><b>'+esc(c)+'</b><span class="'+(u>l?"neg":"")+'">'+fmt(u)+' of '+fmt(l)+'</span></div><div class="bar '+cl+'"><i style="width:'+p+'%"></i></div></div>'}).join("")}
function ov(){
  var s=sums(month),left=s.i-s.e,rate=s.i>0?Math.round(left/s.i*100):0;
  return'<div class="grid"><div class="card hero"><div class="k">Left this month</div><div class="big">'+fmt(left)+'</div></div>'+
  '<div class="card"><div class="k">Income</div><div class="big pos">'+fmt(s.i)+'</div></div>'+
  '<div class="card"><div class="k">Spent</div><div class="big">'+fmt(s.e)+'</div></div>'+
  '<div class="card"><div class="k">Saved of income</div><div class="big">'+rate+'%</div></div></div>'+
  '<div class="card stack"><h3>Smart insights</h3>'+insights()+'</div><div class="two stack"><div class="card"><h3>Budget progress</h3>'+budgetRows(month)+'</div><div class="card"><h3>Last six months</h3>'+bars()+'</div></div>'}
function tx(){
  var list=inMonth(month).sort(function(a,b){return b.date.localeCompare(a.date)});
  var opts=CATS.map(function(c){return"<option>"+c+"</option>"}).join("");
  return'<div class="card"><h3>Add transaction</h3><form class="f" id="tf"><label>Type<select name="type"><option value="out">Expense</option><option value="in">Income</option></select></label>'+
  '<label>Amount<input name="amt" type="number" min="0" step="0.01" required></label><label>Category<select name="cat">'+opts+'</select></label>'+
  '<label>Date<input name="date" type="date" required value="'+(month===new Date().toISOString().slice(0,7)?new Date().toISOString().slice(0,10):month+"-01")+'"></label>'+
  '<label>Note<input name="note" maxlength="60"></label><button class="p">Add</button></form></div>'+
  '<div class="card stack"><h3>'+month+' transactions</h3>'+(list.length?'<div class="scroll">'+list.map(function(t){
    return'<div class="row"><span><b>'+esc(t.note||t.cat)+'</b><br><span class="k">'+t.date+' · '+(t.type==="in"?"Income":esc(t.cat))+'</span></span><span><b class="'+(t.type==="in"?"pos":"")+'">'+(t.type==="in"?"+":"−")+fmt(t.amt)+'</b><button class="x" data-del="'+t.id+'" aria-label="Delete">✕</button></span></div>'}).join("")+'</div>':'<div class="empty">Nothing logged for this month. Add your first transaction above.</div>')+'</div>'}
function bd(){
  var s=sums(month);
  return'<div class="card"><h3>Monthly limits</h3><p class="k">Set a limit per category. Leave at 0 to skip. Progress uses '+month+' spending.</p>'+
  CATS.map(function(c){var u=s.by[c]||0,l=S.budgets[c]||0;
    return'<div class="row"><label style="flex:1">'+c+' <span class="k">(spent '+fmt(u)+')</span></label><input type="number" min="0" step="1" value="'+l+'" data-bud="'+c+'" style="width:110px" aria-label="'+c+' limit"></div>'}).join("")+'</div>'+
  '<div class="card stack"><h3>Status</h3>'+budgetRows(month)+'</div>'}
function gl(){
  return'<div class="card"><h3>New goal</h3><form class="f" id="gf"><label>Name<input name="name" required maxlength="40"></label><label>Target<input name="target" type="number" min="1" required></label><label>Already saved<input name="saved" type="number" min="0" value="0"></label><button class="p">Add goal</button></form></div>'+
  '<div class="stack">'+(S.goals.length?S.goals.map(function(g){var p=Math.min(100,g.saved/g.target*100);
    return'<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><h3 style="margin:0">'+esc(g.name)+'</h3><button class="x" data-gdel="'+g.id+'" aria-label="Delete goal">✕</button></div><div class="k">'+fmt(g.saved)+' of '+fmt(g.target)+' · '+Math.round(p)+'%</div><div class="bar"><i style="width:'+p+'%"></i></div>'+
    '<div style="display:flex;gap:8px;margin-top:10px"><input type="number" min="0" placeholder="Amount" data-gin="'+g.id+'" style="width:110px"><button data-gadd="'+g.id+'">Add funds</button></div></div>'}).join(""):'<div class="card empty">No goals yet. Add one above, like an emergency fund.</div>')+'</div>'}
function insights(){
  var s=sums(month),p=sums(shift(month,-1)),cur=month===new Date().toISOString().slice(0,7),n=new Date(),dim=new Date(+month.slice(0,4),+month.slice(5),0).getDate(),day=cur?n.getDate():dim,out=[];
  if(!inMonth(month).length)return'<div class="empty">Add transactions to unlock insights.</div>';
  if(cur){var fc=s.e/day*dim;out.push(["",'On pace to spend <b>'+fmt(fc)+'</b> by month end'+(s.i?' ('+(fc>s.i?'above':'below')+' your income of '+fmt(s.i)+').':'.')]);
    var left=s.i-s.e,dl=dim-day;if(dl>0&&left>0)out.push(["",'You can spend about <b>'+fmt(left/dl)+'</b> a day for the rest of the month.']);if(left<0)out.push(["b",'You have spent <b>'+fmt(-left)+'</b> more than you earned this month.'])}
  var top=Object.keys(s.by).sort(function(a,b){return s.by[b]-s.by[a]})[0];if(top)out.push(["",'Biggest category: <b>'+esc(top)+'</b> at '+fmt(s.by[top])+' ('+Math.round(s.by[top]/s.e*100)+'% of spending).']);
  if(p.e>0){var d=Math.round((s.e-p.e)/p.e*100);out.push([d>10?"w":"",'Spending is '+Math.abs(d)+'% '+(d>=0?'higher':'lower')+' than last month.'])}
  Object.keys(S.budgets).forEach(function(c){var l=S.budgets[c],u=s.by[c]||0;if(l>0&&u>l)out.push(["b",esc(c)+' is over budget by '+fmt(u-l)+'.']);else if(l>0&&u>=l*.8)out.push(["w",esc(c)+' has used '+Math.round(u/l*100)+'% of its limit.'])});
  return'<div class="ins">'+out.map(function(o){return'<div class="'+o[0]+'">'+o[1]+'</div>'}).join("")+'</div>'}
function rc(){var o=CATS.map(function(c){return"<option>"+c+"</option>"}).join("");
  return'<div class="card"><h3>Add recurring item</h3><p class="k">Posts automatically every month, such as rent, salary or subscriptions.</p><form class="f" id="rf"><label>Type<select name="type"><option value="out">Expense</option><option value="in">Income</option></select></label><label>Amount<input name="amt" type="number" min="0" step="0.01" required></label><label>Category<select name="cat">'+o+'</select></label><label>Day of month<input name="day" type="number" min="1" max="28" value="1"></label><label>Name<input name="note" maxlength="40" required></label><button class="p">Add</button></form></div><div class="card stack"><h3>Active</h3>'+(S.rec.length?S.rec.map(function(r){return'<div class="row"><span><b>'+esc(r.note)+'</b><br><span class="k">Day '+r.day+' · '+(r.type==="in"?"Income":esc(r.cat))+'</span></span><span><b>'+fmt(r.amt)+'</b><button class="x" data-rdel="'+r.id+'" aria-label="Remove">✕</button></span></div>'}).join(""):'<div class="empty">Nothing recurring yet.</div>')+'</div>'}
var chatLog=[];
function ch(){var qs=["Where is my money going?","How can I save more?","Am I on track this month?","Explain budgeting basics"];
  return'<div class="card"><h3>Cre8 Coach</h3><p class="k">Ask about your budget in plain words. Free, private and works offline: no account or API key.</p><div class="chips">'+qs.map(function(q){return'<button data-q="'+q+'">'+q+'</button>'}).join("")+'</div><div class="chat" id="chat">'+(chatLog.length?chatLog.map(function(m){return'<div class="m '+(m.role==="user"?"u":"a")+'">'+esc(m.content)+'</div>'}).join(""):'<div class="empty">Try a question above.</div>')+'</div><form class="f" id="cf" style="grid-template-columns:1fr auto"><input name="q" placeholder="Ask your coach..." autocomplete="off" required><button class="p" id="cbtn">Send</button></form></div>'}
function answer(q){
  q=q.toLowerCase();var s=sums(month),left=s.i-s.e,keys=Object.keys(s.by).sort(function(a,b){return s.by[b]-s.by[a]});
  function has(){for(var i=0;i<arguments.length;i++)if(q.indexOf(arguments[i])>-1)return true;return false}
  var cur=month===new Date().toISOString().slice(0,7),n=new Date(),dim=new Date(+month.slice(0,4),+month.slice(5),0).getDate(),day=cur?n.getDate():dim;
  if(has("basic","explain","50/30","rule","how to budget"))return"A simple starting point is the 50/30/20 rule: about 50% of income for needs (housing, food, transport, bills), 30% for wants, and 20% for savings and debt."+(s.i?" On your "+fmt(s.i)+" income that is "+fmt(s.i*.5)+" needs, "+fmt(s.i*.3)+" wants and "+fmt(s.i*.2)+" savings.":" Add your income first and I will work out the amounts for you.");
  if(!S.txs.length&&!has("hello","hi","help"))return"I need some data first. Add a few transactions or a recurring item, then ask me again.";
  if(has("save","saving","cut","reduce","cheaper")){
    if(!keys.length)return"Log some expenses first and I will show you where to cut.";
    var t=keys[0],c=s.by[t]*.1;return"Your biggest category is "+t+" at "+fmt(s.by[t])+". Trimming just 10% there saves "+fmt(c)+" a month, about "+fmt(c*12)+" a year. "+(s.i?"You are saving "+Math.round(left/s.i*100)+"% of income now; aim for 20%. ":"")+"Set a limit for "+t+" in the Budgets tab and move the savings into a goal."}
  if(has("goal","target","emergency")){
    if(!S.goals.length)return"You have no goals yet. Add one in the Goals tab, like an emergency fund of three months of spending.";
    return S.goals.map(function(g){var r=g.target-g.saved;return g.name+": "+fmt(g.saved)+" of "+fmt(g.target)+(r<=0?" (reached!)":left>0?". At "+fmt(left)+" a month you would finish in about "+Math.ceil(r/left)+" months.":". Free up some monthly surplus to make progress.")}).join("\n")}
  if(has("budget","limit","over")){
    var bk=Object.keys(S.budgets).filter(function(c){return S.budgets[c]>0});
    if(!bk.length)return"No limits are set yet. Open the Budgets tab and give your top categories a monthly limit.";
    return bk.map(function(c){var l=S.budgets[c],u=s.by[c]||0;return c+": "+fmt(u)+" of "+fmt(l)+" ("+Math.round(u/l*100)+"%)"+(u>l?" - over by "+fmt(u-l):"")}).join("\n")}
  if(has("track","pace","forecast","month end","end of month","afford")){
    var fc=s.e/day*dim;return cur?"You have spent "+fmt(s.e)+" in "+day+" days, which puts you on pace for about "+fmt(fc)+" this month."+(s.i?(fc>s.i?" That is above your income, so slow down on "+(keys[0]||"spending")+".":" That is within your income of "+fmt(s.i)+". Nice."):""):"For "+month+" you spent "+fmt(s.e)+" and earned "+fmt(s.i)+"."}
  if(has("where","spend","spent","categor","going","biggest")){
    if(!keys.length)return"No spending logged for "+month+" yet.";
    return"Top spending in "+month+":\n"+keys.slice(0,4).map(function(c){return c+": "+fmt(s.by[c])+" ("+Math.round(s.by[c]/s.e*100)+"%)"}).join("\n")}
  if(has("income","earn","salary"))return"Income for "+month+" is "+fmt(s.i)+"."+(S.rec.filter(function(r){return r.type==="in"}).length?" Part of it comes from recurring items.":"");
  if(has("recurring","bills","subscription","rent"))return S.rec.length?"Recurring items: "+S.rec.map(function(r){return r.note+" "+fmt(r.amt)}).join(", ")+".":"No recurring items yet. Add rent, salary or subscriptions in the Recurring tab.";
  if(has("left","remain","balance","have"))return"For "+month+" you earned "+fmt(s.i)+", spent "+fmt(s.e)+" and have "+fmt(left)+" left.";
  if(has("hello","hi","hey","help"))return"Hi! I can explain where your money goes, check your budgets and goals, forecast the month, and suggest ways to save. Try one of the buttons above.";
  return"I can help with spending, savings, budgets, goals, forecasts and budgeting basics. Try: \"Where is my money going?\" or \"How can I save more?\""}
function ask(q){chatLog.push({role:"user",content:q});chatLog.push({role:"assistant",content:answer(q)});render();var c=$("#chat");if(c)c.scrollTop=c.scrollHeight}
function render(){
  document.querySelectorAll("#tabs button").forEach(function(b){b.setAttribute("aria-selected",b.dataset.t===tab)});
  $("#month").value=month;$("#cur").value=S.cur;
  $("#view").innerHTML={ov:ov,tx:tx,bd:bd,gl:gl,rc:rc,ch:ch}[tab]();
}
$("#tabs").onclick=function(e){if(e.target.dataset.t){tab=e.target.dataset.t;render()}};
$("#month").onchange=function(e){if(e.target.value){month=e.target.value;render()}};
$("#cur").onchange=function(e){S.cur=e.target.value;save();render()};
$("#theme").onclick=function(){var r=document.documentElement,d=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=d?"light":"dark"};
$("#view").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target);
  if(e.target.id==="cf"){var q=f.get("q").trim();e.target.reset();if(q)ask(q);return}
  if(e.target.id==="rf"){var a2=parseFloat(f.get("amt"));if(!(a2>0))return;S.rec.push({id:uid(),type:f.get("type"),amt:a2,cat:f.get("cat"),day:parseInt(f.get("day"))||1,note:f.get("note").trim(),start:month});materialise()}
  else if(e.target.id==="tf"){var a=parseFloat(f.get("amt"));if(!(a>0))return;S.txs.push({id:uid(),type:f.get("type"),amt:a,cat:f.get("cat"),date:f.get("date"),note:f.get("note").trim()});month=f.get("date").slice(0,7)}
  else if(e.target.id==="gf"){S.goals.push({id:uid(),name:f.get("name").trim(),target:parseFloat(f.get("target")),saved:parseFloat(f.get("saved"))||0})}
  save();render()};
$("#view").onclick=function(e){var d=e.target.dataset;
  if(d.q){ask(d.q);return}
  if(d.rdel){S.rec=S.rec.filter(function(r){return r.id!==d.rdel});S.txs=S.txs.filter(function(t){return t.id.indexOf("rec_"+d.rdel+"_")!==0})}
  else if(d.del){S.txs=S.txs.filter(function(t){return t.id!==d.del})}
  else if(d.gdel){S.goals=S.goals.filter(function(g){return g.id!==d.gdel})}
  else if(d.gadd){var v=parseFloat($('[data-gin="'+d.gadd+'"]').value);if(!(v>0))return;S.goals.forEach(function(g){if(g.id===d.gadd)g.saved+=v})}
  else return;save();render()};
$("#view").onchange=function(e){var c=e.target.dataset.bud;if(c){S.budgets[c]=Math.max(0,parseFloat(e.target.value)||0);save();render()}};
$("#exp").onclick=function(){var rows=[["date","type","category","amount","note"]].concat(S.txs.map(function(t){return[t.date,t.type,t.cat,t.amt,'"'+t.note.replace(/"/g,'""')+'"']}));
  var bl=new Blob([rows.join("\n")],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download="cre8-budget.csv";a.click()};
$("#rst").onclick=function(){if(confirm("Delete all transactions, budgets and goals?")){S={cur:S.cur,txs:[],budgets:{},goals:[],rec:[]};save();render()}};
render();
load().then(function(x){if(x){S=Object.assign(S,x);if(!S.rec)S.rec=[]}materialise();render()});
