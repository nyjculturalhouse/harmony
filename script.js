const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec";
let selectedSeats = [];
let reservedSeats = [];

// 30칸 전역 격자 레이아웃을 사용하므로, 구형 개별 offset 설정인 rowLayoutConfigs는 이제 사용하지 않습니다.

document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
});

function fetchReservedSeats() {
    fetch(GAS_URL)
        .then(res => res.json())
        .then(data => { reservedSeats = data || []; loadSeatLayout(); })
        .catch(() => { reservedSeats = []; loadSeatLayout(); });
}

// 🛠️ 기존 fetch("seats.json") 뒤에 ?v=1 을 붙여서 캐시를 강제로 파괴합니다.
function loadSeatLayout() {
    fetch("seats.json?v=1")  // <-- 여기를 이렇게 변경!
        .then(res => res.json())
        .then(data => renderFloor("floor1", data.floor1));
}

// 🎯 최종 수정된 30칸 고정 격자 렌더링 함수 (중복 제거 완료)
function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    // GAS에서 받아온 예약 좌석 문자열 정형화
    const reserved = reservedSeats.map(s => String(s).replace(/[^0-9]/g, ""));

    rowsData.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";
        rowDiv.innerHTML = `<div class="row-label">${row.row}</div>`;
        
        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        // 해당 행에 존재하는 모든 좌석 종류(일반, 장애인, 시야제한)의 번호를 총망라하여 수집
        const seatNumbersInJson = new Set([
            ...(row.seats || []), 
            ...(row.disabled || []), 
            ...(row.obstructed || [])
        ]);

        // 💡 [열별 격자 시작점 설정]
        // 1열, 2열, 3열은 2번째 칸부터 1번이 시작하므로 offset은 1
        // 13열은 4번째 칸부터 1번이 시작하므로 offset은 3
        // 그 외 4~12열은 1번째 칸부터 시작하므로 offset은 0
        let gridOffset = 0;
        if (row.row === "1열" || row.row === "2열" || row.row === "3열") {
            gridOffset = 1;
        } else if (row.row === "13열") {
            gridOffset = 3;
        }

        // 도면의 격자는 최대 30번까지 존재하므로, 1번부터 30번까지 순서대로 칸을 만듭니다.
        for (let seatNum = 1; seatNum <= 30; seatNum++) {
            
            // 💡 현재 격자 번호(seatNum)에서 해당 열의 오프셋을 빼서 실제 JSON 내부의 좌석 번호를 구합니다.
            const actualSeatNum = seatNum - gridOffset;

            // JSON 데이터에 계산된 실제 좌석 번호 정의가 있는 경우에만 버튼을 생성
            if (actualSeatNum > 0 && seatNumbersInJson.has(actualSeatNum)) {
                const seatId = `${row.row}-${actualSeatNum}`;
                const cell = document.createElement("div");
                cell.className = "seat-cell";

                const isReserved = reserved.includes(seatId.replace(/[^0-9]/g, ""));
                const isDisabled = row.disabled?.includes(actualSeatNum);
                const isObstructed = row.obstructed?.includes(actualSeatNum);

                const btn = document.createElement("button");
                
                // 클래스 지정 (시야제한석도 도면처럼 빨간색/선택불가 테마인 reserved 적용)
                btn.className = `seat ${isReserved || isObstructed ? "reserved" : (isDisabled ? "wheelchair" : "available")}`;
                btn.innerText = isDisabled ? "♿" : actualSeatNum;
                btn.disabled = isReserved || isObstructed;
                
                if (!isReserved && !isObstructed) {
                    btn.onclick = () => handleSeatClick(btn, seatId);
                }

                // 🛠️ [통로 마진 정밀 설정 수정] 
                // 1~10칸 / 11~20칸 / 21~30칸 구역 분할에 맞춰 
                // 10번 칸과 20번 칸의 오른쪽에 정확히 통로 마진을 부여합니다.
                if (seatNum === 10 || seatNum === 20) {
                    cell.style.marginRight = "24px";
                }

                cell.appendChild(btn);
                seatsRow.appendChild(cell);
            } else {
                // 데이터에 없는 좌석 번호 칸은 도면처럼 투명한 빈 공간(통로 또는 공백) 처리
                const emptyCell = document.createElement("div");
                emptyCell.className = "seat-cell";
                
                // 🛠️ 빈 공간 격자일지라도 10번, 20번 위치를 지나갈 때는 동일하게 마진을 유지합니다.
                if (seatNum === 10 || seatNum === 20) {
                    emptyCell.style.marginRight = "24px";
                }
                
                seatsRow.appendChild(emptyCell);
            }
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
