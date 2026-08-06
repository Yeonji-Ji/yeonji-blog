---
layout: post
title: "Render test"
date: 2026-08-05
---

이 글은 렌더링 확인용입니다. 확인이 끝나면 삭제하세요.

## 1. 표

| 모델 | MW | MolLogP | rot_bonds | max_sim_exp |
|---|---|---|---|---|
| Experimental (n=8) | 510.1 | 6.57 | 5.9 | — |
| ChatGPT | 558.7 | 7.26 | 8.9 | 0.51 |
| Claude | 639.1 | 9.31 | 10.2 | 0.60 |
| Claude Science | 659.6 | 9.68 | 5.7 | 0.56 |
| Gemini | 638.9 | 9.21 | 16.6 | 0.67 |

**확인:** 표에 테두리/여백이 있는가, 열이 밀리지 않는가, 폭이 넘쳐서 잘리지 않는가.

## 2. 코드 블록

```python
from rdkit import Chem

triaz = Chem.MolFromSmarts("n1ncncc1")   # 1,2,4-triazine
m = Chem.MolFromSmiles("CC1(C)CCC(C)(C)c2nc(-c3ccc4ccc5ccc(-c6nnc7c(n6)C(C)(C)CCC7(C)C)nc5c4n3)nnc21")
print(len(m.GetSubstructMatches(triaz)))   # -> 2
```

인라인 코드도 확인: `n_triazine_rings` 컬럼, `max_sim_exp` 값.

**확인:** 문법 강조 색이 들어가는가, 가로로 긴 줄이 잘리지 않고 스크롤되는가.

## 3. 이미지 — 마크다운 문법

![rot_bonds by model]({{ site.baseurl }}/assets/img/molgen-design4/rotbonds-by-model.png)

## 4. 이미지 — HTML 문법

<img src="{{ site.baseurl }}/assets/img/molgen-design4/mw-vs-logp.png" alt="MW vs MolLogP">

**확인:** 3번과 4번 **둘 다** 뜨는가. 3번만 안 뜨면 마크다운 안에서 Liquid가 안 도는 것이므로 실제 글에서는 4번 방식만 쓸 것. 둘 다 안 뜨면 baseurl 또는 파일 경로 문제.

## 5. 인용 블록과 각주 스타일

> PubChem 미등록이 미보고를 뜻하지는 않는다. 커버리지가 완전하지 않고 최근 논문의 화합물은 등재가 지연되는 경우가 많다.

## 6. 링크

- 외부 링크: [molgen-llm-bench](https://github.com/Yeonji-Ji/molgen-llm-bench)
- 내부 링크: [About]({{ site.baseurl }}/about.html)

**확인:** 내부 링크가 404가 아닌가. 404면 baseurl 설정 문제.

## 7. 목록 중첩

- 상위 항목
  - 하위 항목
    - 더 하위 항목
1. 번호 목록
2. 두 번째

## 8. 수식이 필요한지 판단용

Tanimoto T = c / (a + b − c) 형태를 본문에서 쓸 일이 있는데, 이 정도는 일반 텍스트로 충분한지 확인. 부족하면 MathJax 추가 필요.
