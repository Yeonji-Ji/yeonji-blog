document.addEventListener("DOMContentLoaded", function() {
    // include를 시작하는 함수 호출
    loadIncludes();
});

function loadIncludes() {
    // 아직 처리되지 않은 첫 번째 data-include 요소를 찾습니다.
    const el = document.querySelector('[data-include]');

    // 더 이상 처리할 요소가 없으면 함수를 종료합니다. (모든 include가 완료된 시점)
    if (!el) {
        return;
    }

    // include할 파일의 경로를 가져옵니다.
    const file = el.getAttribute('data-include');

    if (file) {
        fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${file}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                // 가져온 HTML 내용을 요소에 삽입합니다.
                el.innerHTML = data;
                
                // 중요: 처리 완료된 요소의 속성을 제거하여 다음번 검색에서 제외시킵니다.
                el.removeAttribute('data-include');
                
                // 중요: 다음 include 요소를 처리하기 위해 함수를 다시 호출합니다.
                // 이것이 순차적으로 중첩된 include를 가능하게 합니다.
                loadIncludes();
            })
            .catch(error => {
                console.error('Include Error:', error);
                el.innerHTML = `Error loading ${file}.`;
                // 에러가 발생해도 속성을 제거하고 다음으로 넘어가야 무한 루프를 방지할 수 있습니다.
                el.removeAttribute('data-include');
                loadIncludes();
            });
    }
}

// document.addEventListener('DOMContentLoaded', async () => {
//   const targets = document.querySelectorAll('[data-include]');
//   const toAbs = (path) => new URL(path, document.baseURI).toString();

//   await Promise.all([...targets].map(async el => {
//     const rel = el.getAttribute('data-include');
//     const url = toAbs(rel);
//     try {
//       const res = await fetch(url, { cache: 'no-cache' });
//       if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
//       el.innerHTML = await res.text();
//     } catch (e) {
//       el.innerHTML = `<div style="color:#c00">Failed to load: ${rel}</div>`;
//       console.error('Include error:', rel, e);
//     }
//   }));
// });
