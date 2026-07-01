const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec"; 

let selectedSeats = [];
let reservedSeats = []; 

// 초기 구동
document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
    setupBookingForm();
});

// 1. 구글 시트에서 예약 완료된 좌석 가져오기
function fetchReservedSeats() {
    fetch(GAS_URL)
        .then(response => response.json())
        .then(data => {
            reservedSeats = data;
            loadSeatLayout(); // 예약 내역 받은 후 배치도 로드
        })
        .catch(err => {
            console.error("좌석 정보를 불러오지 못했습니다.", err);
            loadSeatLayout(); // 에러 시에도 기본 배치도는 로드
        });
}

// 2. seats.json 읽어서 화면에 배치도 렌더링
function loadSeatLayout() {
    fetch("seats.json")
        .then(response => response.json())
        .then(data => {
            // 1층만 렌더링하도록 변경
            renderFloor("floor1", data.floor1);
        });
}

// [수정] 배치도 렌더링 코어 함수 (json 데이터 기반 유연한 렌더링 및 에러 방지)
function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ""; // 초기화
    
    rowsData.forEach(rowData => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";

        const label = document.createElement("div");
        label.className = "row-label";
        label.innerText = rowData.row;
        rowDiv.appendChild(label);

        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        // JSON 데이터에 명시된 seats 배열을 기반으로만 안전하게 순회합니다.
        rowData.seats.forEach(seatNum => {
            const seatId = `1층-${rowData.row}-${seatNum}`; // 1층 전용 네이밍 고정
            
            // 시야 방해석 체크
            if (rowData.obstructed && rowData.obstructed.includes(seatNum)) {
                createSpecialButton(seatsRow, seatNum, "reserved", true);
            }
            // 장애인석(휠체어) 체크
            else if (rowData.disabled && rowData.disabled.includes(seatNum)) {
                const isReserved = reservedSeats.includes(seatId);
                createSeatButton(seatsRow, seatId, "♿", isReserved, "wheelchair");
            }
            // 일반 예매 가능 좌석
            else {
                const isReserved = reservedSeats.includes(seatId);
                createSeatButton(seatsRow, seatId, seatNum, isReserved, "available");
            }
        });

        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

// 시야방해석 전용 생성기
function createSpecialButton(targetRow, label, className, isDisabled) {
    const btn = document.createElement("button");
    btn.className = `seat ${className}`;
    btn.innerText = label;
    btn.disabled = isDisabled;
    targetRow.appendChild(btn);
}

// 좌석 선택/예약 제어 버튼 생성기
function createSeatButton(targetRow, seatId, label, isReserved, baseClass) {
    const btn = document.createElement("button");
    btn.id = seatId;
    
    if (isReserved) {
        btn.className = "seat reserved";
        btn.disabled = true;
    } else {
        btn.className = `seat ${baseClass}`;
    }
    
    btn.innerText = label;
    
    if (!isReserved) {
        btn.addEventListener("click", () => handleSeatClick(btn, seatId));
    }
    
    targetRow.appendChild(btn);
}

// 좌석 클릭 이벤트
function handleSeatClick(btn, seatId) {
    if (btn.classList.contains("selected")) {
        btn.classList.remove("selected");
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    } else {
        // 이미 5개가 선택된 상태에서 추가 선택을 시도할 때 차단
        if (selectedSeats.length >= 5) {
            alert("좌석은 최대 5개까지 선택할 수 있습니다.");
            return;
        }
        btn.classList.add("selected");
        selectedSeats.push(seatId);
    }
    updateSummary();
}

// 요약창 정보 실시간 업데이트
// [수정] 요약창 정보 및 예매 수량(최대 5개 기준) 실시간 업데이트
function updateSummary() {
    const display = document.getElementById("selectedSeatsDisplay");
    const count = document.getElementById("ticketCount");
    
    if (selectedSeats.length === 0) {
        display.innerText = "없음";
    } else {
        display.innerText = selectedSeats.map(s => s.replace("1층-", "")).join(", ");
    }
    // 현재 선택한 개수를 화면의 수량 데이터 엘리먼트에 바인딩
    count.innerText = selectedSeats.length;
}

// [수정] 폼 세팅, 연락처 자동 하이픈 기능 및 예매 데이터 구글 전송
function setupBookingForm() {
    const submitBtn = document.getElementById("submitBtn");
    const phoneInput = document.getElementById("phone");

    // 연락처 입력 시 자동 하이픈 추가 이벤트 listen
    phoneInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/[^0-9]/g, ""); // 숫자만 남기기
        if (value.length > 11) value = value.substring(0, 11); // 최대 11자리 제한

        if (value.length > 7) {
            e.target.value = `${value.substring(0, 3)}-${value.substring(3, 7)}-${value.substring(7)}`;
        } else if (value.length > 3) {
            e.target.value = `${value.substring(0, 3)}-${value.substring(3)}`;
        } else {
            e.target.value = value;
        }
    });
    
    submitBtn.addEventListener("click", () => {
        const name = document.getElementById("name").value.trim();
        let phone = phoneInput.value.trim();
        
        if (!name || !phone) {
            alert("예매자 이름과 연락처를 입력해 주세요.");
            return;
        }

        // 숫자가 도중에 누락되어 하이픈 포맷이 안 맞거나 길이가 짧은 경우 강제 보정 후 시트 전송 준비
        const pureNumbers = phone.replace(/[^0-9]/g, "");
        if (pureNumbers.length === 11) {
            phone = `${pureNumbers.substring(0, 3)}-${pureNumbers.substring(3, 7)}-${pureNumbers.substring(7)}`;
        } else if (pureNumbers.length === 10) {
            phone = `${pureNumbers.substring(0, 3)}-${pureNumbers.substring(3, 6)}-${pureNumbers.substring(6)}`;
        }
        
        if (selectedSeats.length === 0) {
            alert("좌석을 하나 이상 선택해 주세요.");
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerText = "예약 처리 중...";
        
        const payload = {
            name: name,
            phone: phone, // 하이픈이 완벽히 포함된 포맷으로 시트에 저장됩니다.
            seats: selectedSeats.join(",")
        };
        
        fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(result => {
            if (result.result === "success") {
                alert("예약이 성공적으로 완료되었습니다!");
                location.reload();
            } else {
                alert("예약에 실패했습니다: " + result.message);
                submitBtn.disabled = false;
                submitBtn.innerText = "예약 확정하기";
            }
        })
        .catch(err => {
            console.error(err);
            alert("네트워크 통신 오류가 발생했습니다.");
            submitBtn.disabled = false;
            submitBtn.innerText = "예약 확정하기";
        });
    });
}
