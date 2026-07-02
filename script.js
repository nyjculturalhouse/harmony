const GAS_URL = "https://script.google.com/macros/s/AKfycbwEGlst8zJdzKQaQzMxzF7SVwrn9GcFVD24LT8Wg4IIhQf-TnRJlancSLdTWIbtjxWE3w/exec";
let selectedSeats = [];
let reservedSeats = [];

const rowLayoutConfigs = {
    "1열": { offset: 1, aisles: [9, 19] },
    "2열": { offset: 1, aisles: [9, 19] },
    "3열": { offset: 1, aisles: [9, 19] },
    "4열": { offset: 0, aisles: [10, 20] },
    "5열": { offset: 0, aisles: [10, 20] },
    "6열": { offset: 0, aisles: [10, 20] },
    "7열": { offset: 0, aisles: [10, 20] },
    "8열": { offset: 0, aisles: [10, 20] },
    "9열": { offset: 0, aisles: [10, 20] },
    "10열": { offset: 0, aisles: [10, 20] },
    "11열": { offset: 0, aisles: [10, 20] },
    "12열": { offset: 0, aisles: [10, 20] },
    "13열": { offset: 4, aisles: [7, 19] }
};

document.addEventListener("DOMContentLoaded", () => {
    fetchReservedSeats();
});

function fetchReservedSeats() {
    fetch(GAS_URL)
        .then(res => res.json())
        .then(data => { reservedSeats = data || []; loadSeatLayout(); })
        .catch(() => { reservedSeats = []; loadSeatLayout(); });
}

function loadSeatLayout() {
    fetch("seats.json")
        .then(res => res.json())
        .then(data => renderFloor("floor1", data.floor1));
}

function renderFloor(containerId, rowsData) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    const reserved = reservedSeats.map(s => String(s).replace(/[^0-9]/g, ""));

    rowsData.forEach(row => {
        const config = rowLayoutConfigs[row.row] || { offset: 0, aisles: [10, 20] };
        const finalOffset = (row.offset !== undefined) ? row.offset : config.offset;

        const rowDiv = document.createElement("div");
        rowDiv.className = "row-container";
        rowDiv.innerHTML = `<div class="row-label">${row.row}</div>`;
        const seatsRow = document.createElement("div");
        seatsRow.className = "seats-row";

        for (let i = 0; i < finalOffset; i++) {
            seatsRow.appendChild(document.createElement("div")).className = "seat-cell";
        }

        const allSeats = [...new Set([...(row.seats || []), ...(row.disabled || []), ...(row.obstructed || [])])].sort((a, b) => a - b);
        
        allSeats.forEach((seatNum) => {
            const seatId = `${row.row}-${seatNum}`;
            const cell = document.createElement("div");
            cell.className = "seat-cell";

            const isReserved = reserved.includes(seatId.replace(/[^0-9]/g, ""));
            const isDisabled = row.disabled?.includes(seatNum);
            const isObstructed = row.obstructed?.includes(seatNum);

            const btn = document.createElement("button");
            btn.className = `seat ${isReserved || isObstructed ? "reserved" : (isDisabled ? "wheelchair" : "available")}`;
            btn.innerText = isDisabled ? "♿" : seatNum;
            btn.disabled = isReserved || isObstructed;
            if (!isReserved && !isObstructed) btn.onclick = () => handleSeatClick(btn, seatId);
            
            cell.appendChild(btn);
            seatsRow.appendChild(cell);

            const rowNum = parseInt(row.row);
            if (rowNum >= 1 && rowNum <= 3) {
                if (seatNum === 9 || seatNum === 19) {
                    seatsRow.appendChild(document.createElement("div")).className = "aisle-space";
                }
            } else if (rowNum >= 4 && rowNum <= 12) {
                if (seatNum === 10 || seatNum === 20) {
                    seatsRow.appendChild(document.createElement("div")).className = "aisle-space";
                }
            } else if (rowNum === 13) {
                if (seatNum === 7 || seatNum === 19) {
                    seatsRow.appendChild(document.createElement("div")).className = "aisle-space";
                }
            }
        });
        rowDiv.appendChild(seatsRow);
        container.appendChild(rowDiv);
    });
}

function handleSeatClick(btn, seatId) {
    if (btn.classList.toggle("selected")) {
        if (selectedSeats.length >= 5) { btn.classList.remove("selected"); return alert("최대 5개까지 선택 가능합니다."); }
        selectedSeats.push(seatId);
    } else {
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    }
    document.getElementById("selectedSeatsDisplay").innerText = selectedSeats.length ? selectedSeats.join(", ") : "없음";
    document.getElementById("ticketCount").innerText = selectedSeats.length;
}
