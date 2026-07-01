const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec"; 

let selectedSeats = [];
let reservedSeats = []; 

// 초기 구동
document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
    setupBookingForm();
    createCheckModalMarkup(); 
});

// 1. 구글 시트에서 예약 완료된 좌석 가져오기
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

// 3. 배치도 렌더링 코어 함수
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

        const maxSeatNum = 30; 
        for (let i = 1; i <= maxSeatNum; i++) {
            const seatId = `${rowData.row}-${i}`; 
            const currentSeatCleaned = seatId.replace(/[-_\s]/g, "").trim();
            
            const seatCell = document.createElement("div");
            seatCell.className = "seat-cell";

            if (rowData.obstructed && rowData.obstructed.includes(i)) {
                createSpecialButton(seatCell, i, "reserved", true);
            }
            else if (rowData.disabled && rowData.disabled.includes(i)) {
                const isReserved = cleanedReservedSeats.includes(currentSeatCleaned);
                createSeatButton(seatCell, seatId, "♿", isReserved, "wheelchair");
            }
            else if (rowData.seats && rowData.seats.includes(i)) {
                const isReserved = cleanedReservedSeats.includes(currentSeatCleaned);
                createSeatButton(seatCell, seatId, i, isReserved, "available");
            }
            else {
                // 빈 공간
            }

            seatsRow.appendChild(seatCell);

            if (i === 9 || i === 19) {
                const aisleSpace = document.createElement("div");
                aisleSpace.className = "aisle-space";
                seatsRow.appendChild(aisleSpace);
            }
        }

        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

function createSpecialButton(targetCell, label, className, isDisabled) {
    const btn = document.createElement("button");
    btn.className = `seat ${className}`;
    btn.innerText = label;
    btn.disabled = isDisabled;
    btn.style.width = "100%";  
    btn.style.height = "100%";
    targetCell.appendChild(btn);
}

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
    btn.style.width = "100%";  
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

// 동적 모달 마크업 생성 기능 함수 (정렬 레이아웃 래퍼 추가)
function createCheckModalMarkup() {
    const overlay = document.createElement("div");
    overlay.id = "checkModal";
    overlay.className = "modal-overlay";
    
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title" id="modalUserTitle">내 예약 좌석 내역 조회 결과</div>
                <button class="modal-close" id="closeModalBtn">&times;</button>
            </div>
            <div class="modal-booking-zone">
                <div class="stage">STAGE</div>
                <div id="modalFloorContainer" class="seating-container"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("closeModalBtn").addEventListener("click", () => {
        overlay.classList.remove("active");
    });
    overlay.addEventListener("click", (e) => {
        if(e.target === overlay) overlay.classList.remove("active");
    });
}

// [수정] 본인이 예매한 좌석 확인 모달 전용 정밀 렌더러
function renderModalFloor(rowsData, mySeatsArray) {
    const container = document.getElementById("modalFloorContainer");
    if (!container) return;
    container.innerHTML = "";

    const cleanedMySeats = mySeatsArray.map(seat => String(seat).replace(/[-_\s]/g, "").trim());
    const cleanedReservedSeats = reservedSeats.map(seat => String(seat).replace(/[-_\s]/g, "").trim());

    rowsData.forEach(rowData => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";

        const label = document.createElement("div");
        label.className = "row-label";
        label.innerText = rowData.row;
        rowDiv.appendChild(label);

        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        for (let i = 1; i <= 30; i++) {
            const seatId = `${rowData.row}-${i}`;
            const currentSeatCleaned = seatId.replace(/[-_\s]/g, "").trim();

            const seatCell = document.createElement("div");
            seatCell.className = "seat-cell";

            const btn = document.createElement("button");
            btn.style.width = "100%"; btn.style.height = "100%";
            btn.disabled = true; 

            if (rowData.obstructed && rowData.obstructed.includes(i)) {
                btn.className = "seat reserved";
                btn.innerText = i;
                seatCell.appendChild(btn);
            }
            else if ((rowData.disabled && rowData.disabled.includes(i)) || (rowData.seats && rowData.seats.includes(i))) {
                btn.innerText = rowData.disabled && rowData.disabled.includes(i) ? "♿" : i;
                
                // [정밀 검사] 전체 예약 좌석 중 내 좌석 목록에 포함되는가 매칭
                if (cleanedMySeats.includes(currentSeatCleaned)) {
                    btn.className = "seat my-reserved"; // 노란색 활성화
                } else if (cleanedReservedSeats.includes(currentSeatCleaned)) {
                    btn.className = "seat reserved";
                } else {
                    btn.className = rowData.disabled && rowData.disabled.includes(i) ? "seat wheelchair" : "seat available";
                }
                seatCell.appendChild(btn);
            } else {
                // 공백
            }

            seatsRow.appendChild(seatCell);

            if (i === 9 || i === 19) {
                const aisleSpace = document.createElement("div");
                aisleSpace.className = "aisle-space";
                seatsRow.appendChild(aisleSpace);
            }
        }
        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

// 폼 세팅 및 전송
function setupBookingForm() {
    const submitBtn = document.getElementById("submitBtn");
    const checkBtn = document.getElementById("checkBtn"); 
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

    checkBtn.addEventListener("click", () => {
        const name = document.getElementById("name").value.trim();
        const phone = phoneInput.value.trim();

        if (!name || !phone) {
            alert("예약 내역을 조회하려면 이름과 연락처를 입력해 주세요.");
            return;
        }

        checkBtn.innerText = "조회 중...";
        checkBtn.disabled = true;

        const checkPayload = {
            action: "checkReservation", 
            name: name,
            phone: phone
        };

        fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify(checkPayload)
        })
        .then(res => res.json())
        .then(result => {
            fetch("seats.json")
                .then(res => res.json())
                .then(seatData => {
                    if (result.result === "success" && result.seats) {
                        const userSeats = result.seats.split(",").map(s => s.trim());
                        document.getElementById("modalUserTitle").innerText = `${name}님의 예약 확인 결과 (노란색 표시)`;
                        renderModalFloor(seatData.floor1, userSeats);
                        document.getElementById("checkModal").classList.add("active");
                    } 
                    else {
                        alert("입력하신 정보로 등록된 예약 내역이 없습니다.");
                    }
                    
                    checkBtn.innerText = "예약 확인하기";
                    checkBtn.disabled = false;
                });
        })
        .catch(err => {
            console.error(err);
            alert("조회 중 네트워크 오류가 발생했습니다.");
            checkBtn.innerText = "예약 확인하기";
            checkBtn.disabled = false;
        });
    });
    
    // 예약 확정하기
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
