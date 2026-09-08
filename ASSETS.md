# 이미지와 구현 참고 자료

2026-09-08 확인. 상점 메뉴 이름과 사진은 각 브랜드의 공식 자료를 참고했습니다. 게임 내 가격, 회복 수치, 건물 크기와 배치는 게임용 설정이며 실제 매장과 다를 수 있습니다.

## 맥도날드

`public/mcd/`의 제품 사진 6개와 로고는 맥도날드 코리아 공식 사이트의 제품 이미지와 로고를 사용합니다. 상점 건물은 코드로 만든 모델이며 붉은 간판, 노란 아치, 유리 전면과 독립 간판을 반영했습니다.

- [공식 메뉴](https://www.mcdonalds.co.kr/kor/menu/burger?ca=2&page=1)
- [빅맥 세트](https://www.mcdonalds.co.kr/kor/menu/detail/178/3/21)
- [상하이 버거 세트](https://www.mcdonalds.co.kr/kor/menu/detail/603/4/21)
- [1955 버거 세트](https://www.mcdonalds.co.kr/kor/menu/detail/2/3/1)
- [후렌치 후라이](https://www.mcdonalds.co.kr/kor/menu/detail/88/6/8)
- [맥너겟](https://www.mcdonalds.co.kr/kor/menu/detail/284/6/8)
- [아이스 아메리카노](https://www.mcdonalds.co.kr/kor/menu/detail/731/6/9)
- [브랜드 소개](https://www.mcdonalds.co.kr/kor/story/brand/intro)

## BBQ

`public/bbq/`의 제품 사진 6개와 로고는 BBQ 공식 자료입니다. 건물은 공식 매장 외관을 참고해 검은 간판, 붉은 띠, 금색 창틀과 유리 매장으로 직접 모델링했습니다.

- [공식 메뉴판](https://bbq.co.kr/categories/17)
- [공식 메뉴 데이터](https://bbq.co.kr/api/delivery/menu/17)
- [공식 로고](https://bbq.co.kr/images/symbols/logo-red.svg)
- [제너시스BBQ 공식 매장 외관 자료](https://www.genesiskorea.co.kr/ceo/activity_view.asp?BIDX=3191)

브랜드 이미지의 권리는 해당 권리자에게 있습니다. 이를 아래 Kenney CC0 에셋과 같은 라이선스로 표시하지 않습니다.

## 발사 효과와 조준

`public/fx/`의 muzzle, spark, smoke, scorch 텍스처는 [Kenney Particle Pack](https://kenney.nl/assets/particle-pack)의 CC0 자료입니다. 라이선스 원문은 같은 디렉터리의 `LICENSE.txt`에 있습니다. 이 텍스처를 Three.js 스프라이트, 총구 조명, 탄도 선, 충돌 스파크와 흔적으로 구현했습니다.

- [PUBG 공식 기본 조작 안내](https://support.pubg.com/hc/en-us/articles/360002074913-What-are-the-basic-game-commands): 우클릭 유지 조준과 짧은 클릭 ADS 구분
- [PUBG 공식 업데이트](https://pubg.com/en/news/1733): 3인칭 조준 카메라의 오른쪽 어깨 기준 참고

PUBG의 모델이나 텍스처를 복사하지 않았습니다. 캐릭터를 화면 한쪽으로 옮기는 어깨 너머 조준과 총기 중심의 1인칭 시점은 기존 게임 카메라에 직접 구현했습니다.

## 부동산 인터페이스

- [메이플스토리 인벤토리 안내](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/398)
- [메이플스토리 상점 안내](https://gi.maplestory.nexon.com/Guide/GameInformation/SpecialContents/Dojang#10)
- [메이플스토리 월드 UI 가이드](https://maplestoryworlds-creators.nexon.com/ko/docs/?postId=1116)

슬롯 선택 후 상세 정보를 확인하는 구성을 참고했습니다. 4×4 배치는 사용자가 요청한 게임용 구성이고, 부동산 아이콘·스타일은 직접 구현했습니다.

## 바이크와 이동 동기화 (2026-09-09)

- [Honda CB650R 공식 사양](https://www.honda.co.uk/motorcycles/range/street/cb650r/specifications-and-price.html): 휠·포크·연료탱크·시트의 구성을 참고했습니다. 브랜드 모델을 복제하거나 Honda 에셋을 배포한 것이 아니라 게임에 맞춘 원본 로우폴리 모델입니다.
- [Three.js 물리 안내](https://threejs.org/manual/en/physics.html): 시각 모델과 충돌·운동 계산 분리 참고. 이 게임은 기존 물리 계산을 확장하며 별도 Ammo 엔진은 설치하지 않습니다.
- [Gaffer On Games: Snapshot Interpolation](https://github.com/mas-bandwidth/gafferongames/blob/main/content/post/snapshot_interpolation.md): 받은 위치를 짧게 보관한 뒤 보간하는 방식 참고.

올리브영 간판은 텍스트와 3D 기하로 구성하며 뷰티 박스 배달은 게임 속 가상 주문입니다.
