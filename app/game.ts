import { sportsCar } from './vehicles';
import { LANDMARKS, landmark } from './landmarks';
import { WEAPONS, weaponModel } from './weapons';
import { FEMALE_RESIDENT_IDS, residentName, numberChance } from './social';
import type { Peer, PresenceState } from './multiplayer';
import { createMotorcycle } from './motorcycle';
import { newBikeMotion, stepBike } from './bike-motion';
import { SKIN_TONES, HAIR_COLORS, avatarSeed } from './avatar';
import { sampleMotion, type MotionSample } from './net-motion';
import { createHuman, type HumanRig } from './human';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { body, collide, integrate, type Body } from './physics';
import { headingFromDirection } from './controls';
import {
  circleVehicleCorrection,
  isRoadSurface,
  type VehicleBounds,
} from './world-rules';
import type { DecorId } from './decor';
import {
  act,
  dropCash,
  collectCash,
  claimDeliveryBike,
  createLife,
  restoreLife,
  tickLife,
  reportCrime,
  deliver,
  targetPlace,
  place,
  PLACES,
  BIKES,
  SAVE_KEY,
  type Life,
  type Action,
  type PlaceId,
} from './life';
import {
  roles,
  schedule,
  sidewalkPath,
  type Point,
  type Occupation,
} from './city';
import {
  person,
  respawnStep,
  damagePerson,
  combatStep,
  hitPerson,
  vehiclePerson,
  stepPerson,
  type Person,
} from './pedestrians';
export type Panel =
  | 'friends'
  | 'phone'
  | 'bag'
  | 'map'
  | 'home'
  | 'place'
  | 'dialogue'
  | 'help'
  | null;
export type Hud = {
  building?: {
    floor: number;
    moving: boolean;
    nearLift: boolean;
    nearDelivery: boolean;
  } | null;
  social: {
    id: number;
    name: string;
    chance: number;
    remaining: number;
    following: boolean;
    known: boolean;
    cooldown: number;
  } | null;
  position: { x: number; z: number };
  heading: number;
  playerHeading: number;
  life: Life;
  panel: Panel;
  nearby: PlaceId | null;
  riding: boolean;
  aiming: boolean;
  ads: boolean;
  weapon?: number;
  reload: number;
  spread: number;
  saveStatus: string;
  activity: string;
  armed: boolean;
  vehicleHp: number;
  hp: number;
  hurt: boolean;
  speed: number;
  driving: boolean;
  mission: number;
  distance: number;
  paused: boolean;
  hint: string;
  error: string;
};
export type GameApi = {
  presence: () => PresenceState;
  onPeerAttack: (callback: (id: string, kind: 'gun' | 'punch') => void) => void;
  receiveDamage: (amount: number) => void;
  typing: (value: boolean) => void;
  elevator: () => void;
  askNumber: () => void;
  setPeers: (peers: Peer[]) => void;
  jump: () => void;
  equip: () => void;
  selectWeapon: (id: number) => void;
  dispose: () => void;
  pause: () => void;
  reset: () => void;
  attack: () => void;
  key: (k: string, v: boolean) => void;
  stick: (x: number, y: number) => void;
  interact: () => void;
  open: (panel: Panel) => void;
  action: (action: Action, value?: string) => void;
  mount: () => void;
  reload: () => void;
  aim: () => void;
};
export function createGame(
  host: HTMLDivElement,
  report: (h: Hud) => void,
): GameApi {
  let life = createLife(),
    saveStatus = '이 브라우저에 자동 저장';
  try {
    life = restoreLife(localStorage.getItem(SAVE_KEY));
  } catch {
    saveStatus = '저장 공간에 접근할 수 없습니다.';
  }
  let panel: Panel = null,
    nearby: PlaceId | null = null,
    riding = false,
    aiming = false,
    reloadTime = 0,
    recoil = 0,
    stableAim = 0,
    lastSave = 0,
    crimeCheck = 0;
  const save = () => {
    try {
      life.hp = hp;
      if (!life.inside) {
        const pos = activePosition();
        life.playerX = buildingFloor !== null ? 100 : pos.x;
        life.playerZ = buildingFloor !== null ? 56 : pos.z;
      }
      life.bikeX = bike.position.x;
      life.bikeZ = bike.position.z;
      localStorage.setItem(SAVE_KEY, JSON.stringify(life));
      saveStatus = '이 브라우저에 자동 저장';
    } catch {
      saveStatus = '저장 실패 · 브라우저 저장 공간을 확인하세요.';
    }
  };
  let buildingFloor: number | null = null;
  let liftRemaining = 0,
    liftFrom = 0,
    liftTo = 0;
  let typing = false,
    zoom = 1;
  const bikeMotion = newBikeMotion();
  const scene = new T.Scene();
  scene.background = new T.Color('#b6c7cb');
  scene.fog = new T.Fog('#b6c7cb', 90, 260);
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  host.appendChild(renderer.domElement);
  const camera = new T.PerspectiveCamera(53, 1, 0.1, 350);
  const ambient = new T.HemisphereLight('#d6ebff', '#b39b7c', 2.3);
  scene.add(ambient);
  const sun = new T.DirectionalLight('#ffe4b5', 3.2);
  sun.position.set(-55, 85, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -110,
    right: 110,
    top: 110,
    bottom: -110,
    far: 250,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const solids: { x: number; z: number; w: number; d: number; h: number }[] =
    [];
  const mats = new Map<string, T.MeshStandardMaterial>();
  function mat(c: string) {
    if (!mats.has(c))
      mats.set(c, new T.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    return mats.get(c)!;
  }
  function box(
    w: number,
    h: number,
    d: number,
    c: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
  ) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    m.userData.staticWorld = parent === scene;
    return m;
  }
  function sign(
    txt: string,
    w: number,
    x: number,
    y: number,
    z: number,
    bg = '#203a38',
  ) {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 160);
    ctx.fillStyle = '#f6ebd5';
    ctx.font = 'bold 70px Arial, Malgun Gothic';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 384, 83, 730);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(
      new T.PlaneGeometry(w, 2),
      new T.MeshStandardMaterial({
        map: tex,
        emissive: '#ffffff',
        emissiveMap: tex,
        emissiveIntensity: 0.25,
      }),
    );
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  box(240, 0.2, 240, '#71836a', 0, -0.2, 0);
  for (const z of [-65, 0, 65])
    box(235, 0.12, z === 0 ? 20 : 15, '#555e60', 0, 0, z);
  for (const x of [-70, 0, 70])
    box(x === 0 ? 18 : 15, 0.13, 220, '#555e60', x, 0, 0);
  for (let a = -110; a <= 110; a += 8) {
    box(3, 0.02, 0.17, '#e0c88a', a, 0.1, 0);
    box(0.17, 0.02, 3, '#e0c88a', 0, 0.1, a);
  }
  for (const z of [-65, 0, 65])
    for (const x of [-70, 0, 70])
      for (let i = -4; i <= 4; i++) {
        box(1, 0.025, 5, '#e7e4d6', x + i * 1.6, 0.11, z + 12);
        box(5, 0.025, 0.9, '#e7e4d6', x + 12, 0.11, z + i * 1.5);
      }
  const names = [
    '성수 로스터리',
    'SEONGSU GARAGE',
    '벽돌상회',
    '오후의 커피',
    '성수 작업실',
    'STUDIO 02',
    '수제화 공방',
    '연무장 카페',
    'SEOUL SUPPLY',
    '성수 문구',
  ];
  let n = 0;
  for (const x of [-100, -40, 40, 100])
    for (const z of [-96, -36, 36, 96]) {
      const w = 30,
        d = 34,
        h = x === 100 && z === 36 ? 8 : 8 + (n % 4) * 3;
      box(w + 5, 0.3, d + 5, '#b6b4a5', x, 0.12, z);
      if (LANDMARKS[n]) {
        const item = LANDMARKS[n], building = landmark(item.style, item.name);
        building.position.set(x,0,z);scene.add(building);
        solids.push({x,z,w:w+1,d:d+1,h:12});n++;continue;
      }
      box(
        w,
        h,
        d,
        ['#925f4a', '#a36b50', '#777773', '#a47b60'][n % 4],
        x,
        h / 2,
        z,
      );
      solids.push({ x, z, w: w + 1, d: d + 1, h: h + 1 });
      box(w + 1, 0.55, d + 1, '#615f57', x, h + 0.1, z);
      box(9, 2, 8, '#89877c', x + 3, h + 1, z);
      for (let yy = 5; yy < h; yy += 4)
        for (let xx = -11; xx < 14; xx += 5) {
          box(3, 2.2, 0.14, '#344b50', x + xx, yy, z + d / 2 + 0.1);
          box(0.08, 2.2, 0.18, '#a1aaa1', x + xx, yy, z + d / 2 + 0.2);
        }
      for (let yy = 1; yy < h; yy += 0.7)
        box(w, 0.035, 0.04, '#bd9272', x, yy, z + d / 2 + 0.05);
      box(w - 4, 3.3, 0.16, '#253e40', x, 1.8, z + d / 2 + 0.2);
      for (let j = -12; j < 14; j += 4)
        box(0.15, 3.4, 0.23, '#aa9981', x + j, 1.8, z + d / 2 + 0.3);
      if (x !== 40 || z !== -96)
        sign(names[n % names.length], w - 3, x, 5.8, z + d / 2 + 0.3);
      box(
        w - 2,
        0.25,
        2.8,
        n % 2 ? '#dad1b8' : '#345b4b',
        x,
        4.3,
        z + d / 2 + 1,
      );
      n++;
    }
  // Elevated concrete railway inspired by the supplied Seongsu viaduct photo.
  box(22, .8, 218, '#94958b', 0, 9.2, 0);
  for(const x of [-9.7,9.7]) {
    box(.4,1.3,218,'#75786e',x,10.1,0);
    for(const z of [-96,-36,36,96]) {
      box(1,9,1.5,'#a3a394',x,4.5,z);
      box(1.05,2,1.55,'#d6b543',x,1,z);
      for(let y=.25;y<2;y+=.4){const stripe=box(1.08,.15,1.57,'#353936',x,y,z);stripe.rotation.z=.2;}
      solids.push({x,z,w:1,d:1.5,h:9});
      box(20,.7,1.2,'#8a8d81',0,8.6,z);
      box(1.2,.12,.6,'#f3e9be',x*.7,8.15,z);
    }
  }
  const oliveSign = sign('OLIVE YOUNG', 27, -40, 5.8, 53.6);
  (oliveSign.material as T.MeshStandardMaterial).color.set('#d1ed57');
  box(29, 1.2, 0.35, '#b7d631', -40, 3.7, 53.6);
  sign('뷰티 · 생활용품 · 배달 픽업', 22, -40, 2.2, 53.85);
  sign('SEONGSU MOTORS', 27, -100, 5.8, -18.5);
  sign('BIKE SHOP · BUY & RIDE', 24, -100, 3.7, -18.4);
  sign('서울숲 빌딩 · 1F / 2F', 27, 100, 5.8, 53.7);
  // Branded shop facade. Logo texture is the official SVG served locally.
  const mcdFacade = new T.Group();
  mcdFacade.name = 'mcdonalds';
  mcdFacade.position.set(40, 0, -78.4);
  scene.add(mcdFacade);
  box(29, 1.8, 0.45, '#bd1728', 0, 5.5, 0, mcdFacade);
  box(29, 0.3, 2, '#2b2925', 0, 4.5, 0.4, mcdFacade);
  box(29, 3.7, 0.28, '#27322e', 0, 2.1, -0.05, mcdFacade);
  for (const x of [-11, -6, 6, 11]) {
    box(4.4, 2.7, 0.12, '#b8b99b', x, 2, 0.14, mcdFacade);
    box(0.12, 3.6, 0.3, '#2d3536', x + 2.3, 2, 0.25, mcdFacade);
  }
  box(4, 3.3, 0.15, '#506e73', 0, 1.8, 0.21, mcdFacade);
  box(0.12, 3.3, 0.23, '#ddd1ac', 0, 1.8, 0.4, mcdFacade);
  box(0.07, 0.7, 0.15, '#e9e4d8', -0.28, 1.7, 0.52, mcdFacade);
  sign('McDonald’s', 17, 43, 5.5, -78, '#bd1728');
  const loadTexture = (url: string) => {
    const texture = new T.TextureLoader().load(url);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
  };
  const arches = new T.Mesh(
    new T.PlaneGeometry(2.8, 2.8),
    new T.MeshBasicMaterial({
      map: loadTexture('/mcd/logo.svg'),
      transparent: true,
    }),
  );
  arches.position.set(-11, 5.6, 0.3);
  mcdFacade.add(arches);
  box(0.3, 8, 0.3, '#333839', -17, 4, 2, mcdFacade);
  box(3.8, 3.8, 0.4, '#bd1728', -17, 8, 2, mcdFacade);
  const poleLogo = arches.clone();
  poleLogo.position.set(-17, 8, 2.25);
  poleLogo.scale.setScalar(1.2);
  mcdFacade.add(poleLogo);
  box(2.5, 3, 0.4, '#242424', 8, 1.65, 1.2, mcdFacade);
  const menuPhoto = new T.Mesh(
    new T.PlaneGeometry(2.2, 1.5),
    new T.MeshBasicMaterial({
      map: loadTexture('/mcd/bigmac.png'),
      color: '#ffffff',
    }),
  );
  menuPhoto.position.set(8, 1.9, 1.43);
  mcdFacade.add(menuPhoto);
  const bbqFacade = new T.Group();
  bbqFacade.name = 'bbq-chicken';
  bbqFacade.position.set(-100, 0, -53.7);
  bbqFacade.rotation.y = Math.PI;
  scene.add(bbqFacade);
  box(29, 2.1, 0.45, '#24262a', 0, 5.8, 0, bbqFacade);
  box(29, 1.1, 0.5, '#a62830', 0, 3.85, 0.12, bbqFacade);
  box(29, 3, 0.22, '#282d31', 0, 1.6, 0, bbqFacade);
  for (let x = -14; x < 15; x += 0.45)
    box(0.07, 1.05, 0.06, '#de5960', x, 3.85, 0.4, bbqFacade);
  for (const x of [-10, -5, 5, 10]) {
    box(4.5, 2.5, 0.12, '#9caba7', x, 1.7, 0.15, bbqFacade);
    box(0.13, 2.9, 0.2, '#d5b978', x + 2.3, 1.6, 0.27, bbqFacade);
  }
  box(3.7, 2.8, 0.15, '#537574', 0, 1.5, 0.25, bbqFacade);
  box(0.1, 2.8, 0.2, '#dcbd7b', 0, 1.5, 0.36, bbqFacade);
  const bbqSign = sign('OLIVE CHICKEN', 19, -103, 5.8, -54, '#24262a');
  bbqSign.rotation.y = Math.PI;
  const bbqLogo = new T.Mesh(
    new T.PlaneGeometry(5.5, 2.4),
    new T.MeshBasicMaterial({
      map: loadTexture('/bbq/logo.svg'),
      transparent: true,
    }),
  );
  bbqLogo.position.set(-11, 5.8, 0.31);
  bbqFacade.add(bbqLogo);
  const bbqBoard = new T.Mesh(
    new T.PlaneGeometry(2.8, 2.5),
    new T.MeshBasicMaterial({ map: loadTexture('/bbq/golden.jpg') }),
  );
  bbqBoard.position.set(9, 1.9, 0.5);
  bbqFacade.add(bbqBoard);
  for (const x of [-11, -5, 5, 11])
    box(0.7, 0.15, 0.35, '#fff0b0', x, 4.45, 0.5, bbqFacade);
  function tree(x: number, z: number) {
    if (
      isRoadSurface(x, z, 2.8) ||
      PLACES.some((p) => Math.hypot(p.x - x, p.z - z) < 5.5)
    )
      return;
    solids.push({ x, z, w: 0.6, d: 0.6, h: 4 });
    box(0.5, 4, 0.5, '#625843', x, 2, z);
    const m = new T.Mesh(new T.IcosahedronGeometry(2.5, 1), mat('#52775a'));
    m.name = 'street-tree';
    m.userData = { x, z };
    m.scale.y = 1.25;
    m.position.set(x, 5, z);
    m.castShadow = true;
    scene.add(m);
  }
  for (let i = -105; i <= 105; i += 15) {
    if (Math.abs(i) > 12) {
      tree(i, 15);
      tree(i, -15);
    }
    if (Math.abs(i) > 20) tree(13, i);
  }
  for (let i = 0; i < 18; i++) {
    const x = -110 + ((i * 37) % 220),
      z = i % 2 ? 119 : -119;
    box(13, 25 + (i % 5) * 8, 12, '#93a2a0', x, 12 + (i % 5) * 4, z);
  }
  const lamps: {
    mesh: T.Group;
    x: number;
    z: number;
    broken: boolean;
    fall: number;
    axis: T.Vector3;
  }[] = [];
  for (let i = -100; i <= 100; i += 30) {
    const pole = new T.Group();
    pole.position.set(i, 0, 11);
    box(0.17, 7, 0.17, '#384443', 0, 3.5, 0, pole);
    box(2, 0.18, 0.5, '#d3ccab', 0.7, 7, 0, pole);
    scene.add(pole);
    lamps.push({
      mesh: pole,
      x: i,
      z: 11,
      broken: false,
      fall: 0,
      axis: new T.Vector3(1, 0, 0),
    });
    box(2, 1, 0.6, '#7b5e46', i, 0.6, 17);
    solids.push({ x: i, z: 17, w: 2, d: 0.6, h: 1.1 });
  }
  box(2, 24, 2, '#927664', -98, 12, -42);
  box(2, 20, 2, '#927664', -93, 10, -42);
  sign('성수역  ②', 12, 3, 7, -13, '#245e45');
  box(0.3, 7, 0.3, '#697368', -3, 3.5, -13);
  box(0.3, 7, 0.3, '#697368', 9, 3.5, -13);
  let carIndex = 0;
  function car(color: string, x: number, z: number) {
    const g = sportsCar(carIndex++ % 3, color);
    g.position.set(x, 0, z); scene.add(g); return g;
  }
  const room = new T.Group();
  room.position.set(300, 0, 0);
  scene.add(room);
  const roomFloor = box(9, 0.2, 8, '#756b5d', 0, -0.1, 0, room);
  const roomWalls = [
    box(9, 3.1, 0.15, '#aab2a9', 0, 1.55, -4, room),
    box(0.15, 3.1, 8, '#969d91', -4.5, 1.55, 0, room),
  ];
  // Open doorway faces the camera; crossing its threshold leaves the room.
  for (const x of [-0.95, 0.95])
    box(0.13, 2.7, 0.18, '#d7c7a2', x, 1.35, 3.7, room);
  box(2.05, 0.15, 0.18, '#d7c7a2', 0, 2.72, 3.7, room);
  box(1.8, 0.06, 1.2, '#99bb9c', 0, 0.04, 3.8, room);
  box(2.2, 0.2, 2, '#756b5d', 0, -0.1, 4.6, room);
  sign('출입문 · 걸어서 외출', 4.2, 300, 3.3, 3.8, '#253c35');
  const decorations = new Map<DecorId, T.Group>();
  const decorGroup = (id: DecorId) => {
    const group = new T.Group();
    group.name = 'decor-' + id;
    room.add(group);
    decorations.set(id, group);
    return group;
  };
  const rug = decorGroup('rug');
  box(2.3, 0.025, 1.6, '#caaa7b', 0, 0.025, 0, rug);
  for (let i = -1; i <= 1; i++)
    box(0.06, 0.028, 1.6, '#597a79', i * 0.65, 0.04, 0, rug);
  const plant = decorGroup('plant');
  box(0.48, 0.45, 0.48, '#aa7959', 0, 0.225, 0, plant);
  for (let i = 0; i < 5; i++) {
    const leaf = new T.Mesh(new T.SphereGeometry(0.26, 8, 6), mat('#729a64'));
    leaf.scale.set(0.7, 1.8, 0.6);
    leaf.position.set(Math.sin(i * 2) * 0.15, 0.7, Math.cos(i * 2) * 0.15);
    leaf.rotation.z = Math.sin(i) * 0.5;
    plant.add(leaf);
  }
  const lamp = decorGroup('lamp');
  box(0.12, 1.1, 0.12, '#a8a183', 0, 0.55, 0, lamp);
  const shade = new T.Mesh(new T.ConeGeometry(0.4, 0.45, 12), mat('#f3d998'));
  shade.position.y = 1.25;
  lamp.add(shade);
  const moodLight = new T.PointLight('#ffd298', 18, 7, 2);
  moodLight.position.y = 1.1;
  lamp.add(moodLight);
  const shelf = decorGroup('shelf');
  for (const y of [0.1, 0.6, 1.1])
    box(1.1, 0.09, 0.45, '#9d7c53', 0, y, 0, shelf);
  for (const x of [-0.51, 0.51])
    box(0.08, 1.15, 0.45, '#887150', x, 0.57, 0, shelf);
  for (let i = 0; i < 4; i++)
    box(
      0.15,
      0.35,
      0.3,
      ['#657d91', '#b88b76', '#8e9b72', '#d0bb87'][i],
      -0.3 + i * 0.19,
      0.85,
      0,
      shelf,
    );
  const poster = decorGroup('poster');
  box(1.35, 1.6, 0.05, '#cfb787', 0, 1.6, 0, poster);
  box(1.15, 1.4, 0.07, '#305d62', 0, 1.6, 0.02, poster);
  box(0.7, 0.16, 0.08, '#d9ef8d', 0, 1.7, 0.07, poster);
  box(0.4, 0.08, 0.08, '#d9ef8d', 0, 1.35, 0.07, poster);
  box(2.7, 0.75, 3.8, '#756653', -2.5, 0.45, -0.6, room);
  const mattress = box(2.6, 0.24, 3.6, '#b0bfab', -2.5, 0.93, -0.6, room);
  box(2, 0.18, 0.65, '#e8e5d6', -2.5, 1.13, -1.9, room);
  box(1.3, 2.2, 1, '#bdc4bb', 3.25, 1.1, -3.25, room);
  box(1.25, 0.07, 1.02, '#6e7771', 3.25, 1.3, -3.25, room);
  box(2.6, 1.1, 1.1, '#8f9690', 0.8, 0.55, -3.25, room);
  box(2.65, 0.1, 1.15, '#d0d6ca', 0.8, 1.15, -3.25, room);
  box(0.75, 0.45, 0.65, '#c5c9be', 0.4, 1.45, -3.25, room);
  box(0.58, 0.25, 0.02, '#3c514f', 0.4, 1.45, -2.91, room);
  box(2.2, 0.15, 1.2, '#967658', 2.8, 1.2, 2, room);
  for (const x of [1.85, 3.75]) box(0.12, 1.2, 0.8, '#545b56', x, 0.6, 2, room);
  box(0.8, 0.5, 0.06, '#263b3e', 2.8, 1.55, 1.8, room);
  box(1, 0.6, 0.7, '#655a4b', 2.8, 0.3, 3, room);
  box(2.7, 0.65, 0.06, '#5d8e9d', -2, 2.45, -3.9, room);
  for (const x of [-3.2, -2, -0.8])
    box(0.06, 0.75, 0.12, '#566a64', x, 2.45, -3.85, room);
  box(0.15, 2, 0.15, '#686e62', 4, 1, 0.1, room);
  box(0.9, 0.12, 0.2, '#686e62', 3.7, 2, 0.1, room);
  const office = new T.Group();
  office.name = 'office-interior';
  scene.add(office);
  const officeFloors: T.Group[] = [];
  for (let floor = 0; floor < 2; floor++) {
    const level = new T.Group();
    level.position.set(400, floor * 5, 0);
    office.add(level);
    officeFloors.push(level);
    box(12, 0.15, 9, '#c7cdd0', 0, -0.12, 0, level);
    box(12, 3.4, 0.15, '#b8c8c5', 0, 1.6, -4.5, level);
    box(0.15, 3.4, 9, '#a4b8b8', -6, 1.6, 0, level);
    for (const x of [-2, 2]) box(0.15, 3.4, 2, '#899b9d', x, 1.6, -3.5, level);
    box(3.4, 0.15, 2.8, '#5e6a70', 0, 3.25, -3.1, level);
    box(1.3, 2.6, 0.13, '#60766f', 4, 1.25, -4.35, level);
    const label = sign(
      floor ? '201 · 배달 수령' : 'LOBBY · 1F',
      4,
      404,
      2.9 + floor * 5,
      -4.22,
    );
    level.attach(label);
    const number = sign(floor ? '2F' : '1F', 1.3, 400, 2.8 + floor * 5, -4.2);
    level.attach(number);
    if (floor) {
      const person = createHuman('#cbb697', SKIN_TONES[3]);
      person.root.position.set(4, 0, 1);
      level.add(person.root);
    }
  }
  const lift = new T.Group();
  lift.position.set(400, 0, -3.1);
  office.add(lift);
  box(3.3, 0.2, 2.4, '#555f67', 0, -0.03, 0, lift);
  box(3.3, 3, 0.1, '#a3adb4', 0, 1.5, -1.2, lift);
  const liftDoors = [
    box(1.6, 2.8, 0.1, '#8e999e', -0.82, 1.4, 1.16, lift),
    box(1.6, 2.8, 0.1, '#8e999e', 0.82, 1.4, 1.16, lift),
  ];
  const officeLight = new T.PointLight('#f0f8ff', 95, 24, 2);
  officeLight.position.set(400, 8, 0);
  scene.add(officeLight);
  function enterOffice() {
    if (life.inside || driving || riding || hp <= 0) return;
    buildingFloor = 1;
    panel = null;
    clear();
    player.position.set(400, 0, 2.5);
    yaw = orbit = 0;
    camera.position.set(405, 7, 8);
    lastHud = 0;
  }
  function operateElevator() {
    if (paused || hp <= 0) return;
    if (buildingFloor === null) {
      if (nearby === 'office') enterOffice();
      return;
    }
    if (
      liftRemaining ||
      Math.hypot(player.position.x - 400, player.position.z + 3.1) > 1.55
    )
      return;
    liftFrom = (buildingFloor - 1) * 5;
    liftTo = buildingFloor === 1 ? 5 : 0;
    liftRemaining = 2.8;
    clear();
    panel = null;
    player.position.set(400, liftFrom, -3.1);
  }
  function updateOffice(dt: number) {
    office.visible = officeLight.visible = buildingFloor !== null;
    officeFloors.forEach((g, i) => (g.visible = buildingFloor === i + 1));
    if (buildingFloor === null) return;
    if (liftRemaining > 0 && !paused) {
      liftRemaining = Math.max(0, liftRemaining - dt);
      const t = 1 - liftRemaining / 2.8;
      const ease = t * t * (3 - 2 * t);
      lift.position.y = liftFrom + (liftTo - liftFrom) * ease;
      player.position.set(400, lift.position.y, -3.1);
      if (!liftRemaining) {
        buildingFloor = liftTo === 5 ? 2 : 1;
        lastHud = 0;
        say(buildingFloor + '층에 도착했습니다.');
      }
    } else lift.position.y = (buildingFloor - 1) * 5;
    liftDoors[0].position.x = liftRemaining ? -0.82 : -2.3;
    liftDoors[1].position.x = liftRemaining ? 0.82 : 2.3;
    if (buildingFloor === 1 && player.position.z > 3.8 && !liftRemaining) {
      buildingFloor = null;
      player.position.set(100, 0, 60);
      dismissedPlace = 'office';
      panel = null;
      clear();
    }
  }
  const roomLight = new T.PointLight('#fff0c9', 55, 18, 2);
  roomLight.position.set(300, 4, 1);
  scene.add(roomLight);
  function scooter(color: string, x: number, z: number, tier = 0) {
    const g = createMotorcycle(color, tier);
    g.position.set(x, 0, z);
    scene.add(g);
    return g;
  }
  const bike = scooter(
    '#84b9ae',
    life.bikeX,
    life.bikeZ,
    Math.max(0, life.bikeTier),
  );
  bike.name = 'player-bike';
  const deliveryBox = box(0.85, 0.7, 0.8, '#e1e581', 0, 1.55, -0.65, bike);
  const placeMarkers = PLACES.map((p) => {
    const mesh = new T.Mesh(
      new T.RingGeometry(4.55, 4.7, 48),
      new T.MeshBasicMaterial({
        color: p.color,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p.x, 0.16, p.z);
    scene.add(mesh);
    if (p.id !== 'burger' && p.id !== 'bbq')
      sign(
        p.name,
        Math.min(14, p.name.length * 0.8),
        p.x,
        3.6,
        p.z - 1.8,
        '#1e3438',
      );
    return mesh;
  });
  const streetLights = lamps.map((l) => {
    const light = new T.PointLight('#ffdc9c', 0, 22, 2);
    light.position.set(l.x, 6.8, l.z);
    scene.add(light);
    return light;
  });
  // Illuminate the north/south streets as well as the main avenue.
  const alleyLights: T.PointLight[] = [];
  for (const z of [-76, -12, 76])
    for (const x of [-82, -12, 82]) {
      const pole = new T.Group();
      pole.position.set(x, 0, z);
      box(0.17, 6, 0.17, '#3a4952', 0, 3, 0, pole);
      const bulb = box(0.8, 0.22, 0.65, '#fff1c9', 0.3, 6, 0, pole);
      bulb.material = new T.MeshStandardMaterial({
        color: '#fff1c9',
        emissive: '#ffdb99',
        emissiveIntensity: 2,
      });
      scene.add(pole);
      const light = new T.PointLight('#ffe3b2', 0, 40, 1.3);
      light.position.set(x, 5.8, z);
      scene.add(light);
      alleyLights.push(light);
    }
  const rainGeometry = new T.BufferGeometry(),
    rainPositions = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 90;
    rainPositions[i * 3 + 1] = Math.random() * 35;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  rainGeometry.setAttribute(
    'position',
    new T.BufferAttribute(rainPositions, 3),
  );
  const rain = new T.Points(
    rainGeometry,
    new T.PointsMaterial({
      color: '#b9dae7',
      size: 0.11,
      transparent: true,
      opacity: 0.65,
    }),
  );
  scene.add(rain);
  let ride = car('#df7740', 5, 8);
  type Vehicle = {
    stuck: number;
    outFor: number;
    progressX: number;
    progressZ: number;
    driverOut: boolean;
    driverId: number;
    burnTime: number;
    exploded: boolean;
    respawnTime: number;
    hp: number;
    bar: T.Group;
    fill: T.Mesh;
    fire: T.Group;
    mesh: T.Group;
    physics: Body;
    route: T.Vector3[];
    waypoint: number;
    cruise: number;
    spawn: Body;
  };
  const vehicles: Vehicle[] = [];
  function vehicle(
    mesh: T.Group,
    angle: number,
    route: T.Vector3[] = [],
    waypoint = 0,
    cruise = 9,
  ) {
    const p = body(mesh.position.x, mesh.position.z, angle);
    const bar = new T.Group();
    const bg = new T.Mesh(
      new T.PlaneGeometry(2.7, 0.25),
      new T.MeshBasicMaterial({ color: '#142229' }),
    );
    bar.add(bg);
    const fill = new T.Mesh(
      new T.PlaneGeometry(2.6, 0.17),
      new T.MeshBasicMaterial({ color: '#83c9ec' }),
    );
    fill.position.z = 0.01;
    bar.add(fill);
    scene.add(bar);
    const fire = new T.Group();
    for (let i = 0; i < 9; i++) {
      const flame = new T.Mesh(
        new T.ConeGeometry(0.25 + (i % 3) * 0.12, 1.4 + (i % 2) * 0.5, 7),
        new T.MeshBasicMaterial({
          color: i % 2 ? '#ffcd42' : '#f56522',
          transparent: true,
          opacity: 0.85,
        }),
      );
      flame.position.set(
        ((i % 3) - 1) * 0.55,
        1.5,
        Math.floor(i / 3) * 0.65 - 0.2,
      );
      fire.add(flame);
    }
    for (let i = 0; i < 5; i++) {
      const smoke = new T.Mesh(
        new T.IcosahedronGeometry(0.7, 1),
        new T.MeshBasicMaterial({
          color: '#343738',
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
      );
      smoke.position.set(0, 3 + i * 0.7, 0);
      fire.add(smoke);
    }
    fire.visible = false;
    mesh.add(fire);
    const v = {
      stuck: 0,
      outFor: 0,
      progressX: p.x,
      progressZ: p.z,
      driverOut: false,
      driverId: -1,
      burnTime: 0,
      exploded: false,
      respawnTime: 0,
      hp: 100,
      bar,
      fill,
      fire,
      mesh,
      physics: p,
      route,
      waypoint,
      cruise,
      spawn: { ...p },
    };
    mesh.rotation.y = angle;
    mesh.name = 'car-' + vehicles.length;
    vehicles.push(v);
    return v;
  }
  let controlled: Vehicle = vehicle(ride, 0);
  const loop = [
    new T.Vector3(-65, 0, 5),
    new T.Vector3(65, 0, 5),
    new T.Vector3(65, 0, 60),
    new T.Vector3(-65, 0, 60),
  ];
  controlled.route = loop;
  controlled.waypoint = 1;
  controlled.cruise = 6;
  controlled.physics.angle = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const route =
      i < 4 ? loop : loop.map((p) => new T.Vector3(p.x, 0, -p.z)).reverse();
    const index = i % 4,
      next = (index + 1) % 4,
      start = route[index].clone().lerp(route[next], 0.25);
    const heading = Math.atan2(
      route[next].x - start.x,
      route[next].z - start.z,
    );
    vehicle(
      car(
        ['#d8d9cd', '#426d70', '#beb99d', '#8c5959'][i % 4],
        start.x,
        start.z,
      ),
      heading,
      route,
      next,
      7 + (i % 3),
    );
  }
  const patrolCars = vehicles.slice(-2);
  const patrolLights = patrolCars.map((v) => {
    box(2.02, 0.22, 1.9, '#2b5a8b', 0, 1.94, -0.15, v.mesh);
    const light = new T.PointLight('#538fff', 0, 18, 2);
    light.position.set(0, 2.5, 0);
    v.mesh.add(light);
    box(0.65, 0.15, 0.4, '#d3504b', -0.36, 2.16, 0, v.mesh);
    box(0.65, 0.15, 0.4, '#5a9fe8', 0.36, 2.16, 0, v.mesh);
    return light;
  });
  const lastKnown = new T.Vector3(life.playerX, 0, life.playerZ);
  let hp = life.hp,
    hurtTimer = 0;
  let attackTime = 0,
    attackCooldown = 0,
    notice = '',
    noticeTime = 0,
    shake = 0,
    accumulator = 0;
  const sparks: T.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const spark = new T.Mesh(
      new T.BoxGeometry(0.1, 0.1, 0.35),
      new T.MeshBasicMaterial({ color: '#ffe495' }),
    );
    spark.visible = false;
    scene.add(spark);
    sparks.push(spark);
  }
  let sparkLife = 0;
  const sparkOrigin = new T.Vector3();
  function impactEffect(x: number, z: number, power: number) {
    if (power < 3) return;
    shake = Math.min(0.6, power * 0.025);
    sparkLife = 0.35;
    sparkOrigin.set(x, 1, z);
    notice = '충돌! 차량이 충격 방향으로 밀려납니다';
    noticeTime = 1.7;
  }

  const playerRig = createHuman('#eee8d5');
  const player = playerRig.root;
  player.name = 'player';
  const legs = playerRig.legs;
  scene.add(player);
  player.position.set(
    life.inside ? 300 : life.playerX,
    0,
    life.inside ? 1 : life.playerZ,
  );
  const people: {
    deathHandled: boolean;
    female: boolean;
    mesh: T.Group;
    state: Person;
    spawn: Person;
    bar: T.Group;
    fill: T.Mesh;
    arm: T.Bone;
    rig: HumanRig;
    role: Occupation;
    path: Point[];
    goal: string;
    activity: string;
    active: boolean;
    wait: number;
    phase: number;
    vehicle: T.Group | null;
  }[] = [];
  function addPerson(i: number, x: number, z: number) {
    const female = FEMALE_RESIDENT_IDS.includes(i);
    const rig = createHuman(
      female
        ? ['#b597bb', '#c1aaa1', '#95aaba'][i % 3]
        : ['#61787f', '#c8b594', '#914f40'][i % 3],
      SKIN_TONES[i % SKIN_TONES.length],
      HAIR_COLORS[Math.floor(i / 3) % HAIR_COLORS.length],
      female,
    );
    const g = rig.root;
    g.name = 'npc-' + i;
    g.position.set(x, 0, z);
    scene.add(g);
    const state = person(i, g.position.x, g.position.z);
    const bar = new T.Group();
    const bg = new T.Mesh(
      new T.PlaneGeometry(2, 0.24),
      new T.MeshBasicMaterial({ color: '#182526', side: T.DoubleSide }),
    );
    bar.add(bg);
    const fill = new T.Mesh(
      new T.PlaneGeometry(1.9, 0.15),
      new T.MeshBasicMaterial({ color: '#86df88', side: T.DoubleSide }),
    );
    fill.position.z = 0.01;
    bar.add(fill);
    scene.add(bar);
    const arm = rig.arms[1];
    const role: Occupation = i >= 30 ? '직장인' : roles[i % roles.length];
    const npc = {
      deathHandled: false,
      female,
      mesh: g,
      state,
      spawn: { ...state },
      bar,
      fill,
      arm,
      rig,
      role,
      path: [] as Point[],
      goal: '',
      activity: '동네 산책',
      active: true,
      wait: 0,
      phase: 0,
      vehicle: role === '배달기사' ? scooter('#6caaa8', x, z) : null,
    };
    if (role === '경찰') {
      box(0.4, 0.14, 0.4, '#283d67', 0, 2.13, 0, g);
      box(0.22, 0.15, 0.04, '#efcf74', 0.18, 1.6, 0.22, g);
    }
    if (npc.vehicle) {
      npc.vehicle.name = 'npc-bike-' + i;
      box(0.85, 0.7, 0.8, '#e1e581', 0, 1.55, -0.65, npc.vehicle);
    }
    people.push(npc);
    return npc;
  }
  const RESIDENTS = 30;
  for (let i = 0; i < RESIDENTS; i++)
    addPerson(i, -100 + (i % 12) * 17, [-16, 16, 55][Math.floor(i / 12)]);
  const ring = new T.Mesh(
    new T.TorusGeometry(3, 0.13, 8, 40),
    new T.MeshBasicMaterial({ color: '#eaff79' }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const beam = new T.Mesh(
    new T.CylinderGeometry(0.8, 0.8, 16, 16, 1, true),
    new T.MeshBasicMaterial({
      color: '#eaff79',
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  scene.add(beam);
  let driving = false,
    speed = 0,
    yaw = 0,
    orbit = 0.5,
    paused = false,
    frame = 0,
    last = performance.now(),
    elapsed = 0,
    lastHud = 0,
    drag = false,
    px = 0,
    py = 0,
    pitch = 0.6;
  const keys: Record<string, boolean> = {};
  const analog = { x: 0, y: 0 };
  const abandonedBikes: { mesh: T.Group; id: number }[] = [];
  const cashMeshes = new Map<number, T.Group>();
  const bikeBounds = (g: T.Group): VehicleBounds => ({
    x: g.position.x,
    z: g.position.z,
    angle: g.rotation.y,
    halfWidth: 0.43,
    halfLength: 1.05,
  });
  const obstacleBounds = () => [
    ...vehicles
      .filter((v) => !v.exploded)
      .map((v) => ({
        x: v.physics.x,
        z: v.physics.z,
        angle: v.physics.angle,
        halfWidth: 1.22,
        halfLength: 2.18,
      })),
    ...(life.bikeTier >= 0 && !riding ? [bikeBounds(bike)] : []),
    ...people
      .filter((p) => p.vehicle && p.active)
      .map((p) => bikeBounds(p.vehicle!)),
    ...abandonedBikes.map((b) => bikeBounds(b.mesh)),
  ];
  const blocked = (x: number, z: number, r: number) =>
    Math.abs(x) > 113 ||
    Math.abs(z) > 110 ||
    solids.some(
      (b) => Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r,
    );
  const playerBlocked = (x: number, z: number, r: number) =>
    buildingFloor !== null
      ? Math.abs(x - 400) > 6 - r || Math.abs(z) > 4.5 - r
      : life.inside
        ? Math.abs(x - 300) > 4.2 - r ||
          (Math.abs(z) > 3.7 - r &&
            !(Math.abs(x - 300) < 0.7 && z > 0 && z < 5)) ||
          (x < 298.9 && z < 1.4 && z > -2.8)
        : blocked(x, z, r) ||
          obstacleBounds().some(
            (b) => circleVehicleCorrection(x, z, r, b) !== null,
          );
  let triggerHeld = false;
  let armed = false,
    jumpVelocity = 0,
    shotCooldown = 0,
    shotTime = 0;
  let ads = false,
    rightDownAt = 0,
    rightMoved = 0,
    adsBefore = false;
  let weapon = 0;
  const gun = new T.Group();
  gun.add(weaponModel(0));
  gun.position.set(0.37, 1.46, 0.6);
  gun.visible = false;
  player.add(gun);
  const viewGun = gun.clone();
  viewGun.name = 'ads-weapon';
  viewGun.position.set(0, -0.155, -0.5);
  viewGun.rotation.y = Math.PI;
  viewGun.scale.setScalar(0.75);
  viewGun.visible = false;
  camera.add(viewGun);
  scene.add(camera);
  box(0.035, 0.065, 0.035, '#b7d9a7', 0, 0.105, 0.17, viewGun);
  box(0.11, 0.04, 0.035, '#252c2d', 0, 0.08, -0.14, viewGun);
  const flashTexture = loadTexture('/fx/muzzle_01.png'),
    sparkTexture = loadTexture('/fx/spark_03.png'),
    smokeTexture = loadTexture('/fx/smoke_01.png'),
    scorchTexture = loadTexture('/fx/scorch_01.png');
  const flash = new T.Sprite(
    new T.SpriteMaterial({
      map: flashTexture,
      color: '#ffdda2',
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  flash.scale.set(0.8, 0.8, 1);
  const adsFlash = new T.Sprite(
    new T.SpriteMaterial({
      map: flashTexture,
      color: '#ffdda2',
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  adsFlash.position.set(0, 0, 0.4);
  adsFlash.scale.set(0.9, 0.9, 1);
  adsFlash.visible = false;
  viewGun.add(adsFlash);
  const shotLight = new T.PointLight('#ffd496', 0, 7, 1.5);
  scene.add(shotLight);
  const tracer = new T.Mesh(
    new T.CylinderGeometry(0.008, 0.008, 1, 6),
    new T.MeshBasicMaterial({
      color: '#ffedb7',
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  tracer.name = 'bullet-tracer';
  tracer.visible = false;
  scene.add(tracer);
  const impactEffects: {
    object: T.Sprite | T.Mesh;
    ttl: number;
    max: number;
    velocity: T.Vector3;
  }[] = [];
  function impactParticles(point: T.Vector3, normal: T.Vector3, mark: boolean) {
    for (let i = 0; i < 5; i++) {
      const smoke = i === 4,
        object = new T.Sprite(
          new T.SpriteMaterial({
            map: smoke ? smokeTexture : sparkTexture,
            color: smoke ? '#b7b4aa' : '#ffce83',
            transparent: true,
            blending: smoke ? T.NormalBlending : T.AdditiveBlending,
            depthWrite: false,
          }),
        );
      object.name = smoke ? 'bullet-smoke' : 'bullet-spark';
      object.position.copy(point).addScaledVector(normal, 0.05);
      object.scale.setScalar(smoke ? 0.65 : 0.22);
      scene.add(object);
      impactEffects.push({
        object,
        ttl: smoke ? 0.8 : 0.25,
        max: smoke ? 0.8 : 0.25,
        velocity: normal
          .clone()
          .multiplyScalar(smoke ? 0.3 : 1.5)
          .add(
            new T.Vector3(
              (Math.random() - 0.5) * 1.5,
              smoke ? 0.8 : Math.random(),
              (Math.random() - 0.5) * 1.5,
            ),
          ),
      });
    }
    if (mark) {
      const object = new T.Mesh(
        new T.PlaneGeometry(0.26, 0.26),
        new T.MeshBasicMaterial({
          map: scorchTexture,
          color: '#514739',
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        }),
      );
      object.name = 'bullet-mark';
      object.position.copy(point).addScaledVector(normal, 0.015);
      object.lookAt(point.clone().add(normal));
      scene.add(object);
      impactEffects.push({
        object,
        ttl: 12,
        max: 12,
        velocity: new T.Vector3(),
      });
    }
    while (impactEffects.length > 96) {
      const old = impactEffects.shift()!;
      scene.remove(old.object);
      if (old.object instanceof T.Mesh) old.object.geometry.dispose();
      (old.object.material as T.Material).dispose();
    }
  }
  function updateShotEffects(dt: number) {
    for (let i = impactEffects.length - 1; i >= 0; i--) {
      const e = impactEffects[i];
      e.ttl -= dt;
      e.object.position.addScaledVector(e.velocity, dt);
      (e.object.material as T.Material).opacity = Math.min(
        1,
        e.ttl / (e.max * 0.4),
      );
      if (e.ttl <= 0) {
        scene.remove(e.object);
        if (e.object instanceof T.Mesh) e.object.geometry.dispose();
        (e.object.material as T.Material).dispose();
        impactEffects.splice(i, 1);
      }
    }
    tracer.visible = shotTime > 0.02;
    adsFlash.visible = ads && shotTime > 0;
    shotLight.intensity = shotTime > 0 ? 12 : 0;
  }
  flash.position.z = 0.3;
  flash.visible = false;
  gun.add(flash);
  const trail = new T.Line(
    new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
    new T.LineBasicMaterial({
      color: '#ffe28a',
      transparent: true,
      opacity: 0.85,
    }),
  );
  trail.visible = false;
  scene.add(trail);
  const damageNumbers: { sprite: T.Sprite; ttl: number }[] = [];
  let previousHp = hp;
  function floatingDamage(amount: number) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.font = '900 82px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#571914';
    ctx.strokeText('-' + Math.round(amount), 128, 64);
    ctx.fillStyle = '#ff756b';
    ctx.fillText('-' + Math.round(amount), 128, 64);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(
      new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    );
    sprite.name = 'damage-number';
    sprite.userData.amount = amount;
    sprite.scale.set(1.25, 0.625, 1);
    sprite.position
      .copy(activePosition())
      .add(new T.Vector3(((damageNumbers.length % 3) - 1) * 0.35, 2.8, 0));
    if (ads)
      sprite.position
        .copy(camera.position)
        .addScaledVector(camera.getWorldDirection(new T.Vector3()), 2)
        .add(new T.Vector3(0.35, 0.25, 0));
    scene.add(sprite);
    damageNumbers.push({ sprite, ttl: 1.05 });
  }
  function updateDamage(dt: number) {
    if (hp < previousHp) floatingDamage(previousHp - hp);
    previousHp = hp;
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const d = damageNumbers[i];
      d.ttl -= dt;
      d.sprite.position.y += dt * 0.9;
      d.sprite.material.opacity = Math.min(1, d.ttl * 2);
      if (d.ttl <= 0) {
        scene.remove(d.sprite);
        d.sprite.material.map?.dispose();
        d.sprite.material.dispose();
        damageNumbers.splice(i, 1);
      }
    }
  }
  const guests = new Map<
    string,
    {
      rig: HumanRig;
      label: T.Sprite;
      labelText: string;
      target: Peer;
      vehicle: T.Group | null;
      companion: HumanRig | null;
      samples: MotionSample[];
    }
  >();
  function nameLabel(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#112a35dd';
    ctx.fillRect(0, 0, 512, 96);
    ctx.font = 'bold 34px Arial, Malgun Gothic';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8f5df';
    ctx.fillText(text, 256, 48, 490);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(
      new T.SpriteMaterial({ map: texture, depthTest: false }),
    );
    sprite.scale.set(3.8, 0.71, 1);
    return sprite;
  }
  function disposeGuestVehicle(root: T.Group | null) {
    if (!root) return;
    scene.remove(root);
    root.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
    });
  }
  function removeGuest(id: string) {
    const g = guests.get(id);
    if (!g) return;
    scene.remove(g.rig.root, g.label);
    if (g.companion) {
      scene.remove(g.companion.root);
      g.companion.root.traverse(o => { if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();} });
    }
    disposeGuestVehicle(g.vehicle);
    g.label.material.map?.dispose();
    g.label.material.dispose();
    const materials = new Set<T.Material>();
    g.rig.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          materials.add(m);
      }
    });
    materials.forEach((m) => m.dispose());
    guests.delete(id);
  }
  let peerAttack: (id: string, kind: 'gun' | 'punch') => void = () => {};
  const currentScene = () =>
    buildingFloor !== null
      ? 'office:' + buildingFloor
      : life.inside
        ? 'home'
        : 'outdoors';
  function setPeers(peers: Peer[]) {
    const ids = new Set(peers.map((p) => p.id));
    for (const id of guests.keys()) if (!ids.has(id)) removeGuest(id);
    for (const p of peers) {
      let g = guests.get(p.id);
      const text =
        p.name +
        ((p.hp ?? 100) <= 0
          ? ' · 쓰러짐'
          : ' · HP ' + Math.round(p.hp ?? 100)) +
        (p.emote ? ' · ' + p.emote : '');
      if (!g) {
        const seed = avatarSeed(p.id);
        const rig = createHuman(
          ['#829dd3', '#cc9977', '#80aaa1'][seed % 3],
          SKIN_TONES[seed % 6],
          HAIR_COLORS[Math.floor(seed / 6) % 6],
          seed % 3 === 0,
        );
        rig.root.name = 'guest-' + p.id;
        rig.root.position.set(p.x, 0, p.z);
        const label = nameLabel(text);
        g = {
          rig,
          label,
          labelText: text,
          target: p,
          vehicle: null,
          companion: null,
          samples: [{ ...p, at: performance.now() }],
        };
        guests.set(p.id, g);
        scene.add(rig.root, label);
      }
      if (g.labelText !== text) {
        scene.remove(g.label);
        g.label.material.map?.dispose();
        g.label.material.dispose();
        g.label = nameLabel(text);
        g.labelText = text;
        scene.add(g.label);
      }
      if (g.target.mode !== p.mode || (!g.vehicle && p.mode !== 'walk')) {
        disposeGuestVehicle(g.vehicle);
        g.vehicle =
          p.mode === 'car'
            ? car('#7a8ab5', p.x, p.z)
            : p.mode === 'bike'
              ? scooter('#829dd3', p.x, p.z)
              : null;
      }
      if (p.at === undefined || p.at !== g.target.at) {
        if (
          p.scene !== g.target.scene ||
          Math.hypot(p.x - g.target.x, p.z - g.target.z) > 25
        )
          g.samples = [];
        g.samples.push({ ...p, at: performance.now() });
        if (g.samples.length > 8) g.samples.shift();
      }
      g.target = p;
      if (p.companion && !g.companion) {
        const id = p.companion.id;
        g.companion = createHuman(['#b597bb','#c1aaa1','#95aaba'][id % 3], SKIN_TONES[id % 6], HAIR_COLORS[Math.floor(id / 3) % 6], true);
        g.companion.root.name = 'guest-companion-' + p.id;
        g.companion.root.position.set(p.companion.x, 0, p.companion.z);
        scene.add(g.companion.root);
      }
    }
  }
  function updateGuests(_dt: number) {
    for (const g of guests.values()) {
      const p = g.target,
        visible = !life.inside && p.scene === currentScene();
      g.rig.root.visible = visible && p.mode !== 'car';
      g.label.visible = visible;
      if (g.vehicle) g.vehicle.visible = visible;
      if (g.companion) {
        g.companion.root.visible = visible && !!p.companion;
        if (p.companion) {
          const c = p.companion;
          g.companion.root.position.lerp(new T.Vector3(c.x, 0, c.z), 1-Math.exp(-_dt*12));
          g.companion.root.rotation.y = c.heading;
          g.companion.pose(elapsed, Math.hypot(c.x-g.companion.root.position.x,c.z-g.companion.root.position.z)>.06?4:0, 0);
        }
      }
      const root = g.rig.root;
      const motion = sampleMotion(g.samples, performance.now());
      root.position.set(
        buildingFloor !== null ? 400 + (motion.x - 100) : motion.x,
        buildingFloor !== null ? (buildingFloor - 1) * 5 : 0,
        buildingFloor !== null ? motion.z - 56 : motion.z,
      );
      if (p.mode === 'bike') root.position.y += 0.22;
      root.rotation.set((p.hp ?? 100) <= 0 ? 1.35 : 0, motion.heading, 0);
      g.rig.pose(
        elapsed,
        p.mode === 'walk' ? motion.speed / 3.6 : 0,
        0,
        (p.hp ?? 100) <= 0,
      );
      if (p.mode === 'bike') g.rig.ride(0);
      g.label.position.set(
        root.position.x,
        root.position.y + 3.1,
        root.position.z,
      );
      if (g.vehicle) {
        g.vehicle.position.set(root.position.x, 0, root.position.z);
        g.vehicle.rotation.y = root.rotation.y;
        g.vehicle.userData.animateBike?.((elapsed * motion.speed) / 3.6, 0, 0);
      }
    }
  }
  const activePosition = () => (driving ? ride.position : player.position);
  function say(text: string) {
    if (text) {
      notice = text;
      noticeTime = 5;
    }
  }
  let dismissedPlace: PlaceId | null = null,
    previousNearby: PlaceId | null = null;
  const movementAllowed = () =>
    liftRemaining <= 0 && !typing && (!panel || panel === 'place');
  function open(next: Panel) {
    if ((paused || hp <= 0) && next) return;
    if (panel === 'place' && next === null) dismissedPlace = nearby;
    panel = next;
    clear();
    if (panel) {
      armed = false;
      gun.visible = false;
    }
    lastHud = 0;
  }
  function enterHome() {
    life.inside = true;
    Object.assign(bikeMotion, newBikeMotion());
    playerRig.pose(0, 0, 0);
    riding = driving = false;
    armed = false;
    gun.visible = false;
    player.visible = true;
    speed = 0;
    player.rotation.set(0, Math.PI, 0);
    player.position.set(300, 0, 1);
    camera.position.set(308, 9, 12);
    camera.lookAt(300, 1.4, 0);
    panel = 'home';
    clear();
    save();
  }
  function leaveHome() {
    if (!life.inside) return;
    life.inside = false;
    panel = null;
    player.position.set(-40, 0, -69);
    dismissedPlace = 'home';
    camera.position.set(-30, 10, -61);
    yaw = 0;
    orbit = 0.5;
    clear();
    save();
  }
  function doAction(action: Action, value = '') {
    if ((paused || hp <= 0) && action !== 'recover') return;
    life.hp = hp;
    const oldTier = life.bikeTier;
    const previous = life.logs[0];
    const at = life.inside ? 'home' : nearby;
    say(act(life, action, value, at));
    hp = life.hp;
    if (action === 'talk') panel = 'dialogue';
    if (oldTier !== life.bikeTier) {
      for (const child of bike.children.slice())
        if (child !== deliveryBox) {
          bike.remove(child);
          child.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.geometry.dispose();
              (o.material as T.Material).dispose();
            }
          });
        }
      const model = createMotorcycle(
        ['#81b6a8', '#e5cd83', '#abc8dc', '#de684d', '#8295eb'][
          Math.max(0, life.bikeTier)
        ],
        Math.max(0, life.bikeTier),
      );
      for (const child of model.children.slice()) bike.add(child);
      bike.userData.animateBike = model.userData.animateBike;
      Object.assign(bikeMotion, newBikeMotion());
      bike.position.set(-97, 0, -13);
      riding = false;
    }
    if (action === 'recover') {
      buildingFloor = null;
      liftRemaining = 0;
      paused = false;
      player.rotation.set(0, Math.PI, 0);
      playerRig.pose(0, 0, 0);
      Object.assign(bikeMotion, newBikeMotion());
      enterHome();
    }
    if (action === 'navigate') open(null);
    if (action === 'fine' && !life.wanted) {
      people
        .filter((p) => p.role === '경찰')
        .forEach((p) => (p.state.aggro = 0));
    }
    if (life.logs[0] !== previous) save();
    lastHud = 0;
  }
  function lineClear(a: { x: number; z: number }, b: { x: number; z: number }) {
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    for (let t = 1; t < d; t += 1.5) {
      if (
        blocked(a.x + ((b.x - a.x) * t) / d, a.z + ((b.z - a.z) * t) / d, 0.15)
      )
        return false;
    }
    return true;
  }
  function crime(severity: number, loud = false) {
    if (life.inside) return;
    const pos = activePosition();
    const witness = people.some(
      (p) =>
        p.active &&
        p.state.hp > 0 &&
        Math.hypot(p.state.x - pos.x, p.state.z - pos.z) < (loud ? 50 : 22) &&
        (loud || lineClear(pos, p.state)),
    );
    const cctv = PLACES.filter((p) =>
      ['police', 'store', 'station', 'warehouse', 'construction'].includes(
        p.id,
      ),
    ).some(
      (p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 22 && lineClear(pos, p),
    );
    if (witness || cctv) {
      lastKnown.copy(pos);
      if (
        reportCrime(
          life,
          severity,
          cctv ? 'CCTV 포착' : loud ? '주변에서 총성 신고' : '목격자 신고',
        )
      )
        say(life.logs[0].text);
    }
  }
  function selectWeapon(id: number) {
    if (!WEAPONS[id] || hp <= 0 || riding || driving) return;
    life.reserve += life.ammo; life.ammo = 0;
    weapon = id; reloadTime = 0; shotCooldown = 0;
    for (const root of [gun, viewGun]) {
      for (const child of root.children.slice()) if (child instanceof T.Group) {
        root.remove(child); child.traverse(o => { if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();} });
      }
      root.add(weaponModel(id));
    }
    armed = true; reload(); say(WEAPONS[id].name + ' · R 재장전'); lastHud=0;
  }
  function reload() {
    if (
      paused ||
      !movementAllowed() ||
      riding ||
      driving ||
      !armed ||
      hp <= 0 ||
      reloadTime ||
      life.ammo >= WEAPONS[weapon].magazine
    )
      return;
    if (!life.reserve) {
      say('예비 탄약이 없습니다.');
      return;
    }
    reloadTime = WEAPONS[weapon].reload;
    aiming = ads = false;
    say('재장전 중…');
  }
  function mount() {
    if (
      paused ||
      !movementAllowed() ||
      life.inside ||
      buildingFloor !== null ||
      hp <= 0 ||
      (!riding && player.position.y > 0.05)
    )
      return;
    if (riding) {
      if (speed > 2) {
        say('속도를 줄인 뒤 내리세요.');
        return;
      }
      const pos = player.position;
      for (const dx of [1.5, -1.5])
        if (!blocked(pos.x + dx, pos.z, 0.5)) {
          riding = false;
          yaw = bikeMotion.heading + Math.PI;
          bikeMotion.velocity = 0;
          bike.rotation.z = 0;
          player.rotation.z = 0;
          player.position.x += dx;
          break;
        }
      return;
    }
    if (driving) {
      interact();
      return;
    }
    const abandoned = abandonedBikes.find(
      (b) => player.position.distanceTo(b.mesh.position) < 3.5,
    );
    if (abandoned) {
      claimDeliveryBike(life);
      bike.position.copy(abandoned.mesh.position);
      bike.rotation.copy(abandoned.mesh.rotation);
      scene.remove(abandoned.mesh);
      abandonedBikes.splice(abandonedBikes.indexOf(abandoned), 1);
      clear();
      riding = true;
      Object.assign(bikeMotion, newBikeMotion(bike.rotation.y));
      player.position.copy(bike.position);
      armed = false;
      gun.visible = false;
      panel = null;
      speed = 0;
      crime(1);
      say('배달 오토바이 탑승 · 휴대폰에서 배달을 시작하세요');
      save();
      return;
    }
    if (life.bikeTier >= 0 && player.position.distanceTo(bike.position) < 4) {
      if (!life.fuel || !life.bikeHp) {
        say('바이크에 주유 또는 수리가 필요합니다.');
        return;
      }
      clear();
      riding = true;
      Object.assign(bikeMotion, newBikeMotion(bike.rotation.y));
      player.position.copy(bike.position);
      armed = false;
      gun.visible = false;
      aiming = false;
      speed = 0;
      return;
    }
    interact();
  }
  let numberRequest: { id: number; remaining: number; chance: number } | null =
    null;
  function nearbyWoman() {
    return !life.inside && buildingFloor === null && !driving && !riding
      ? people
          .filter(
            (p) =>
              p.female &&
              p.active &&
              p.state.hp > 0 &&
              p.state.aggro <= 0 &&
              lineClear(player.position, p.state) &&
              Math.hypot(
                p.state.x - player.position.x,
                p.state.z - player.position.z,
              ) < 3.4,
          )
          .sort(
            (a, b) =>
              Math.hypot(
                a.state.x - player.position.x,
                a.state.z - player.position.z,
              ) -
              Math.hypot(
                b.state.x - player.position.x,
                b.state.z - player.position.z,
              ),
          )[0]
      : undefined;
  }
  function askNumber() {
    if (paused || hp <= 0 || !movementAllowed() || numberRequest) return;
    const npc = nearbyWoman();
    if (!npc) return;
    const id = npc.state.id;
    if (life.companionId === id) {
      life.companionId = null;
      say(residentName(id) + '와 동행을 마쳤습니다.');
      save();
      return;
    }
    if (life.contacts.includes(id)) {
      life.companionId = id;
      say(residentName(id) + '와 함께 걷습니다.');
      save();
      return;
    }
    if ((life.numberCooldowns[id] || 0) > life.minutes) {
      say('잠시 뒤에 다시 이야기해 보세요.');
      return;
    }
    numberRequest = { id, remaining: 3, chance: numberChance(life.cash) };
    npc.wait = 3.2;
    armed = aiming = ads = false;
  }
  function updateSocial(dt: number) {
    if (!numberRequest) return;
    const request = numberRequest,
      npc = people.find((p) => p.state.id === request.id);
    if (
      life.inside ||
      driving ||
      riding ||
      !movementAllowed() ||
      !npc ||
      npc.state.hp <= 0 ||
      npc.state.aggro > 0 ||
      !lineClear(player.position, npc.state) ||
      hp <= 0 ||
      Math.hypot(
        npc.state.x - player.position.x,
        npc.state.z - player.position.z,
      ) > 4
    ) {
      numberRequest = null;
      if (npc) npc.wait = 0;
      say('대화를 중단했습니다.');
      return;
    }
    request.remaining -= dt;
    if (request.remaining <= 0) {
      numberRequest = null;
      life.numberCooldowns[request.id] = life.minutes + 10;
      npc.wait = 0;
      if (Math.random() < request.chance) {
        if (!life.contacts.includes(request.id)) life.contacts.push(request.id);
        life.companionId = request.id;
        say(residentName(request.id) + '의 연락처를 받았습니다. 함께 걸어요!');
      } else say(residentName(request.id) + ': 지금은 괜찮아요. 다음에 봐요.');
      save();
    }
  }
  function updateResidents(dt: number) {
    const hour = (life.minutes % 1440) / 60,
      pos = activePosition();
    for (const npc of people) {
      if (npc.state.id >= RESIDENTS) continue;
      const plan = schedule(npc.role, hour, npc.state.id);
      npc.active =
        plan.active ||
        life.companionId === npc.state.id ||
        npc.state.aggro > 0 ||
        npc.state.hp < 100;
      npc.activity = plan.activity;
      npc.mesh.visible = npc.active && !life.inside;
      if (npc.vehicle) npc.vehicle.visible = npc.active && !life.inside;
      if (!npc.active) continue;
      npc.wait = Math.max(0, npc.wait - dt);
      let goal: Point = place(plan.at),
        goalName = plan.at as string;
      if (npc.role === '배달기사') {
        const stops: PlaceId[] = [
          'burger',
          'office',
          'bbq',
          'pc',
          'cafe',
          'forest',
        ];
        const stop = stops[npc.phase % stops.length];
        goal = place(stop);
        goalName = stop;
        npc.activity =
          npc.wait > 0
            ? npc.phase % 2
              ? '음식 수령'
              : '배달 완료'
            : '주문지로 이동';
        if (
          Math.hypot(npc.state.x - goal.x, npc.state.z - goal.z) < 2 &&
          !npc.wait
        ) {
          npc.phase++;
          npc.wait = 4;
        }
        npc.state.walkSpeed = npc.wait > 0 ? 0 : npc.vehicle ? 5 : 1.2;
      } else
        npc.state.walkSpeed =
          npc.role === '청소 직원' ? 0.8 : npc.role === '경찰' ? 2 : 1.2;
      if (npc.role === '경찰' && life.wanted > 0) {
        goal = lastKnown;
        goalName = 'chase-' + Math.floor(elapsed / 2);
        npc.activity = life.wanted >= 3 ? '수배자 추적' : '신고 지점 수색';
        npc.state.walkSpeed = 3.3 + life.wanted * 0.4;
        if (
          npc.state.hp > 0 &&
          npc.state.stun <= 0 &&
          npc.state.down <= 0 &&
          Math.hypot(pos.x - npc.state.x, pos.z - npc.state.z) < 2.2 &&
          lineClear(pos, npc.state)
        ) {
          const fine = Math.min(life.cash, life.wanted * 25000);
          life.cash -= fine;
          life.wanted = life.pendingHeat = life.reportIn = 0;
          life.order = null;
          say(
            `경찰에게 붙잡혔습니다 · 벌금 ${fine.toLocaleString()}원 · 배달 취소`,
          );
          npc.state.aggro = 0;
          player.position.set(96, 0, -75);
          riding = driving = false;
          player.visible = true;
          speed = 0;
          save();
        }
      }
      if (
        life.companionId === npc.state.id &&
        npc.state.hp > 0 &&
        npc.state.aggro <= 0
      ) {
        const a = player.rotation.y;
        goal = {
          x: pos.x + Math.cos(a) * 1.8 - Math.sin(a) * 0.6,
          z: pos.z - Math.sin(a) * 1.8 - Math.cos(a) * 0.6,
        };
        if (blocked(goal.x, goal.z, 0.6))
          goal = { x: pos.x - Math.cos(a) * 1.8, z: pos.z + Math.sin(a) * 1.8 };
        const distance = Math.hypot(npc.state.x - goal.x, npc.state.z - goal.z);
        npc.state.walkSpeed = distance < 1 ? 0 : distance > 5 ? 9 : 5;
        npc.activity = residentName(npc.state.id) + ' · 함께 걷는 중';
        goalName =
          'companion-' + Math.round(goal.x / 2) + '-' + Math.round(goal.z / 2);
        if (distance > 45 && !blocked(goal.x, goal.z, 0.6)) {
          npc.state.x = goal.x;
          npc.state.z = goal.z;
        }
        npc.wait = 0;
      }
      if (numberRequest?.id === npc.state.id) {
        npc.wait = 1;
        npc.state.walkSpeed = 0;
        npc.activity = '번호 따는 중…';
      }
      if (npc.goal !== goalName) {
        npc.goal = goalName;
        npc.path = sidewalkPath(npc.state, goal, blocked);
      }
      if (
        npc.path.length &&
        Math.hypot(npc.state.x - npc.path[0].x, npc.state.z - npc.path[0].z) <
          1.2
      )
        npc.path.shift();
      if (npc.vehicle) {
        npc.vehicle.position.set(npc.state.x, 0, npc.state.z);
        npc.vehicle.rotation.y = npc.state.heading;
      }
    }
  }
  function updateEnvironment(dt: number) {
    const hour = (life.minutes % 1440) / 60,
      light = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)),
      night = 1 - light;
    const sky = new T.Color(
      life.weather === '폭우' ? '#536875' : '#b6c7cb',
    ).lerp(new T.Color('#253a52'), night);
    scene.background = sky;
    (scene.fog as T.Fog).color.copy(sky);
    ambient.intensity = life.inside ? 1.6 : 1.15 + light * 1.25;
    sun.intensity = life.inside ? 0 : 0.4 + light * 2.8;
    room.visible = roomLight.visible = life.inside;
    sun.position.set(
      Math.cos((hour / 12) * Math.PI) * 75,
      Math.max(8, light * 85),
      35,
    );
    streetLights.forEach(
      (l, i) =>
        (l.intensity =
          life.inside || lamps[i].broken
            ? 0
            : night * (life.outage ? 70 : 190)),
    );
    alleyLights.forEach(
      (l) => (l.intensity = life.inside ? 0 : night * (life.outage ? 80 : 180)),
    );
    roomFloor.material = mat(life.decor.floor);
    roomWalls.forEach((w) => (w.material = mat(life.decor.wall)));
    const spots: Record<DecorId, [number, number][]> = {
      rug: [
        [1, 0],
        [1, 2.3],
        [0, -1.8],
      ],
      plant: [
        [3.5, -3],
        [3.5, 2.8],
        [-3.7, 2.9],
      ],
      lamp: [
        [2.3, -3],
        [3.5, 1.3],
        [-1.3, 2.6],
      ],
      shelf: [
        [1, -3.6],
        [2.6, -3.6],
        [-0.5, -3.6],
      ],
      poster: [
        [0, -3.86],
        [2, -3.86],
        [-2, -3.86],
      ],
    };
    decorations.forEach((g, id) => {
      const slot = life.decor.placed[id];
      g.visible = life.decor.owned.includes(id) && slot !== undefined;
      if (slot !== undefined) {
        g.position.x = spots[id][slot][0];
        g.position.z = spots[id][slot][1];
      }
    });
    patrolLights.forEach((light, i) => {
      light.intensity =
        !life.inside && life.wanted >= 2 && !patrolCars[i].exploded
          ? Math.sin(elapsed * 12 + i * Math.PI) > 0
            ? 50
            : 4
          : 0;
      patrolCars[i].cruise = life.wanted >= 2 ? 12 : 7;
    });
    mats.forEach((m, c) => {
      if (['#253e40', '#344b50', '#ffedb5', '#d3ccab', '#fff0b0'].includes(c)) {
        m.emissive.set(c);
        m.emissiveIntensity = life.outage ? 0 : night * 1.5;
      }
    });
    placeMarkers.forEach((m) => (m.visible = !life.inside));
    bike.visible = !life.inside && life.bikeTier >= 0;
    deliveryBox.visible = life.bikeBox;
    rain.visible = !life.inside && life.weather === '폭우';
    if (rain.visible) {
      rain.position.set(activePosition().x, 0, activePosition().z);
      for (let i = 0; i < 600; i++)
        rainPositions[i * 3 + 1] =
          (rainPositions[i * 3 + 1] - dt * 22 + 35) % 35;
      rainGeometry.attributes.position.needsUpdate = true;
    }
    mattress.material = mat(
      life.homeUpgrade
        ? '#6c9c9d'
        : ['#b0bfab', '#719d9b', '#7f99b3', '#a199c1', '#d3cbaa'][
            life.homeTier
          ],
    );
  }
  function jump() {
    if (buildingFloor !== null || typing) return;
    if (
      !paused &&
      movementAllowed() &&
      !riding &&
      hp > 0 &&
      !driving &&
      player.position.y <= 0.001
    ) {
      jumpVelocity = 7;
    }
  }
  function equip() {
    if (
      paused ||
      !movementAllowed() ||
      life.inside ||
      riding ||
      hp <= 0 ||
      driving
    )
      return;
    armed = !armed;
    ads = aiming = false;
    attackTime = 0;
    notice = armed
      ? '권총 장착 · 좌클릭 / F 발사 · Q 넣기'
      : '주먹 모드 · F 공격';
    noticeTime = 2;
  }
  function shoot() {
    if (buildingFloor !== null) return;
    if (
      paused ||
      !movementAllowed() ||
      life.inside ||
      riding ||
      hp <= 0 ||
      driving ||
      shotCooldown > 0 ||
      reloadTime
    )
      return;
    if (life.ammo <= 0) {
      say('탄창이 비었습니다 · R 재장전');
      return;
    }
    life.ammo--;
    crime(2, true);
    shotCooldown = WEAPONS[weapon].cooldown;
    shotTime = 0.08;
    player.rotation.y = yaw + orbit + Math.PI;
    player.updateMatrixWorld(true);
    const origin = gun.getWorldPosition(new T.Vector3());
    const sight = new T.Raycaster();
    sight.setFromCamera(new T.Vector2(0, 0), camera);
    const aimPoint = sight.ray.at(WEAPONS[weapon].range, new T.Vector3());
    let aimDistance: number = WEAPONS[weapon].range;
    const point = new T.Vector3();
    const bounds = [
      ...solids.map(
        (b) =>
          new T.Box3(
            new T.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
            new T.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
          ),
      ),
      ...people
        .filter((p) => p.active && p.state.hp > 0)
        .map(
          (p) =>
            new T.Box3(
              new T.Vector3(p.state.x - 0.4, 0, p.state.z - 0.4),
              new T.Vector3(p.state.x + 0.4, 2.25, p.state.z + 0.4),
            ),
        ),
    ];
    for (const b of bounds)
      if (
        sight.ray.intersectBox(b, point) &&
        point.distanceTo(sight.ray.origin) < aimDistance
      ) {
        aimDistance = point.distanceTo(sight.ray.origin);
        aimPoint.copy(point);
      }
    for (const v of vehicles) {
      if (v.exploded) continue;
      const hits = sight.intersectObjects(
        v.mesh.children.filter((o) => o !== v.fire),
        true,
      );
      if (hits.length && hits[0].distance < aimDistance) {
        aimDistance = hits[0].distance;
        aimPoint.copy(hits[0].point);
      }
    }
    for (const g of guests.values())
      if (g.target.scene === currentScene() && (g.target.hp ?? 100) > 0) {
        const p = g.rig.root.position;
        const bounds = new T.Box3(
          new T.Vector3(p.x - 0.45, p.y, p.z - 0.45),
          new T.Vector3(p.x + 0.45, p.y + 2.2, p.z + 0.45),
        );
        if (
          sight.ray.intersectBox(bounds, point) &&
          point.distanceTo(sight.ray.origin) < aimDistance
        ) {
          aimDistance = point.distanceTo(sight.ray.origin);
          aimPoint.copy(point);
        }
      }
    const aimSpread =
      (aiming ? 0.004 : 0.035) +
      speed * 0.006 +
      (100 - hp) * 0.00025 +
      (life.caffeine >= 3 ? 0.035 : 0) +
      recoil -
      (life.focus > 0 ? 0.002 : 0) -
      Math.min(0.003, stableAim * 0.001);
    const direction = aimPoint.sub(origin).normalize();
    direction.x += (Math.random() - 0.5) * aimSpread;
    direction.y += (Math.random() - 0.5) * aimSpread;
    direction.z += (Math.random() - 0.5) * aimSpread;
    direction.normalize();
    recoil = Math.min(0.08, recoil + 0.025);
    const ray = new T.Ray(origin, direction);
    let distance: number = WEAPONS[weapon].range;
    const impactNormal = direction.clone().negate(),
      ground = new T.Vector3();
    const grounded = new T.Ray(origin, direction).intersectPlane(
      new T.Plane(new T.Vector3(0, 1, 0), -0.12),
      ground,
    );
    if (grounded && origin.distanceTo(ground) < distance) {
      distance = origin.distanceTo(ground);
      impactNormal.set(0, 1, 0);
    }
    let victim: (typeof people)[number] | null = null;
    let vehicleTarget: Vehicle | null = null;
    const hit = new T.Vector3();
    for (const b of solids) {
      const bounds = new T.Box3(
        new T.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
        new T.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
      );
      if (ray.intersectBox(bounds, hit) && origin.distanceTo(hit) < distance) {
        distance = origin.distanceTo(hit);
        const choices = [
          { d: Math.abs(hit.x - bounds.min.x), n: new T.Vector3(-1, 0, 0) },
          { d: Math.abs(hit.x - bounds.max.x), n: new T.Vector3(1, 0, 0) },
          { d: Math.abs(hit.z - bounds.min.z), n: new T.Vector3(0, 0, -1) },
          { d: Math.abs(hit.z - bounds.max.z), n: new T.Vector3(0, 0, 1) },
        ];
        impactNormal.copy(choices.sort((a, b) => a.d - b.d)[0].n);
      }
    }
    for (const p of people) {
      if (p.state.hp <= 0 || !p.active) continue;
      const height = p.state.down > 0 ? 0.65 : 2.25;
      const bounds = new T.Box3(
        new T.Vector3(p.state.x - 0.4, 0, p.state.z - 0.4),
        new T.Vector3(p.state.x + 0.4, height, p.state.z + 0.4),
      );
      if (ray.intersectBox(bounds, hit) && origin.distanceTo(hit) < distance) {
        distance = origin.distanceTo(hit);
        victim = p;
        vehicleTarget = null;
      }
    }
    const caster = new T.Raycaster(origin, direction, 0, distance);
    for (const v of vehicles) {
      if (v.exploded) continue;
      const hits = caster.intersectObjects(
        v.mesh.children.filter((o) => o !== v.fire),
        true,
      );
      if (hits.length && hits[0].distance < distance) {
        distance = hits[0].distance;
        vehicleTarget = v;
        victim = null;
      }
    }
    let peerVictim: string | null = null;
    for (const [id, g] of guests)
      if (g.target.scene === currentScene() && (g.target.hp ?? 100) > 0) {
        const p = g.rig.root.position;
        const bounds = new T.Box3(
          new T.Vector3(p.x - 0.45, p.y, p.z - 0.45),
          new T.Vector3(p.x + 0.45, p.y + 2.2, p.z + 0.45),
        );
        if (
          ray.intersectBox(bounds, hit) &&
          origin.distanceTo(hit) < distance
        ) {
          distance = origin.distanceTo(hit);
          peerVictim = id;
          victim = null;
          vehicleTarget = null;
        }
      }
    if (peerVictim) peerAttack(peerVictim, 'gun');
    if (victim) {
      damagePerson(victim.state, WEAPONS[weapon].damage);
      hitPerson(victim.state, direction.x, direction.z, 3);
      notice = '명중 · NPC 체력 -' + WEAPONS[weapon].damage;
      noticeTime = 0.7;
    } else if (vehicleTarget && vehicleTarget.hp > 0) {
      vehicleTarget.hp = Math.max(0, vehicleTarget.hp - 20);
      driverExit(vehicleTarget);
      notice = '명중 · 차량 내구도 -20';
      noticeTime = 0.7;
    }
    const end = origin.clone().addScaledVector(direction, distance);
    shotLight.position.copy(origin);
    tracer.position.copy(origin).lerp(end, 0.5);
    tracer.scale.y = distance;
    tracer.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    if (distance < 65)
      impactParticles(end, impactNormal, !victim && !vehicleTarget);
    trail.geometry.setFromPoints([origin, end]);
    trail.visible = true;
    flash.visible = true;
    shake = 0.06;
  }
  function driverExit(v: Vehicle) {
    if ((v === controlled && driving) || v.driverOut || v.exploded)
      return false;
    const p = v.physics;
    for (let i = 0; i < 16; i++) {
      const a = p.angle + Math.PI / 2 + (i * Math.PI) / 8,
        x = p.x + Math.sin(a) * 3.4,
        z = p.z + Math.cos(a) * 3.4;
      if (
        blocked(x, z, 0.6) ||
        vehicles.some(
          (o) =>
            o !== v &&
            !o.exploded &&
            Math.hypot(o.physics.x - x, o.physics.z - z) < 3,
        ) ||
        people.some(
          (o) =>
            o.state.hp > 0 && Math.hypot(o.state.x - x, o.state.z - z) < 1.2,
        )
      )
        continue;
      let npc = people.find((o) => o.state.id === v.driverId);
      if (!npc) {
        v.driverId = RESIDENTS + vehicles.indexOf(v);
        npc = addPerson(v.driverId, x, z);
      }
      Object.assign(npc.state, person(v.driverId, x, z));
      npc.state.aggro = 30;
      npc.mesh.position.set(x, 0, z);
      npc.mesh.rotation.set(0, npc.state.heading, 0);
      v.driverOut = true;
      v.outFor = 0;
      p.vx = p.vz = p.spin = 0;
      notice = '운전자가 내려서 공격해옵니다!';
      noticeTime = 2;
      npc.deathHandled = false;
      return true;
    }
    return false;
  }
  function attack() {
    if (buildingFloor !== null) return;
    if (armed) {
      shoot();
      return;
    }
    if (
      hp <= 0 ||
      paused ||
      !movementAllowed() ||
      life.inside ||
      riding ||
      driving ||
      attackCooldown > 0
    )
      return;
    attackTime = 0.28;
    attackCooldown = 0.48;
    const dir = new T.Vector3(
      Math.sin(player.rotation.y),
      0,
      Math.cos(player.rotation.y),
    );
    let hit = false;
    for (const v of vehicles) {
      const delta = v.mesh.position.clone().sub(player.position);
      const distance = delta.length();
      if (v.hp > 0 && distance < 4.2 && delta.normalize().dot(dir) > 0.35) {
        v.hp = Math.max(0, v.hp - 10);
        driverExit(v);
        v.physics.vx += dir.x * 0.8;
        v.physics.vz += dir.z * 0.8;
        v.physics.spin += 0.12;
        v.physics.stun = Math.max(v.physics.stun, 0.7);
        impactEffect(v.physics.x, v.physics.z, 3);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const target = [...guests.entries()]
        .filter(
          ([, g]) =>
            g.target.scene === currentScene() && (g.target.hp ?? 100) > 0,
        )
        .map(([id, g]) => ({
          id,
          p: g.rig.root.position,
          delta: g.rig.root.position.clone().sub(player.position),
        }))
        .filter(
          (g) =>
            g.delta.length() < 2.7 &&
            g.delta.clone().normalize().dot(dir) > 0.25 &&
            lineClear(player.position, g.p),
        )
        .sort((a, b) => a.delta.lengthSq() - b.delta.lengthSq())[0];
      if (target) {
        peerAttack(target.id, 'punch');
        hit = true;
      }
    }
    if (!hit) {
      const candidates = people
        .map((p) => ({
          p,
          delta: new T.Vector3(
            p.state.x - player.position.x,
            0,
            p.state.z - player.position.z,
          ),
        }))
        .filter(
          ({ p, delta }) =>
            p.state.hp > 0 &&
            delta.length() < 2.7 &&
            delta.clone().normalize().dot(dir) > 0.25,
        )
        .sort((a, b) => a.delta.lengthSq() - b.delta.lengthSq());
      if (candidates.length) {
        const target = candidates[0].p.state;
        hit = hitPerson(target, dir.x, dir.z, 5.5);
        if (hit) damagePerson(target, 25);
      }
    }
    if (hit) crime(1);
    if (noticeTime < 1.5) {
      notice = hit ? '타격!' : '주먹 공격';
      noticeTime = 0.6;
    }
  }
  function interact() {
    if (buildingFloor !== null) {
      if (paused || typing || hp <= 0 || liftRemaining) return;
      if (Math.hypot(player.position.x - 400, player.position.z + 3.1) < 1.55) {
        operateElevator();
        return;
      }
      if (
        buildingFloor === 2 &&
        Math.hypot(player.position.x - 404, player.position.z - 1) < 2
      ) {
        const message = deliver(life, 'office', 2);
        say(message || '201호 · 주문하신 상품을 이곳에 전달합니다.');
        if (message) save();
      }
      return;
    }
    if (
      hp <= 0 ||
      paused ||
      !movementAllowed() ||
      (!riding && player.position.y > 0.05)
    )
      return;
    if (life.inside) {
      open('home');
      return;
    }
    if (riding) {
      mount();
      return;
    }
    if (
      !driving &&
      abandonedBikes.some(
        (b) => player.position.distanceTo(b.mesh.position) < 3.5,
      )
    ) {
      mount();
      return;
    }
    const closeCar = vehicles
      .filter((v) => !v.exploded && v.hp > 0)
      .sort(
        (a, b) =>
          player.position.distanceTo(a.mesh.position) -
          player.position.distanceTo(b.mesh.position),
      )[0];
    if (
      !driving &&
      closeCar &&
      player.position.distanceTo(closeCar.mesh.position) < 5.5
    ) {
      if (Math.hypot(closeCar.physics.vx, closeCar.physics.vz) > 3) {
        say('차 앞에서 정차를 기다리세요');
        return;
      }
      if (!closeCar.driverOut) {
        if (driverExit(closeCar)) {
          crime(2);
          say('운전자를 끌어내렸습니다 · E 한 번 더 누르면 탑승');
        } else say('운전자가 내릴 공간이 없습니다.');
      } else {
        controlled = closeCar;
        ride = closeCar.mesh;
        driving = true;
        player.visible = false;
        yaw = ride.rotation.y;
        orbit = 0.3;
        speed = 0;
        panel = null;
        clear();
      }
      return;
    }
    if (
      !driving &&
      abandonedBikes.some(
        (b) => player.position.distanceTo(b.mesh.position) < 3.5,
      )
    ) {
      mount();
      return;
    }
    if (!driving && nearby) {
      if (
        nearby === 'office' &&
        life.order?.floor === 2 &&
        life.order.stage === 'dropoff'
      ) {
        enterOffice();
        return;
      }
      const message = deliver(life, nearby);
      if (message) {
        say(message);
        save();
        return;
      }
      if (nearby === 'home') {
        enterHome();
        return;
      }
      open('place');
      return;
    }
    if (driving) {
      if (Math.hypot(controlled.physics.vx, controlled.physics.vz) > 3) {
        notice = '속도를 줄인 뒤 내리세요';
        noticeTime = 1.5;
        return;
      }
      for (const s of [1, -1]) {
        const x = ride.position.x + Math.cos(yaw) * 3 * s,
          z = ride.position.z - Math.sin(yaw) * 3 * s;
        if (
          !blocked(x, z, 0.5) &&
          !vehicles.some(
            (v) =>
              v !== controlled &&
              Math.hypot(v.physics.x - x, v.physics.z - z) < 3,
          )
        ) {
          driving = false;
          speed = 0;
          player.visible = true;
          player.position.set(x, 0, z);
          break;
        }
      }
    }
  }
  function clear() {
    triggerHeld = false;
    ads = false;
    rightDownAt = 0;
    analog.x = analog.y = 0;
    Object.keys(keys).forEach((k) => (keys[k] = false));
    drag = false;
    aiming = false;
    reloadTime = 0;
  }
  function reset() {
    buildingFloor = null;
    liftRemaining = 0;
    Object.assign(bikeMotion, newBikeMotion());
    for (const b of abandonedBikes) scene.remove(b.mesh);
    abandonedBikes.length = 0;
    for (const m of cashMeshes.values()) scene.remove(m);
    cashMeshes.clear();
    dismissedPlace = previousNearby = null;
    numberRequest = null;
    life = createLife();
    panel = null;
    riding = false;
    armed = false;
    jumpVelocity = shotCooldown = shotTime = 0;
    gun.visible = false;
    trail.visible = false;
    flash.visible = false;
    for (let i = people.length - 1; i >= RESIDENTS; i--) {
      const npc = people[i];
      scene.remove(npc.mesh, npc.bar);
      if (npc.vehicle) scene.remove(npc.vehicle);
      for (const root of [npc.mesh, npc.bar])
        root.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            if (root === npc.bar) (o.material as T.Material).dispose();
          }
        });
      people.splice(i, 1);
    }
    vehicles.forEach((v) => (v.driverId = -1));
    debris.forEach((d) => {
      scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      (d.mesh.material as T.Material).dispose();
    });
    debris.length = 0;
    lamps.forEach((l) => {
      l.broken = false;
      l.fall = 0;
      l.mesh.quaternion.identity();
    });
    hp = 100;
    hurtTimer = 0;
    driving = false;
    speed = 0;
    paused = false;
    orbit = 0.5;
    pitch = 0.6;
    yaw = 0;
    attackTime =
      attackCooldown =
      noticeTime =
      shake =
      accumulator =
      sparkLife =
        0;
    vehicles.forEach((v) => {
      v.hp = 100;
      v.driverOut = false;
      v.burnTime = 0;
      v.exploded = false;
      v.respawnTime = 0;
      v.mesh.visible = true;
      v.mesh.scale.set(1, 1, 1);
      v.fire.visible = false;
      Object.assign(v.physics, v.spawn);
      v.mesh.position.set(v.physics.x, 0, v.physics.z);
      v.mesh.rotation.set(0, v.physics.angle, 0);
      if (v.route.length) {
        v.waypoint = (((vehicles.indexOf(v) - 1) % 4) + 1) % 4;
      }
    });
    people.forEach((p) => {
      Object.assign(p.state, p.spawn);
      p.mesh.position.set(p.state.x, 0, p.state.z);
      p.mesh.rotation.set(0, p.state.heading, 0);
      p.deathHandled = false;
      if (p.role === '배달기사' && !p.vehicle) {
        p.vehicle = scooter('#6caaa8', p.state.x, p.state.z);
        box(0.85, 0.7, 0.8, '#e1e581', 0, 1.55, -0.65, p.vehicle);
      }
      p.goal = '';
      p.path = [];
      p.phase = 0;
      p.wait = 0;
    });
    player.position.set(300, 0, 1);
    camera.position.set(308, 9, 12);
    bike.position.set(-97, 0, -13);
    player.rotation.x = 0;
    player.visible = true;
    clear();
    save();
  }
  const debris: {
    mesh: T.Mesh;
    velocity: T.Vector3;
    life: number;
    hit: Set<number>;
  }[] = [];
  function explode(v: Vehicle) {
    v.exploded = true;
    v.respawnTime = 10;
    v.fire.visible = false;
    v.mesh.scale.y = 0.35;
    v.physics.vx = v.physics.vz = v.physics.spin = 0;
    if (v === controlled && driving) {
      driving = false;
      player.visible = true;
      let placed = false;
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          x = v.physics.x + Math.sin(a) * 3.8,
          z = v.physics.z + Math.cos(a) * 3.8;
        if (!blocked(x, z, 0.5)) {
          player.position.set(x, 0, z);
          placed = true;
          break;
        }
      }
      if (!placed) player.position.set(v.physics.x, 0, v.physics.z);
      speed = 0;
    }
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + Math.random() * 0.15,
        velocity = new T.Vector3(
          Math.sin(a) * (7 + Math.random() * 9),
          1 + Math.random() * 7,
          Math.cos(a) * (7 + Math.random() * 9),
        );
      const mesh = new T.Mesh(
        new T.BoxGeometry(0.3 + Math.random() * 0.3, 0.25, 0.5),
        new T.MeshStandardMaterial({
          color: i % 3 ? '#555e62' : '#dc8142',
          roughness: 0.6,
        }),
      );
      mesh.position.set(v.physics.x, 1.1, v.physics.z);
      scene.add(mesh);
      debris.push({ mesh, velocity, life: 3, hit: new Set() });
    }
    if (player.position.distanceTo(v.mesh.position) < 30) {
      shake = 0.7;
      notice = '차량 폭발! 파편을 피하세요';
      noticeTime = 2;
    }
  }
  function recoverTraffic(v: Vehicle) {
    for (let n = 0; n < 60; n++) {
      const index = Math.floor(Math.random() * v.route.length),
        a = v.route[index],
        b = v.route[(index + 1) % v.route.length];
      if (!a || !b) return false;
      const t = 0.15 + Math.random() * 0.7,
        x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t;
      if (
        blocked(x, z, 2.5) ||
        vehicles.some(
          (o) =>
            o !== v &&
            !o.exploded &&
            Math.hypot(o.physics.x - x, o.physics.z - z) < 12,
        ) ||
        people.some(
          (p) => p.active && Math.hypot(p.state.x - x, p.state.z - z) < 4,
        ) ||
        Math.hypot(player.position.x - x, player.position.z - z) < 18
      )
        continue;
      Object.assign(v.physics, body(x, z, Math.atan2(b.x - a.x, b.z - a.z)));
      v.waypoint = (index + 1) % v.route.length;
      v.driverOut = false;
      v.outFor = 0;
      v.stuck = 0;
      v.progressX = x;
      v.progressZ = z;
      v.hp = 100;
      v.burnTime = 0;
      v.exploded = false;
      v.mesh.visible = true;
      v.mesh.scale.setScalar(1);
      return true;
    }
    return false;
  }
  function updateDestruction(dt: number) {
    for (const v of vehicles) {
      if (v.hp > 0) continue;
      if (!v.exploded) {
        v.burnTime += dt;
        if (v.burnTime >= 4) explode(v);
      } else {
        v.respawnTime = Math.max(0, v.respawnTime - dt);
        if (v.respawnTime === 0) {
          recoverTraffic(v);
        }
      }
    }
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.life -= dt;
      const old = d.mesh.position.clone();
      d.velocity.y -= 9.8 * dt;
      d.mesh.position.addScaledVector(d.velocity, dt);
      if (blocked(d.mesh.position.x, d.mesh.position.z, 0.15)) {
        d.mesh.position.copy(old);
        d.velocity.x *= -0.3;
        d.velocity.z *= -0.3;
      }
      if (d.mesh.position.y < 0.15) {
        d.mesh.position.y = 0.15;
        d.velocity.y = Math.abs(d.velocity.y) * 0.25;
        d.velocity.x *= 0.9;
        d.velocity.z *= 0.9;
      }
      d.mesh.rotation.x += dt * 7;
      d.mesh.rotation.z += dt * 5;
      const delta = d.mesh.position.clone().sub(old),
        len = delta.lengthSq();
      const touches = (x: number, y: number, z: number) => {
        const target = new T.Vector3(x, y, z),
          t = len
            ? T.MathUtils.clamp(target.clone().sub(old).dot(delta) / len, 0, 1)
            : 0;
        return old.clone().addScaledVector(delta, t).distanceTo(target) < 0.85;
      };
      if (d.velocity.length() > 3) {
        for (const p of people)
          if (
            p.state.hp > 0 &&
            !d.hit.has(p.state.id) &&
            touches(p.state.x, 1, p.state.z)
          ) {
            d.hit.add(p.state.id);
            damagePerson(p.state, 15, false);
            hitPerson(p.state, d.velocity.x, d.velocity.z, 3);
          }
        if (
          hp > 0 &&
          !driving &&
          !d.hit.has(-1) &&
          touches(player.position.x, player.position.y + 1, player.position.z)
        ) {
          d.hit.add(-1);
          if (hurtTimer <= 0) {
            hp = Math.max(0, hp - 15);
            hurtTimer = 0.2;
            shake = 0.3;

            if (hp === 0) {
              clear();
              speed = 0;
              player.rotation.x = 1.4;
            }
          }
        }
      }
      if (d.life <= 0) {
        scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as T.Material).dispose();
        debris.splice(i, 1);
      }
    }
  }
  function handleDeaths() {
    for (const npc of people) {
      if (npc.state.hp > 0 || npc.deathHandled) continue;
      npc.deathHandled = true;
      if (life.companionId === npc.state.id) life.companionId = null;
      dropCash(
        life,
        npc.state.x,
        npc.state.z,
        800 + ((npc.state.id * 173 + life.dropSerial * 97) % 7200),
      );
      if (npc.vehicle) {
        npc.vehicle.position.set(npc.state.x, 0, npc.state.z);
        npc.vehicle.name = 'abandoned-bike-' + npc.state.id;
        abandonedBikes.push({ mesh: npc.vehicle, id: npc.state.id });
        npc.vehicle = null;
      }
      save();
    }
  }
  function updateCash() {
    const live = new Set(life.cashDrops.map((d) => d.id));
    for (const [id, g] of cashMeshes) {
      if (!live.has(id)) {
        scene.remove(g);
        cashMeshes.delete(id);
      }
    }
    for (const d of life.cashDrops) {
      let g = cashMeshes.get(d.id);
      if (!g) {
        g = new T.Group();
        g.name = 'cash-' + d.id;
        box(0.65, 0.14, 0.35, '#83c37e', 0, 0.15, 0, g);
        box(0.12, 0.15, 0.36, '#f6e9a6', 0, 0.15, 0, g);
        const halo = new T.Mesh(
          new T.RingGeometry(0.4, 0.55, 16),
          new T.MeshBasicMaterial({ color: '#d9ef8d', side: T.DoubleSide }),
        );
        halo.rotation.x = -Math.PI / 2;
        g.add(halo);
        scene.add(g);
        cashMeshes.set(d.id, g);
      }
      g.position.set(d.x, 0.14 + Math.sin(elapsed * 3 + d.id) * 0.06, d.z);
      g.visible = !life.inside;
    }
  }
  function physicsStep(dt: number, f: number, turn: number) {
    handleDeaths();
    updateDestruction(dt);
    for (const v of vehicles) {
      const p = v.physics;
      const fx = Math.sin(p.angle),
        fz = Math.cos(p.angle);
      if (v.exploded) continue;
      if (v.driverOut && !(v === controlled && driving)) {
        v.outFor += dt;
        if (v.outFor > 10 && player.position.distanceTo(v.mesh.position) > 8) {
          v.driverOut = false;
          v.outFor = 0;
        }
      }
      if (v.hp > 0 && !(v === controlled && driving)) {
        if (Math.hypot(p.x - v.progressX, p.z - v.progressZ) > 0.8) {
          v.stuck = 0;
          v.progressX = p.x;
          v.progressZ = p.z;
        } else v.stuck += dt;
        if (v.stuck > 9 && player.position.distanceTo(v.mesh.position) > 18)
          recoverTraffic(v);
      }
      if (v.hp <= 0) {
        p.vx *= Math.exp(-5 * dt);
        p.vz *= Math.exp(-5 * dt);
        p.spin *= Math.exp(-3 * dt);
      } else if (v === controlled && driving) {
        const forward = p.vx * fx + p.vz * fz;
        const thrust =
          Math.max(-1, Math.min(1, f)) * (forward * f < 0 ? 11 : 6.5);
        p.vx += fx * thrust * dt;
        p.vz += fz * thrust * dt;
        const lateral = p.vx * fz - p.vz * fx,
          grip = 1 - Math.exp(-(p.stun > 0 ? 1.3 : 7) * dt);
        p.vx -= lateral * fz * grip;
        p.vz += lateral * fx * grip;
        if (p.stun <= 0)
          p.angle +=
            turn * dt * 1.7 * T.MathUtils.clamp(forward / 18, -1.2, 1.2);
        if (keys[' ']) {
          const brakeSpeed = Math.hypot(p.vx, p.vz);
          const braking = Math.max(
            0,
            1 - (11 * dt) / Math.max(0.001, brakeSpeed),
          );
          p.vx *= braking;
          p.vz *= braking;
        }
        const vel = Math.hypot(p.vx, p.vz);
        const limit = forward < 0 ? 6 : 32;
        if (vel > limit) {
          p.vx *= limit / vel;
          p.vz *= limit / vel;
        }
      } else if (v.route.length && !v.driverOut && p.stun <= 0) {
        let target = v.route[v.waypoint];
        if (Math.hypot(target.x - p.x, target.z - p.z) < 5) {
          v.waypoint = (v.waypoint + 1) % v.route.length;
          target = v.route[v.waypoint];
        }
        const desired = Math.atan2(target.x - p.x, target.z - p.z),
          diff = Math.atan2(
            Math.sin(desired - p.angle),
            Math.cos(desired - p.angle),
          );
        p.angle += T.MathUtils.clamp(diff, -1.6 * dt, 1.6 * dt);
        const blockedAhead = vehicles.some(
          (o) =>
            o !== v &&
            !o.exploded &&
            o.hp > 0 &&
            Math.abs((o.physics.x - p.x) * fz - (o.physics.z - p.z) * fx) <
              2.5 &&
            Math.hypot(o.physics.x - p.x, o.physics.z - p.z) < 9 &&
            (o.physics.x - p.x) * fx + (o.physics.z - p.z) * fz > 1,
        );
        const px = player.position.x - p.x,
          pz = player.position.z - p.z;
        const pedestrianAhead =
          !driving &&
          !life.inside &&
          Math.abs(px * fz - pz * fx) < 1.9 &&
          px * fx + pz * fz > 1 &&
          px * fx + pz * fz < 10;
        const cruise =
            blockedAhead || pedestrianAhead
              ? 0
              : v.cruise * (Math.abs(diff) > 0.6 ? 0.45 : 1),
          rate = 1 - Math.exp(-1.8 * dt);
        p.vx += (Math.sin(p.angle) * cruise - p.vx) * rate;
        p.vz += (Math.cos(p.angle) * cruise - p.vz) * rate;
      } else if (v.driverOut || (v === controlled && !driving)) {
        p.vx *= Math.exp(-2 * dt);
        p.vz *= Math.exp(-2 * dt);
      }
      const wallHit = integrate(p, dt, blocked);
      if (wallHit > 2) {
        v.hp = Math.max(0, v.hp - Math.round((wallHit - 2) * 2.5));
        if (v === controlled) impactEffect(p.x, p.z, wallHit);
      }
      for (const lamp of lamps) {
        if (lamp.broken) continue;
        const dx = lamp.x - p.x,
          dz = lamp.z - p.z,
          sin = Math.sin(p.angle),
          cos = Math.cos(p.angle);
        const lx = dx * cos - dz * sin,
          lz = dx * sin + dz * cos;
        if (Math.abs(lx) > 1.4 || Math.abs(lz) > 2.35) continue;
        const speed = Math.hypot(p.vx, p.vz);
        if (speed > 2) {
          lamp.broken = true;
          lamp.axis.set(p.vz / speed, 0, -p.vx / speed);
          v.hp = Math.max(0, v.hp - Math.min(30, Math.round(speed * 1.2)));
          p.vx *= 0.8;
          p.vz *= 0.8;
          if (v === controlled) {
            impactEffect(lamp.x, lamp.z, speed);
            notice = '가로등이 부러졌습니다';
            noticeTime = 1.2;
          }
        } else {
          const length = Math.hypot(dx, dz) || 1;
          p.x -= (dx / length) * 0.1;
          p.z -= (dz / length) * 0.1;
          p.vx *= -0.2;
          p.vz *= -0.2;
        }
      }
    }
    for (const lamp of lamps) {
      if (lamp.broken) {
        lamp.fall = Math.min(
          Math.PI / 2 - 0.03,
          lamp.fall + dt * (0.7 + lamp.fall * 3),
        );
        lamp.mesh.quaternion.setFromAxisAngle(lamp.axis, lamp.fall);
      }
    }
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < vehicles.length; i++)
        for (let j = i + 1; j < vehicles.length; j++) {
          if (vehicles[i].exploded || vehicles[j].exploded) continue;
          const a = vehicles[i].physics,
            b = vehicles[j].physics;
          const hit = collide(a, b);
          if (hit > 3) {
            const damage = Math.min(65, Math.round((hit - 3) * 2.5));
            vehicles[i].hp = Math.max(0, vehicles[i].hp - damage);
            vehicles[j].hp = Math.max(0, vehicles[j].hp - damage);
          }
          if (
            hit > 3 &&
            driving &&
            (vehicles[i] === controlled || vehicles[j] === controlled)
          )
            driverExit(vehicles[vehicles[i] === controlled ? j : i]);
          if (
            hit > 3 &&
            (vehicles[i] === controlled || vehicles[j] === controlled)
          )
            impactEffect((a.x + b.x) / 2, (a.z + b.z) / 2, hit);
        }
    for (const p of people) {
      if (!p.active) continue;
      const respawned = respawnStep(
        p.state,
        dt,
        (x, z) =>
          !blocked(x, z, 1) &&
          vehicles.every(
            (v) => Math.hypot(v.physics.x - x, v.physics.z - z) > 6,
          ) &&
          people.every(
            (o) => o === p || Math.hypot(o.state.x - x, o.state.z - z) > 2,
          ) &&
          Math.hypot(player.position.x - x, player.position.z - z) > 8,
      );
      if (respawned) {
        p.deathHandled = false;
        p.goal = '';
        p.path = [];
        p.wait = 0;
        if (p.role === '배달기사' && !p.vehicle) {
          p.vehicle = scooter('#6caaa8', p.state.x, p.state.z);
          p.vehicle.name = 'npc-bike-' + p.state.id;
          box(0.85, 0.7, 0.8, '#e1e581', 0, 1.55, -0.65, p.vehicle);
        }
      }
      stepPerson(
        p.state,
        dt,
        blocked,
        !driving && !riding && hp > 0
          ? { x: player.position.x, z: player.position.z }
          : undefined,
        p.wait > 0
          ? { x: p.state.x, z: p.state.z }
          : p.path[0] ||
              (p.state.id < RESIDENTS
                ? { x: p.state.x, z: p.state.z }
                : undefined),
      );
      for (const v of vehicles) {
        if (v.exploded) continue;
        const oldX = p.state.x,
          oldZ = p.state.z;
        const power = vehiclePerson(v.physics, p.state);
        if (power > 0)
          damagePerson(
            p.state,
            Math.round(power * 3),
            v === controlled && driving,
          );
        if (blocked(p.state.x, p.state.z, 0.5)) {
          p.state.x = oldX;
          p.state.z = oldZ;
          p.state.vx *= 0.1;
          p.state.vz *= 0.1;
        }
        if (power > 1 && v === controlled && driving) {
          crime(1);
          shake = Math.min(0.35, power * 0.015);
          notice =
            power >= 6
              ? '보행자가 충격으로 넘어졌습니다'
              : '보행자가 충격에 밀려났습니다';
          noticeTime = 1.2;
        }
      }
      const target = {
        x: player.position.x,
        z: player.position.z,
        available: !driving && hp > 0 && player.position.y < 1,
      };
      let clearLine = true;
      for (let k = 1; k < 5; k++) {
        if (
          blocked(
            p.state.x + ((target.x - p.state.x) * k) / 5,
            p.state.z + ((target.z - p.state.z) * k) / 5,
            0.2,
          )
        )
          clearLine = false;
      }
      if (p.role === '경찰') {
        p.state.aggro = 0;
        p.state.swing = 0;
      }
      const damage =
        p.role === '경찰' ? 0 : combatStep(p.state, dt, target, clearLine);
      if (damage && hurtTimer <= 0) {
        hp = Math.max(0, hp - damage);
        hurtTimer = 0.55;
        shake = 0.2;

        if (hp === 0) {
          speed = 0;
          clear();
          player.rotation.x = 1.4;
        }
      }
      p.rig.pose(
        elapsed + p.state.id,
        Math.hypot(p.state.vx, p.state.vz),
        p.state.swing > 0
          ? Math.sin(((0.3 - p.state.swing) / 0.3) * Math.PI)
          : 0,
        p.state.hp === 0 || p.state.down > 0 || p.state.stun > 0,
      );
      if (p.vehicle) {
        p.rig.ride(0);
        p.vehicle.userData.animateBike?.(
          elapsed * Math.hypot(p.state.vx, p.state.vz),
          0,
          0,
        );
      }
      p.mesh.position.set(
        p.state.x,
        Math.sin(p.state.lean) * 0.3 + (p.vehicle && p.wait <= 0 ? 0.35 : 0),
        p.state.z,
      );
      p.mesh.rotation.set(p.state.lean, p.state.heading, 0);
    }
    for (const v of vehicles) {
      v.mesh.position.set(v.physics.x, 0, v.physics.z);
      v.mesh.rotation.y = v.physics.angle;
    }
    handleDeaths();
    if (!driving && !life.inside) {
      for (const b of obstacleBounds()) {
        const correction = circleVehicleCorrection(
          player.position.x,
          player.position.z,
          riding ? 0.85 : 0.5,
          b,
        );
        if (!correction) continue;
        const vehicle = vehicles.find(
            (v) => v.physics.x === b.x && v.physics.z === b.z,
          ),
          impact = vehicle
            ? Math.hypot(vehicle.physics.vx, vehicle.physics.vz)
            : 0;
        if (impact > 2 && hurtTimer <= 0) {
          const damage = Math.min(65, Math.max(3, Math.round(impact * 3)));
          hp = Math.max(0, hp - damage);
          hurtTimer = 1;
          shake = 0.2;
          if (riding) life.bikeHp = Math.max(0, life.bikeHp - damage);
        }
        if (
          !blocked(
            player.position.x + correction.x,
            player.position.z + correction.z,
            0.5,
          )
        ) {
          player.position.x += correction.x;
          player.position.z += correction.z;
        }
      }
    }
    if (driving) {
      yaw = controlled.physics.angle;
      speed = Math.hypot(controlled.physics.vx, controlled.physics.vz);
    }
  }
  function onKey(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('input,textarea,select,[role="dialog"]')
    )
      return;
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k))
      e.preventDefault();
    if (e.type === 'keyup') keys[k] = false;
    if (movementAllowed()) keys[k] = e.type === 'keydown';
    if (e.type === 'keydown' && !e.repeat) {
      if (k === 'e') interact();
      if (k === 'f') attack();
      if (k === 'q') equip();
      if (['1','2','3','4'].includes(k)) selectWeapon(Number(k)-1);
      if (k === 'v') mount();
      if (k === 'p' || k === 'tab') {
        e.preventDefault();
        open(panel === 'phone' ? null : 'phone');
      }
      if (k === 'i') open(panel === 'bag' ? null : 'bag');
      if (k === 'm') open(panel === 'map' ? null : 'map');
      if (k === ' ') jump();
      if (k === 'escape') {
        if (panel) open(null);
        else paused = !paused;
        clear();
      }
      if (k === 'r') reload();
    }
  }
  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || paused || !movementAllowed()) return;
    e.preventDefault();
    drag = true;
    px = e.clientX;
    py = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !drag) return;
    orbit -= (e.clientX - px) * (aiming ? 0.004 : 0.007);
    pitch = T.MathUtils.clamp(
      pitch + (e.clientY - py) * (aiming ? 0.003 : 0.005),
      armed ? -1.1 : 0.12,
      armed ? 1.1 : 1.35,
    );
    px = e.clientX;
    py = e.clientY;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerType === 'touch') drag = false;
  };
  const contextMenu = (e: MouseEvent) => e.preventDefault();
  const lostCapture = () => {
    drag = false;
  };
  const mouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      triggerHeld = true;
      attack();
      return;
    }
    if (e.button !== 2 || paused || !movementAllowed()) return;
    e.preventDefault();
    drag = true;
    adsBefore = ads;
    aiming = armed;
    rightDownAt = performance.now();
    rightMoved = 0;
    px = e.clientX;
    py = e.clientY;
    if (aiming) pitch = T.MathUtils.clamp(pitch, -0.5, 0.12);
  };
  const mouseMove = (e: MouseEvent) => {
    if (paused || !movementAllowed()) return;
    if (!ads && (!drag || !(e.buttons & 2))) {
      px = e.clientX;
      py = e.clientY;
      return;
    }
    rightMoved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
    orbit -= (e.clientX - px) * (aiming ? 0.004 : 0.007);
    pitch = T.MathUtils.clamp(
      pitch + (e.clientY - py) * (aiming ? 0.003 : 0.005),
      armed ? -1.1 : 0.12,
      armed ? 1.1 : 1.35,
    );
    px = e.clientX;
    py = e.clientY;
  };
  const mouseUp = (e: MouseEvent) => {
    if (e.button === 0) triggerHeld = false;
    if (e.button !== 2) return;
    drag = false;
    if (
      armed &&
      rightDownAt &&
      performance.now() - rightDownAt < 200 &&
      rightMoved < 5
    ) {
      ads = !adsBefore;
      aiming = ads;
    } else {
      ads = adsBefore;
      aiming = ads;
    }
    rightDownAt = 0;
  };
  renderer.domElement.addEventListener('mousedown', mouseDown);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mouseup', mouseUp);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', clear);
  renderer.domElement.addEventListener('pointerdown', down);
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerup', up);
  renderer.domElement.addEventListener('pointercancel', up);
  renderer.domElement.addEventListener('lostpointercapture', lostCapture);
  renderer.domElement.addEventListener('contextmenu', contextMenu);
  const wheel = (e: WheelEvent) => {
    if (!movementAllowed() || paused) return;
    e.preventDefault();
    zoom = T.MathUtils.clamp(zoom + e.deltaY * 0.001, 0.42, 1.85);
  };
  renderer.domElement.addEventListener('wheel', wheel, { passive: false });
  const resize = () => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
  camera.position.set(
    life.inside ? 308 : -30,
    life.inside ? 9 : 11,
    life.inside ? 12 : -61,
  );
  camera.lookAt(player.position.x, 1.4, player.position.z);
  const onVisibility = () => {
    clear();
    if (document.hidden) save();
    last = performance.now();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', save);
  function animate(now: number) {
    frame = requestAnimationFrame(animate);
    const realDt = document.hidden ? 0 : Math.min((now - last) / 1000, 1),
      dt = Math.min(realDt, 0.045);
    last = now;
    if (!paused) hurtTimer = Math.max(0, hurtTimer - dt);
    if (!paused && hp > 0) {
      life.hp = hp;
      const pos = activePosition();
      const seen =
        !life.inside &&
        people.some(
          (p) =>
            p.role === '경찰' &&
            p.active &&
            p.state.hp > 0 &&
            Math.hypot(pos.x - p.state.x, pos.z - p.state.z) < 30 &&
            lineClear(pos, p.state),
        );
      tickLife(life, realDt, {
        home: life.inside,
        menu:
          !movementAllowed() &&
          panel !== 'place' &&
          panel !== 'home' &&
          panel !== 'dialogue',
        dialogue: panel === 'dialogue',
        moving: speed > 0,
        running: !!keys.shift && speed > 0,
        riding: riding && speed > 0,
        seen,
      });
      hp = life.hp;
      if (seen) lastKnown.copy(pos);
    }
    const posNow = activePosition();
    updateOffice(dt);
    nearby =
      buildingFloor !== null
        ? null
        : life.inside
          ? 'home'
          : PLACES.find((p) => Math.hypot(p.x - posNow.x, p.z - posNow.z) < 4.8)
              ?.id || null;
    if (!paused) updateSocial(dt);
    if (nearby !== previousNearby) {
      dismissedPlace = null;
      previousNearby = nearby;
      if (panel === 'place') panel = null;
    }
    if (
      !life.inside &&
      !driving &&
      !riding &&
      !paused &&
      hp > 0 &&
      nearby &&
      !panel &&
      dismissedPlace !== nearby
    ) {
      panel = 'place';
      armed = false;
      gun.visible = false;
      aiming = ads = false;
      reloadTime = 0;
    }
    if (panel === 'place' && (!nearby || driving || riding)) panel = null;
    if (!life.inside && !driving && hp > 0 && !paused && movementAllowed()) {
      const amount = collectCash(life, posNow.x, posNow.z);
      if (amount) {
        say('현금 +' + amount.toLocaleString() + '원');
        save();
      }
    }
    updateCash();
    updateEnvironment(dt);
    if (now - lastSave > 5000) {
      lastSave = now;
      life.hp = hp;
      save();
    }
    if (!paused && !movementAllowed() && !life.inside && hp > 0) {
      updateResidents(dt);
      elapsed += dt;
      accumulator += dt;
      while (accumulator >= 1 / 120) {
        physicsStep(1 / 120, 0, 0);
        accumulator -= 1 / 120;
      }
    }
    if (!paused && movementAllowed() && hp > 0) {
      elapsed += dt;
      const f =
          Number(keys.w || keys.arrowup || false) -
          Number(keys.s || keys.arrowdown || false) -
          analog.y,
        turn =
          Number(keys.a || keys.arrowleft || false) -
          Number(keys.d || keys.arrowright || false) -
          analog.x;
      if (!life.inside) {
        updateResidents(dt);
        accumulator += dt;
      }
      while (accumulator >= 1 / 120) {
        physicsStep(1 / 120, f, turn);
        accumulator -= 1 / 120;
      }
      if (!driving && riding) {
        const maximum =
          life.fuel > 0 && life.bikeHp > 0
            ? BIKES[life.bikeTier].speed + (life.bikeTune ? 3 : 0)
            : 0;
        const delta = stepBike(bikeMotion, f, turn, !!keys[' '], maximum, dt);
        const before = player.position.clone();
        let impact = false;
        const steps = Math.max(
          1,
          Math.ceil(Math.hypot(delta.x, delta.z) / 0.22),
        );
        for (let i = 0; i < steps; i++) {
          const nx = player.position.x + delta.x / steps,
            nz = player.position.z + delta.z / steps;
          if (playerBlocked(nx, nz, 0.8)) {
            impact = true;
            break;
          }
          player.position.x = nx;
          player.position.z = nz;
        }
        if (impact) {
          const force = Math.abs(bikeMotion.velocity);
          bikeMotion.velocity *= 0.12;
          life.bikeHp = Math.max(0, life.bikeHp - force * 0.4);
          if (force > 7 && hurtTimer <= 0) {
            hp = Math.max(0, hp - Math.round(force));
            hurtTimer = 1;
            shake = 0.15;
          }
        }
        speed = Math.abs(bikeMotion.velocity);
        player.position.y = 0.22;
        player.rotation.y = bikeMotion.heading;
        player.rotation.z = bikeMotion.lean;
        bike.position.set(player.position.x, 0, player.position.z);
        bike.rotation.y = bikeMotion.heading;
        bike.userData.animateBike?.(
          bikeMotion.travel,
          bikeMotion.steering,
          bikeMotion.lean,
        );
        for (const p of people)
          if (
            p.active &&
            p.state.hp > 0 &&
            p.state.cooldown === 0 &&
            Math.hypot(
              p.state.x - player.position.x,
              p.state.z - player.position.z,
            ) < 1 &&
            speed > 3
          ) {
            hitPerson(
              p.state,
              Math.sin(bikeMotion.heading),
              Math.cos(bikeMotion.heading),
              6,
            );
            damagePerson(p.state, Math.min(45, speed * 2));
            crime(1);
            bikeMotion.velocity *= 0.7;
          }
        if (impact && before.distanceTo(player.position) < 0.001 && speed < 0.1)
          bikeMotion.velocity = 0;
      }
      if (!driving && !riding) {
        player.rotation.z = 0;
        jumpVelocity -= 18 * dt;
        const groundY = buildingFloor !== null ? (buildingFloor - 1) * 5 : 0;
        player.position.y = Math.max(
          groundY,
          player.position.y + jumpVelocity * dt,
        );
        if (player.position.y === groundY) jumpVelocity = 0;
        const a = yaw + orbit;
        const dx = -Math.sin(a) * f - Math.cos(a) * turn,
          dz = -Math.cos(a) * f + Math.sin(a) * turn,
          len = Math.hypot(dx, dz),
          v = riding
            ? life.fuel > 0 && life.bikeHp > 0
              ? BIKES[life.bikeTier].speed + (life.bikeTune ? 3 : 0)
              : 0
            : life.inside
              ? 2.5
              : aiming
                ? 2.5
                : keys.shift
                  ? 9
                  : 5;
        if (len) {
          const nx = player.position.x + (dx / len) * v * Math.min(1, len) * dt,
            nz = player.position.z + (dz / len) * v * Math.min(1, len) * dt;
          if (!playerBlocked(nx, player.position.z, riding ? 0.85 : 0.5))
            player.position.x = nx;
          else if (riding) life.bikeHp = Math.max(0, life.bikeHp - dt * 6);
          if (!playerBlocked(player.position.x, nz, riding ? 0.85 : 0.5))
            player.position.z = nz;
          else if (riding) life.bikeHp = Math.max(0, life.bikeHp - dt * 6);
          player.rotation.y = Math.atan2(dx, dz);
          legs[0].rotation.x = Math.sin(elapsed * 12) * 0.6;
          legs[1].rotation.x = -legs[0].rotation.x;
        } else legs.forEach((l) => (l.rotation.x = 0));
        speed = len ? v * Math.min(1, len) : 0;
        if (
          life.inside &&
          Math.abs(player.position.x - 300) < 0.7 &&
          player.position.z > 4.15
        )
          leaveHome();
        if (riding) {
          bike.position.set(player.position.x, 0, player.position.z);
          bike.rotation.y = player.rotation.y;
          player.position.y = 0.35;
          for (const p of people) {
            if (
              p.active &&
              p.state.hp > 0 &&
              Math.hypot(
                p.state.x - player.position.x,
                p.state.z - player.position.z,
              ) < 1 &&
              speed > 3 &&
              p.state.cooldown === 0
            ) {
              hitPerson(
                p.state,
                Math.sin(player.rotation.y),
                Math.cos(player.rotation.y),
                6,
              );
              damagePerson(p.state, 12);
              crime(1);
            }
          }
        }
      }
      attackTime = Math.max(0, attackTime - dt);
      attackCooldown = Math.max(0, attackCooldown - dt);
      noticeTime = Math.max(0, noticeTime - dt);
      const punch =
        attackTime > 0 ? Math.sin((1 - attackTime / 0.28) * Math.PI) : 0;
      playerRig.pose(elapsed, driving || riding ? 0 : speed, punch);
      if (riding) playerRig.ride(bikeMotion.lean);
      shotCooldown = Math.max(0, shotCooldown - dt);
      if (triggerHeld && armed && (weapon === 1 || weapon === 2) && !shotCooldown && life.ammo > 0) shoot();
      shotTime = Math.max(0, shotTime - dt);
      recoil = Math.max(0, recoil - dt * 0.055);
      stableAim = aiming && speed < 0.1 ? stableAim + dt : 0;
      if (reloadTime > 0) {
        reloadTime = Math.max(0, reloadTime - dt);
        if (!reloadTime) {
          const rounds = Math.min(WEAPONS[weapon].magazine - life.ammo, life.reserve);
          life.ammo += rounds;
          life.reserve -= rounds;
          say('재장전 완료');
          save();
        }
      }
      crimeCheck -= dt;
      if (crimeCheck <= 0) {
        crimeCheck = 2;
        if (armed) crime(1);
      }
      gun.visible = armed && !driving;
      flash.visible = shotTime > 0;
      trail.visible = shotTime > 0;
      if (armed && !driving) {
        player.rotation.y = yaw + orbit + Math.PI;
        playerRig.arms[1].rotation.x = -Math.PI / 2;
        playerRig.elbows[1].rotation.x = 0;
      }
      if (!riding && player.position.y > 0.05) {
        playerRig.knees[0].rotation.x = 0.65;
        playerRig.knees[1].rotation.x = 0.65;
      }
      sparkLife = Math.max(0, sparkLife - dt);
      sparks.forEach((s, i) => {
        s.visible = sparkLife > 0;
        const t = 0.35 - sparkLife,
          angle = (i / 12) * Math.PI * 2;
        s.position.set(
          sparkOrigin.x + Math.cos(angle) * t * 8,
          sparkOrigin.y + t * 3 - t * t * 12,
          sparkOrigin.z + Math.sin(angle) * t * 8,
        );
      });
      const pos = driving ? ride.position : player.position;
      const target = targetPlace(life);
      ring.visible = beam.visible = !!target && !life.inside;
      if (target) {
        ring.position.set(target.x, 0.2, target.z);
        beam.position.set(target.x, 8, target.z);
      }
      ring.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.06);
      const a =
          (driving
            ? yaw + Math.PI
            : riding
              ? bikeMotion.heading + Math.PI
              : yaw) + orbit,
        forward = new T.Vector3(
          -Math.sin(a) * Math.cos(pitch),
          -Math.sin(pitch),
          -Math.cos(a) * Math.cos(pitch),
        ),
        right = new T.Vector3(Math.cos(a), 0, -Math.sin(a));
      const desired = aiming
        ? ads
          ? new T.Vector3(
              pos.x,
              1.8 + player.position.y,
              pos.z,
            ).addScaledVector(forward, 0.12)
          : new T.Vector3(pos.x, 1.65 + player.position.y, pos.z)
              .addScaledVector(forward, -3.1)
              .addScaledVector(right, 0.98)
        : new T.Vector3(
            pos.x +
              Math.sin(a) *
                Math.cos(pitch) *
                (life.inside ? 10 : driving ? 16 : 13) *
                zoom,
            1.8 +
              player.position.y +
              Math.sin(pitch) * (life.inside ? 10 : driving ? 16 : 13) * zoom,
            pos.z +
              Math.cos(a) *
                Math.cos(pitch) *
                (life.inside ? 10 : driving ? 16 : 13) *
                zoom,
          );
      if (aiming && !ads) {
        const start = new T.Vector3(pos.x, 1.7, pos.z);
        for (let t = 0.05; t <= 1; t += 0.05) {
          const probe = start.clone().lerp(desired, t);
          if (blocked(probe.x, probe.z, 0.2)) {
            desired.copy(start.lerp(desired, Math.max(0, t - 0.08)));
            break;
          }
        }
      }
      if (ads) camera.position.copy(desired);
      else camera.position.lerp(desired, 1 - Math.exp(-dt * (aiming ? 16 : 5)));
      camera.fov = ads
        ? weapon === 3 ? T.MathUtils.clamp(20 * zoom, 12, 35) : T.MathUtils.clamp(43 * zoom, 25, 65)
        : aiming
          ? 50
          : 53;
      camera.updateProjectionMatrix();
      shake *= Math.exp(-7 * dt);
      camera.position.x += Math.sin(elapsed * 91) * shake;
      camera.position.y += Math.cos(elapsed * 78) * shake;
      if (aiming)
        camera.lookAt(camera.position.clone().addScaledVector(forward, 40));
      else camera.lookAt(pos.x, 1.8 + player.position.y, pos.z);
    }
    player.visible =
      !driving &&
      !ads &&
      (!aiming ||
        camera.position.distanceTo(
          player.position.clone().add(new T.Vector3(0, 1.7, 0)),
        ) > 1.25);
    viewGun.visible = ads && armed && !reloadTime && hp > 0;
    viewGun.position.z = -0.5 + shotTime * 0.45;
    gun.visible = armed && !driving && !ads;
    updateDamage(dt);
    updateShotEffects(dt);
    if (now - lastHud > 100) {
      lastHud = now;
      const pos = driving ? ride.position : player.position;
      const target = targetPlace(life);
      const closest = people
        .filter((p) => p.active)
        .sort(
          (a, b) =>
            Math.hypot(a.state.x - pos.x, a.state.z - pos.z) -
            Math.hypot(b.state.x - pos.x, b.state.z - pos.z),
        )[0];
      const forward = camera.getWorldDirection(new T.Vector3()),
        heading = headingFromDirection(forward.x, forward.z);
      const requestedId = numberRequest?.id;
      const woman =
        requestedId !== undefined
          ? people.find((p) => p.state.id === requestedId)
          : nearbyWoman();
      report({
        building:
          buildingFloor !== null
            ? {
                floor: buildingFloor,
                moving: liftRemaining > 0,
                nearLift:
                  Math.hypot(player.position.x - 400, player.position.z + 3.1) <
                  1.55,
                nearDelivery:
                  buildingFloor === 2 &&
                  Math.hypot(player.position.x - 404, player.position.z - 1) <
                    2,
              }
            : null,
        social: woman
          ? {
              id: woman.state.id,
              name: residentName(woman.state.id),
              chance: Math.round(numberChance(life.cash) * 100),
              remaining:
                numberRequest?.id === woman.state.id
                  ? Math.max(0, numberRequest.remaining)
                  : 0,
              following: life.companionId === woman.state.id,
              known: life.contacts.includes(woman.state.id),
              cooldown: Math.max(
                0,
                (life.numberCooldowns[woman.state.id] || 0) - life.minutes,
              ),
            }
          : null,
        position: {
          x: buildingFloor !== null ? 100 : life.inside ? -40 : pos.x,
          z: buildingFloor !== null ? 56 : life.inside ? -75 : pos.z,
        },
        heading,
        playerHeading: driving ? ride.rotation.y : player.rotation.y,
        life: structuredClone(life),
        panel,
        nearby,
        riding,
        aiming,
        ads,
        weapon,
        reload: reloadTime,
        spread: Math.round(
          8 + speed * 2 + (life.caffeine >= 3 ? 15 : 0) + recoil * 100,
        ),
        saveStatus,
        activity:
          !life.inside &&
          closest &&
          Math.hypot(closest.state.x - pos.x, closest.state.z - pos.z) < 12
            ? `${closest.role} · ${closest.activity}`
            : '',
        armed,
        vehicleHp: controlled.hp,
        hp,
        hurt: hurtTimer > 0,
        speed: Math.round(Math.abs(speed) * 3.6),
        driving,
        mission: life.order ? (life.order.stage === 'pickup' ? 0 : 1) : 2,
        distance: target
          ? Math.round(
              Math.hypot(
                (life.inside ? -40 : pos.x) - target.x,
                (life.inside ? -75 : pos.z) - target.z,
              ),
            )
          : 0,
        paused,
        hint:
          driving && controlled.hp === 0
            ? '차량이 불타고 있습니다 · E 키로 내리세요'
            : noticeTime > 0
              ? notice
              : life.inside
                ? '문 밖으로 걸어서 외출 · E 집 꾸미기'
                : nearby && !driving && !riding
                  ? `E ${place(nearby).name}${life.order && (life.order.stage === 'pickup' ? life.order.pickup : life.order.dropoff) === nearby ? ' · 배달 상호작용' : ' · 원 밖으로 이동하면 닫기'}`
                  : driving
                    ? 'E 내려서 탐험하기 · SPACE 브레이크'
                    : riding
                      ? 'V 바이크 내리기 · WASD 이동'
                      : life.bikeTier >= 0 && pos.distanceTo(bike.position) < 4
                        ? 'V 내 바이크 탑승'
                        : pos.distanceTo(ride.position) < 6
                          ? 'E 키를 눌러 차량에 탑승하세요'
                          : 'WASD 이동 · P 휴대폰 · M 동네 지도 · E 상호작용',
        error: '',
      });
      for (const mapId of ['minimap', 'citymap']) {
        const c = document.getElementById(mapId) as HTMLCanvasElement | null,
          ctx = c?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 220, 220);
          ctx.fillStyle = '#293c3e';
          ctx.fillRect(0, 0, 220, 220);
          const cv = (v: number) => 110 + v * 0.88;
          ctx.save();
          if (mapId === 'minimap') {
            ctx.translate(110, 110);
            ctx.rotate(-heading);
            ctx.translate(
              -cv(buildingFloor !== null ? 100 : life.inside ? -40 : pos.x),
              -cv(buildingFloor !== null ? 56 : life.inside ? -75 : pos.z),
            );
          }
          ctx.fillStyle = '#67716a';
          solids.forEach((b) =>
            ctx.fillRect(
              cv(b.x - b.w / 2),
              cv(b.z - b.d / 2),
              b.w * 0.88,
              b.d * 0.88,
            ),
          );
          ctx.strokeStyle = '#a3aaa0';
          ctx.lineWidth = 2;
          for (const a of [-70, 0, 70]) {
            ctx.beginPath();
            ctx.moveTo(cv(a), 0);
            ctx.lineTo(cv(a), 220);
            ctx.stroke();
          }
          for (const a of [-65, 0, 65]) {
            ctx.beginPath();
            ctx.moveTo(0, cv(a));
            ctx.lineTo(220, cv(a));
            ctx.stroke();
          }
          PLACES.forEach((p) => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(cv(p.x), cv(p.z), 2.4, 0, Math.PI * 2);
            ctx.fill();
          });
          if (target) {
            ctx.fillStyle = '#eaff79';
            ctx.beginPath();
            ctx.arc(cv(target.x), cv(target.z), 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#aac7d3';
          vehicles
            .slice(1)
            .forEach((v) =>
              ctx.fillRect(cv(v.physics.x) - 2, cv(v.physics.z) - 2, 4, 4),
            );
          ctx.fillStyle = '#ed905d';
          ctx.fillRect(cv(ride.position.x) - 3, cv(ride.position.z) - 3, 6, 6);
          ctx.save();
          ctx.translate(
            cv(buildingFloor !== null ? 100 : life.inside ? -40 : pos.x),
            cv(buildingFloor !== null ? 56 : life.inside ? -75 : pos.z),
          );
          ctx.rotate(heading);
          ctx.fillStyle = '#d9ef8d33';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 22, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#172e35';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -8);
          ctx.lineTo(5, 6);
          ctx.lineTo(0, 3);
          ctx.lineTo(-5, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          ctx.restore();
          if (mapId === 'minimap') {
            ctx.fillStyle = '#d9ef8d';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              'N',
              110 - Math.sin(heading) * 94,
              110 - Math.cos(heading) * 94,
            );
          }
        }
      }
    }
    vehicles.forEach((v) => {
      v.bar.position.set(v.physics.x, 2.7, v.physics.z);
      v.bar.quaternion.copy(camera.quaternion);
      v.fill.scale.x = v.hp / 100;
      v.fill.position.x = -(1 - v.hp / 100) * 1.3;
      (v.fill.material as T.MeshBasicMaterial).color.set(
        v.hp < 30 ? '#ef6546' : '#83c9ec',
      );
      v.bar.visible = !v.exploded && !life.inside && v.hp < 100;
      v.fire.visible = v.hp === 0 && !v.exploded;
      if (v.hp === 0)
        v.fire.children.forEach((part, i) => {
          if (i < 9) {
            part.scale.y = 1 + Math.sin(elapsed * 12 + i) * 0.3;
            part.scale.x = 1 + Math.cos(elapsed * 9 + i) * 0.15;
          } else {
            const t = (elapsed * 0.5 + (i - 9) * 0.2) % 1;
            part.position.y = 2.7 + t * 4;
            part.position.x = Math.sin(elapsed + i) * t * 0.6;
            part.scale.setScalar(0.5 + t * 1.7);
          }
        });
    });
    people.forEach((p) => {
      p.bar.visible =
        p.active && !life.inside && (p.state.hp < 100 || p.state.aggro > 0);
      p.bar.position.set(p.state.x, p.state.hp > 0 ? 2.7 : 0.8, p.state.z);
      p.bar.quaternion.copy(camera.quaternion);
      p.fill.scale.x = p.state.hp / 100;
      p.fill.position.x = -(1 - p.state.hp / 100) * 0.95;
      (p.fill.material as T.MeshBasicMaterial).color.set(
        p.state.aggro > 0 ? '#ef795c' : p.state.hp < 35 ? '#e8b64b' : '#86df88',
      );
    });
    updateGuests(dt);
    renderer.render(scene, camera);
  }
  // Buildings and roads do not move. Batch boxes by material to cut draw calls.
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  let staticCount = 0;
  for (const object of scene.children.slice())
    if (object instanceof T.Mesh && object.userData.staticWorld) {
      object.updateMatrixWorld(true);
      const material = object.material as T.Material;
      if (!batches.has(material)) batches.set(material, []);
      batches
        .get(material)!
        .push(object.geometry.clone().applyMatrix4(object.matrixWorld));
      scene.remove(object);
      object.geometry.dispose();
      staticCount++;
    }
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false)!;
    const mesh = new T.Mesh(geometry, material);
    mesh.name = 'static-world-batch';
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  scene.userData.staticBatching = { before: staticCount, after: batches.size };
  frame = requestAnimationFrame(animate);
  return {
    presence: () => {
      const p = activePosition();
      const companion = people.find(n => n.active && n.state.hp > 0 && n.state.id === life.companionId);

      return {
        x: buildingFloor !== null ? 100 + (p.x - 400) : life.inside ? -40 : p.x,
        z: buildingFloor !== null ? 56 + p.z : life.inside ? -75 : p.z,
        heading: Math.atan2(
          Math.sin(driving ? ride.rotation.y : player.rotation.y),
          Math.cos(driving ? ride.rotation.y : player.rotation.y),
        ),
        speed: speed * 3.6,
        mode: driving ? 'car' : riding ? 'bike' : 'walk',
        inside: life.inside,
        scene: buildingFloor !== null ? 'office:' + buildingFloor : 'outdoors',
        hp,
        armed,
        weapon,
        companion: companion && !life.inside && buildingFloor === null ? { id: companion.state.id, x: companion.state.x, z: companion.state.z, heading: companion.mesh.rotation.y } : null,
        emote: '',
      };
    },
    onPeerAttack: (callback) => {
      peerAttack = callback;
    },
    receiveDamage: (amount) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      hp = Math.max(0, hp - amount);
      life.hp = hp;
      hurtTimer = 1;
      shake = 0.15;
      if (!hp) {
        speed = 0;
        bikeMotion.velocity = 0;
        clear();
        player.rotation.x = 1.4;
      }
      lastHud = 0;
    },
    typing: (value) => {
      typing = value;
      if (value) clear();
    },
    elevator: () => operateElevator(),
    setPeers,
    askNumber,
    open,
    action: doAction,
    stick: (x, y) => {
      if (!paused && movementAllowed()) {
        analog.x = Number.isFinite(x) ? T.MathUtils.clamp(x, -1, 1) : 0;
        analog.y = Number.isFinite(y) ? T.MathUtils.clamp(y, -1, 1) : 0;
      }
    },
    mount,
    selectWeapon,
    reload,
    aim: () => {
      if (armed && movementAllowed() && !paused) {
        aiming = !aiming;
        ads = aiming;
        pitch = T.MathUtils.clamp(pitch, -0.5, 0.12);
      }
    },
    jump,
    equip,
    attack,
    key: (k, v) => {
      if (movementAllowed() && !paused) keys[k] = v;
    },
    interact,
    reset,
    pause: () => {
      paused = !paused;
      panel = null;
      clear();
    },
    dispose: () => {
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
      for (const e of impactEffects) {
        scene.remove(e.object);
        if (e.object instanceof T.Mesh) e.object.geometry.dispose();
        (e.object.material as T.Material).dispose();
      }
      for (const texture of [
        flashTexture,
        sparkTexture,
        smokeTexture,
        scorchTexture,
      ])
        texture.dispose();
      flash.material.dispose();
      adsFlash.material.dispose();
      for (const d of damageNumbers) {
        scene.remove(d.sprite);
        d.sprite.material.map?.dispose();
        d.sprite.material.dispose();
      }
      for (const id of guests.keys()) removeGuest(id);
      life.hp = hp;
      save();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', save);
      rainGeometry.dispose();
      (rain.material as T.Material).dispose();
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', clear);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      renderer.domElement.removeEventListener(
        'lostpointercapture',
        lostCapture,
      );
      renderer.domElement.removeEventListener('contextmenu', contextMenu);
      trail.geometry.dispose();
      (trail.material as T.Material).dispose();
      scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
