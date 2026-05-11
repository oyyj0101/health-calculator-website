// --- 全域變數 ---
let records = JSON.parse(localStorage.getItem('health_records')) || [];
let currentData = null;
let myChart = null; // 用來存放 Chart.js 實例

// 頁面載入時，自動渲染一次紀錄(讓舊資料出現)
window.onload = function() {
    renderRecords();
};

// 將當前的 records 陣列同步到瀏覽器的 localStorage
function syncStorage() {
    localStorage.setItem('health_records', JSON.stringify(records));
}

// 1. 處理內容切換邏輯 (支援三個分頁)
function switchPage(pageId, element) {
    // 1. 處理文字顏色
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    // 2. 處理滑塊位移（核心修正：三個位置）
    const navToggle = document.querySelector('.nav-toggle');
    navToggle.classList.remove('pos-0', 'pos-1', 'pos-2'); // 先清除舊的位置

    if (pageId === 'calc') {
        navToggle.classList.add('pos-0');
    } else if (pageId === 'record') {
        navToggle.classList.add('pos-1');
    } else if (pageId === 'chart') {
        navToggle.classList.add('pos-2');
        updateChart(); // 這是你之前的圖表更新功能
    }

    // 3. 處理內容切換
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
}

function calculate() {
    const age = parseFloat(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const genderElement = document.querySelector('input[name="gender"]:checked');
    const activity = parseFloat(document.getElementById('activity').value);

    if(!age || !weight || !height || !genderElement){
        alert("請填寫完所有完整資訊");
        return;
    }
    
    const gender = genderElement.value;

    const bmi = weight / ((height / 100) ** 2);
    const bmiFixed = bmi.toFixed(1);
    document.getElementById('bmi-val').innerText = bmiFixed;

    let bmr;
    if(gender === 'male'){
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    const bmrRounded = Math.round(bmr);
    document.getElementById('bmr-val').innerText = bmrRounded;

    const tdee = bmr * activity;
    const tdeeRounded = Math.round(tdee);
    document.getElementById('tdee-val').innerText = tdeeRounded;

    let status = "";
    if(bmi < 18.5) status = "過輕";
    else if(bmi < 24) status = "健康";
    else if(bmi < 27) status = "過重";
    else status = "肥胖";
    document.getElementById('bmi-status').innerText = "您的狀態屬於: " + status;

    document.getElementById('results').style.display = 'block';

    currentData = {
        time: new Date().toLocaleString(),
        shortTime: new Date().toLocaleDateString(), // 圖表用的簡短日期
        age: age,
        weight: weight,
        height: height,
        bmi: bmiFixed,
        bmr: bmrRounded,
        tdee: tdeeRounded,
        status: status
    };
}

function saveRecord() {
    if (!currentData) {
        alert("請先進行計算後再儲存");
        return;
    }
    records.unshift(currentData);
    syncStorage();
    renderRecords();
    alert("紀錄已儲存！");
}

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
                <div style="color: #888; font-size: 0.85rem; margin-bottom: 5px;">${item.time}</div>
                <div style="margin-bottom: 5px;">
                    <strong>${item.status}</strong> | BMI: ${item.bmi}
                </div>
                <div style="font-size: 0.9rem; color: #666;">
                    ${item.height}cm / ${item.weight}kg / ${item.age}歲
                </div>
            </div>
            <button class="delete-btn" onclick="deleteRecord(${index})">刪除</button>
        `;
        listContainer.appendChild(itemDiv);
    });
}

function deleteRecord(index) {
    if (confirm("確定要刪除這筆紀錄嗎？")) {
        records.splice(index, 1);
        syncStorage();
        renderRecords();
        // 如果目前在圖表頁，刪除後也要更新圖表
        if (document.getElementById('page-chart').classList.contains('active')) {
            updateChart();
        }
    }
}

// --- 圖表功能：使用 Chart.js ---
function updateChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx) return;

    // 如果沒有紀錄，就不要畫圖
    if (records.length === 0) {
        if (myChart) myChart.destroy();
        return;
    }

    // 準備資料 (圖表通常是從左到右，所以要把 records 反轉回來)
    const chartData = [...records].reverse();
    const labels = chartData.map(d => d.shortTime);
    const weights = chartData.map(d => d.weight);

    // 如果圖表已經存在，先銷毀它，避免重新渲染時出錯
    if (myChart) {
        myChart.destroy();
    }

    // 建立新圖表
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '體重變化 (kg)',
                data: weights,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                borderWidth: 3,
                tension: 0.3, // 讓線條變圓滑
                fill: true,
                pointBackgroundColor: '#4a90e2',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false, // 體重不用從 0 開始，視覺上波動較明顯
                    title: { display: true, text: '體重 (kg)' }
                }
            }
        }
    });
}