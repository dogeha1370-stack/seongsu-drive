import './globals.css';
export const metadata = {
  title: '성수 드라이브 | Seongsu Life Simulator',
  description:
    '월세 30만 원의 반지하에서 시작하는 성수동 3D 생활·생존 샌드박스 RPG.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
