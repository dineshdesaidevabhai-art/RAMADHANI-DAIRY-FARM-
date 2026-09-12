import React, { useEffect, useMemo, useState } from "react";
import { Users, Milk, WalletCards, Bot, Plus, Pencil, Trash2, LogOut, MessageCircle, DatabaseBackup, X } from "lucide-react";
import "../Css/styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const money = n => `₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const today = () => new Date().toISOString().slice(0,10);
const monthNow = () => today().slice(0,7);

async function api(path, opts={}) {
  const token = localStorage.getItem("rdf_token");
  const r = await fetch(API+path, {
    ...opts,
    headers: {"Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) , ...(opts.headers||{})}
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function Login({onLogin}) {
  const [username,setUsername]=useState("admin"),[password,setPassword]=useState("ChangeMe@123"),[err,setErr]=useState("");
  const submit=async e=>{e.preventDefault();setErr("");try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({username,password})});localStorage.setItem("rdf_token",d.token);onLogin();}catch(e){setErr(e.message)}};
  return <div className="login"><div className="login-card">
    <div className="logo">ર</div><div className="brand">રામાધણી <span>ડેરી ફાર્મ</span></div>
    <p className="muted">Premium Dairy Management</p>
    <form onSubmit={submit}><label>Username<input value={username} onChange={e=>setUsername(e.target.value)}/></label>
    <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {err&&<div className="error">{err}</div>}<button className="gold full">Secure Login</button></form>
    <small>First login: admin / ChangeMe@123</small>
  </div></div>
}

function App(){
  const [logged,setLogged]=useState(!!localStorage.getItem("rdf_token"));
  if(!logged) return <Login onLogin={()=>setLogged(true)}/>;
  return <Dashboard logout={()=>{localStorage.removeItem("rdf_token");setLogged(false)}}/>
}

function Dashboard({logout}){
  const [tab,setTab]=useState("overview"),[customers,setCustomers]=useState([]),[entries,setEntries]=useState([]),[payments,setPayments]=useState([]);
  const [month,setMonth]=useState(monthNow()),[modal,setModal]=useState(null),[notice,setNotice]=useState("");
  const [ai,setAi]=useState(false);

  const load=async()=>{try{setCustomers(await api("/customers"));setEntries(await api("/entries?month="+month));setPayments(await api("/payments"))}catch(e){setNotice(e.message)}};
  useEffect(()=>{load()},[month]);
  const totalMilk=entries.reduce((s,e)=>s+e.morning+e.evening,0);
  const totalPaid=payments.filter(p=>p.payment_date?.startsWith(month)).reduce((s,p)=>s+p.amount,0);
  const totalBill=customers.reduce((s,c)=>s+entries.filter(e=>e.customer_id===c.id).reduce((a,e)=>a+e.morning+e.evening,0)*c.rate,0);

  async function saveCustomer(form){
    const method=form.id?"PUT":"POST"; const path=form.id?`/customers/${form.id}`:"/customers";
    await api(path,{method,body:JSON.stringify(form)});setModal(null);load();
  }
  async function removeCustomer(id){if(confirm("Delete this customer and all related entries?")){await api("/customers/"+id,{method:"DELETE"});load()}}
  async function saveEntry(form){await api("/entries",{method:"POST",body:JSON.stringify(form)});setModal(null);load()}
  async function savePayment(form){await api("/payments",{method:"POST",body:JSON.stringify(form)});setModal(null);load()}

  return <div className="app">
    <aside><div className="side-logo"><div className="logo small">ર</div><div><b>રામાધણી</b><span>ડેરી ફાર્મ</span></div></div>
      {[
        ["overview","Dashboard",Milk],["customers","Customers",Users],["entries","Milk Entries",Milk],["ledger","Monthly Ledger",WalletCards],["payments","Payments",WalletCards]
      ].map(([id,label,I])=><button key={id} className={tab===id?"nav active":"nav"} onClick={()=>setTab(id)}><I size={18}/>{label}</button>)}
      <button className="nav" onClick={()=>setAi(true)}><Bot size={18}/>AI Assistant</button>
      <div className="side-bottom"><button className="nav" onClick={async()=>{try{await api("/backup",{method:"POST"});setNotice("Backup created successfully.")}catch(e){setNotice(e.message)}}}><DatabaseBackup size={18}/>Backup Now</button><button className="nav" onClick={logout}><LogOut size={18}/>Logout</button></div>
    </aside>
    <main><header><div><h1>{tab==="overview"?"Good evening 👋":tab.replace(/^\w/,c=>c.toUpperCase())}</h1><p className="muted">રામાધણી ડેરી ફાર્મ • {month}</p></div><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></header>
      {notice&&<div className="notice" onClick={()=>setNotice("")}>{notice} <X size={15}/></div>}
      {tab==="overview"&&<><div className="hero"><div><div className="eyebrow">TODAY'S OPERATIONS</div><h2>Manage your dairy, beautifully.</h2><p>Milk collection, customer ledgers and payments in one premium workspace.</p></div><div className="hero-mark">ર</div></div>
      <div className="stats"><Stat icon={Users} label="Customers" value={customers.length}/><Stat icon={Milk} label={`Milk • ${month}`} value={`${totalMilk.toFixed(1)} L`}/><Stat icon={WalletCards} label="Monthly Billing" value={money(totalBill)}/><Stat icon={WalletCards} label="Payments" value={money(totalPaid)}/></div>
      <div className="grid2"><section className="card"><div className="card-head"><h3>Quick actions</h3></div><div className="quick"><button onClick={()=>setModal({type:"customer"})}><Plus/> Add customer</button><button onClick={()=>setModal({type:"entry"})}><Milk/> Add milk entry</button><button onClick={()=>setModal({type:"payment"})}><WalletCards/> Record payment</button><button onClick={()=>setAi(true)}><Bot/> Ask AI</button></div></section>
      <section className="card"><h3>Recent payments</h3>{payments.slice(0,5).map(p=><div className="row" key={p.id}><div><b>{p.name}</b><small>{p.payment_date} • {p.method}</small></div><strong>{money(p.amount)}</strong></div>)}{!payments.length&&<Empty/>}</section></div></>}
      {tab==="customers"&&<Customers customers={customers} onAdd={()=>setModal({type:"customer"})} onEdit={c=>setModal({type:"customer",data:c})} onDelete={removeCustomer}/>}
      {tab==="entries"&&<Entries customers={customers} entries={entries} onAdd={()=>setModal({type:"entry"})}/>}
      {tab==="ledger"&&<Ledger customers={customers} month={month}/>}
      {tab==="payments"&&<Payments payments={payments} onAdd={()=>setModal({type:"payment"})}/>}
    </main>
    {modal&&<Modal type={modal.type} data={modal.data} customers={customers} onClose={()=>setModal(null)} onSave={modal.type==="customer"?saveCustomer:modal.type==="entry"?saveEntry:savePayment}/>}
    {ai&&<AI onClose={()=>setAi(false)}/>}
  </div>
}

const Stat=({icon:Icon,label,value})=><div className="stat"><div className="icon"><Icon size={20}/></div><div><small>{label}</small><strong>{value}</strong></div></div>;
const Empty=()=> <div className="empty">No records yet.</div>;

function Customers({customers,onAdd,onEdit,onDelete}){return <section className="card"><div className="card-head"><div><h2>Customers</h2><p className="muted">Customer master and milk rate management</p></div><button className="gold" onClick={onAdd}><Plus/> Add Customer</button></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Rate/L</th><th>Address</th><th>Actions</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.phone||"—"}</td><td>{money(c.rate)}</td><td>{c.address||"—"}</td><td><button className="icon-btn" onClick={()=>onEdit(c)}><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(c.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table>{!customers.length&&<Empty/>}</div></section>}

function Entries({customers,entries,onAdd}){return <section className="card"><div className="card-head"><div><h2>Milk Entries</h2><p className="muted">Morning + evening collection for selected month</p></div><button className="gold" onClick={onAdd}><Plus/> Add Entry</button></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Morning</th><th>Evening</th><th>Total</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{e.entry_date}</td><td><b>{e.name}</b></td><td>{e.morning} L</td><td>{e.evening} L</td><td><strong>{(e.morning+e.evening).toFixed(2)} L</strong></td></tr>)}</tbody></table>{!entries.length&&<Empty/>}</div></section>}

function Ledger({customers,month}){const [selected,setSelected]=useState(customers[0]?.id),[data,setData]=useState(null);useEffect(()=>{if(selected)api(`/ledger/${selected}?month=${month}`).then(setData)},[selected,month,customers]); const whatsapp=()=>{if(!data)return;const lines=[`રામાધણી ડેરી ફાર્મ`,`Monthly Ledger: ${data.month}`,`Customer: ${data.customer.name}`,`Milk: ${data.totalMilk.toFixed(2)} L`,`Rate: ${money(data.rate)}/L`,`Bill: ${money(data.bill)}`,`Paid: ${money(data.paid)}`,`Balance: ${money(data.balance)}`].join("\\n");window.open("https://wa.me/"+(data.customer.phone||"")+"?text="+encodeURIComponent(lines),"_blank")};return <section className="card"><div className="card-head"><div><h2>Monthly Ledger</h2><p className="muted">Customer statement for {month}</p></div><select value={selected||""} onChange={e=>setSelected(Number(e.target.value))}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>{data?<><div className="ledger-summary"><div><small>Total Milk</small><b>{data.totalMilk.toFixed(2)} L</b></div><div><small>Bill</small><b>{money(data.bill)}</b></div><div><small>Paid</small><b>{money(data.paid)}</b></div><div><small>Balance</small><b>{money(data.balance)}</b></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Morning</th><th>Evening</th><th>Total</th></tr></thead><tbody>{data.entries.map(e=><tr key={e.entry_date}><td>{e.entry_date}</td><td>{e.morning} L</td><td>{e.evening} L</td><td>{e.total.toFixed(2)} L</td></tr>)}</tbody></table></div><button className="whatsapp" onClick={whatsapp}><MessageCircle/> Send Ledger on WhatsApp</button></>:<Empty/>}</section>}

function Payments({payments,onAdd}){return <section className="card"><div className="card-head"><div><h2>Payments</h2><p className="muted">Track customer collections and settlement</p></div><button className="gold" onClick={onAdd}><Plus/> Record Payment</button></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{p.payment_date}</td><td><b>{p.name}</b></td><td>{money(p.amount)}</td><td>{p.method}</td><td>{p.note||"—"}</td></tr>)}</tbody></table>{!payments.length&&<Empty/>}</div></section>}

function Modal({type,data={},customers,onClose,onSave}){const [f,setF]=useState(type==="customer"?{name:"",phone:"",address:"",rate:0,notes:"",...data}:type==="entry"?{customer_id:customers[0]?.id||"",entry_date:today(),morning:0,evening:0}: {customer_id:customers[0]?.id||"",payment_date:today(),amount:"",method:"Cash",note:""});const set=(k,v)=>setF(x=>({...x,[k]:v}));const submit=e=>{e.preventDefault();onSave(f)};return <div className="overlay"><form className="modal" onSubmit={submit}><div className="modal-head"><h2>{type==="customer"?(data.id?"Edit Customer":"Add Customer"):type==="entry"?"Milk Entry":"Record Payment"}</h2><button type="button" onClick={onClose}><X/></button></div>{type==="customer"?<><Field label="Customer name" value={f.name} onChange={v=>set("name",v)}/><Field label="Phone" value={f.phone} onChange={v=>set("phone",v)}/><Field label="Address" value={f.address} onChange={v=>set("address",v)}/><Field label="Milk rate / litre" type="number" value={f.rate} onChange={v=>set("rate",v)}/><Field label="Notes" value={f.notes} onChange={v=>set("notes",v)}/></>:<><label>Customer<select value={f.customer_id} onChange={e=>set("customer_id",Number(e.target.value))}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Field label="Date" type="date" value={f.entry_date||f.payment_date} onChange={v=>set(type==="entry"?"entry_date":"payment_date",v)}/>{type==="entry"?<><Field label="Morning (L)" type="number" step="0.01" value={f.morning} onChange={v=>set("morning",v)}/><Field label="Evening (L)" type="number" step="0.01" value={f.evening} onChange={v=>set("evening",v)}/></>:<><Field label="Amount" type="number" step="0.01" value={f.amount} onChange={v=>set("amount",v)}/><label>Method<select value={f.method} onChange={e=>set("method",e.target.value)}><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option></select></label><Field label="Note" value={f.note} onChange={v=>set("note",v)}/></>}</>}<button className="gold full">Save</button></form></div>}
const Field=({label,value,onChange,...p})=><label>{label}<input {...p} value={value} onChange={e=>onChange(e.target.value)}/></label>;

function AI({onClose}){const [q,setQ]=useState(""),[answer,setAnswer]=useState(""),[busy,setBusy]=useState(false);const ask=async()=>{if(!q)return;setBusy(true);try{setAnswer((await api("/ai",{method:"POST",body:JSON.stringify({question:q})})).answer)}catch(e){setAnswer(e.message)}finally{setBusy(false)}};return <div className="ai-panel"><div className="ai-head"><div><Bot/> <b>રામાધણી AI</b></div><button onClick={onClose}><X/></button></div><div className="ai-body"><div className="ai-intro">Ask about billing, payments, milk entries, ledgers or backups.</div>{answer&&<div className="ai-answer">{answer}</div>}</div><div className="ai-input"><input placeholder="Type your question…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()}/><button className="gold" onClick={ask}>{busy?"…":"Ask"}</button></div></div>}

createRoot(document.getElementById("root")).render(<App/>);
