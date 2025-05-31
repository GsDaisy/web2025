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

    g.render("now", "");
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

    this.render = function (canvasId, title) {
        bar.className = "graph-bar";
        label.className = "graph-label";
        valLabel.className = "graph-value";

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
