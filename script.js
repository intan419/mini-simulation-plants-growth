let mode = "normal";

let dayN = 0, dayE = 0;
let dataN = [], dataE = [];
let chart;

const el = id => document.getElementById(id);

// SLIDER VALUE
["water", "light", "temp", "ph", "humidity", "fertDose"].forEach(id => {
    el(id).oninput = () => {
        el(id + "Val").innerText = el(id).value;
        if (mode === "experiment") updateUI();
    };
});

// FASE TANAMAN (dengan emoji untuk animasi)
const stages = [
    { day: 0, img: "assets/seed.png", phase: "🌰 Dormancy (Biji)", emoji: "🌰", size: 55 },
    { day: 5, img: "assets/sprout.png", phase: "🌱 Germination (Kecambah)", emoji: "🌱", size: 60 },
    { day: 15, img: "assets/small.png", phase: "🌿 Seedling (Bibit)", emoji: "🌿", size: 65 },
    { day: 30, img: "assets/medium.png", phase: "🍃 Vegetative (Daun)", emoji: "🍃", size: 75 },
    { day: 50, img: "assets/flower.png", phase: "🌻 Reproductive (Kuncup)", emoji: "🌻", size: 85 },
    { day: 70, img: "assets/bloom.png", phase: "🌸 Anthesis (Mekar)", emoji: "🌸", size: 90 },
    { day: 90, img: "assets/wilt.png", phase: "🍂 Senescence (Menua)", emoji: "🍂", size: 80 }
];

// ========== ANIMASI TANAMAN ==========
function updatePlantAnimation(day, isDead, stressLevel, currentHeight) {
    let plantDiv = document.getElementById("animatedPlant");
    if (!plantDiv) return;
    
    // Hapus class grow dulu
    plantDiv.classList.remove("grow");
    
    if (isDead) {
        plantDiv.innerHTML = "💀";
        plantDiv.style.fontSize = "60px";
        plantDiv.style.filter = "grayscale(1)";
        plantDiv.style.animation = "gentleSway 1s infinite ease-in-out";
        return;
    }
    
    // Cari fase berdasarkan hari
    let currentStage = stages[0];
    for (let s of stages) {
        if (day >= s.day) currentStage = s;
    }
    
    plantDiv.innerHTML = currentStage.emoji;
    
    // Ukuran berdasarkan tinggi tanaman
    let baseSize = currentStage.size;
    let extraSize = Math.min(30, Math.max(0, currentHeight / 8));
    let finalSize = baseSize + extraSize;
    plantDiv.style.fontSize = finalSize + "px";
    
    // Efek stres (goyang lebih cepat)
    if (stressLevel > 2) {
        plantDiv.style.animation = "gentleSway 0.6s infinite ease-in-out";
        plantDiv.style.filter = "drop-shadow(0 0 8px rgba(255,0,0,0.5))";
    } else {
        plantDiv.style.animation = "gentleSway 3s infinite ease-in-out";
        plantDiv.style.filter = "drop-shadow(0 8px 12px rgba(0,0,0,0.2))";
    }
    
    // Efek tumbuh (setiap update)
    plantDiv.classList.add("grow");
    setTimeout(() => plantDiv.classList.remove("grow"), 400);
}

// ========== TARGET TINGGI REAL DATA ==========
function getTargetHeight(day) {
    if (day <= 0) return 0;
    if (day <= 10) return 2 + (day / 10) * 3;
    if (day <= 20) return 5 + ((day - 10) / 10) * 15;
    if (day <= 40) return 20 + ((day - 20) / 20) * 80;
    if (day <= 60) return 100 + ((day - 40) / 20) * 80;
    if (day <= 75) return 180 + ((day - 60) / 15) * 40;
    if (day <= 90) return 220 + ((day - 75) / 15) * 30;
    return Math.max(0, 250 - (day - 90) * 5);
}

// MODE
el("mode").onchange = e => {
    mode = e.target.value;
    updateUI();
};

// ========== FUNGSI UTAMA STEP ==========
function step(prev, d, mode) {
    let H = prev?.H ?? 0;
    let stress = prev?.stress ?? 0;
    let deadCause = prev?.deadCause ?? null;
    let isDead = prev?.dead ?? false;

    if (isDead) {
        let newH = Math.max(0, H - 3);
        return { H: newH, stress, dead: true, deadCause };
    }

    let w = +el("water").value;
    let l = +el("light").value;
    let t = +el("temp").value;
    let p = +el("ph").value;
    let h = +el("humidity").value;
    let fert = el("fertilizer").value;
    let dose = +el("fertDose").value / 100;
    let season = el("season").value;

    if (mode === "normal") {
        w = 100; l = 80; t = 27; p = 6.5; h = 60; dose = 0.5; fert = "npk";
    }

    if (season === "kemarau") { w *= 0.7; h *= 0.7; }
    if (season === "hujan") { w *= 1.3; h *= 1.2; }

    let fertEffect = 1;
    if (fert === "npk") fertEffect = 1 + 0.4 * dose;
    if (fert === "organic") fertEffect = 1 + 0.25 * dose;
    if (dose > 0.85) stress += 1.2;

    let f = Math.min(
        l / (l + 50),
        w < 80 ? w / 80 : (w > 140 ? 140 / w : 1),
        (t >= 20 && t <= 30) ? 1 : 0.5,
        (p >= 6 && p <= 7.5) ? 1 : 0.5,
        (h >= 40 && h <= 70) ? 1 : 0.7
    );

    if (f < 0.6) stress += 0.4;
    else stress = Math.max(0, stress - 0.2);

    if (stress > 4.2) {
        let cause = "";
        if (w < 60) cause = "kekurangan air";
        else if (w > 150) cause = "kelebihan air";
        else if (l < 50) cause = "kekurangan cahaya";
        else if (l > 95) cause = "kelebihan cahaya";
        else if (t < 18) cause = "suhu terlalu rendah";
        else if (t > 35) cause = "suhu terlalu tinggi";
        else if (p < 5) cause = "pH terlalu asam";
        else if (p > 8) cause = "pH terlalu basa";
        else cause = "stres lingkungan parah";
        return { H, stress, dead: true, deadCause: cause };
    }

    if (d > 90) {
        let penurunan = (d - 90) * 2.5;
        H = Math.max(0, H - penurunan);
        if (H <= 0.5 || d > 130) {
            return { H: 0, stress, dead: true, deadCause: "usia tua (siklus hidup selesai)" };
        }
        return { H, stress };
    }

    let target = getTargetHeight(d);
    let diff = Math.max(0, target - H);
    let growth = diff * 0.38 * f * fertEffect;
    H += growth;
    H = Math.min(260, Math.max(0, H));

    return { H, stress };
}

// ========== SIMULASI ==========
function simulate(day, mode) {
    let arr = [], prev = null;
    for (let d = 5; d <= day; d += 5) {
        let res = step(prev, d, mode);
        arr.push(res);
        if (res.dead) break;
        prev = res;
    }
    return arr;
}

// ========== NAVIGASI ==========
function nextDay() {
    if (mode === "normal") {
        dayN = Math.min(dayN + 5, 150);
        dataN = simulate(dayN, "normal");
    } else {
        dayE = Math.min(dayE + 5, 150);
        dataE = simulate(dayE, "experiment");
    }
    updateUI();
}

function prevDay() {
    if (mode === "normal" && dayN >= 5) {
        dayN -= 5;
        dataN = simulate(dayN, "normal");
    }
    if (mode === "experiment" && dayE >= 5) {
        dayE -= 5;
        dataE = simulate(dayE, "experiment");
    }
    updateUI();
}

// ========== UPDATE GAMBAR ==========
function updateImage(day, dead, deadCause, currentH) {
    let imgEl = el("plantImg");
    let phaseEl = el("phase");

    if (dead) {
        imgEl.src = "assets/wilt.png";
        if (deadCause && (deadCause.includes("air") || deadCause.includes("cahaya") || deadCause.includes("suhu") || deadCause.includes("pH"))) {
            phaseEl.innerHTML = `💀 MATI (Stres)<br><span style="font-size:11px;">📏 ${currentH.toFixed(1)} cm</span>`;
        } else if (deadCause && deadCause.includes("usia")) {
            phaseEl.innerHTML = `💀 MATI (Usia Tua)<br><span style="font-size:11px;">📏 ${currentH.toFixed(1)} cm</span>`;
        } else {
            phaseEl.innerHTML = `💀 MATI<br><span style="font-size:11px;">📏 ${currentH.toFixed(1)} cm</span>`;
        }
        return;
    }

    let current = stages[0];
    for (let s of stages) {
        if (day >= s.day) current = s;
    }
    imgEl.src = current.img;
    phaseEl.innerHTML = current.phase;
}

// ========== ANALISIS ==========
function treatmentAnalysis() {
    if (mode === "normal") {
        return "🌿 MODE NORMAL (Parameter Optimal)<br>💧 Air 100 | ☀️ Cahaya 80% | 🌡️ Suhu 27°C<br>🧪 pH 6.5 | 💨 Kelembaban 60% | 🌾 Pupuk NPK 50%";
    }
    return `
        💧 Air: ${el("water").value} (80-120)<br>
        ☀️ Cahaya: ${el("light").value}% (70-90)<br>
        🌡️ Suhu: ${el("temp").value}°C (22-30)<br>
        🧪 pH: ${el("ph").value} (6-7.5)<br>
        💨 Kelembaban: ${el("humidity").value}% (40-70)<br>
        🌾 Pupuk: ${el("fertDose").value}% (40-70)
    `;
}

function plantResponse(res, mode, day) {
    if (mode === "normal") {
        let target = getTargetHeight(day);
        let persen = target > 0 ? ((res?.H || 0) / target * 100).toFixed(0) : 0;
        return `🌿 TUMBUH OPTIMAL<br>📊 Target: ${target.toFixed(1)} cm<br>🌱 Aktual: ${(res?.H || 0).toFixed(1)} cm<br>✅ Capaian: ${persen}%`;
    }

    if (res?.dead) {
        return `💀 TANAMAN MATI<br>📏 Tinggi akhir: ${res.H.toFixed(1)} cm<br>⚠️ Penyebab: ${res.deadCause || "stres lingkungan"}`;
    }

    let target = getTargetHeight(day);
    let persen = target > 0 ? ((res?.H || 0) / target * 100).toFixed(0) : 0;
    let stressText = res?.stress > 2 ? `⚠️ Stres: ${res.stress.toFixed(1)}/4` : "✅ Stres: rendah";

    return `🌱 STATUS TUMBUH<br>📊 Target: ${target.toFixed(1)} cm<br>🌿 Aktual: ${(res?.H || 0).toFixed(1)} cm<br>📈 Capaian: ${persen}%<br>${stressText}`;
}

// ========== UPDATE UI UTAMA ==========
function updateUI() {
    let d = mode === "normal" ? dayN : dayE;
    let currentArr = mode === "normal" ? dataN : dataE;
    let current = currentArr.length ? currentArr[currentArr.length - 1] : { H: 0, stress: 0 };

    el("day").innerText = d;
    el("height").innerText = current.H.toFixed(1);

    updateImage(d, current.dead, current.deadCause, current.H);
    el("treatmentInfo").innerHTML = treatmentAnalysis();
    el("plantInfo").innerHTML = plantResponse(current, mode, d);
    
    // PANGGIL ANIMASI TANAMAN
    updatePlantAnimation(d, current.dead, current.stress || 0, current.H);

    drawChart();
}

// ========== GRAFIK ==========
function drawChart() {
    let maxLen = Math.max(dataN.length, dataE.length);
    let labels = [];
    for (let i = 0; i < maxLen; i++) {
        labels.push((i + 1) * 5);
    }

    let canvas = el("chart");
    if (!canvas) {
        console.error("Canvas tidak ditemukan!");
        return;
    }

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "🌿 Mode Normal",
                    data: dataN.map(d => d.H),
                    borderColor: "#22c55e",
                    backgroundColor: "rgba(34, 197, 94, 0.1)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: "#22c55e"
                },
                {
                    label: "🧪 Mode Eksperimen",
                    data: dataE.map(d => d.H),
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: "#ef4444"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "top",
                    labels: { font: { size: 12, family: "Poppins" } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || "";
                            let value = context.raw;
                            let dataPoint = context.dataset.label.includes("Normal") ? dataN[context.dataIndex] : dataE[context.dataIndex];
                            if (dataPoint?.dead) {
                                return `${label}: ${value.toFixed(1)} cm (MATI)`;
                            }
                            return `${label}: ${value.toFixed(1)} cm`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: "Tinggi (cm)", font: { weight: "bold" } },
                    min: 0,
                    max: 280,
                    grid: { color: "rgba(0,0,0,0.05)" }
                },
                x: {
                    title: { display: true, text: "Hari ke-", font: { weight: "bold" } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ========== RESET ==========
function resetAll() {
    dayN = 0;
    dayE = 0;
    dataN = [];
    dataE = [];
    updateUI();
}

// ========== INIT ==========
updateUI();
