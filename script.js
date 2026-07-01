const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec"; 

let selectedSeats = [];
let reservedSeats = []; 

// 초기 구동
document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
    setupBookingForm();
});

// 1. 구글 시트에서 예약 완료된 좌석 가져오기 (데이터 타입 예외 처리 추가)
function fetchReservedSeats() {
    fetch(GAS_URL)
        .then(response => response.json())
        .then(data => {
            reservedSeats = Array.isArray(data) ? data : [];
            loadSeatLayout(); 
        })
        .catch(err => {
            console.error("좌석 정보를 불러오지 못했습니다.", err);
            reservedSeats = []; 
            loadSeatLayout(); 
        });
}

// 2. seats.json 읽어서 화면에 배치도 렌더링
function loadSeatLayout() {
    fetch("seats.json")
        .then(response => response.json())
        .then(data => {
            renderFloor("floor1", data.floor1);
        });
}

// 3. 배치도 렌더링 코어 함수 (1~30번 그리드 고정 및 통로 정렬 보완)
function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ""; 
    
    const safeReservedSeats = Array.isArray(reservedSeats) ? reservedSeats : [];
    const cleanedReservedSeats = safeReservedSeats.map(seat => 
        String(seat).replace(/[-_\s]/g, "").trim()
    );
    
    rowsData.forEach(rowData => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";

        const label = document.createElement("div");
        label.className = "row-label";
        label.innerText = rowData.row;
        rowDiv.appendChild(label);

        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        // 다산아트홀 1층 구조 기준 가로 최대 30칸을 엄격한 위치 인덱스로 순회
        const maxSeatNum = 30; 
        for (let i = 1; i <= maxSeatNum; i++) {
            const seatId = `${rowData.row}-${i}`; 
            const currentSeatCleaned = seatId.replace(/[-_\s]/g, "").trim();
            
            // [수정] 모든 칸(좌석이든 빈 공간이든)이 동일한 너비를 가지도록 박스 틀을 생성하여 정렬을 맞춥니다.
            const seatCell = document.createElement("div");
            seatCell.style.width = "29px";  // style.css의 .seat 너비와 동일하게 일치
            seatCell.style.height = "29px"; // style.css의 .seat 높이와 동일하게 일치
            seatCell.style.display = "flex";
            seatCell.style.alignItems = "center";
            seatCell.style.justifyContent = "center";

            // ① 시야 방해석(검은박스 비활성화) 체크
            if (rowData.obstructed && rowData.obstructed.includes(i)) {
                createSpecialButton(seatCell, i, "reserved", true);
            }
            // ② 장애인석(휠체어석) 체크
            else if (rowData.disabled && rowData.disabled.includes(i)) {
                const isReserved = cleanedReservedSeats.includes(currentSeatCleaned);
                createSeatButton(seatCell, seatId, "♿", isReserved, "wheelchair");
            }
            // ③ 일반 예매 가능 좌석 체크
            else if (rowData.seats && rowData.seats.includes(i)) {
                const isReserved = cleanedReservedSeats.includes(currentSeatCleaned);
                createSeatButton(seatCell, seatId, i, isReserved, "available");
            }
            // ④ 빈 통로 공간 (아무것도 없는 공백 칸도 동일한 29px 크기로 채워서 자리를 확보)
            else {
                // 공간을 채워두기 위해 비워둡니다 (seatCell 자체 너비가 정렬을 유지함)
            }

            seatsRow.appendChild(seatCell);

            // [수정] 실제 정렬 축을 망가뜨리지 않도록, 9번과 19번 칸 '자체'가 끝난 직후에 별도의 독립된 통로 마진을 삽입합니다.
            if (i === 9 || i === 19) {
                const aisleSpace = document.createElement("div");
                aisleSpace.style.width = "24px"; // 통로 길의 너비
                aisleSpace.style.height = "29px";
                seatsRow.appendChild(aisleSpace);
            }
        }

        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

// 시야방해석 전용 생성기 (targetRow가 아닌 부모 cell에 삽입하도록 수정)
function createSpecialButton(targetCell, label, className, isDisabled) {
    const btn = document.createElement("button");
    btn.className = `seat ${className}`;
    btn.innerText = label;
    btn.disabled = isDisabled;
    btn.style.width = "100%";  // 셀 크기에 꽉 차게 설정
    btn.style.height = "100%";
    targetCell.appendChild(btn);
}

// 좌석 선택/예약 제어 버튼 생성기 (targetRow가 아닌 부모 cell에 삽입하도록 수정)
function createSeatButton(targetCell, seatId, label, isReserved, baseClass) {
    const btn = document.createElement("button");
    btn.id = seatId;
    
    if (isReserved) {
        btn.className = "seat reserved";
        btn.disabled = true;
    } else {
        btn.className = `seat ${baseClass}`;
    }
    
    btn.innerText = label;
    btn.style.width = "100%";  // 셀 크기에 꽉 차게 설정
    btn.style.height = "100%";
    
    if (!isReserved) {
        btn.addEventListener("click", () => handleSeatClick(btn, seatId));
    }
    
    targetCell.appendChild(btn);
}

// 좌석 클릭 이벤트
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

// 요약창 정보 업데이트
function updateSummary() {
    const display = document.getElementById("selectedSeatsDisplay");
    const count = document.getElementById("ticketCount");
    
    if (selectedSeats.length === 0) {
        display.innerText = "없음";
    } else {
        display.innerText = selectedSeats.join(", ");
    }
    count.innerText = selectedSeats.length;
}

// 폼 세팅 및 전송
function setupBookingForm() {
    const submitBtn = document.getElementById("submitBtn");
    const phoneInput = document.getElementById("phone");

    phoneInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/[^0-9]/g, ""); 
        if (value.length > 11) value = value.substring(0, 11); 

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
            phone: phone, 
            quantity: selectedSeats.length, 
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
