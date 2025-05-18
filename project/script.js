document.querySelectorAll('nav ul li a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 모든 섹션 숨기기
        document.querySelectorAll('main section').forEach(section => {
            section.style.display = 'none';
        });

        // 선택한 섹션만 보이기
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        targetElement.style.display = 'block';
    });
});

// 처음 로딩 시 첫 번째 섹션만 보이기
document.querySelectorAll('main section').forEach((section, index) => {
    section.style.display = index === 0 ? 'block' : 'none';
});
