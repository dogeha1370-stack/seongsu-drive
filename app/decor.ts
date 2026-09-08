export const DECOR = {
  rug: {
    name: '체크 러그',
    price: 15000,
    description: '침대 앞 작은 포인트',
    icon: 'rug',
  },
  plant: {
    name: '초록 화분',
    price: 8000,
    description: '창가에 놓는 작은 초록',
    icon: 'plant',
  },
  lamp: {
    name: '무드등',
    price: 12000,
    description: '따뜻하게 밝히는 밤',
    icon: 'lamp',
  },
  shelf: {
    name: '원목 선반',
    price: 22000,
    description: '소품을 모아두는 자리',
    icon: 'shelf',
  },
  poster: {
    name: '성수 포스터',
    price: 9000,
    description: '내 취향을 담은 벽',
    icon: 'poster',
  },
} as const;
export type DecorId = keyof typeof DECOR;
export type DecorState = {
  owned: DecorId[];
  placed: Partial<Record<DecorId, number>>;
  wall: string;
  floor: string;
};
export const WALL_COLORS = ['#aab2a9', '#c9c0ad', '#809eac', '#b58473'];
export const FLOOR_COLORS = ['#756b5d', '#a18b6c', '#555f62'];
export const defaultDecor = (): DecorState => ({
  owned: [],
  placed: {},
  wall: WALL_COLORS[0],
  floor: FLOOR_COLORS[0],
});
