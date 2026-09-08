export const SKIN_TONES = [
  '#f0d0b4',
  '#deb48c',
  '#bd865e',
  '#986344',
  '#75472f',
  '#4e3025',
];
export const HAIR_COLORS = [
  '#211c1a',
  '#49372b',
  '#a77443',
  '#dcc584',
  '#793e30',
  '#343033',
];
export function avatarSeed(id: string) {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n;
}
