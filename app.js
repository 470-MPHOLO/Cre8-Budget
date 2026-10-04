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
var DEF=[{n:"Housing",g:"need"},{n:"Food",g:"need"},{n:"Transport",g:"need"},{n:"Bills",g:"need"},{n:"Health",g:"want"},{n:"Fun",g:"want"},{n:"Savings",g:"save"},{n:"Other",g:"want"}];
function CL(){return S.catList&&S.catList.length?S.catList:DEF}
function ensureCL(){if(!S.catList||!S.catList.length)S.catList=DEF.map(function(x){return{n:x.n,g:x.g}})}
function syncCats(){CATS=CL().map(function(x){return x.n})}
function avg3(c){var t=0,n=0;for(var k=1;k<=3;k++){var m=shift(month,-k);if(inMonth(m).length){n++;t+=sums(m).by[c]||0}}return n?t/n:0}
function applyPlan(){var inc=(S.profile&&S.profile.income)||sums(month).i;if(!inc){alert("Add your income in Profile first.");return}
  if(!confirm("Replace your categories and limits with the 50/30/20 plan?"))return;
  S.catList=DEF.map(function(x){return{n:x.n,g:x.g}});S.budgets={};Object.keys(PLAN).forEach(function(c){S.budgets[c]=Math.round(inc*PLAN[c]/100)});save();render()}
function tracked(m,day){var d=inMonth(m).filter(function(t){return t.type==="out"&&!t.rec}).map(function(t){return+t.date.slice(8)});if(!d.length)return 0;return Math.max(1,day-Math.min.apply(null,d)+1)}
function bd(){
  var s=sums(month),inc=(S.profile&&S.profile.income)||s.i,L=CL(),tot=0,g={need:0,want:0,save:0},tips=[];
  L.forEach(function(x){var l=S.budgets[x.n]||0;tot+=l;g[x.g]=(g[x.g]||0)+l});
  var un=inc-tot;
  if(!inc)tips.push(["w","Add your income in Profile so I can check your plan."]);
  else{
    if(un<0)tips.push(["b","You have planned "+fmt(-un)+" more than your income. Lower a limit or two."]);
    else if(un>inc*.02)tips.push(["w",fmt(un)+" is not assigned yet. Give it a job, like savings or a goal."]);
    else tips.push(["","Your plan uses all of your income. Well done."]);
    var np=Math.round(g.need/inc*100),sp=Math.round(g.save/inc*100);
    if(np>60)tips.push(["w","Needs take "+np+"% of income. About 50% is the common guide, so check housing and bills first."]);
    if(sp<10)tips.push(["w","Savings are "+sp+"% of income. Aim for 10% to start and 20% over time."]);
    else if(sp>=20)tips.push(["","Savings are "+sp+"% of income, which meets the 20% guide."])}
  var mx=Math.max(inc,tot,1);function w(v){return(v/mx*100).toFixed(1)+"%"}
  var bar='<div class="alloc" role="img" aria-label="How your income is planned"><i style="width:'+w(g.need)+';background:var(--acc)"></i><i style="width:'+w(g.want)+';background:var(--warn)"></i><i style="width:'+w(g.save)+';background:var(--good)"></i></div><div class="leg"><span><b style="background:var(--acc)"></b>Needs '+fmt(g.need)+'</span><span><b style="background:var(--warn)"></b>Wants '+fmt(g.want)+'</span><span><b style="background:var(--good)"></b>Savings '+fmt(g.save)+'</span></div>';
  var gs=function(v){return'<option value="need"'+(v==="need"?" selected":"")+'>Need</option><option value="want"'+(v==="want"?" selected":"")+'>Want</option><option value="save"'+(v==="save"?" selected":"")+'>Savings</option>'};
  var rows=L.map(function(x){var u=s.by[x.n]||0,l=S.budgets[x.n]||0,a=avg3(x.n),r=Math.round(a),h="";
    if(a>0){h=' · usual '+fmt(a);if(l>0&&l<a*.9)h+=' <span class="neg">(limit is below your usual spend)</span>';else if(l>a*1.5)h+=' (room to trim)';if(l!==r)h+=' <button class="x" data-use="'+esc(x.n)+'" data-amt="'+r+'">Use '+fmt(r)+'</button>'}
    return'<div class="row" style="display:block"><div class="crow"><input value="'+esc(x.n)+'" data-ren="'+esc(x.n)+'" maxlength="24" aria-label="Category name"><select data-grp="'+esc(x.n)+'" aria-label="Group">'+gs(x.g)+'</select><input type="number" min="0" step="1" value="'+l+'" data-bud="'+esc(x.n)+'" aria-label="'+esc(x.n)+' limit"><button class="x" data-cdel="'+esc(x.n)+'" aria-label="Delete '+esc(x.n)+'">✕</button></div><div class="k">Spent '+fmt(u)+h+'</div></div>'}).join("");
  return'<div class="card"><h3>Your plan</h3><div class="k">Income '+fmt(inc)+' · Planned '+fmt(tot)+' · Unassigned '+fmt(Math.max(0,un))+'</div>'+bar+'<div class="ins" style="margin-top:12px">'+tips.map(function(t){return'<div class="'+t[0]+'">'+t[1]+'</div>'}).join("")+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button data-plan="1">Apply 50/30/20 plan</button><button data-clear="1">Clear all limits</button></div></div>'+
  '<div class="card stack"><h3>Categories and limits</h3><p class="k">Rename categories, set your own limits, or add what matters to you. Needs are things you must pay, wants are choices.</p>'+rows+
  '<form class="f" id="af" style="margin-top:12px"><label>New category<input name="n" maxlength="24" required></label><label>Group<select name="g">'+gs("want")+'</select></label><button class="p">Add category</button></form></div>'+
  '<div class="card stack"><h3>This month</h3>'+budgetRows(month)+'</div>'}
function gl(){
  return'<div class="card"><h3>New goal</h3><form class="f" id="gf"><label>Name<input name="name" required maxlength="40"></label><label>Target<input name="target" type="number" min="1" required></label><label>Already saved<input name="saved" type="number" min="0" value="0"></label><button class="p">Add goal</button></form></div>'+
  '<div class="stack">'+(S.goals.length?S.goals.map(function(g){var p=Math.min(100,g.saved/g.target*100);
    return'<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><h3 style="margin:0">'+esc(g.name)+'</h3><button class="x" data-gdel="'+g.id+'" aria-label="Delete goal">✕</button></div><div class="k">'+fmt(g.saved)+' of '+fmt(g.target)+' · '+Math.round(p)+'%</div><div class="bar"><i style="width:'+p+'%"></i></div>'+
    '<div style="display:flex;gap:8px;margin-top:10px"><input type="number" min="0" placeholder="Amount" data-gin="'+g.id+'" style="width:110px"><button data-gadd="'+g.id+'">Add funds</button></div></div>'}).join(""):'<div class="card empty">No goals yet. Add one above, like an emergency fund.</div>')+'</div>'}
function insights(){
  var s=sums(month),p=sums(shift(month,-1)),cur=month===new Date().toISOString().slice(0,7),n=new Date(),dim=new Date(+month.slice(0,4),+month.slice(5),0).getDate(),day=cur?n.getDate():dim,out=[];
  if(!inMonth(month).length)return'<div class="empty">Add transactions to unlock insights.</div>';
  if(cur&&tracked(month,day)<7)out.push(["","You have tracked fewer than 7 days so far, so a forecast would be unreliable. I will show one after a week of tracking."]);
  if(cur&&tracked(month,day)>=7){var fc=s.e+s.e/Math.max(1,tracked(month,day))*(dim-day);out.push(["",'On pace to spend <b>'+fmt(fc)+'</b> by month end'+(s.i?' ('+(fc>s.i?'above':'below')+' your income of '+fmt(s.i)+').':'.')]);
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
    var fc=s.e+s.e/Math.max(1,tracked(month,day))*(dim-day),pl=Object.keys(S.budgets).reduce(function(t,c){return t+(S.budgets[c]||0)},0);if(cur&&tracked(month,day)<7)return"You have only tracked "+tracked(month,day)+" day(s) so far, so a forecast would be unreliable: one big payment like rent can look like a whole month of spending. So far you have spent "+fmt(s.e)+(pl?" of your "+fmt(pl)+" plan ("+Math.round(s.e/pl*100)+"%).":".")+" Ask me again after a week of tracking.";return cur?"You have spent "+fmt(s.e)+" over "+tracked(month,day)+" tracked days, which puts you on pace for about "+fmt(fc)+" this month."+(s.i?(fc>s.i?" That is above your income, so slow down on "+(keys[0]||"spending")+".":" That is within your income of "+fmt(s.i)+". Nice."):""):"For "+month+" you spent "+fmt(s.e)+" and earned "+fmt(s.i)+"."}
  if(has("where","spend","spent","categor","going","biggest")){
    if(!keys.length)return"No spending logged for "+month+" yet.";
    return"Top spending in "+month+":\n"+keys.slice(0,4).map(function(c){return c+": "+fmt(s.by[c])+" ("+Math.round(s.by[c]/s.e*100)+"%)"}).join("\n")}
  if(has("income","earn","salary"))return"Income for "+month+" is "+fmt(s.i)+"."+(S.rec.filter(function(r){return r.type==="in"}).length?" Part of it comes from recurring items.":"");
  if(has("recurring","bills","subscription","rent"))return S.rec.length?"Recurring items: "+S.rec.map(function(r){return r.note+" "+fmt(r.amt)}).join(", ")+".":"No recurring items yet. Add rent, salary or subscriptions in the Recurring tab.";
  if(has("left","remain","balance","have"))return"For "+month+" you earned "+fmt(s.i)+", spent "+fmt(s.e)+" and have "+fmt(left)+" left.";
  if(has("hello","hi","hey","help"))return"Hi! I can explain where your money goes, check your budgets and goals, forecast the month, and suggest ways to save. Try one of the buttons above.";
  return"I can help with spending, savings, budgets, goals, forecasts and budgeting basics. Try: \"Where is my money going?\" or \"How can I save more?\""}
function ask(q){chatLog.push({role:"user",content:q});chatLog.push({role:"assistant",content:answer(q)});render();var c=$("#chat");if(c)c.scrollTop=c.scrollHeight}
function render(){syncCats();
  document.querySelectorAll("#tabs button").forEach(function(b){b.setAttribute("aria-selected",b.dataset.t===tab)});
  $("#month").value=month;$("#cur").value=code();$("#hi").textContent=S.profile&&S.profile.name?"Hi, "+S.profile.name+" · ":"";
  $("#view").innerHTML={ov:ov,tx:tx,bd:bd,gl:gl,rc:rc,ch:ch}[tab]();
}
$("#tabs").onclick=function(e){if(e.target.dataset.t){tab=e.target.dataset.t;render()}};
$("#month").onchange=function(e){if(e.target.value){month=e.target.value;render()}};
$("#cur").onchange=function(e){S.code=e.target.value;save();render()};
$("#theme").onclick=function(){var r=document.documentElement,d=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=d?"light":"dark"};
$("#view").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target);
  if(e.target.id==="af"){var nn=f.get("n").trim();if(nn&&!CL().some(function(x){return x.n.toLowerCase()===nn.toLowerCase()})){ensureCL();S.catList.push({n:nn,g:f.get("g")});save()}render();return}
  if(e.target.id==="cf"){var q=f.get("q").trim();e.target.reset();if(q)ask(q);return}
  if(e.target.id==="rf"){var a2=parseFloat(f.get("amt"));if(!(a2>0))return;S.rec.push({id:uid(),type:f.get("type"),amt:a2,cat:f.get("cat"),day:parseInt(f.get("day"))||1,note:f.get("note").trim(),start:month});materialise()}
  else if(e.target.id==="tf"){var a=parseFloat(f.get("amt"));if(!(a>0))return;S.txs.push({id:uid(),type:f.get("type"),amt:a,cat:f.get("cat"),date:f.get("date"),note:f.get("note").trim()});month=f.get("date").slice(0,7)}
  else if(e.target.id==="gf"){S.goals.push({id:uid(),name:f.get("name").trim(),target:parseFloat(f.get("target")),saved:parseFloat(f.get("saved"))||0})}
  save();render()};
$("#view").onclick=function(e){var d=e.target.dataset;
  if(d.q){ask(d.q);return}
  if(d.cdel!==undefined){if(confirm("Remove "+d.cdel+"? Past transactions keep their label.")){ensureCL();S.catList=S.catList.filter(function(x){return x.n!==d.cdel});delete S.budgets[d.cdel];save();render()}return}
  if(d.use!==undefined){S.budgets[d.use]=+d.amt;save();render();return}
  if(d.plan!==undefined){applyPlan();return}
  if(d.clear!==undefined){if(confirm("Clear every category limit?")){S.budgets={};save();render()}return}
  if(d.rdel){S.rec=S.rec.filter(function(r){return r.id!==d.rdel});S.txs=S.txs.filter(function(t){return t.id.indexOf("rec_"+d.rdel+"_")!==0})}
  else if(d.del){S.txs=S.txs.filter(function(t){return t.id!==d.del})}
  else if(d.gdel){S.goals=S.goals.filter(function(g){return g.id!==d.gdel})}
  else if(d.gadd){var v=parseFloat($('[data-gin="'+d.gadd+'"]').value);if(!(v>0))return;S.goals.forEach(function(g){if(g.id===d.gadd)g.saved+=v})}
  else return;save();render()};
$("#view").onchange=function(e){var d=e.target.dataset,v=e.target.value;
  if(d.bud!==undefined){S.budgets[d.bud]=Math.max(0,parseFloat(v)||0);save();render()}
  else if(d.grp!==undefined){ensureCL();S.catList.forEach(function(x){if(x.n===d.grp)x.g=v});save();render()}
  else if(d.ren!==undefined){var o=d.ren,nu=v.trim();ensureCL();
    if(!nu||nu===o||S.catList.some(function(x){return x.n.toLowerCase()===nu.toLowerCase()&&x.n!==o})){render();return}
    S.catList.forEach(function(x){if(x.n===o)x.n=nu});if(S.budgets[o]!==undefined){S.budgets[nu]=S.budgets[o];delete S.budgets[o]}
    S.txs.forEach(function(t){if(t.cat===o)t.cat=nu});S.rec.forEach(function(r){if(r.cat===o)r.cat=nu});save();render()}};
$("#exp").onclick=function(){var rows=[["date","type","category","amount","note"]].concat(S.txs.map(function(t){return[t.date,t.type,t.cat,t.amt,'"'+t.note.replace(/"/g,'""')+'"']}));
  var bl=new Blob([rows.join("\n")],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download="cre8-budget.csv";a.click()};
$("#rst").onclick=function(){if(confirm("Delete all transactions, budgets and goals?")){S={cur:S.cur,code:code(),txs:[],budgets:{},goals:[],rec:[]};save();render();openSetup()}};
$("#bak").onclick=function(){var bl=new Blob([JSON.stringify(S)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download="cre8-budget-backup-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("#res").onclick=function(){$("#rfile").click()};
$("#rfile").onchange=function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){try{var d=JSON.parse(r.result);if(!d||!Array.isArray(d.txs))throw 0;
    if(!confirm("Replace everything on this device with the backup from "+f.name+"?"))return;
    S=Object.assign({cur:"M",txs:[],budgets:{},goals:[],rec:[]},d);save();materialise();render()}catch(x){alert("That file is not a Cre8 Budget backup.")}};
  r.readAsText(f);e.target.value=""};
var SYM={M:"LSL",R:"ZAR","$":"USD","€":"EUR","£":"GBP"};
var CODES=["LSL","ZAR","USD","EUR","GBP","NGN","KES","GHS","TZS","UGX","BWP","NAD","ZMW","MZN","EGP","INR","CNY","JPY","AUD","CAD","BRL","AED","SAR","PKR","PHP","MXN"];
var PLAN={Housing:25,Food:12,Transport:8,Bills:5,Health:5,Fun:10,Other:15,Savings:20};
function code(){return S.code||SYM[S.cur]||"USD"}
function guess(){var r=(navigator.language||"").split("-")[1]||"";return({LS:"LSL",ZA:"ZAR",NG:"NGN",KE:"KES",GH:"GHS",TZ:"TZS",UG:"UGX",BW:"BWP",NA:"NAD",ZM:"ZMW",EG:"EGP",IN:"INR",GB:"GBP",US:"USD",CA:"CAD",AU:"AUD",BR:"BRL",AE:"AED",DE:"EUR",FR:"EUR"})[r]||"USD"}
function curOpts(sel){var dn;try{dn=new Intl.DisplayNames(undefined,{type:"currency"})}catch(e){}
  return CODES.map(function(c){var n="";try{n=dn?dn.of(c):""}catch(e){}return'<option value="'+c+'"'+(c===sel?" selected":"")+'>'+c+(n?" - "+esc(n):"")+'</option>'}).join("")}
function fmt(n){try{return new Intl.NumberFormat(undefined,{style:"currency",currency:code(),maximumFractionDigits:2}).format(n)}catch(e){return code()+" "+Number(n).toFixed(2)}}
function openSetup(){
  if($("#ob"))return;var p=S.profile||{},ed=!!S.setup,el=document.createElement("div");el.className="ov";el.id="ob";
  el.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="obt"><h2 id="obt">'+(ed?"Your profile":"Welcome to Cre8 Budget")+'</h2><p class="k">'+(ed?"Update your income and preferences.":"Four quick questions. You can change them anytime.")+'</p><form class="f" id="obf" style="grid-template-columns:1fr;margin-top:12px"><label>Your name<input name="name" maxlength="30" autocomplete="given-name" value="'+esc(p.name||"")+'"></label><label>Currency<select name="code">'+curOpts(ed?code():guess())+'</select></label><label>Monthly income after tax<input name="income" type="number" min="1" step="0.01" inputmode="decimal" required value="'+(p.income||"")+'"></label><label>Pay day (1 to 28)<input name="day" type="number" min="1" max="28" value="'+(p.day||25)+'"></label><label>Budget plan<select name="plan"><option value="plan">50/30/20 plan (recommended)</option><option value="blank">Start blank</option>'+(ed?'<option value="keep" selected>Keep my current budgets</option>':'')+'</select></label><div style="display:flex;gap:8px"><button class="p" style="flex:1">'+(ed?"Save":"Get started")+'</button>'+(ed?'<button type="button" id="obx">Cancel</button>':'')+'</div></form></div>';
  document.body.appendChild(el);var fi=el.querySelector("input");if(fi)fi.focus();
  if(ed)$("#obx").onclick=function(){el.remove()};
  $("#obf").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target),inc=parseFloat(f.get("income"));if(!(inc>0))return;
    S.code=f.get("code");S.profile={name:f.get("name").trim(),income:inc,day:parseInt(f.get("day"))||25};
    var mo=new Date().toISOString().slice(0,7);
    S.rec=S.rec.filter(function(r){return r.id!=="salary"});S.txs=S.txs.filter(function(t){return t.id!=="rec_salary_"+mo});
    S.rec.push({id:"salary",type:"in",amt:inc,cat:"Other",day:S.profile.day,note:"Salary",start:mo});
    var pl=f.get("plan");
    if(pl==="plan"){S.catList=DEF.map(function(x){return{n:x.n,g:x.g}});S.budgets={};Object.keys(PLAN).forEach(function(c){S.budgets[c]=Math.round(inc*PLAN[c]/100)});
      if(!S.goals.some(function(g){return g.name==="Emergency fund"}))S.goals.push({id:uid(),name:"Emergency fund",target:Math.round(inc*3),saved:0})}
    else if(pl==="blank")S.budgets={};
    S.setup=1;save();materialise();el.remove();month=mo;render()}}
function statement(){
  var s=sums(month),list=inMonth(month).sort(function(a,b){return a.date.localeCompare(b.date)}),p=S.profile||{};
  var title=new Date(+month.slice(0,4),+month.slice(5)-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
  var net=s.i-s.e,rate=s.i>0?Math.round(net/s.i*100):0;
  var cats=Object.keys(s.by).sort(function(a,b){return s.by[b]-s.by[a]});
  var rows=cats.map(function(c){var l=S.budgets[c]||0,u=s.by[c];return'<tr><td>'+esc(c)+'</td><td class="r">'+fmt(u)+'</td><td class="r">'+(l?fmt(l):"-")+'</td><td class="r'+(l&&u>l?" bad":"")+'">'+(l?Math.round(u/l*100)+"%":"-")+'</td></tr>'}).join("");
  var tx=list.map(function(t){return'<tr><td>'+t.date+'</td><td>'+esc(t.note||t.cat)+'</td><td>'+(t.type==="in"?"Income":esc(t.cat))+'</td><td class="r">'+(t.type==="in"?"+":"-")+fmt(t.amt)+'</td></tr>'}).join("");
  var gl=S.goals.map(function(g){return'<tr><td>'+esc(g.name)+'</td><td class="r">'+fmt(g.saved)+'</td><td class="r">'+fmt(g.target)+'</td><td class="r">'+Math.min(100,Math.round(g.saved/g.target*100))+'%</td></tr>'}).join("");
  var css='body{font:14px/1.5 system-ui,sans-serif;color:#12212b;max-width:780px;margin:0 auto;padding:28px}h1{font-size:26px;margin:0}h2{font-size:16px;margin:26px 0 8px;border-bottom:2px solid #0e6e6e;padding-bottom:4px}table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #d6dee3;text-align:left}th{font-size:12px;color:#5d6f7a}.r{text-align:right}.bad{color:#b42318;font-weight:600}.sum{display:flex;gap:12px;flex-wrap:wrap}.sum div{flex:1;min-width:130px;border:1px solid #d6dee3;border-radius:8px;padding:10px}.sum b{display:block;font-size:20px}.k{color:#5d6f7a;font-size:12px}button{margin-bottom:16px;padding:8px 16px;border:0;border-radius:8px;background:#0e6e6e;color:#fff;font-size:14px;cursor:pointer}@media print{button{display:none}body{padding:0}}';
  var d='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Statement '+title+'</title><style>'+css+'</style></head><body><button onclick="window.print()">Print or save as PDF</button><h1>Monthly statement</h1><div class="k">'+esc(title)+(p.name?" · "+esc(p.name):"")+' · Currency '+code()+' · Generated '+new Date().toLocaleDateString()+'</div>'+
  '<h2>Summary</h2><div class="sum"><div><span class="k">Income</span><b>'+fmt(s.i)+'</b></div><div><span class="k">Spent</span><b>'+fmt(s.e)+'</b></div><div><span class="k">Net</span><b>'+fmt(net)+'</b></div><div><span class="k">Saved of income</span><b>'+rate+'%</b></div></div>'+
  '<h2>Spending by category</h2>'+(rows?'<table><tr><th>Category</th><th class="r">Spent</th><th class="r">Budget</th><th class="r">Used</th></tr>'+rows+'</table>':'<p class="k">No spending recorded.</p>')+
  (gl?'<h2>Savings goals</h2><table><tr><th>Goal</th><th class="r">Saved</th><th class="r">Target</th><th class="r">Progress</th></tr>'+gl+'</table>':'')+
  '<h2>Transactions</h2>'+(tx?'<table><tr><th>Date</th><th>Description</th><th>Category</th><th class="r">Amount</th></tr>'+tx+'</table>':'<p class="k">No transactions this month.</p>')+
  '<p class="k" style="margin-top:28px">Generated by Cre8 Budget · Powered by cre8learn Institute. This is a personal record, not an official bank statement.</p></body></html>';
  var w=window.open("","_blank");if(!w){alert("Your browser blocked the statement window. Allow pop-ups for this page and try again.");return}
  w.document.write(d);w.document.close()}
$("#stm").onclick=statement;
$("#prof").onclick=openSetup;
$("#cur").innerHTML=curOpts(code());
render();
load().then(function(x){if(x){S=Object.assign(S,x);if(!S.rec)S.rec=[]}materialise();render();if(!S.setup)openSetup();if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().then(function(ok){var p=$("#pst");if(p)p.textContent=ok?" Storage protected.":" Tip: back up regularly.";}).catch(function(){})}});
