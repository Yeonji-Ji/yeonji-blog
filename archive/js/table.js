// 웹 페이지의 HTML 문서가 완전히 로드되고 분석되었을 때 아래 함수를 실행합니다.
// 이렇게 하면 HTML 요소가 미처 만들어지기 전에 스크립트가 실행되는 것을 방지할 수 있습니다.
document.addEventListener("DOMContentLoaded", function() {
    
    // 'data-include'라는 속성을 가진 모든 HTML 요소를 찾습니다.
    const includeElements = document.querySelectorAll('[data-include]');
    
    // 찾은 각 요소에 대해 반복 작업을 수행합니다.
    includeElements.forEach(function(el) {
        // 해당 요소의 'data-include' 속성 값을 가져옵니다. (예: "data/telco_results_table.html")
        const file = el.getAttribute('data-include');
        
        if (file) {
            // fetch API를 사용해 해당 파일을 비동기적으로 불러옵니다.
            fetch(file)
                // 서버로부터 응답(response)을 받으면, 그 내용을 텍스트 형태로 변환합니다.
                .then(response => {
                    // 응답이 성공적인지 확인합니다. (예: 파일이 실제로 존재하는 경우)
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    return response.text();
                })
                // 텍스트로 변환된 데이터(HTML 내용)를 가져오면,
                .then(data => {
                    // 원래 div 요소의 내부 HTML(innerHTML)로 삽입합니다.
                    el.innerHTML = data;
                })
                // 파일을 불러오는 과정에서 에러가 발생하면 콘솔에 에러 메시지를 출력합니다.
                .catch(error => {
                    console.error('Error fetching the include file:', error);
                    el.innerHTML = "Error: 파일을 불러올 수 없습니다.";
                });
        }
    });
});


// document.addEventListener("DOMContentLoaded", function () {
//   document.querySelectorAll('[data-include]').forEach(el => {
//     const file = el.getAttribute('data-include');
//     if (!file) return;

//     const url = file.startsWith('/') ? file : new URL(file, window.location.href).toString();

//     fetch(url, { cache: "no-cache" })
//       .then(res => {
//         if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
//         return res.text();
//       })
//       .then(html => { el.innerHTML = html; })
//       .catch(err => {
//         el.innerHTML = `<p style="color:red;">Error loading ${file}</p>`;
//         console.error(err);
//       });
//   });
// });
