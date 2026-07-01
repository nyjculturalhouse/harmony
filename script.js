const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec";
let selectedSeats = [];
let reservedSeats = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
    setupBookingForm();
    createCheckModalMarkup();
});

function fetchReservedSeats() {
    fetch(GAS_URL)
        .then(response => response.json())
        .then(data => { reservedSeats = Array.isArray(data) ? data : []; loadSeatLayout(); })
        .catch(() => { reservedSeats = []; loadSeatLayout(); });
}

function loadSeatLayout() {
    fetch("seats.json")
        .then(response => response.json())
        .then(data => renderFloor("floor1", data.floor1));
}

function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    rowsData.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";
        rowDiv.innerHTML = `<div class="row-label">${row.row}</div>`;
        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        // Offset 처리 (들여쓰기)
        for (let i = 0; i < (row.offset || 0); i++) {
            seatsRow.appendChild(document.createElement("div")).className = "seat-cell";
        }

        // 전체 좌석 목록 병합 및 정렬
        const allSeats = [...(row.seats || []), ...(row.disabled || []), ...(row.obstructed || [])].sort((a, b) => a - b);
        
        // [핵심 수정] 좌석을 3등분하여 배치 (중앙 통로 확보)
        // 전체 좌석 개수를 3으로 나누어 좌/중/우 섹션 배치
        const third = Math.floor(allSeats.length / 3);
        
        allSeats.forEach((seatNum, index) => {
            const seatId = `${row.row}-${seatNum}`;
            const cell = document.createElement("div");
            cell.className = "seat-cell";

            // (버튼 생성 로직 생략 - 기존과 동일)
            const btn = document.createElement("button");
            // ... (버튼 속성 설정)
            cell.appendChild(btn);
            seatsRow.appendChild(cell);

            // [수정] 좌석 그룹(섹션)이 끝날 때마다 통로 div 삽입
            // 좌석이 30개라면 10개마다, 28개라면 9개-10개-9개 식으로 구분
            if ((index + 1 === 9 || index + 1 === 19) && row.row.includes("1열") || 
                (index + 1 === 10 || index + 1 === 20) && !row.row.includes("1열")) {
                const aisle = document.createElement("div");
                aisle.className = "aisle-space";
                seatsRow.appendChild(aisle);
            }
        });
        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

function handleSeatClick(btn, seatId) {
    if (btn.classList.contains("selected")) {
        btn.classList.remove("selected");
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    } else {
        if (selectedSeats.length >= 5) return alert("최대 5개까지 선택 가능합니다.");
        btn.classList.add("selected");
        selectedSeats.push(seatId);
    }
    updateSummary();
}

function updateSummary() {
    document.getElementById("selectedSeatsDisplay").innerText = selectedSeats.length ? selectedSeats.join(", ") : "없음";
    document.getElementById("ticketCount").innerText = selectedSeats.length;
}

// ... (나머지 createCheckModalMarkup, setupBookingForm 등 기존 로직 유지)
