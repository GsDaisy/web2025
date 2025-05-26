window.onload = function () {
    handleRefresh();
    initTabs();
    initComments();
};

function initTabs() {
    const tabs = document.querySelectorAll('nav button');
    const sections = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            sections.forEach(section => {
                section.classList.toggle('hidden', section.id !== target);
            });
        });
    });
}
/*
function handleRefresh() {
    const url = 'https://cors-anywhere.herokuapp.com/http://openapi.seoul.go.kr:8088/61627862697379303832434e624e50/xml/ListAirQualityByDistrictService/1/25/';
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            updateTraffic(this);
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
    https://seoul-proxy-git-main-gsdaisys-projects.vercel.app
}*/

function handleRefresh() {
    const url = "https://seoul-proxy-git-main-gsdaisys-projects.vercel.app"; // ← 프록시 주소로 교체

    fetch(url)
        .then(res => res.text()) // XML이므로 .text()로 받아야 함
        .then(str => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(str, "text/xml");
            updateTraffic({ responseXML: xml }); // 기존 함수에 그대로 넘김
        })
        .catch(err => {
            console.error("미세먼지 데이터 불러오기 실패:", err);
        });
}

function updateTraffic(xml) {
    const xmlDoc = xml.responseXML;
    const subwayDiv = document.getElementById("subwaypeople");
    const traffic = xmlDoc.getElementsByTagName("row");
    const values = [];

    for (let i = 0; i < traffic.length; i++) {
        const row = traffic[i];
        const pm10 = row.getElementsByTagName("PM10")[0].textContent;
        const pm25 = row.getElementsByTagName("PM25")[0].textContent;
        const station = row.getElementsByTagName("MSRSTENAME")[0].textContent;
        const date = row.getElementsByTagName("MSRDATE")[0].textContent;

        const div = document.createElement("div");
        div.className = "subwayItem";
        div.innerText = `${date}에 ${station}의 미세먼지 지수는 ${pm10}㎍/㎥, 초미세먼지 지수는 ${pm25}㎍/㎥입니다.`;
        subwayDiv.appendChild(div);

        values.push(pm10);
    }

    localStorage.setItem("bbb", JSON.stringify(values));
    renderGraph(values);
}

function renderGraph(values) {
    const g = new graph();
    const guNames = ["종로", "중구", "용산", "성동", "광진", "동대문", "중랑", "성북",
        "강북", "도봉", "노원", "은평", "서대문", "마포", "양천", "강서", "구로", "금천",
        "영등포", "동작", "관악", "서초", "강남", "송파", "강동"];

    for (let i = 0; i < guNames.length; i++) {
        g.add(guNames[i], values[i]);
    }

    g.render("now", "서울시 자치구별 미세먼지");
}

function initComments() {
    document.getElementById("reply_save").addEventListener("click", () => {
        const writer = document.getElementById("reply_writer").value.trim();
        const content = document.getElementById("reply_content").value.trim();
        const table = document.getElementById("reply_area");

        if (!writer || !content) {
            alert("이름과 내용을 입력해주세요.");
            return;
        }

        const row = document.createElement("tr");
        row.innerHTML = `<td><b>${writer}</b>: ${content}</td>`;
        table.appendChild(row);

        document.getElementById("reply_writer").value = "";
        document.getElementById("reply_content").value = "";
    });
}
function graph() {
    this.ct = 0;
    this.data = [];
    this.x_name = [];
    this.scale = 1;
    this.max = -64000;

    this.c_array = [
        [255, 192, 95], [80, 127, 175], [159, 87, 112], [111, 120, 96], [224, 119, 96],
        [80, 159, 144], [207, 88, 95], [64, 135, 96], [239, 160, 95], [144, 151, 80],
        [255, 136, 80]
    ];

    this.getColor = function () {
        if (this.ct >= this.c_array.length - 1) this.ct = 0;
        else this.ct++;
        const c = this.c_array[this.ct];
        return "#" + c.map(v => v.toString(16).padStart(2, '0')).join("");
    }

    this.setScale = function (scale) {
        this.scale = scale;
    }

    this.add = function (x_name, value) {
        value = parseFloat(value) * this.scale;
        this.x_name.push(x_name);
        this.data.push(value);
        if (value > this.max) this.max = value;
    }

    this.render = function (canvasId, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.innerHTML = ''; // 그래프 초기화

        const h = 250;
        const sx = 40;
        const dw = 15;
        const shadow = 3;
        const rtmax = sx + 10 + (dw + Math.round(dw / 2) + shadow) * this.data.length;

        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            const y = Math.round(h / 5 * (i + 1));
            line.style.position = "absolute";
            line.style.top = `${y}px`;
            line.style.left = "0";
            line.style.width = rtmax + "px";
            line.style.height = "1px";
            line.style.backgroundColor = "#ccc";
            canvas.appendChild(line);
        }

        let x = sx;
        for (let i = 0; i < this.data.length; i++) {
            const ht1 = Math.round(this.data[i] * h / this.max);
            const bar = document.createElement("div");
            bar.style.position = "absolute";
            bar.style.left = `${x}px`;
            bar.style.top = `${h - ht1}px`;
            bar.style.width = `${dw}px`;
            bar.style.height = `${ht1}px`;
            bar.style.backgroundColor = this.getColor();
            bar.title = `${this.x_name[i]}: ${this.data[i].toFixed(1)}㎍/㎥`;
            canvas.appendChild(bar);

            const label = document.createElement("div");
            label.style.position = "absolute";
            label.style.top = `${h + 5}px`;
            label.style.left = `${x - 5}px`;
            label.style.fontSize = "10px";
            label.innerText = this.x_name[i];
            canvas.appendChild(label);

            x += dw + Math.round(dw / 2) + shadow;
        }
    }
}
