const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec";

let selectedSeats = [];

let reservedSeats = [];



// 30칸 전역 격자 레이아웃을 사용하므로, 구형 개별 offset 설정인 rowLayoutConfigs는 이제 사용하지 않습니다.



document.addEventListener("DOMContentLoaded", () => {

    fetchReservedSeats();

    initActionButtons(); // 🛠️ 버튼 이벤트 리스너 초기화 함수 호출 추가

});



function fetchReservedSeats() {

    fetch(GAS_URL)

        .then(res => res.json())

        .then(data => { reservedSeats = data || []; loadSeatLayout(); })

        .catch(() => { reservedSeats = []; loadSeatLayout(); });

}



// 🛠️ 기존 fetch("seats.json") 뒤에 ?v=1 을 붙여서 캐시를 강제로 파괴합니다.

function loadSeatLayout() {

    fetch("seats.json?v=2")  // <-- 새로고침 반영을 위해 v=2로 변경

        .then(res => res.json())

        .then(data => renderFloor("floor1", data.floor1));

}



// 🎯 최종 완성된 30칸 고정 격자 렌더링 함수

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



        // 도면의 원본 격자는 무조건 1번부터 30번까지 순서대로 칸을 만듭니다.

        for (let seatNum = 1; seatNum <= 30; seatNum++) {

            let actualSeatNum = null;



            // 💡 [도면 매핑 로직] 각 격자(seatNum) 위치에 들어갈 실제 JSON 좌석 번호(actualSeatNum) 매칭

            if (row.row === "1열" || row.row === "2열" || row.row === "3열") {

                // 🛠️ 1~3열 수정: 1번 격자는 통로로 비우고, 2번 격자부터 실제 좌석 1번이 매핑되도록 -1 연산 적용

                if (seatNum === 1) {

                    actualSeatNum = null;

                } else if (seatNum >= 2 && seatNum <= 30) {

                    actualSeatNum = seatNum - 1;

                }

            } 

            else if (row.row === "13열") {

                // 좌측 구역 (격자 4~10번 -> 실제 좌석 1~7번)

                if (seatNum >= 4 && seatNum <= 10) {

                    actualSeatNum = seatNum - 3; 

                }

                // 중간 구역 (격자 11~20번 -> 실제 좌석 10~19번)

                else if (seatNum >= 11 && seatNum <= 20) {

                    actualSeatNum = seatNum - 1; 

                }

                // 우측 구역 (격자 21~26번 -> 실제 좌석 22~27번)

                else if (seatNum >= 21 && seatNum <= 26) {

                    actualSeatNum = seatNum + 1; 

                }

            } 

            else {

                // 4~12열: 격자 번호와 실제 좌석 번호가 1:1로 일치

                actualSeatNum = seatNum;

            }



            // 해당 위치에 배치할 실제 좌석 번호가 존재하고, JSON 데이터(seats, disabled, obstructed)에 정의되어 있는지 확인

            const isExistInJson = actualSeatNum && (

                row.seats?.includes(actualSeatNum) ||

                row.disabled?.includes(actualSeatNum) ||

                row.obstructed?.includes(actualSeatNum)

            );



            const cell = document.createElement("div");

            cell.className = "seat-cell";



            // 🛠️ [통로 마진 정밀 설정] 좌석 유무와 관계없이 '격자' 기준 10번과 20번 뒤에 무조건 고정 통로 배치

            if (seatNum === 10 || seatNum === 20) {

                cell.style.marginRight = "24px";

            }



            if (isExistInJson) {

                const seatId = `${row.row}-${actualSeatNum}`;

                

                // 💡 [시야제한석 차단 조건]

                let isObstructedSeat = false;

                if (row.row === "1열") {

                    isObstructedSeat = [1, 2, 3, 4, 14, 15, 24, 25, 26, 27].includes(actualSeatNum);

                } else if (row.row === "2열" || row.row === "3열") {

                    isObstructedSeat = [1, 2, 27, 28].includes(actualSeatNum);

                } 

                // 🛠️ 7열 시야제한석 해제 피드백 반영: 기존의 7열 하드코딩 차단 조건 삭제



                // GAS에서 예약 완료되었거나 시야제한석인 경우 예매 불가 처리

                const isReserved = reserved.includes(seatId.replace(/[^0-9]/g, "")) || isObstructedSeat;

                const isDisabled = row.disabled?.includes(actualSeatNum);



                const btn = document.createElement("button");

                

                // 클래스 지정

                btn.className = `seat ${isReserved ? "reserved" : (isDisabled ? "wheelchair" : "available")}`;

                btn.innerText = isDisabled ? "♿" : actualSeatNum;

                btn.disabled = isReserved; 

                

                if (!isReserved) {

                    btn.onclick = () => handleSeatClick(btn, seatId);

                }



                cell.appendChild(btn);

            } else {

                // 좌석이 배치되지 않는 격자 칸은 투명한 공백 처리

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



// 🛠️ 버튼 클릭 처리 및 구글 앱스 스크립트(GAS) 전송 연동 함수

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

                

                // 📊 [구글 시트 전송용 데이터 구성] 요청하신 5대 항목 취합

                const now = new Date();

                const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                

                const bookingData = {

                    timestamp: timestamp,                        // 1. 예약일시

                    name: name,                                  // 2. 성함

                    phone: phone,                                // 3. 연락처

                    count: selectedSeats.length,                 // 4. 예매좌석 수

                    seats: selectedSeats.join(", ")              // 5. 예매좌석 위치

                };



                // 🚀 구글 앱스 스크립트(GAS)로 POST 전송

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

                        location.reload(); // 성공 시 페이지를 새로고침하여 예약 좌석 갱신

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

