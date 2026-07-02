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

        // 도면의 격자는 최대 30번까지 존재하므로, 1번부터 30번까지 순서대로 칸을 만듭니다.
        for (let seatNum = 1; seatNum <= 30; seatNum++) {
            
            // JSON 데이터에 해당 좌석 번호 정의가 있는 경우에만 버튼을 생성
            if (seatNumbersInJson.has(seatNum)) {
                const seatId = `${row.row}-${seatNum}`;
                const cell = document.createElement("div");
                cell.className = "seat-cell";

                const isReserved = reserved.includes(seatId.replace(/[^0-9]/g, ""));
                const isDisabled = row.disabled?.includes(seatNum);
                const isObstructed = row.obstructed?.includes(seatNum);

                const btn = document.createElement("button");
                
                // 클래스 지정 (시야제한석도 도면처럼 빨간색/선택불가 테마인 reserved 적용)
                btn.className = `seat ${isReserved || isObstructed ? "reserved" : (isDisabled ? "wheelchair" : "available")}`;
                btn.innerText = isDisabled ? "♿" : seatNum;
                btn.disabled = isReserved || isObstructed;
                
                if (!isReserved && !isObstructed) {
                    btn.onclick = () => handleSeatClick(btn, seatId);
                }

                // [통로 마진 정밀 설정] 
                // 9번 칸(좌측 통로 경계), 20번 칸(우측 통로 경계)에 마진을 주어 전 열을 정렬합니다.
                if (seatNum === 9 || seatNum === 20) {
                    cell.style.marginRight = "24px";
                }

                cell.appendChild(btn);
                seatsRow.appendChild(cell);
            } else {
                // 데이터에 없는 좌석 번호 칸은 도면처럼 투명한 빈 공간(통로 또는 공백) 처리
                const emptyCell = document.createElement("div");
                emptyCell.className = "seat-cell";
                
                // 빈 공간 격자일지라도 통로 구역(9번, 20번 위치)을 지나갈 때는 마진을 동일하게 유지해야 대칭이 맞습니다.
                if (seatNum === 9 || seatNum === 20) {
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
