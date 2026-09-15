const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let data = null;
let selectedDate = isoDate(new Date());
let calendarCursor = new Date();
let taskFilter = "all";

function isoDate(d) {
  const x = new Date(d);
  const y = x.getFullYear(), m = String(x.getMonth()+1).padStart(2,"0"), day = String(x.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function prettyDate(s) {
  return new Date(`${s}T00:00:00`).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
}
function uid(prefix="id") { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function save() { return window.dayBloom.saveData(data); }
function toast(msg) {
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}
function sameDay(a,b){ return a===b; }

async function init() {
  data = await window.dayBloom.loadData();
  applyTheme();
  bindNavigation();
  bindButtons();
  renderAll();
}
function bindNavigation(){
  $$(".nav").forEach(btn=>btn.addEventListener("click",()=>goToView(btn.dataset.view)));
}
function goToView(view){
  $$(".nav").forEach(x=>x.classList.remove("active"));
  const navBtn=$(`.nav[data-view="${view}"]`);
  if(navBtn)navBtn.classList.add("active");
  $$(".view").forEach(x=>x.classList.remove("active-view"));
  $(`#${view}View`).classList.add("active-view");
  renderAll();
}
function bindButtons(){
  $("#todayBtn").onclick=()=>{
    selectedDate=isoDate(new Date());
    calendarCursor=new Date();
    goToView("home");
    $("#homeView")?.scrollIntoView({behavior:"smooth",block:"start"});
  };
  $("#prevMonth").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendars();};
  $("#nextMonth").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendars();};
  $("#quickAdd").onclick=()=>openTask(selectedDate);
  $("#taskAdd").onclick=()=>openTask(selectedDate);
  $("#calendarAdd").onclick=()=>openTask(selectedDate);
  $("#openTasks").onclick=()=>document.querySelector('[data-view="tasks"]').click();
  $("#newNote").onclick=()=>openNote();
  $("#noteAdd").onclick=()=>openNote();
  $("#themeQuick").onclick=()=>document.querySelector('[data-view="settings"]').click();
  $("#minBtn").onclick=()=>window.dayBloom.minimize();
  $("#maxBtn").onclick=()=>window.dayBloom.maximize();
  $("#closeBtn").onclick=()=>window.dayBloom.hide();
  $("#testNotify").onclick=()=>window.dayBloom.notify("🌸 DayBloom","This is your test reminder. You are all set!");
  $("#clearData").onclick=async()=>{
    if(confirm("Reset all DayBloom data? This cannot be undone.")){
      data={tasks:[],notes:[],events:[],settings:{theme:"sakura",accent:"#e88aa7",compact:false,startup:false}};
      await save(); applyTheme(); renderAll(); toast("Data reset.");
    }
  };
  $$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");taskFilter=b.dataset.filter;renderTasks();});
  $$(".theme-choice").forEach(b=>b.onclick=()=>{data.settings.theme=b.dataset.theme;save();applyTheme();});
  $("#compactToggle").onchange=e=>{data.settings.compact=e.target.checked;save();applyTheme();};
  $("#startupToggle").onchange=async e=>{data.settings.startup=e.target.checked;await save();const ok=await window.dayBloom.setStartup(e.target.checked);toast(ok?"Startup preference saved.":"Could not change Windows startup.");};
  $$("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
  $("#taskForm").addEventListener("submit",saveTask);
  $("#noteForm").addEventListener("submit",saveNote);
}
function applyTheme(){
  document.body.className="";
  const th=data.settings.theme;
  if(th && th!=="sakura")document.body.classList.add(th);
  if(data.settings.compact)document.body.classList.add("compact");
  $$(".theme-choice").forEach(b=>b.classList.toggle("active",b.dataset.theme===th));
  if($("#compactToggle"))$("#compactToggle").checked=!!data.settings.compact;
  if($("#startupToggle"))$("#startupToggle").checked=!!data.settings.startup;
}
function renderAll(){ renderHome();renderCalendars();renderTasks();renderNotes();renderReminder(); }
function renderHome(){
  $("#homeDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  const today=data.tasks.filter(t=>t.date===selectedDate);
  $("#taskCount").textContent=`${today.length} task${today.length===1?"":"s"}`;
  const done=today.filter(t=>t.completed).length;
  $("#progressBar").style.width=(today.length?done/today.length*100:0)+"%";
  $("#progressText").textContent=today.length?`${done} of ${today.length} completed`:"No tasks yet";
  renderTaskList($("#todayTasks"),today.slice(0,6));
  const notes=data.notes.slice(0,3);
  $("#notePreview").innerHTML=notes.length?notes.map(noteHTML).join(""):`<div class="empty">No sticky notes yet.<br>Create one for your little reminders.</div>`;
}
function renderCalendars(){renderCalendar($("#calendar"),false);renderCalendar($("#calendarLarge"),true);$("#monthTitle").textContent=calendarCursor.toLocaleDateString(undefined,{month:"long",year:"numeric"});}
function renderCalendar(el,large){
  if(!el)return;
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const start=(first.getDay()+6)%7, total=last.getDate();
  const prevLast=new Date(y,m,0).getDate();
  let html=`<div class="calendar-grid">`;
  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(d=>html+=`<div class="dow">${d}</div>`);
  for(let i=0;i<42;i++){
    const n=i-start+1;
    let date,muted=false;
    if(n<1){date=new Date(y,m-1,prevLast+n);muted=true}
    else if(n>total){date=new Date(y,m+1,n-total);muted=true}
    else date=new Date(y,m,n);
    const iso=isoDate(date);
    const has=data.tasks.some(t=>t.date===iso&&!t.completed);
    const events=data.events.filter(e=>e.date===iso);
    html+=`<button class="day ${muted?"muted-day":""} ${iso===selectedDate?"selected":""} ${iso===isoDate(new Date())?"today":""} ${has?"has-task":""}" data-date="${iso}">
      <strong>${date.getDate()}</strong>${large&&events.length?`<div class="day-events">${events[0].title}</div>`:""}</button>`;
  }
  html+="</div>";el.innerHTML=html;
  el.querySelectorAll(".day").forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;calendarCursor=new Date(`${selectedDate}T00:00:00`);renderAll();});
}
function renderTaskList(el,tasks){
  if(!tasks.length){el.innerHTML=`<div class="empty">🌷 Nothing here yet.<br>Add a task and make it a good day.</div>`;return;}
  el.innerHTML=tasks.map(t=>`<div class="task ${t.completed?"done":""}">
    <button class="check ${t.completed?"done":""}" data-id="${t.id}">${t.completed?"✓":""}</button>
    <div class="task-title">${escapeHtml(t.title)}${t.reminder?`<div class="muted">🔔 ${formatReminder(t.reminder)}</div>`:""}</div>
    <span class="priority ${t.priority}">${t.priority}</span>
    <button class="delete-task" data-delete="${t.id}" title="Delete">×</button>
  </div>`).join("");
  el.querySelectorAll(".check").forEach(b=>b.onclick=async()=>{const t=data.tasks.find(x=>x.id===b.dataset.id);t.completed=!t.completed;if(t.completed)t.reminded=true;await save();renderAll();});
  el.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{data.tasks=data.tasks.filter(x=>x.id!==b.dataset.delete);await save();renderAll();});
}
function renderTasks(){
  let list=[...data.tasks];
  if(taskFilter==="today")list=list.filter(t=>t.date===selectedDate);
  if(taskFilter==="open")list=list.filter(t=>!t.completed);
  if(taskFilter==="done")list=list.filter(t=>t.completed);
  list.sort((a,b)=>a.date.localeCompare(b.date)||(a.completed-b.completed));
  renderTaskList($("#allTasks"),list);
}
function renderNotes(){
  $("#notesGrid").innerHTML=data.notes.length?data.notes.map(n=>noteHTML(n,true)).join(""):`<div class="card empty">🗒️<br>No notes yet. Create your first sticky note.</div>`;
  $$("#notesGrid [data-note-delete]").forEach(b=>b.onclick=async()=>{data.notes=data.notes.filter(n=>n.id!==b.dataset.noteDelete);await save();renderAll();});
}
function noteHTML(n,full=false){
  return `<article class="note-card note-${n.color}">
    ${full?`<div class="note-actions"><button data-note-delete="${n.id}">🗑</button></div>`:""}
    <h3>${escapeHtml(n.title||"My note")}</h3><p>${escapeHtml(n.text).replace(/\n/g,"<br>")}</p>
  </article>`;
}
function renderReminder(){
  const upcoming=data.tasks.filter(t=>!t.completed&&t.reminder&&new Date(t.reminder)>=new Date()).sort((a,b)=>new Date(a.reminder)-new Date(b.reminder))[0];
  $("#nextReminder").innerHTML=upcoming?`<div class="reminder-time">${formatReminder(upcoming.reminder)}</div><div class="reminder-name">${escapeHtml(upcoming.title)}</div>`:`<div class="empty">✨ No upcoming reminders.<br>Your schedule is breathing nicely.</div>`;
}
function formatReminder(v){return new Date(v).toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
function openTask(date){
  $("#taskTitle").value="";$("#taskDate").value=date||selectedDate;$("#taskReminder").value="";$("#taskPriority").value="normal";$("#taskDialog").showModal();setTimeout(()=>$("#taskTitle").focus(),50);
}
async function saveTask(e){
  e.preventDefault();
  const title=$("#taskTitle").value.trim();
  if(!title){toast("Please enter a task name.");return;}
  const reminder=$("#taskReminder").value;
  data.tasks.push({id:uid("task"),title,date:$("#taskDate").value,reminder:reminder||null,priority:$("#taskPriority").value,completed:false,reminded:false});
  await save();$("#taskDialog").close();renderAll();toast("Task saved 🌸");
}
function openNote(){ $("#noteTitle").value="";$("#noteText").value="";$("#noteColor").value="yellow";$("#noteDialog").showModal();setTimeout(()=>$("#noteText").focus(),50); }
async function saveNote(e){
  e.preventDefault();
  const text=$("#noteText").value.trim();if(!text){toast("Please write something.");return;}
  data.notes.unshift({id:uid("note"),title:$("#noteTitle").value.trim()||"My note",text,color:$("#noteColor").value});
  await save();$("#noteDialog").close();renderAll();toast("Sticky note saved 🗒️");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

init();