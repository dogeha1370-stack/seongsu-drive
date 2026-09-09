# 성수 드라이브 — EC2 전체 배포

이 배포는 게임 화면·파일과 WebSocket 서버를 EC2 한 대에서 실행합니다. Cloudflare Workers, D1, Sites 계정이 필요하지 않습니다. 기존 Sites 빌드는 별도로 유지됩니다.

## 빌드 컴퓨터 (Windows/macOS/Linux)

Node.js 22.13 이상에서 저장소 최신 소스를 받고 실행합니다. t3.micro에서 빌드하지 않아도 됩니다.

```sh
npm ci
npm run build:ec2
npm run test:ec2
npm run package:ec2
```

결과는 `work/seongsu-drive-ec2.tar.gz`입니다. 클라이언트 빌드, Node 서버, 런타임 전용 package.json/lockfile, nginx와 systemd 설정이 포함됩니다. 서버에 Three.js 빌드 도구나 Cloudflare 의존성을 설치하지 않습니다.

## Ubuntu EC2 준비

서울 리전 t3.micro, Ubuntu 24.04 LTS 기준입니다. 인바운드 80/443을 허용하고 SSH 22는 관리자 IP만 허용합니다. Node.js 22.13 이상을 설치하고 `node --version` 및 `command -v node`로 확인하세요. 서비스 예시는 `/usr/bin/node`를 사용하므로 다른 경로라면 `ExecStart`를 맞추세요.

```sh
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo useradd --system --user-group --home-dir /opt/seongsu-drive --shell /usr/sbin/nologin seongsu
sudo install -d -o seongsu -g seongsu /opt/seongsu-drive
```

이미 `seongsu` 계정이 있다면 useradd는 생략합니다. 로컬 컴퓨터에서 아카이브를 전송합니다. EC2_IP와 키 경로를 실제 값으로 바꾸세요.

```sh
scp -i /path/to/key.pem work/seongsu-drive-ec2.tar.gz ubuntu@EC2_IP:/tmp/
```

EC2에서:

```sh
sudo tar -xzf /tmp/seongsu-drive-ec2.tar.gz -C /opt/seongsu-drive
sudo chown -R seongsu:seongsu /opt/seongsu-drive
cd /opt/seongsu-drive
sudo -u seongsu npm ci --omit=dev --ignore-scripts --cache /tmp/seongsu-npm-cache
sudo cp deploy/seongsu-drive.service /etc/systemd/system/seongsu-drive.service
sudo systemctl daemon-reload
sudo systemctl enable --now seongsu-drive
curl --fail http://127.0.0.1:3000/healthz
```

기존 서비스가 3000 포트를 사용하면 서비스의 PORT와 nginx의 두 proxy_pass 포트를 함께 변경하세요. Node는 127.0.0.1에만 바인딩되며 3000 포트를 외부에 열 필요가 없습니다.

## 도메인과 HTTPS

`game.h57studio.com`을 EC2의 고정 공인 IP로 향하는 A 레코드로 설정하세요. 같은 이름의 Sites CNAME이 있으면 교체해야 합니다. 다른 이름의 DNS 레코드는 변경하지 마세요. Sites에 등록만 해 둔 도메인은 EC2로 트래픽을 보내지 않습니다.

```sh
sudo cp /opt/seongsu-drive/deploy/nginx-game.conf /etc/nginx/sites-available/seongsu-drive
sudo ln -s /etc/nginx/sites-available/seongsu-drive /etc/nginx/sites-enabled/seongsu-drive
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx --cert-name seongsu-drive-game -d game.h57studio.com --redirect
```

동일 도메인의 기존 nginx vhost가 있으면 새 vhost와 중복시키지 말고 기존 설정을 교체하세요. 인증서는 별도 이름 `seongsu-drive-game`으로 발급하므로 다른 서비스의 기존 인증서를 확장하거나 덮어쓰지 않습니다. Certbot의 이메일·약관 안내는 서버 관리자가 완료하세요.

`ALLOWED_ORIGINS=https://game.h57studio.com`이 systemd 파일에 설정되어 있습니다. 다른 도메인을 사용하면 정확한 HTTPS origin으로 변경하고 서비스를 재시작하세요. 쉼표로 여러 origin을 허용할 수 있습니다. Origin을 지우거나 임의로 덮어쓰는 nginx 설정은 넣지 마세요.

## 확인 및 업데이트

```sh
curl --fail https://game.h57studio.com/healthz
sudo systemctl status seongsu-drive
sudo journalctl -u seongsu-drive -n 100 --no-pager
```

두 브라우저에서 같은 친구 방 코드를 입력해 이동·채팅·공격을 확인합니다. 개발자 도구 Network에서 `/ws`가 101로 연결되고 반복 `/api/presence` 요청이 없어야 합니다.

업데이트는 새 아카이브를 빌드·전송하고, 서비스를 정지한 뒤 기존 배포 디렉터리를 백업하고 새 아카이브를 풀어 npm ci 후 재시작합니다. 서버 재시작 시 방·채팅·접속 상태가 초기화되므로 이용자에게 새 방을 만들도록 안내하세요. 롤백은 백업 디렉터리를 복원하고 서비스를 재시작합니다.

## 운영 범위

- 단일 Node 프로세스, 방당 최대 24명, 전체 최대 240세션으로 메모리를 제한합니다. 240명 수용 성능을 보증하는 수치는 아닙니다. t3.micro 동시 접속 성능은 실제 환경 부하 테스트가 필요합니다.
- 위치는 50ms 주기로 전송하고 DB에 쓰지 않습니다. 채팅은 방당 최근 60개만 메모리에 보관합니다. 빈 방은 5분 뒤 정리합니다.
- 끊긴 세션은 30초 동안 재접속할 수 있습니다. 돈·아이템·진행 상황은 기존처럼 브라우저에 저장되며 다른 도메인으로 자동 이전되지 않습니다.
- 기존 공격 사거리·방/층 격리·재접속 보호·공격 간격 검증을 유지합니다. 이동과 생활 HP는 클라이언트 보고 기반이므로 경쟁 게임 수준의 치트 방지는 아닙니다.
- 여러 프로세스/EC2를 동시에 띄우는 구성은 지원하지 않습니다. 확장하려면 방 라우팅 또는 공유 상태 설계가 필요합니다.
- T3 CPU 크레딧·메모리·네트워크 사용량을 관찰하세요. EC2·디스크·공인 IPv4·전송량 비용은 별도입니다.

WebSocket 구현 참고: https://github.com/websockets/ws/blob/master/README.md

## 관리자와 친구 이동
함께하기의 방코드 입력에 123123123을 입력하면 현재 연결이 관리자 모드로 전환됩니다. 접속자 목록에 추방 버튼이 나타납니다. 코드 소지자는 누구나 관리자 권한을 얻습니다. 서버 ADMIN_CODE 환경 변수로 코드를 변경할 수 있습니다. 권한은 연결 종료 시 해제됩니다. 추방은 같은 방의 접속 ID에 적용하며 자동 재접속을 중단합니다. 영구 차단은 아니므로 직접 다시 입장할 수 있습니다.
일반 접속자도 목록에서 친구에게 이동할 수 있습니다. 집 안 친구는 집 입구로 이동합니다.
