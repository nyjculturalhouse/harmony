const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec"; 
let selectedSeats = [];
let reservedSeats = []; // 구글 시트에서 받아올 이미 예약된 좌석 목록

document.addEventListener("DOMContentLoaded", async () => {
    // 1. 구글 시트로부터 현재 예약 완료된 좌석 리스트 조회
    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        reservedSeats = data.reservedSeats || [];
    } catch (error) {
        console.error("예약 데이터를 불러오는데 실패했습니다.", error);
    }

    // 2. seats.json 기반으로 배치도 그리기
    fetch("seats.json")
        .then(res => res.json())
        .then(data => {
            renderFloor("floor1", data.floor1);
            renderFloor("floor2", data.floor2);
        });

    // 3. 예약 확정 버튼 이벤트 연결
    document.getElementById("submitBtn").addEventListener("click", submitReservation);
});

// 배치도 렌더링 함수
function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    
    rowsData.forEach(rowData => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";

        const label = document.createElement("div");
        label.className = "row-label";
        label.innerText = rowData.row;
        rowDiv.appendChild(label);

        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        // 일반석 배치
        rowData.seats.forEach(seatNum => {
            const seatId = `${containerId === 'floor1' ? '1층' : '2층'}-${rowData.row}-${seatNum}`;
            createSeatButton(seatsRow, seatId, seatNum, false);
        });

        // 장애인석 등 특별석 배치
        if (rowData.special) {
            rowData.special.forEach(sp => {
                const seatId = `${containerId === 'floor1' ? '1층' : '2층'}-${rowData.row}-${sp.id}`;
                createSeatButton(seatsRow, seatId, sp.label, true);
            });
        }

        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

// 개별 좌석 버튼 생성 및 이벤트 부여
function createSeatButton(targetRow, seatId, label, isWheelchair) {
    const btn = document.createElement("button");
    btn.className = "seat " + (isWheelchair ? "wheelchair" : "available");
    btn.innerText = label;
    btn.setAttribute("data-id", seatId);

    // 이미 예약된 좌석 처리
    if (reservedSeats.includes(seatId)) {
        btn.className = "seat reserved";
        btn.disabled = true;
    } else {
        // 클릭 이벤트 (5매 제한 핵심 로직)
        btn.addEventListener("click", () => handleSeatClick(btn, seatId));
    }

    targetRow.appendChild(btn);
}

// 좌석 클릭 시 토글 및 5매 제한 체크
function handleSeatClick(btn, seatId) {
    if (btn.classList.contains("selected")) {
        // 이미 선택한 좌석 해제
        btn.classList.remove("selected");
        selectedSeats = selectedSeats.filter(id => id !== seatId);
    } else {
        // 인당 최대 5매 제한 체크!!
        if (selectedSeats.length >= 5) {
            alert("좌석은 인당 최대 5매까지만 선택할 수 있습니다.");
            return;
        }
        // 좌석 선택 추가
        btn.classList.add("selected");
        selectedSeats.push(seatId);
    }

    // UI 업데이트
    document.getElementById("selectedSeatsDisplay").innerText = selectedSeats.length > 0 ? selectedSeats.join(", ") : "없음";
    document.getElementById("ticketCount").innerText = selectedSeats.length;
}

// 예약 데이터 전송
async function submitReservation() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !phone) {
        alert("이름과 연락처를 입력해주세요.");
        return;
    }
    if (selectedSeats.length === 0) {
        alert("최소 1개 이상의 좌석을 선택해주세요.");
        return;
    }

    const payload = {
        name: name,
        phone: phone,
        quantity: selectedSeats.length,
        seats: selectedSeats.join(",")
    };

    // 버튼 임시 비활성화 (중복 클릭 방지)
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.innerText = "예약 처리 중...";

    try {
        const response = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const resultData = await response.json();

        if (resultData.result === "success") {
            alert(`예약이 성공적으로 완료되었습니다! (${selectedSeats.length}매)`);
            location.reload(); // 성공 시 새로고침하여 좌석 현황 최신화
        } else {
            alert("예약 중 오류가 발생했습니다: " + resultData.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "예약 확정하기";
        }
    } catch (err) {
        alert("서버 통신 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.innerText = "예약 확정하기";
    }
}
