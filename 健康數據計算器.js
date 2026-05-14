// --- 全域變數 ---
let records = JSON.parse(localStorage.getItem('health_records')) || [];
let currentData = null;
let myChart = null;

// 頁面載入時初始化
window.onload = function() {
    renderRecords();
};

// 同步到瀏覽器儲存空間
function syncStorage() {
    localStorage.setItem('health_records', JSON.stringify(records));
}

// 1. 處理分頁切換 (支援 3 個分頁與 pos-0/1/2 邏輯)
function switchPage(pageId, element) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    const navToggle = document.querySelector('.nav-toggle');
    navToggle.classList.remove('pos-0', 'pos-1', 'pos-2');

    if (pageId === 'calc') {
        navToggle.classList.add('pos-0');
    } else if (pageId === 'record') {
        navToggle.classList.add('pos-1');
    } else if (pageId === 'chart') {
        navToggle.classList.add('pos-2');
        updateChart(); // 切換到圖表頁時更新
    }

    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
}

function goToFormula() {
    window.location.href = "formula.html";
}

// 2. 計算功能
function calculate() {
    const age = parseFloat(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const genderElement = document.querySelector('input[name="gender"]:checked');
    const activity = parseFloat(document.getElementById('activity').value);
    const note = document.getElementById('daily-note').value;

    if (!age || !weight || !height || !genderElement) {
        alert("請填寫完所有完整資訊");
        return;
    }

    const gender = genderElement.value;

    // BMI
    const bmi = weight / ((height / 100) ** 2);
    const bmiFixed = bmi.toFixed(1);
    document.getElementById('bmi-val').innerText = bmiFixed;

    // BMR
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    const bmrRounded = Math.round(bmr);
    document.getElementById('bmr-val').innerText = bmrRounded;

    // TDEE
    const tdee = bmr * activity;
    const tdeeRounded = Math.round(tdee);
    document.getElementById('tdee-val').innerText = tdeeRounded;

    // 狀態
    let status = "";
    if (bmi < 18.5) status = "過輕";
    else if (bmi < 24) status = "健康";
    else if (bmi < 27) status = "過重";
    else status = "肥胖";
    document.getElementById('bmi-status').innerText = "您的狀態屬於: " + status;

    document.getElementById('results').style.display = 'block';

    // 封裝本次數據
    currentData = {
        time: new Date().toLocaleString(),
        shortTime: new Date().toLocaleDateString(),
        age: age,
        weight: weight,
        height: height,
        bmi: bmiFixed,
        bmr: bmrRounded,
        tdee: tdeeRounded,
        status: status,
        note: note || "無備註"
    };
    
    // 計算後滾動到結果區 (優化體驗)
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// 3. 儲存功能
function saveRecord() {
    if (!currentData) {
        alert("請先進行計算後再儲存");
        return;
    }
    records.unshift(currentData);
    syncStorage();
    renderRecords();
    alert("紀錄已儲存！");
    // 清空備註欄位
    document.getElementById('daily-note').value = '';
}

// 4. 渲染紀錄 (關鍵修改：對應 CSS 新結構)
function renderRecords() {
    const listContainer = document.getElementById('record-list');
    if (!listContainer) return;

    if (records.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">尚無紀錄資料</p>';
        return;
    }

    listContainer.innerHTML = '';
    records.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'record-item';
        itemDiv.innerHTML = `
            <div class="record-info">
                <small>${item.time}</small>
                <div style="margin: 5px 0;">
                    <strong>${item.status}</strong> | BMI: ${item.bmi}
                </div>
                <div style="font-size: 0.85rem; color: #666;">
                    ${item.height}cm / ${item.weight}kg / ${item.age}歲
                </div>
                
                <div class="note-container" onclick="this.classList.toggle('expanded')">
                    <span class="note-text">📝 備註：${item.note}</span>
                </div>
            </div>
            
            <div class="record-actions">
                <button class="delete-btn btn-edit" onclick="event.stopPropagation(); startEdit(${index})">編輯備註</button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteRecord(${index})">刪除紀錄</button>
            </div>
        `;
        listContainer.appendChild(itemDiv);
    });
}

// 5. 編輯備註
function startEdit(index) {
    const newNote = prompt("請輸入新的備註內容：", records[index].note);
    if (newNote !== null) {
        records[index].note = newNote || "無備註";
        syncStorage();
        renderRecords();
    }
}

// 6. 刪除紀錄
function deleteRecord(index) {
    if (confirm("確定要刪除這筆紀錄嗎？")) {
        records.splice(index, 1);
        syncStorage();
        renderRecords();
        if (myChart) updateChart();
    }
}

// 7. 圖表功能
function updateChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx || records.length === 0) {
        if (myChart) myChart.destroy();
        return;
    }

    const chartData = [...records].reverse();
    const labels = chartData.map(d => d.shortTime);
    const weights = chartData.map(d => d.weight);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: '體重變化 (kg)',
            data: weights,
            borderColor: 'rgb(50, 65, 82)', // 折線的顏色（藍色）
            
            // 1. 【關鍵修正】將點的填充顏色設定為與邊框相同的實心藍色
            pointBackgroundColor: 'rgba(50, 65, 82, 0.6)',
            // 設定初始點邊框也帶一點透明度 (或者也可以設為 0 隱藏邊框) 
            pointBorderColor: 'rgba(112, 119, 128, 0.5)',
            // 2. 【選用優化】設定滑鼠移上去時點的顏色，保持實心藍色
            pointHoverBackgroundColor: '#262626',
            pointHoverBorderColor: '#262626',
            pointHoverBorderWidth: 2, // 移上去時可以加粗一點點邊框

            // 3. 折線下方淡灰色區域
            backgroundColor: 'rgba(206, 206, 206, 0.1)', 
            borderWidth: 3,
            tension: 0.3,
            fill: true, // 這會讓折線下方有淡藍色填充
            pointRadius: 3, // 稍微加大一點圓點，看起來更清楚
            pointHoverRadius: 5 // 滑鼠移上去時變更大
        }]
    },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

// --- FAQ 常見問題專用邏輯 (修正優化版) ---
document.addEventListener('DOMContentLoaded', () => {
    const allDetails = document.querySelectorAll('details');

    allDetails.forEach((details) => {
        const summary = details.querySelector('summary');
        
        summary.addEventListener('click', (e) => {
            const isCategory = details.classList.contains('faq-category-card');

            if (!details.hasAttribute('open')) {
                // 開啟時：只關閉「同等級」的鄰居
                let parent = details.parentElement;
                // 如果是分類，則搜尋 container 內的所有分類
                let selector = isCategory ? '.faq-category-card' : '.faq-item';
                
                parent.querySelectorAll(selector).forEach(other => {
                    if (other !== details && other.hasAttribute('open')) {
                        // 讓鄰居優雅地關閉
                        other.classList.add('collapsing');
                        setTimeout(() => {
                            other.removeAttribute('open');
                            other.classList.remove('collapsing');
                        }, 300);
                    }
                });
            } else {
                // 關閉時：執行收合動畫
                e.preventDefault();
                details.classList.add('collapsing');
                setTimeout(() => {
                    details.removeAttribute('open');
                    details.classList.remove('collapsing');
                }, 300);
            }
        });
    });
});

//鼠標移動效果

const canvas = document.getElementById('canvas-cursor');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1; // 隨機大小
        this.speedX = Math.random() * 0.5 - 0.25; // 水平速度
        this.speedY = Math.random() * 0.5 - 0.25; //垂直速度
        this.color = "#88888870"; // 粒子色彩
        this.alpha = 1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.02; // 慢慢消失
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let moveCount = 0; // 新增一個計數器

window.addEventListener('mousemove', (e) => {
    moveCount++;
    
    // --- 修改這裡：每移動 3 次才產生 1 個粒子 ---
    if (moveCount % 3 === 0) { 
        particles.push(new Particle(e.clientX, e.clientY));
    }
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
    requestAnimationFrame(animate);
}
animate();

// --- 響應式導覽列邏輯 ---
const menu = document.querySelector('#mobile-menu');
const menuLinks = document.querySelector('.nav-links');

if (menu) {
    menu.addEventListener('click', function() {
        menu.classList.toggle('is-active');
        menuLinks.classList.toggle('active');
    });
}

// 點擊連結後自動收起選單 (在手機版點擊後跳轉，選單應消失)
document.querySelectorAll('.nav-links a').forEach(n => n.addEventListener('click', () => {
    menu.classList.remove('is-active');
    menuLinks.classList.remove('active');
}));

// --- 頁面跳轉平滑動畫 ---
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        // 排除新視窗開啟或相同路徑
        if (this.hostname === window.location.hostname && !this.getAttribute('target')) {
            e.preventDefault();
            const targetUrl = this.href;

            // 讓 body 執行淡出動畫
            document.body.style.transition = 'opacity 0.4s ease';
            document.body.style.opacity = '0';

            // 等動畫快結束時執行跳轉
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 400);
        }
    });
});
