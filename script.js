const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec";
let selectedSeats = [];
let reservedSeats = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
    initActionButtons(); 
});

function fetchReservedSeats() {
    fetch(GAS_URL)
        .then(res => res.json())
        .then(data => { reservedSeats = data || []; loadSeatLayout(); })
        .catch(() => { reservedSeats = []; loadSeatLayout(); });
}

function loadSeatLayout() {
    fetch("seats.json?v=2")  
        .then(res => res.json())
        .then(data => renderFloor("floor1", data.floor1));
}

function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    const reserved = reservedSeats.map(s => String(s).replace(/[^0-9]/g, ""));

    rowsData.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";
        rowDiv.innerHTML = `<div class="row-label">${row.row}</div>`;
        
        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        // 2번 디자인처럼 완벽한 30칸 격자 레이아웃을 생성합니다.
        for (let seatNum = 1; seatNum <= 30; seatNum++) {
            let actualSeatNum = null;

            // 💡 [도면 매핑 복구 및 교정] 격자(seatNum) 위치와 JSON의 실제 좌석 번호를 1:1 매칭
            if (row.row === "1열" || row.row === "2열" || row.row === "3열") {
                if (seatNum >= 2 && seatNum <= 28) {
                    actualSeatNum = seatNum;
                }
            } 
            else if (row.row === "13열") {
                if (seatNum >= 4 && seatNum <= 10) {
                    actualSeatNum = seatNum; 
                }
                else if (seatNum >= 11 && seatNum <= 20) {
                    actualSeatNum = seatNum; 
                }
                else if (seatNum >= 21 && seatNum <= 27) {
                    actualSeatNum = seatNum; 
                }
            } 
            else {
                // 4~12열: 30칸 격자 구조 그대로 일치
                actualSeatNum = seatNum;
            }

            const isExistInJson = actualSeatNum && (
                row.seats?.includes(actualSeatNum) ||
                row.disabled?.includes(actualSeatNum) ||
                row.obstructed?.includes(actualSeatNum)
            );

            const cell = document.createElement("div");
            cell.className = "seat-cell";

            if (seatNum === 10 || seatNum === 20) {
                cell.style.marginRight = "24px";
            }

            if (isExistInJson) {
                const seatId = `${row.row}-${actualSeatNum}`;
                
                let isObstructedSeat = false;
                if (row.row === "1열") {
                    isObstructedSeat = [1, 2, 3, 4, 14, 15, 24, 25, 26, 27].includes(actualSeatNum);
                } else if (row.row === "2열" || row.row === "3열") {
                    isObstructedSeat = [1, 2, 27, 28].includes(actualSeatNum);
                } 

                const isReserved = reserved.includes(seatId.replace(/[^0-9]/g, "")) || isObstructedSeat;
                const isDisabled = row.disabled?.includes(actualSeatNum);

                const btn = document.createElement("button");
                
                btn.className = `seat ${isReserved ? "reserved" : (isDisabled ? "wheelchair" : "available")}`;
                btn.innerText = isDisabled ? "♿" : actualSeatNum;
                btn.disabled = isReserved; 
                
                if (!isReserved) {
                    btn.onclick = () => handleSeatClick(btn, seatId);
                }

                cell.appendChild(btn);
            } else {
                cell.classList.add("empty");
            }

            seatsRow.appendChild(cell);
        }

        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

function handleSeatClick(btn, seatId) {
    if (btn.classList.toggle("selected")) {
        if (selectedSeats.length >= 5) { 
            btn.classList.remove("selected"); 
            return alert("최대 5개까지 선택 가능합니다."); 
        }
        selectedSeats.push(seatId);
    } else {
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    }
    document.getElementById("selectedSeatsDisplay").innerText = selectedSeats.length ? selectedSeats.join(", ") : "없음";
    document.getElementById("ticketCount").innerText = selectedSeats.length;
}

function initActionButtons() {
    const checkBtn = document.getElementById("checkBtn");
    const submitBtn = document.getElementById("submitBtn");

    if (checkBtn) {
        checkBtn.onclick = () => {
            if (selectedSeats.length === 0) {
                return alert("선택된 좌석이 없습니다.");
            }
            alert(`현재 선택하신 좌석은 [ ${selectedSeats.join(", ")} ] 입니다.`);
        };
    }

    if (submitBtn) {
        submitBtn.onclick = () => {
            const nameInput = document.getElementById("name");
            const phoneInput = document.getElementById("phone");

            const name = nameInput ? nameInput.value.trim() : "";
            const phone = phoneInput ? phoneInput.value.trim() : "";

            if (!name || !phone) {
                return alert("예매자 성명과 연락처를 모두 입력해 주세요.");
            }
            if (selectedSeats.length === 0) {
                return alert("좌석을 최소 1개 이상 선택해 주세요.");
            }

            if (confirm(`[${name}]님, 선택하신 좌석 [ ${selectedSeats.join(", ")} ] 총 ${selectedSeats.length}개로 예약을 확정하시겠습니까?`)) {
                
                const now = new Date();
                const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                
                const bookingData = {
                    timestamp: timestamp,                                        
                    name: name,                                                  
                    phone: phone,                                                
                    count: selectedSeats.length,                                 
                    seats: selectedSeats.join(", ")                              
                };

                submitBtn.disabled = true;
                submitBtn.innerText = "전송 중...";

                fetch(GAS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(bookingData)
                })
                .then(res => res.json())
                .then(result => {
                    if (result.status === "success") {
                        alert("🎉 예약이 완벽하게 확정되었습니다!");
                        location.reload(); 
                    } else {
                        alert("예약 처리 중 오류가 발생했습니다: " + (result.message || "알 수 없는 에러"));
                        submitBtn.disabled = false;
                        submitBtn.innerText = "예약 확정하기";
                    }
                })
                .catch(err => {
                    console.error("Error:", err);
                    alert("서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
                    submitBtn.disabled = false;
                    submitBtn.innerText = "예약 확정하기";
                });
            }
        };
    }
}
