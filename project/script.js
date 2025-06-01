window.onload = function () {
    handleRefresh();
    initTabs();
    initComments();
    setTodayDate();
    loadComments();
};
function setTodayDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    document.getElementById("today-date").innerText = `${yyyy}.${mm}.${dd}`;
}

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
function loadComments() {
    const comments = JSON.parse(localStorage.getItem("comments")) || [];
    const replyArea = document.getElementById("reply_area");
    replyArea.innerHTML = "";
    comments.forEach(comment => {
        const row = document.createElement("tr");
        row.innerHTML = `<td><strong>${comment.writer}</strong> (${comment.time})<br/>${comment.content}</td>`;
        replyArea.appendChild(row);
    });
}
function saveComment(writer, content) {
    const comments = JSON.parse(localStorage.getItem("comments")) || [];
    comments.push({ writer, content, time: new Date().toLocaleString() });
    localStorage.setItem("comments", JSON.stringify(comments));
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
    const url = "https://seoul-proxy-git-main-gsdaisys-projects.vercel.app/api/seoul-air"; // ← 프록시 주소로 교체

    fetch(url)
        .then(res => res.text()) // XML이므로 .text()로 받아야 함
        .then(str => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(str, "text/xml");
            updateTraffic({ responseXML: xml }); // 기존 함수에 그대로 넘김
            renderGasInfoTable({ responseXML: xml }); 
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
        //subwayDiv.appendChild(div);

        values.push(pm10);
    }
    const items = xml.responseXML.getElementsByTagName("row");
    const dataList = [];
    for (let i = 0; i < items.length; i++) {

        const item = items[i];
        const MSRDT = item.getElementsByTagName("MSRDATE")[0]?.textContent || "";
        const MSRSTE_NM = item.getElementsByTagName("MSRSTENAME")[0]?.textContent || "";
        const PM10 = item.getElementsByTagName("PM10")[0]?.textContent || "-";
        const PM25 = item.getElementsByTagName("PM25")[0]?.textContent || "-";

        dataList.push({ MSRDT, MSRSTE_NM, PM10, PM25 });
    }

    renderDustInfoTable(dataList);
    localStorage.setItem("bbb", JSON.stringify(values));
    renderGraph(values);
}
function renderGasInfoTable(xml) {
    const items = xml.responseXML.getElementsByTagName("row");
    const table = document.getElementById("gasInfoTable");
    if (!table) return;
    table.innerHTML = "";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>측정일시</th>
        <th>자치구</th>
        <th>오존 (ppm)</th>
        <th>이산화질소 (ppm)</th>
        <th>일산화탄소 (ppm)</th>
        <th>아황산가스 (ppm)</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const MSRDT = item.getElementsByTagName("MSRDATE")[0]?.textContent || "";
        const MSRSTE_NM = item.getElementsByTagName("MSRSTENAME")[0]?.textContent || "";
        const OZONE = parseFloat(item.getElementsByTagName("OZONE")[0]?.textContent || 0);
        const NITROGEN = parseFloat(item.getElementsByTagName("NITROGEN")[0]?.textContent || 0);
        const CARBON = parseFloat(item.getElementsByTagName("CARBON")[0]?.textContent || 0);
        const SULFUROUS = parseFloat(item.getElementsByTagName("SULFUROUS")[0]?.textContent || 0);

        const dateFormatted = MSRDT.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3 $4:");

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${dateFormatted}</td>
          <td>${MSRSTE_NM}</td>
          <td style="background-color:${getGasColor('OZONE', OZONE)}">${OZONE}</td>
          <td style="background-color:${getGasColor('NITROGEN', NITROGEN)}">${NITROGEN}</td>
          <td style="background-color:${getGasColor('CARBON', CARBON)}">${CARBON}</td>
          <td style="background-color:${getGasColor('SULFUROUS', SULFUROUS)}">${SULFUROUS}</td>
        `;
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
}
function getGasColor(type, value) {
    if (type === "OZONE") {
        if (value <= 0.03) return "rgba(52, 152, 219, 0.4)";
        else if (value <= 0.09) return "rgba(46, 204, 113, 0.4)";
        else if (value <= 0.15) return "rgba(243, 156, 18, 0.4)";
        else return "rgba(231, 76, 60, 0.4)";
    }
    if (type === "NITROGEN") {
        if (value <= 0.03) return "rgba(52, 152, 219, 0.4)";
        else if (value <= 0.06) return "rgba(46, 204, 113, 0.4)";
        else if (value <= 0.2) return "rgba(243, 156, 18, 0.4)";
        else return "rgba(231, 76, 60, 0.4)";
    }
    if (type === "CARBON") {
        if (value <= 2) return "rgba(52, 152, 219, 0.4)";
        else if (value <= 9) return "rgba(46, 204, 113, 0.4)";
        else if (value <= 15) return "rgba(243, 156, 18, 0.4)";
        else return "rgba(231, 76, 60, 0.4)";
    }
    if (type === "SULFUROUS") {
        if (value <= 0.01) return "rgba(52, 152, 219, 0.4)";
        else if (value <= 0.02) return "rgba(46, 204, 113, 0.4)";
        else if (value <= 0.15) return "rgba(243, 156, 18, 0.4)";
        else return "rgba(231, 76, 60, 0.4)";
    }
    return "rgba(200,200,200,0.2)";
}
function getPM10Color(value) {
    if (value <= 30) return "rgba(52, 152, 219, 0.4)"; // 좋음 - 파랑
    if (value <= 80) return "rgba(46, 204, 113, 0.4)"; // 보통 - 초록
    if (value <= 150) return "rgba(243, 156, 18, 0.4)"; // 나쁨 - 주황
    return "rgba(231, 76, 60, 0.4)"; // 매우나쁨 - 빨강
}
function getPM25Color(value) {
    if (value <= 15) return "rgba(52, 152, 219, 0.4)";     // 좋음
    if (value <= 35) return "rgba(46, 204, 113, 0.4)";     // 보통
    if (value <= 75) return "rgba(243, 156, 18, 0.4)";     // 나쁨
    return "rgba(231, 76, 60, 0.4)";                       // 매우나쁨
}
function renderGraph(values) {
    const g = new graph();
    const guNames = ["종로", "중구", "용산", "성동", "광진", "동대문", "중랑", "성북",
        "강북", "도봉", "노원", "은평", "서대문", "마포", "양천", "강서", "구로", "금천",
        "영등포", "동작", "관악", "서초", "강남", "송파", "강동"];

    for (let i = 0; i < guNames.length; i++) {
        g.add(guNames[i], values[i]);
    }

    g.render("now", "");
}
function renderDustInfoTable(dataList) {
    const table = document.getElementById("dustInfoTable");
    table.innerHTML = "";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>측정일시</th>
        <th>자치구</th>
        <th>미세먼지 (㎍/㎥)</th>
        <th>초미세먼지 (㎍/㎥)</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    dataList.forEach(data => {
        const row = document.createElement("tr");
        const date = data.MSRDT.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3 $4:");
        row.innerHTML = `
          <td>${date}</td>
          <td>${data.MSRSTE_NM}</td>
          <td style="background-color:${getPM10Color(Number(data.PM10))}">${data.PM10}</td>
          <td style="background-color:${getPM25Color(Number(data.PM25))}>${data.PM25}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
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
        saveComment(writer, content);
        loadComments();

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
/*
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
    }*/
this.render = function (canvasId, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.innerHTML = ''; // 그래프 초기화

    const h = 30; // 각 바의 높이
    const spacing = 10;
    const leftMargin = 80;
    const barLength = 250;
    const fontSize = 12;

    const totalHeight = (h + spacing) * this.data.length + 50;
    canvas.style.position = "relative";
    canvas.style.height = totalHeight + "px";

    const titleElem = document.createElement("h4");
    titleElem.innerText = title;
    canvas.appendChild(titleElem);

    for (let i = 0; i < this.data.length; i++) {
        const value = this.data[i];
        const percent = Math.min(value / this.max, 1); // 비율
        const barWidth = percent * barLength;

        // 색상 설정
        let color = "gray";
        if (value <= 30) color = "#3498db"; // 파랑
        else if (value <= 80) color = "#2ecc71"; // 초록
        else if (value <= 150) color = "#f39c12"; // 주황
        else color = "#e74c3c"; // 빨강

        const bar = document.createElement("div");
        bar.style.position = "absolute";
        bar.style.left = leftMargin + "px";
        bar.style.top = (i * (h + spacing)) + "px";
        bar.style.width = barWidth + "px";
        bar.style.height = h + "px";
        bar.style.backgroundColor = color;
        bar.style.borderRadius = "4px";
        canvas.appendChild(bar);

        // 구 이름
        const label = document.createElement("div");
        label.style.position = "absolute";
        label.style.left = "10px";
        label.style.top = (i * (h + spacing) + 7) + "px";
        label.style.fontSize = fontSize + "px";
        label.innerText = this.x_name[i];
        canvas.appendChild(label);

        // 수치 표시 (막대 오른쪽)
        const valLabel = document.createElement("div");
        valLabel.style.position = "absolute";
        valLabel.style.left = (leftMargin + barWidth + 5) + "px";
        valLabel.style.top = (i * (h + spacing) + 7) + "px";
        valLabel.style.fontSize = fontSize + "px";
        valLabel.innerText = `${value.toFixed(1)}㎍/㎥`;
        canvas.appendChild(valLabel);
    }
}


}
