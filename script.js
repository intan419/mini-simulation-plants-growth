// ==================== VARIABLES ====================
let mode = "normal";
let dayNormal = 0, dayExp = 0;
let dataNormal = [], dataExp = [];
let chart = null;

// DOM Elements
const el = (id) => document.getElementById(id);

// Phase definition with emoji
const phases = [
    { day: 0, name: "Dormancy", emoji: "🌰", size: 55 },
    { day: 5, name: "Germination", emoji: "🌱", size: 60 },
    { day: 15, name: "Seedling", emoji: "🌿", size: 70 },
    { day: 30, name: "Vegetative", emoji: "🍃", size: 80 },
    { day: 50, name: "Reproductive", emoji: "🌻", size: 90 },
    { day: 70, name: "Anthesis", emoji: "🌸", size: 95 },
    { day: 90, name: "Senescence", emoji: "🍂", size: 85 }
];

// ==================== TARGET HEIGHT (Real Data) ====================
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

// ==================== UPDATE PLANT ANIMATION ====================
function updatePlantAnimation(day, isDead, stressLevel) {
    const plantDiv = document.getElementById("plantEmoji");
    if (!plantDiv) return;
    
    if (isDead) {
        plantDiv.innerHTML = "💀";
        plantDiv.style.fontSize = "60px";
        plantDiv.style.filter = "grayscale(1)";
        plantDiv.style.animation = "gentleSway 0.8s infinite ease-in-out";
        return;
    }
    
    // Find current phase
    let currentPhase = phases[0];
    for (let p of phases) {
        if (day >= p.day) currentPhase = p;
    }
    
    plantDiv.innerHTML = currentPhase.emoji;
    let newSize = currentPhase.size;
    // Add extra size based on height
    let heightVal = parseFloat(el("height")?.innerText || 0);
    if (heightVal > 100) newSize += Math.min(20, (heightVal - 100) / 8);
    plantDiv.style.fontSize = newSize + "px";
    
    // Stress effect: faster shaking
    if (stressLevel > 2) {
        plantDiv.style.animation = "gentleSway 0.5s infinite ease-in-out";
        plantDiv.style.filter = "drop-shadow(0 0 6px red)";
    } else {
        plantDiv.style.animation = "gentleSway 2.2s infinite ease-in-out";
        plantDiv.style.filter = "drop-shadow(2px 8px 12px rgba(0,0,0,0.3))";
    }
}

// ==================== GROWTH MODEL ====================
function step(previous, day, currentMode) {
    let height = previous?.height ?? 0;
    let stress = previous?.stress ?? 0;
    let isDead = previous?.dead ?? false;
    let deadReason = previous?.deadReason ?? null;
    
    if (isDead) {
        let shrink = Math.max(0, height - 3);
        return { height: shrink, stress, dead: true, deadReason };
    }
    
    // Get parameters
    let water = parseFloat(el("water").value);
    let light = parseFloat(el("light").value);
    let temp = parseFloat(el("temp").value);
    let ph = parseFloat(el("ph").value);
    let humidity = parseFloat(el("humidity").value);
    let fertilizer = el("fertilizer").value;
    let dose = parseFloat(el("fertDose").value) / 100;
    let season = el("season").value;
    
    // Normal mode override
    if (currentMode === "normal") {
        water = 100; light = 80; temp = 27; ph = 6.5; humidity = 60; dose = 0.5; fertilizer = "npk";
    }
    
    // Season effects
    if (season === "kemarau") { water *= 0.7; humidity *= 0.7; }
    if (season === "hujan") { water *= 1.3; humidity *= 1.2; }
    
    // Fertilizer effect
    let fertEffect = 1.0;
    if (fertilizer === "npk") fertEffect = 1 + 0.5 * dose;
    if (fertilizer === "organic") fertEffect = 1 + 0.3 * dose;
    if (dose > 0.85) stress += 1.2;
    
    // Environmental factor
    let envFactor = Math.min(
        light / (light + 45),
        water < 75 ? water / 75 : (water > 135 ? 135 / water : 1),
        (temp >= 20 && temp <= 30) ? 1 : (temp < 20 ? 0.4 : 0.5),
        (ph >= 6 && ph <= 7.5) ? 1 : 0.5,
        (humidity >= 40 && humidity <= 70) ? 1 : 0.6
    );
    
    // Stress accumulation
    if (envFactor < 0.55) stress += 0.45;
    else if (envFactor > 0.85) stress = Math.max(0, stress - 0.2);
    else stress = Math.max(0, stress - 0.05);
    
    // Death by stress
    if (stress > 4.2) {
        let cause = "";
        if (water < 55) cause = "💧 Kekeringan ekstrem";
        else if (water > 160) cause = "💧 Kebanjiran/akar busuk";
        else if (light < 40) cause = "☀️ Kekurangan sinar matahari";
        else if (light > 95) cause = "☀️ Terlalu terik";
        else if (temp < 16) cause = "🌡️ Suhu terlalu dingin";
        else if (temp > 36) cause = "🌡️ Suhu terlalu panas";
        else if (ph < 4.5) cause = "🧪 Tanah terlalu asam";
        else if (ph > 8.2) cause = "🧪 Tanah terlalu basa";
        else cause = "⚠️ Stres lingkungan parah";
        return { height, stress, dead: true, deadReason: cause };
    }
    
    // Senescence (old age decline)
    if (day > 90) {
        let decline = (day - 90) * 2.6;
        height = Math.max(0, height - decline);
        if (height < 1 || day > 135) {
            return { height: 0, stress, dead: true, deadReason: "🍂 Usia tua (selesai siklus hidup)" };
        }
        return { height, stress };
    }
    
    // Logistic growth toward target
    let target = getTargetHeight(day);
    let difference = Math.max(0, target - height);
    let growthAmount = difference * 0.38 * envFactor * fertEffect;
    let newHeight = height + growthAmount;
    newHeight = Math.min(265, Math.max(0, newHeight));
    
    return { height: newHeight, stress };
}

// ==================== SIMULATION ====================
function runSimulation(finalDay, currentMode) {
    let results = [];
    let previous = null;
    for (let d = 5; d <= finalDay; d += 5) {
        let result = step(previous, d, currentMode);
        results.push(result);
        if (result.dead) break;
        previous = result;
    }
    return results;
}

// ==================== UI UPDATES ====================
function updateUI() {
    let currentDay = (mode === "normal") ? dayNormal : dayExp;
    let currentData = (mode === "normal") ? dataNormal : dataExp;
    let latest = currentData.length ? currentData[currentData.length - 1] : { height: 0, stress: 0, dead: false };
    
    document.getElementById("day").innerText = currentDay;
    document.getElementById("height").innerText = latest.height.toFixed(1);
    
    // Update phase text & animation
    let deadStatus = latest.dead || false;
    let stressLevel = latest.stress || 0;
    updatePlantAnimation(currentDay, deadStatus, stressLevel);
    
    // Phase text
    if (deadStatus) {
        let reason = latest.deadReason || "Mati";
        document.getElementById("phase").innerHTML = `💀 ${reason}`;
    } else {
        let phaseNow = phases[0];
        for (let p of phases) if (currentDay >= p.day) phaseNow = p;
        document.getElementById("phase").innerHTML = `${phaseNow.emoji} ${phaseNow.name}`;
    }
    
    // Treatment info
    let treatmentHtml = "";
    if (mode === "normal") {
        treatmentHtml = "🌿 Mode Normal: Air 100 | Cahaya 80% | Suhu 27°C | pH 6.5 | Kelembaban 60% | Pupuk NPK 50%";
    } else {
        treatmentHtml = `
            💧 Air: ${el("water").value} (ideal 80-120)<br>
            ☀️ Cahaya: ${el("light").value}% (70-90)<br>
            🌡️ Suhu: ${el("temp").value}°C (22-30)<br>
            🧪 pH: ${el("ph").value} (6-7.5)<br>
            💨 Kelembaban: ${el("humidity").value}% (40-70)<br>
            🌾 Pupuk: ${el("fertDose").value}% (40-70)
        `;
    }
    document.getElementById("treatmentInfo").innerHTML = treatmentHtml;
    
    // Plant response
    let targetNow = getTargetHeight(currentDay);
    let percent = targetNow > 0 ? ((latest.height / targetNow) * 100).toFixed(0) : 0;
    if (mode === "normal") {
        document.getElementById("plantInfo").innerHTML = `🌱 Tumbuh optimal<br>📊 Target: ${targetNow.toFixed(1)} cm<br>🌿 Aktual: ${latest.height.toFixed(1)} cm (${percent}%)`;
    } else if (latest.dead) {
        document.getElementById("plantInfo").innerHTML = `💀 Mati: ${latest.deadReason || "stres"}<br>📏 Tinggi akhir: ${latest.height.toFixed(1)} cm`;
    } else {
        let stressMsg = latest.stress > 2 ? `⚠️ Stres (${latest.stress.toFixed(1)}/5)` : "✅ Stres minimal";
        document.getElementById("plantInfo").innerHTML = `🌿 ${stressMsg}<br>📊 Target: ${targetNow.toFixed(1)} cm<br>🌱 Aktual: ${latest.height.toFixed(1)} cm (${percent}%)`;
    }
    
    drawChart();
}

// ==================== CHART ====================
function drawChart() {
    const maxLen = Math.max(dataNormal.length, dataExp.length);
    const labels = Array.from({ length: maxLen }, (_, i) => (i + 1) * 5);
    const canvas = document.getElementById("growthChart");
    if (!canvas) return;
    
    if (chart) chart.destroy();
    
    chart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "🌿 Normal (Optimal)",
                    data: dataNormal.map(d => d.height),
                    borderColor: "#2e7d32",
                    backgroundColor: "rgba(46,125,50,0.05)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: "#2e7d32"
                },
                {
                    label: "🧪 Eksperimen",
                    data: dataExp.map(d => d.height),
                    borderColor: "#d32f2f",
                    backgroundColor: "rgba(211,47,47,0.05)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: "#d32f2f"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            let val = ctx.raw;
                            return `${ctx.dataset.label}: ${val.toFixed(1)} cm`;
                        }
                    }
                },
                legend: { position: "top" }
            },
            scales: {
                y: { title: { display: true, text: "Tinggi (cm)" }, min: 0, max: 280 },
                x: { title: { display: true, text: "Hari ke-" } }
            }
        }
    });
}

// ==================== NAVIGATION & RESET ====================
function nextDay() {
    if (mode === "normal") {
        dayNormal = Math.min(dayNormal + 5, 150);
        dataNormal = runSimulation(dayNormal, "normal");
    } else {
        dayExp = Math.min(dayExp + 5, 150);
        dataExp = runSimulation(dayExp, "experiment");
    }
    updateUI();
}

function prevDay() {
    if (mode === "normal" && dayNormal >= 5) {
        dayNormal -= 5;
        dataNormal = runSimulation(dayNormal, "normal");
    }
    if (mode === "experiment" && dayExp >= 5) {
        dayExp -= 5;
        dataExp = runSimulation(dayExp, "experiment");
    }
    updateUI();
}

function resetCurrentMode() {
    if (mode === "normal") {
        dayNormal = 0;
        dataNormal = [];
    } else {
        dayExp = 0;
        dataExp = [];
    }
    updateUI();
}

function resetOtherMode() {
    if (mode === "normal") {
        dayExp = 0;
        dataExp = [];
    } else {
        dayNormal = 0;
        dataNormal = [];
    }
    updateUI();
}

function resetAllData() {
    dayNormal = 0;
    dayExp = 0;
    dataNormal = [];
    dataExp = [];
    updateUI();
}

// ==================== EVENT LISTENERS ====================
function bindEvents() {
    document.getElementById("mode").addEventListener("change", (e) => {
        mode = e.target.value;
        updateUI();
    });
    
    document.getElementById("nextBtn").addEventListener("click", nextDay);
    document.getElementById("prevBtn").addEventListener("click", prevDay);
    document.getElementById("resetModeBtn").addEventListener("click", resetCurrentMode);
    document.getElementById("resetPrevBtn").addEventListener("click", resetOtherMode);
    document.getElementById("resetAllBtn").addEventListener("click", resetAllData);
    
    // Live update on slider change for experiment mode
    const sliders = ["water", "light", "temp", "ph", "humidity", "fertDose"];
    sliders.forEach(id => {
        document.getElementById(id).addEventListener("input", function() {
            document.getElementById(id + "Val").innerText = this.value;
            if (mode === "experiment") {
                if (mode === "experiment") {
                    dayExp = Math.min(dayExp, 150);
                    dataExp = runSimulation(dayExp, "experiment");
                    updateUI();
                }
            }
        });
    });
    
    // For select elements
    document.getElementById("fertilizer").addEventListener("change", () => {
        if (mode === "experiment") {
            dayExp = Math.min(dayExp, 150);
            dataExp = runSimulation(dayExp, "experiment");
            updateUI();
        }
    });
    document.getElementById("season").addEventListener("change", () => {
        if (mode === "experiment") {
            dayExp = Math.min(dayExp, 150);
            dataExp = runSimulation(dayExp, "experiment");
            updateUI();
        }
    });
}

// ==================== INITIALIZE ====================
function init() {
    bindEvents();
    dayNormal = 0; dayExp = 0;
    dataNormal = []; dataExp = [];
    updateUI();
}

init();
