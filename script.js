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
            // 1층만 렌더링하도록 설정
            renderFloor("floor1", data.floor1);
        });
}

// 3. 배치도 렌더링 코어 함수 (다산아트홀 실제 1~30번 도면 매핑 구조)
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

        // 다산아트홀 1층 구조 기준 가로 최대 30칸 생성하며 맵 분석
        const maxSeatNum = 30; 
        for (let i = 1; i <= maxSeatNum; i++) {
            const seatId = `1층-${rowData.row}-${i}`; // 1층 전용 네이밍 고정
            
            // ① 시야 방해석(검은박스 비활성화) 체크
            if (rowData.obstructed && rowData.obstructed.includes(i)) {
                createSpecialButton(seatsRow, i, "reserved", true);
            }
            // ② 장애인석(휠체어석) 체크
            else if (rowData.disabled && rowData.disabled.includes(i)) {
                const isReserved = reservedSeats.includes(seatId);
                createSeatButton(seatsRow, seatId, "♿", isReserved, "wheelchair");
            }
            // ③ 일반 예매 가능 좌석 체크
            else if (rowData.seats && rowData.seats.includes(i)) {
                const isReserved = reservedSeats.includes(seatId);
                createSeatButton(seatsRow, seatId, i, isReserved, "available");
            }
            // ④ 통로 및 공백 공간 처리 (가로 비율 균등 유지)
            else {
                const emptySpace = document.createElement("div");
                emptySpace.style.width = "25px";
                emptySpace.style.height = "25px";
                seatsRow.appendChild(emptySpace);
            }
        }

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

// 좌석 클릭 이벤트 (최대 5개 선택 제한 포함)
function handleSeatClick(btn, seatId) {
    if (btn.classList.contains("selected")) {
        btn.classList.remove("selected");
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    } else {
        if (selectedSeats.length >= 5) {
            alert("좌석은 최대 5개까지 선택할 수 있습니다.");
            return;
        }
        btn.classList.add("selected");
        selectedSeats.push(seatId);
    }
    updateSummary();
}

// 요약창 정보 및 예매 수량 실시간 업데이트
function updateSummary() {
    const display = document.getElementById("selectedSeatsDisplay");
    const count = document.getElementById("ticketCount");
    
    if (selectedSeats.length === 0) {
        display.innerText = "없음";
    } else {
        display.innerText = selectedSeats.map(s => s.replace("1층-", "")).join(", ");
    }
    count.innerText = selectedSeats.length;
}

// 폼 세팅, 연락처 자동 하이픈 기능 및 예매 데이터 구글 전송
function setupBookingForm() {
    const submitBtn = document.getElementById("submitBtn");
    const phoneInput = document.getElementById("phone");

    // 연락처 입력 시 숫자만 필터링 후 자동 하이픈 대입
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

        // 하이픈 포맷 유효성 강제 재확인 및 보정 후 전송 데이터 준비
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
            phone: phone, // 구글 시트에 010-XXXX-XXXX 형태로 예쁘게 보관됩니다.
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
