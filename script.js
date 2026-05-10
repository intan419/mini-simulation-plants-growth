// ==================== VARIABLES ====================
let currentMode = "normal";
let dayNormal = 0, dayExperiment = 0;
let dataNormal = [], dataExperiment = [];
let growthChart = null;

// DOM Elements
const get = (id) => document.getElementById(id);

// Nilai optimal untuk mode normal
const OPTIMAL_VALUES = {
    water: 100,
    light: 80,
    temp: 27,
    ph: 6.5,
    humidity: 60,
    fertDose: 50,
    fertilizer: "npk",
    season: "optimal"
};

// Fase tanaman
const growthPhases = [
    { day: 0, emoji: "🌰", name: "Biji", size: 55 },
    { day: 5, emoji: "🌱", name: "Kecambah", size: 60 },
    { day: 15, emoji: "🌿", name: "Bibit", size: 65 },
    { day: 30, emoji: "🍃", name: "Vegetatif", size: 75 },
    { day: 50, emoji: "🌻", name: "Kuncup Bunga", size: 85 },
    { day: 70, emoji: "🌸", name: "Mekar", size: 90 },
    { day: 90, emoji: "🍂", name: "Menua", size: 80 }
];

// ========== TARGET TINGGI DUNIA NYATA ==========
function getRealTargetHeight(day) {
    if (day <= 0) return 0;
    if (day <= 10) return 2 + (day / 10) * 3;
    if (day <= 20) return 5 + ((day - 10) / 10) * 15;
    if (day <= 40) return 20 + ((day - 20) / 20) * 80;
    if (day <= 60) return 100 + ((day - 40) / 20) * 80;
    if (day <= 75) return 180 + ((day - 60) / 15) * 40;
    if (day <= 90) return 220 + ((day - 75) / 15) * 30;
    return Math.max(0, 250 - (day - 90) * 4.5);
}

// ========== RESET SLIDER KE NILAI OPTIMAL ==========
function resetSlidersToOptimal() {
    get("water").value = OPTIMAL_VALUES.water;
    get("light").value = OPTIMAL_VALUES.light;
    get("temp").value = OPTIMAL_VALUES.temp;
    get("ph").value = OPTIMAL_VALUES.ph;
    get("humidity").value = OPTIMAL_VALUES.humidity;
    get("fertDose").value = OPTIMAL_VALUES.fertDose;
    get("fertilizer").value = OPTIMAL_VALUES.fertilizer;
    get("season").value = OPTIMAL_VALUES.season;
    
    get("waterVal").innerText = OPTIMAL_VALUES.water;
    get("lightVal").innerText = OPTIMAL_VALUES.light;
    get("tempVal").innerText = OPTIMAL_VALUES.temp;
    get("phVal").innerText = OPTIMAL_VALUES.ph;
    get("humVal").innerText = OPTIMAL_VALUES.humidity;
    get("fertVal").innerText = OPTIMAL_VALUES.fertDose;
}

// ========== ANIMASI TANAMAN ==========
function updatePlantAnimation(day, isDead, stressLevel, currentHeight) {
    const plantDiv = get("plantEmoji");
    if (!plantDiv) return;
    
    plantDiv.classList.remove("grow-effect");
    
    if (isDead) {
        plantDiv.innerHTML = "💀";
        plantDiv.style.fontSize = "55px";
        plantDiv.style.filter = "grayscale(1)";
        plantDiv.style.animation = "sway 1s infinite ease-in-out";
        return;
    }
    
    let currentPhase = growthPhases[0];
    for (let p of growthPhases) {
        if (day >= p.day) currentPhase = p;
    }
    
    plantDiv.innerHTML = currentPhase.emoji;
    
    let sizeBonus = Math.min(30, Math.max(0, currentHeight / 8));
    let finalSize = currentPhase.size + sizeBonus;
    plantDiv.style.fontSize = finalSize + "px";
    
    if (stressLevel > 2) {
        plantDiv.style.animation = "sway 0.5s infinite ease-in-out";
        plantDiv.style.filter = "drop-shadow(0 0 8px rgba(255,0,0,0.6))";
    } else {
        plantDiv.style.animation = "sway 3s infinite ease-in-out";
        plantDiv.style.filter = "drop-shadow(0 8px 12px rgba(0,0,0,0.2))";
    }
    
    plantDiv.classList.add("grow-effect");
    setTimeout(() => plantDiv.classList.remove("grow-effect"), 400);
}

// ========== MODEL PERTUMBUHAN ==========
function growthStep(previous, currentDay, mode) {
    let height = previous?.height ?? 0;
    let stress = previous?.stress ?? 0;
    
    if (previous?.dead) {
        let newHeight = Math.max(0, height - 3.5);
        return { height: newHeight, stress, dead: true, deadReason: previous.deadReason };
    }
    
    let water = parseFloat(get("water").value);
    let light = parseFloat(get("light").value);
    let temp = parseFloat(get("temp").value);
    let ph = parseFloat(get("ph").value);
    let humidity = parseFloat(get("humidity").value);
    let fertilizer = get("fertilizer").value;
    let dose = parseFloat(get("fertDose").value) / 100;
    let season = get("season").value;
    
    if (mode === "normal") {
        water = OPTIMAL_VALUES.water;
        light = OPTIMAL_VALUES.light;
        temp = OPTIMAL_VALUES.temp;
        ph = OPTIMAL_VALUES.ph;
        humidity = OPTIMAL_VALUES.humidity;
        dose = OPTIMAL_VALUES.fertDose / 100;
        fertilizer = OPTIMAL_VALUES.fertilizer;
        season = OPTIMAL_VALUES.season;
    }
    
    if (season === "kemarau") { water *= 0.65; humidity *= 0.65; }
    if (season === "hujan") { water *= 1.25; humidity *= 1.2; }
    
    let fertEffect = 1.0;
    if (fertilizer === "npk") fertEffect = 1 + 0.45 * dose;
    if (fertilizer === "organic") fertEffect = 1 + 0.25 * dose;
    if (dose > 0.85) stress += 1.3;
    if (fertilizer === "none") fertEffect = 0.7;
    
    let waterFactor = Math.min(1, water / 100) * (water > 150 ? 0.7 : 1);
    let lightFactor = Math.min(1, light / 80) * (light > 95 ? 0.65 : 1);
    let tempFactor = (temp >= 20 && temp <= 30) ? 1 : Math.max(0.3, 1 - Math.abs(temp - 26) / 15);
    let phFactor = (ph >= 6 && ph <= 7.5) ? 1 : Math.max(0.3, 1 - Math.abs(ph - 6.8) / 4);
    let humidityFactor = (humidity >= 40 && humidity <= 70) ? 1 : Math.max(0.3, 1 - Math.abs(humidity - 55) / 35);
    
    let envFactor = Math.min(waterFactor, lightFactor, tempFactor, phFactor, humidityFactor);
    let finalFactor = envFactor * fertEffect;
    
    if (envFactor < 0.55) stress += 0.45;
    else if (envFactor > 0.85) stress = Math.max(0, stress - 0.2);
    else stress = Math.max(0, stress - 0.08);
    
    if (stress > 4.3) {
        let cause = "";
        if (water < 50) cause = "💧 Kekeringan ekstrem";
        else if (water > 170) cause = "💧 Kebanjiran / akar busuk";
        else if (light < 35) cause = "☀️ Kekurangan sinar matahari";
        else if (light > 97) cause = "☀️ Sinar matahari terlalu terik";
        else if (temp < 15) cause = "🌡️ Suhu terlalu dingin";
        else if (temp > 37) cause = "🌡️ Suhu terlalu panas";
        else if (ph < 4.5) cause = "🧪 Tanah terlalu asam";
        else if (ph > 8.2) cause = "🧪 Tanah terlalu basa";
        else cause = "⚠️ Stres lingkungan parah";
        return { height, stress, dead: true, deadReason: cause };
    }
    
    if (currentDay > 90) {
        let decline = (currentDay - 90) * 2.8;
        height = Math.max(0, height - decline);
        if (height < 1 || currentDay > 135) {
            return { height: 0, stress, dead: true, deadReason: "🍂 Usia tua (siklus hidup selesai)" };
        }
        return { height, stress };
    }
    
    let target = getRealTargetHeight(currentDay);
    let difference = Math.max(0, target - height);
    let growth = difference * 0.4 * finalFactor;
    let newHeight = Math.min(265, Math.max(0, height + growth));
    
    return { height: newHeight, stress };
}

// ========== SIMULASI ==========
function runSimulation(finalDay, mode) {
    let results = [];
    let previous = null;
    for (let day = 5; day <= finalDay; day += 5) {
        let stepResult = growthStep(previous, day, mode);
        results.push(stepResult);
        if (stepResult.dead) break;
        previous = stepResult;
    }
    return results;
}

// ========== UPDATE SEMUA UI ==========
function updateAllUI() {
    let currentDay = (currentMode === "normal") ? dayNormal : dayExperiment;
    let currentData = (currentMode === "normal") ? dataNormal : dataExperiment;
    let latest = currentData.length ? currentData[currentData.length - 1] : { height: 0, stress: 0, dead: false };
    
    get("dayDisplay").innerText = currentDay;
    get("heightDisplay").innerText = latest.height.toFixed(1);
    
    if (latest.dead) {
        get("phaseDisplay").innerHTML = `💀 MATI`;
    } else {
        let currentPhase = growthPhases[0];
        for (let p of growthPhases) {
            if (currentDay >= p.day) currentPhase = p;
        }
        get("phaseDisplay").innerHTML = `${currentPhase.emoji} ${currentPhase.name}`;
    }
    
    updatePlantAnimation(currentDay, latest.dead, latest.stress || 0, latest.height);
    
    if (currentMode === "normal") {
        get("treatmentInfo").innerHTML = "🌿 MODE NORMAL: Air 100 | Cahaya 80% | Suhu 27°C | pH 6.5 | Kelembaban 60% | Pupuk NPK 50% | Musim Optimal";
    } else {
        get("treatmentInfo").innerHTML = `
            💧 Air: ${get("water").value} (ideal 80-120)<br>
            ☀️ Cahaya: ${get("light").value}% (ideal 70-90)<br>
            🌡️ Suhu: ${get("temp").value}°C (ideal 22-30)<br>
            🧪 pH: ${get("ph").value} (ideal 6-7.5)<br>
            💨 Kelembaban: ${get("humidity").value}% (ideal 40-70)<br>
            🌾 Pupuk: ${get("fertDose").value}% (ideal 40-70)
        `;
    }
    
    let target = getRealTargetHeight(currentDay);
    let percent = target > 0 ? ((latest.height / target) * 100).toFixed(0) : 0;
    
    if (currentMode === "normal") {
        get("plantInfo").innerHTML = `🌱 TUMBUH OPTIMAL<br>📊 Target: ${target.toFixed(1)} cm<br>🌿 Aktual: ${latest.height.toFixed(1)} cm<br>✅ Capaian: ${percent}% dari target dunia nyata`;
    } else if (latest.dead) {
        get("plantInfo").innerHTML = `💀 TANAMAN MATI<br>📏 Tinggi akhir: ${latest.height.toFixed(1)} cm<br>⚠️ Penyebab: ${latest.deadReason || "stres lingkungan"}`;
    } else {
        let stressText = latest.stress > 2 ? `⚠️ Stres: ${latest.stress.toFixed(1)}/5` : "✅ Stres minimal";
        get("plantInfo").innerHTML = `🌱 STATUS TUMBUH<br>📊 Target: ${target.toFixed(1)} cm<br>🌿 Aktual: ${latest.height.toFixed(1)} cm<br>📈 Capaian: ${percent}%<br>${stressText}`;
    }
    
    drawChart();
}

// ========== GRAFIK ==========
function drawChart() {
    const maxLen = Math.max(dataNormal.length, dataExperiment.length);
    const labels = [];
    for (let i = 0; i < maxLen; i++) {
        labels.push((i + 1) * 5);
    }
    
    const canvas = get("growthChart");
    if (!canvas) return;
    
    if (growthChart) growthChart.destroy();
    
    growthChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "🌿 Mode Normal (Optimal)",
                    data: dataNormal.map(d => d.height),
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
                    data: dataExperiment.map(d => d.height),
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
                legend: { position: "top", labels: { font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            let val = ctx.raw;
                            let isDead = ctx.dataset.label.includes("Normal") 
                                ? dataNormal[ctx.dataIndex]?.dead 
                                : dataExperiment[ctx.dataIndex]?.dead;
                            return `${ctx.dataset.label}: ${val.toFixed(1)} cm${isDead ? " (MATI)" : ""}`;
                        }
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: "Tinggi (cm)" }, min: 0, max: 280 },
                x: { title: { display: true, text: "Hari ke-" } }
            }
        }
    });
}

// ========== FUNGSI TOMBOL ==========
function nextDay() {
    if (currentMode === "normal") {
        dayNormal = Math.min(dayNormal + 5, 150);
        dataNormal = runSimulation(dayNormal, "normal");
    } else {
        dayExperiment = Math.min(dayExperiment + 5, 150);
        dataExperiment = runSimulation(dayExperiment, "experiment");
    }
    updateAllUI();
}

function prevDay() {
    if (currentMode === "normal" && dayNormal >= 5) {
        dayNormal -= 5;
        dataNormal = runSimulation(dayNormal, "normal");
    }
    if (currentMode === "experiment" && dayExperiment >= 5) {
        dayExperiment -= 5;
        dataExperiment = runSimulation(dayExperiment, "experiment");
    }
    updateAllUI();
}

function resetCurrentMode() {
    if (currentMode === "normal") {
        dayNormal = 0;
        dataNormal = [];
    } else {
        dayExperiment = 0;
        dataExperiment = [];
    }
    updateAllUI();
}

function resetOtherMode() {
    if (currentMode === "normal") {
        dayExperiment = 0;
        dataExperiment = [];
    } else {
        dayNormal = 0;
        dataNormal = [];
    }
    updateAllUI();
}

function resetAll() {
    dayNormal = 0;
    dayExperiment = 0;
    dataNormal = [];
    dataExperiment = [];
    if (currentMode === "normal") {
        resetSlidersToOptimal();
    }
    updateAllUI();
}

// ========== GANTI MODE ==========
function changeMode() {
    let newMode = get("modeSelect").value;
    let oldMode = currentMode;
    
    if (newMode === "normal" && oldMode === "experiment") {
        // Pindah dari eksperimen ke normal
        // Reset mode normal ke awal (hari 0)
        dayNormal = 0;
        dataNormal = [];
        // Reset slider ke nilai optimal
        resetSlidersToOptimal();
        // Data eksperimen TETAP TERSIMPAN (tidak dihapus)
    }
    
    if (newMode === "experiment" && oldMode === "normal") {
        // Pindah dari normal ke eksperimen
        // Data normal tetap tersimpan
        // Data eksperimen tetap seperti adanya
    }
    
    currentMode = newMode;
    updateAllUI();
}

// ========== INITIALISASI ==========
function init() {
    // Tombol
    get("prevBtn").addEventListener("click", prevDay);
    get("nextBtn").addEventListener("click", nextDay);
    get("resetCurrentBtn").addEventListener("click", resetCurrentMode);
    get("resetOtherBtn").addEventListener("click", resetOtherMode);
    get("resetAllBtn").addEventListener("click", resetAll);
    
    // Mode
    get("modeSelect").addEventListener("change", changeMode);
    
    // Slider untuk mode eksperimen (update realtime)
    const sliders = ["water", "light", "temp", "ph", "humidity", "fertDose"];
    sliders.forEach(id => {
        get(id).addEventListener("input", function() {
            get(id + "Val").innerText = this.value;
            if (currentMode === "experiment") {
                dayExperiment = Math.min(dayExperiment, 150);
                dataExperiment = runSimulation(dayExperiment, "experiment");
                updateAllUI();
            }
        });
    });
    
    get("fertilizer").addEventListener("change", () => {
        if (currentMode === "experiment") {
            dayExperiment = Math.min(dayExperiment, 150);
            dataExperiment = runSimulation(dayExperiment, "experiment");
            updateAllUI();
        }
    });
    
    get("season").addEventListener("change", () => {
        if (currentMode === "experiment") {
            dayExperiment = Math.min(dayExperiment, 150);
            dataExperiment = runSimulation(dayExperiment, "experiment");
            updateAllUI();
        }
    });
    
    // Set slider ke nilai optimal di awal
    resetSlidersToOptimal();
    
    // Jalankan
    updateAllUI();
}

init();
