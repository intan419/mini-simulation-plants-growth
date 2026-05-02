let mode="normal";

let dayN=0, dayE=0;
let dataN=[], dataE=[];
let chart;

const el=id=>document.getElementById(id);

// SLIDER VALUE
["water","light","temp","ph","humidity","fertDose"].forEach(id=>{
el(id).oninput=()=>{
el(id+"Val").innerText=el(id).value;
};
});

// FASE
const stages=[
{day:0,img:"assets/seed.png",phase:"Dormancy"},
{day:5,img:"assets/sprout.png",phase:"Germination"},
{day:15,img:"assets/small.png",phase:"Seedling"},
{day:30,img:"assets/medium.png",phase:"Vegetative"},
{day:50,img:"assets/flower.png",phase:"Reproductive"},
{day:70,img:"assets/bloom.png",phase:"Anthesis"},
{day:90,img:"assets/wilt.png",phase:"Senescence"}
];

// TARGET TINGGI SESUAI DATA KAMU
function getTargetHeight(day) {
    if (day <= 10) return 2 + (day / 10) * 3;
    if (day <= 20) return 5 + ((day - 10) / 10) * 15;
    if (day <= 40) return 20 + ((day - 20) / 20) * 80;
    if (day <= 60) return 100 + ((day - 40) / 20) * 80;
    if (day <= 75) return 180 + ((day - 60) / 15) * 40;
    if (day <= 90) return 220 + ((day - 75) / 15) * 30;
    return Math.max(0, 250 - (day - 90) * 5);
}

// FUNGSI UNTUK MENDETEKSI PENYEBAB STRES
function analyzeStressFactors(w, l, t, p, h, dose, fert, season) {
    let problems = [];
    
    // Analisis Air
    if (w < 60) problems.push(`💧 Kekurangan air (${w} mm/hari, ideal 80-120)`);
    else if (w > 140) problems.push(`💧 Kelebihan air (${w} mm/hari, ideal 80-120)`);
    
    // Analisis Cahaya
    if (l < 60) problems.push(`☀️ Kekurangan cahaya (${l}%, ideal 70-90)`);
    else if (l > 95) problems.push(`☀️ Kelebihan cahaya (${l}%, ideal 70-90)`);
    
    // Analisis Suhu
    if (t < 20) problems.push(`🌡️ Suhu terlalu rendah (${t}°C, ideal 22-30)`);
    else if (t > 32) problems.push(`🌡️ Suhu terlalu tinggi (${t}°C, ideal 22-30)`);
    
    // Analisis pH
    if (p < 5.5) problems.push(`🧪 pH terlalu asam (${p}, ideal 6-7.5)`);
    else if (p > 8) problems.push(`🧪 pH terlalu basa (${p}, ideal 6-7.5)`);
    
    // Analisis Kelembaban
    if (h < 35) problems.push(`💨 Kelembaban terlalu rendah (${h}%, ideal 40-70)`);
    else if (h > 80) problems.push(`💨 Kelembaban terlalu tinggi (${h}%, ideal 40-70)`);
    
    // Analisis Pupuk
    let fertName = fert === "npk" ? "NPK" : (fert === "organic" ? "Organik" : "Tidak pakai");
    if (dose < 0.3 && fert !== "none") problems.push(`🌾 Kekurangan pupuk (${(dose*100)}%, ideal 40-70%)`);
    else if (dose > 0.85 && fert !== "none") problems.push(`🌾 Kelebihan pupuk (${(dose*100)}%, ideal 40-70%)`);
    else if (fert === "none") problems.push(`🌾 Tidak menggunakan pupuk (pertumbuhan melambat)`);
    
    // Analisis Musim
    if (season === "kemarau") problems.push(`🍂 Musim kemarau (meningkatkan risiko kekeringan)`);
    if (season === "hujan") problems.push(`🍂 Musim hujan (risiko kelebihan air dan penyakit)`);
    
    return problems;
}

// MODE
el("mode").onchange=e=>{
mode=e.target.value;
updateUI();
};

// MODEL
function step(prev,d,mode){

let H=prev?.H??0;
let stress=prev?.stress??0;
let deadCause = prev?.deadCause ?? null;
let isDead = prev?.dead ?? false;
let stressProblems = prev?.stressProblems ?? [];

// Jika sudah mati sebelumnya, teruskan penurunan sampai 0
if(isDead) {
    let newH = Math.max(0, H - 3);
    let finalCause = deadCause || (H <= 0 ? "tanaman telah mati total" : "tanaman mati");
    return {H:newH, stress, dead:newH<=0 ? true : true, deadCause:finalCause, stressProblems};
}

let w=+el("water").value;
let l=+el("light").value;
let t=+el("temp").value;
let p=+el("ph").value;
let h=+el("humidity").value;
let fert=el("fertilizer").value;
let dose=+el("fertDose").value/100;
let season=el("season").value;

if(mode==="normal"){
w=100;l=80;t=27;p=6.5;h=60;dose=0.5;
}

// Deteksi masalah lingkungan (untuk mode eksperimen)
let currentProblems = [];
if(mode !== "normal") {
    currentProblems = analyzeStressFactors(w, l, t, p, h, dose, fert, season);
}

if(season==="kemarau"){w*=0.7;h*=0.7;}
if(season==="hujan"){w*=1.3;h*=1.2;}

let fertEffect=1;
if(fert==="npk") fertEffect=1+0.5*dose;
if(fert==="organic") fertEffect=1+0.3*dose;
if(dose>0.8) stress+=1.5;

let f=Math.min(
l/(l+50),
w<80?w/80:(w>140?140/w:1),
(t>=20&&t<=30)?1:0.5,
(p>=6&&p<=7.5)?1:0.5,
(h>=40&&h<=70)?1:0.7
);

if(f<0.6) stress+=0.4;
else stress*=0.8;

// CEK KEMATIAN KARENA STRES LINGKUNGAN
if(stress>4) {
    let problemList = currentProblems.length > 0 ? currentProblems : ["stres lingkungan parah"];
    return {H, stress, dead:true, deadCause: problemList.join(", "), stressProblems: problemList};
}

// Setelah fase senescence (90+ hari), tanaman mulai layu dan mati
if(d > 90) {
    let penurunan = (d - 90) * 2.8;
    H = Math.max(0, H - penurunan);
    if(H <= 0.5) {
        return {H:0, stress, dead:true, deadCause: "usia tua (siklus hidup selesai)", stressProblems};
    }
    return {H, stress, stressProblems: currentProblems};
}

// Pertumbuhan normal menuju target
let target = getTargetHeight(d);
let diff = Math.max(0, target - H);
let growth = diff * 0.35 * f * fertEffect;

H += growth;
if(H<0) H=0;

return {H, stress, stressProblems: currentProblems};
}

// SIMULASI
function simulate(day,mode){
let arr=[],prev=null;
for(let d=5;d<=day;d+=5){
let res=step(prev,d,mode);
arr.push(res);
prev=res;
}
return arr;
}

// NAV
function nextDay(){
if(mode==="normal"){dayN=Math.min(dayN+5,150);dataN=simulate(dayN,"normal");}
else{dayE=Math.min(dayE+5,150);dataE=simulate(dayE,"experiment");}
updateUI();
}

function prevDay(){
if(mode==="normal"&&dayN>=5){dayN-=5;dataN=simulate(dayN,"normal");}
if(mode==="experiment"&&dayE>=5){dayE-=5;dataE=simulate(dayE,"experiment");}
updateUI();
}

// IMAGE
function updateImage(day,dead,deadCause,currentH){
let imgEl = el("plantImg");
let phaseEl = el("phase");

if(dead){
imgEl.src="assets/wilt.png";
if(deadCause && (deadCause.includes("stres") || deadCause.includes("💧") || deadCause.includes("☀️") || deadCause.includes("🌡️"))){
phaseEl.innerHTML=`💀 Mati (Stres Lingkungan)<br><span style="font-size:11px;">${deadCause.substring(0, 60)}${deadCause.length>60?"...":""}</span><br><span style="font-size:12px;">📏 Tinggi akhir: ${currentH.toFixed(1)} cm</span>`;
} else if(deadCause && deadCause.includes("usia")){
phaseEl.innerHTML=`💀 Mati (Usia Tua)<br><span style="font-size:12px;">📏 Tinggi akhir: ${currentH.toFixed(1)} cm</span>`;
} else {
phaseEl.innerHTML=`💀 Mati<br><span style="font-size:12px;">📏 Tinggi akhir: ${currentH.toFixed(1)} cm</span>`;
}
return;
}
let current=stages[0];
for(let s of stages){if(day>=s.day) current=s;}
imgEl.src=current.img;
phaseEl.innerHTML=current.phase;
}

// ANALISIS
function treatmentAnalysis(){
if(mode==="normal"){
return "Mode Normal: Air 100, Cahaya 80%, Suhu 27°C, pH 6.5, Kelembaban 60%, Pupuk 50%";
}
let w=+el("water").value;
let l=+el("light").value;
let t=+el("temp").value;
let p=+el("ph").value;
let h=+el("humidity").value;
let dose=+el("fertDose").value;

return `
Air ${w} (80–120)<br>
Cahaya ${l}% (70–90)<br>
Suhu ${t}°C (22–30)<br>
pH ${p} (6–7.5)<br>
Kelembaban ${h}% (40–70)<br>
Pupuk ${dose}% (40–70)
`;
}

function plantResponse(res,mode){
if(mode==="normal") return "🌿 Tumbuh optimal sesuai target realistik.<br>✅ Semua parameter dalam kondisi ideal.";

if(res?.dead){
if(res.deadCause && (res.deadCause.includes("💧") || res.deadCause.includes("☀️") || res.deadCause.includes("🌡️") || res.deadCause.includes("🧪") || res.deadCause.includes("💨") || res.deadCause.includes("🌾"))){
return `💀 TANAMAN MATI KARENA STRES LINGKUNGAN:<br><span style="font-size:12px;">${res.deadCause}</span><br><br>📏 Tinggi akhir: ${res.H.toFixed(1)} cm<br>💡 Saran: Sesuaikan parameter ke nilai ideal`;
} else if(res.deadCause && res.deadCause.includes("usia")){
return `💀 TANAMAN MATI KARENA USIA TUA:<br><span style="font-size:12px;">${res.deadCause}</span><br><br>📏 Tinggi akhir: ${res.H.toFixed(1)} cm<br>🌱 Siklus hidup tanaman telah selesai.`;
} else {
return `💀 Tanaman mati.<br>📏 Tinggi akhir: ${res.H.toFixed(1)} cm`;
}
}

// Jika tanaman hidup tapi ada masalah
if(res.stressProblems && res.stressProblems.length > 0 && mode !== "normal"){
let problemText = res.stressProblems.slice(0, 3).join("<br>• ");
return `⚠️ TANAMAN MENGALAMI STRES:<br><span style="font-size:12px;">• ${problemText}</span><br><br>📊 Stres level: ${res.stress?.toFixed(1) || 0}/4<br>🌱 Pertumbuhan terhambat.`;
}

if(res?.stress>2) return `⚠️ Tanaman stres (${res.stress.toFixed(1)}/4) - pertumbuhan terhambat.`;

return "🌱 Tumbuh normal.";
}

// UI
function updateUI(){
let d = mode==="normal"?dayN:dayE;
let currentArr = mode==="normal"?dataN:dataE;
let current = currentArr.length ? currentArr[currentArr.length-1] : {H:0, stressProblems:[]};

el("day").innerText=d;
el("height").innerText=current.H.toFixed(1);

// Update image dan phase dengan info kematian
updateImage(d, current.dead, current.deadCause, current.H);

el("treatmentInfo").innerHTML=treatmentAnalysis();
el("plantInfo").innerHTML=plantResponse(current,mode);

drawChart();
}

// CHART
function drawChart(){
let maxLen = Math.max(dataN.length, dataE.length);
let labels = [];
for(let i=0; i<maxLen; i++) labels.push((i+1)*5);

if(!chart){
chart=new Chart(el("chart"),{
type:"line",
data:{
labels:labels,
datasets:[
{label:"Normal",data:dataN.map(d=>d.H),borderColor:"green",fill:false,tension:0.3},
{label:"Eksperimen",data:dataE.map(d=>d.H),borderColor:"red",fill:false,tension:0.3}
]
},
options:{
responsive:true,
scales:{
y:{
title:{display:true,text:"Tinggi (cm)"},
min:0,
max:280
}
},
plugins:{
tooltip:{
callbacks:{
label:function(context){
let label = context.dataset.label || '';
let value = context.raw;
let dataPoint = context.dataset.label === "Normal" ? dataN[context.dataIndex] : dataE[context.dataIndex];
if(dataPoint?.dead){
let cause = dataPoint.deadCause || "mati";
let shortCause = cause.length > 40 ? cause.substring(0,40)+"..." : cause;
return `${label}: ${value.toFixed(1)} cm (${shortCause})`;
}
if(dataPoint?.stressProblems && dataPoint.stressProblems.length > 0 && context.dataset.label !== "Normal"){
return `${label}: ${value.toFixed(1)} cm (⚠️ stres)`;
}
return `${label}: ${value.toFixed(1)} cm`;
}
}
}
}
}
});
} else {
chart.data.labels=labels;
chart.data.datasets[0].data=dataN.map(d=>d.H);
chart.data.datasets[1].data=dataE.map(d=>d.H);
chart.update();
}
}

// RESET
function resetMode(){
if(mode==="normal"){dayN=0;dataN=[];}
else{dayE=0;dataE=[];}
updateUI();
}

function resetPrevMode(){
if(mode==="normal"){dayE=0;dataE=[];}
else{dayN=0;dataN=[];}
updateUI();
}

function resetAll(){
dayN=0;dayE=0;
dataN=[];dataE=[];
updateUI();
}

updateUI();