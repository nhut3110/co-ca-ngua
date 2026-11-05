/** Presentation-only manifests. Never change game rules or hitboxes through cosmetics. */
export type ProceduralRenderer = 'horse' | 'fox' | 'mage' | 'unicorn' | 'drake' | 'archon';

export type ModelDefinition =
  | { kind: 'procedural'; renderer: ProceduralRenderer }
  | {
      kind: 'gltf';
      url: string;
      scale: number;
      rotationY: number;
      miniature?: boolean;
      barding?: boolean;
      animations: Partial<Record<'idle' | 'move' | 'capture' | 'finish', string>>;
    };

export interface SkinDefinition {
  id: string;
  name: string;
  description: string;
  category?: 'steed' | 'hero' | 'mythic' | 'undead';
  model: ModelDefinition;
  accent: string;
  portrait?: string;
}

export interface ChromaDefinition {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  emissive: string;
  metalness: number;
  roughness: number;
}

export interface AuraDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  secondary: string;
  style: 'none' | 'runes' | 'wings' | 'crown' | 'shards';
}

export interface PedestalDefinition {
  id: string;
  name: string;
  description: string;
  base: string;
  trim: string;
  glow: string;
  style: 'classic' | 'lotus' | 'iron' | 'astral';
}

export interface GameModePreset {
  id: 'classic' | 'arcane' | 'relic' | 'grand';
  name: string;
  subtitle: string;
  badge: string;
  accent: string;
  board: 'classic' | 'grand';
  modules: {
    spells: boolean;
    portals: boolean;
    comeback: boolean;
    events: boolean;
    relics: boolean;
  };
}

export interface BiomeDefinition {
  id: string;
  name: string;
  ground: string;
  foliage: string;
  detail: string;
  atmosphere: string;
  decoration:
    'pine' | 'snow' | 'cactus' | 'sakura' | 'volcano' | 'celestial' | 'mushroom' | 'ruins';
}

export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  layout: 'classic-52';
  base: 'crag' | 'crystal' | 'citadel' | 'archipelago';
  environment: 'daybreak' | 'moonlight';
  surface: string;
  rock: string;
}

export const skins: SkinDefinition[] = [
  {
    id: 'woodland-horse',
    name: 'Kỵ mã cổ điển',
    description: 'Chiến mã cẩm thạch tung vó của hội bàn tròn.',
    category: 'steed',
    accent: '#d6b88a',
    portrait: '/assets/portraits/horse_statue_01.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/horse_statue_01.glb',
      scale: 0.34,
      rotationY: Math.PI / 2,
      miniature: true,
      animations: {},
    },
  },
  {
    id: 'cloud-fox',
    name: 'Cáo mây',
    description: 'Một chút tinh nghịch, một chiếc đuôi bông.',
    category: 'mythic',
    accent: '#e4a56f',
    portrait: '/assets/portraits/Druid.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/Druid.glb',
      scale: 0.32,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
  {
    id: 'little-mage',
    name: 'Pháp sư nhỏ',
    description: 'Mang cả bầu trời trong chiếc mũ.',
    category: 'mythic',
    accent: '#adbce1',
    portrait: '/assets/portraits/Witch.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/Witch.glb',
      scale: 0.32,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
];

export const legacySkins = skins.splice(1, 2);

const recruits: [string, string, string, string, string, SkinDefinition['category']][] = [
  ['Knight', 'knight', 'Hiệp sĩ', 'Áo giáp thép, người giữ lời thề.', '#91aabc', 'hero'],
  ['Mage', 'mage', 'Pháp sư', 'Áo choàng dài, người dệt phép.', '#9984c9', 'hero'],
  ['Barbarian', 'barbarian', 'Cuồng chiến', 'Một chiến binh của vùng biên.', '#b8956d', 'hero'],
  ['Rogue', 'rogue', 'Đạo tặc', 'Bước chân nhẹ của hội bóng tối.', '#668e81', 'hero'],
  ['Rogue_Hooded', 'ranger', 'Du hiệp', 'Ẩn mình trong chiếc mũ trùm.', '#658a6a', 'hero'],
  [
    'Skeleton_Warrior',
    'bone-knight',
    'Cốt kỵ',
    'Lời thề còn lại sau trăm năm.',
    '#c6be9b',
    'undead',
  ],
  [
    'Skeleton_Mage',
    'necromancer',
    'Tử linh',
    'Phép thuật từ thành phố đã mất.',
    '#9a7aa9',
    'undead',
  ],
  ['Skeleton_Rogue', 'bone-rogue', 'Ảnh cốt', 'Kẻ canh gác lối đi bí mật.', '#7e9d99', 'undead'],
  ['Skeleton_Minion', 'bone-guard', 'Cốt vệ', 'Đội quân nhỏ không biết sợ.', '#bdbca7', 'undead'],
];

for (const [file, id, name, description, accent, category] of recruits)
  skins.push({
    id,
    name,
    description,
    category,
    accent,
    portrait: `/assets/portraits/${file}.webp`,
    model: {
      kind: 'gltf',
      url: `/assets/models/${file}.glb`,
      scale: 0.32,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  });

skins.push(
  {
    id: 'royal-steed',
    name: 'Thánh kỵ Hoàng gia',
    description: 'Thánh kỵ sĩ khoác giáp vàng ròng và mũ cánh thiên thần.',
    category: 'steed',
    accent: '#eab869',
    portrait: '/assets/portraits/Paladin.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/Paladin.glb',
      scale: 0.33,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
  {
    id: 'astral-unicorn',
    name: 'Hiền nhân Lộc giác',
    description: 'Thủ hộ rừng cổ đội vương miện sừng hươu dẫn lối qua vòm mây.',
    category: 'mythic',
    accent: '#9be7ff',
    portrait: '/assets/portraits/Druid.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/Druid.glb',
      scale: 0.33,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
  {
    id: 'ember-drake',
    name: 'Cự thần Tinh thạch',
    description: 'Khổng lồ kết tinh từ đá cổ và băng ngọc vĩnh cửu.',
    category: 'mythic',
    accent: '#82d8ff',
    portrait: '/assets/portraits/FrostGolem.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/FrostGolem.glb',
      scale: 0.36,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
  {
    id: 'spirit-fox',
    name: 'Hỏa linh Sừng đỏ',
    description: 'Chiến binh huyết hỏa mang ấn chú cổ đại vùng biên viễn.',
    category: 'mythic',
    accent: '#ff8a65',
    portrait: '/assets/portraits/Tiefling.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/Tiefling.glb',
      scale: 0.32,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
  {
    id: 'arcane-archon',
    name: 'Hắc kỵ Ma thần',
    description: 'Đại kỵ sĩ giáp hắc thiết sừng trâu thống lĩnh đại điện.',
    category: 'mythic',
    accent: '#b79cff',
    portrait: '/assets/portraits/BlackKnight.webp',
    model: {
      kind: 'gltf',
      url: '/assets/models/BlackKnight.glb',
      scale: 0.36,
      rotationY: 0,
      miniature: true,
      animations: { idle: 'Idle', move: 'Running_A', capture: 'Walking_A' },
    },
  },
);

export const chromas: ChromaDefinition[] = [
  {
    id: 'default',
    name: 'Nguyên bản',
    description: 'Sắc màu truyền thống của chiến binh.',
    primary: '#d6b88a',
    secondary: '#6b7d7d',
    emissive: '#000000',
    metalness: 0.45,
    roughness: 0.42,
  },
  {
    id: 'imperial-gold',
    name: 'Hoàng kim Đế vương',
    description: 'Giáp vàng ròng chạm nổi ánh dương.',
    primary: '#f4c762',
    secondary: '#8c5828',
    emissive: '#593b08',
    metalness: 0.88,
    roughness: 0.2,
  },
  {
    id: 'jade-spirit',
    name: 'Ngọc bích Linh thần',
    description: 'Ngọc lục bảo phát sáng từ rừng nguyên sinh.',
    primary: '#4fd6a5',
    secondary: '#1d5c4b',
    emissive: '#114a36',
    metalness: 0.55,
    roughness: 0.24,
  },
  {
    id: 'obsidian-void',
    name: 'Hắc diệu Hư không',
    description: 'Đá hắc diệu поглоth ánh tím ma thuật.',
    primary: '#362b48',
    secondary: '#a87ffb',
    emissive: '#351b68',
    metalness: 0.78,
    roughness: 0.22,
  },
  {
    id: 'frost-crystal',
    name: 'Băng ngọc Vĩnh cửu',
    description: 'Pha lê băng tinh khiết phản chiếu cực quang.',
    primary: '#9ce6ff',
    secondary: '#3b7fa1',
    emissive: '#164d68',
    metalness: 0.62,
    roughness: 0.16,
  },
  {
    id: 'crimson-ember',
    name: 'Huyết hỏa Dung nham',
    description: 'Thép đỏ nung chảy trong lò rèn cổ.',
    primary: '#ff6d4a',
    secondary: '#521d1a',
    emissive: '#5c180a',
    metalness: 0.72,
    roughness: 0.28,
  },
  {
    id: 'astral-nebula',
    name: 'Tinh vân Ngân hà',
    description: 'Ánh sao đêm hội tụ trên thân giáp.',
    primary: '#c9b3ff',
    secondary: '#42559e',
    emissive: '#29225e',
    metalness: 0.8,
    roughness: 0.18,
  },
];

export const auras: AuraDefinition[] = [
  {
    id: 'none',
    name: 'Không dùng',
    description: 'Giữ vẻ đẹp thuần khiết của nhân vật.',
    color: '#9fb0ad',
    secondary: '#566360',
    style: 'none',
  },
  {
    id: 'rune-halo',
    name: 'Vòng Cổ tự',
    description: 'Ấn chú ma thuật xoay quanh chân quân cờ.',
    color: '#73f0d4',
    secondary: '#f5d076',
    style: 'runes',
  },
  {
    id: 'aether-wings',
    name: 'Cánh Tinh linh',
    description: 'Đôi cánh ánh sáng mở rộng sau lưng.',
    color: '#9ee6ff',
    secondary: '#f8e39b',
    style: 'wings',
  },
  {
    id: 'grand-crown',
    name: 'Vương miện Vua cờ',
    description: 'Vương miện vàng lơ lửng trên đỉnh đầu.',
    color: '#ffd166',
    secondary: '#ff8c42',
    style: 'crown',
  },
  {
    id: 'starlight-shards',
    name: 'Tinh thạch Hộ vệ',
    description: 'Ba viên pha lê năng lượng bay vòng quanh.',
    color: '#c79dff',
    secondary: '#7ae7ff',
    style: 'shards',
  },
];

export const pedestals: PedestalDefinition[] = [
  {
    id: 'classic',
    name: 'Đế Đồng Cổ điển',
    description: 'Đế cờ cẩm thạch viền đồng truyền thống.',
    base: '#2b3d37',
    trim: '#c9a664',
    glow: '#7be0c3',
    style: 'classic',
  },
  {
    id: 'lotus-jade',
    name: 'Đài Sen Ngọc bích',
    description: 'Cánh sen ngọc nâng bước chân thần tốc.',
    base: '#1d473d',
    trim: '#6be3b5',
    glow: '#88ffd4',
    style: 'lotus',
  },
  {
    id: 'iron-crown',
    name: 'Bệ Hắc thiết',
    description: 'Gai thép rèn từ đỉnh núi lửa cổ.',
    base: '#342329',
    trim: '#e2844b',
    glow: '#ff964f',
    style: 'iron',
  },
  {
    id: 'astral-ring',
    name: 'Tinh cầu Hoàng kim',
    description: 'Vòng quỹ đạo thiên문 học chạm vàng.',
    base: '#29274c',
    trim: '#f2ca6b',
    glow: '#b9acff',
    style: 'astral',
  },
];

export const gameModes: GameModePreset[] = [
  {
    id: 'classic',
    name: 'Cổ Điển',
    subtitle: 'Đường đua 52 ô truyền thống, thuần chiến thuật xúc xắc.',
    badge: 'TRUYỀN THỐNG',
    accent: '#d8b774',
    board: 'classic',
    modules: { spells: false, portals: false, comeback: false, events: false, relics: false },
  },
  {
    id: 'arcane',
    name: 'Đại Chiến Pháp Thuật',
    subtitle: 'Mở toàn bộ 6 phép thuật, Cổng không gian, Tái xuất & Thiên văn.',
    badge: 'MA THUẬT',
    accent: '#6fe3d1',
    board: 'classic',
    modules: { spells: true, portals: true, comeback: true, events: true, relics: false },
  },
  {
    id: 'relic',
    name: 'Săn Cổ Vật Bí Ẩn',
    subtitle: 'Thu thập Cổ vật phát sáng trên đường đua để nhận bùa lợi tức thì.',
    badge: 'MỚI · SĂN BÁU VẬT',
    accent: '#ffb35c',
    board: 'classic',
    modules: { spells: true, portals: true, comeback: true, events: true, relics: true },
  },
  {
    id: 'grand',
    name: 'Đại Viễn Chinh 80 Ô',
    subtitle: 'Đảo khổng lồ 80 ô với đầy đủ Phép thuật, Cổ vật và Biến cố.',
    badge: 'ĐẠI BẢN ĐỒ',
    accent: '#c09cff',
    board: 'grand',
    modules: { spells: true, portals: true, comeback: true, events: true, relics: true },
  },
];

export const biomes: BiomeDefinition[] = [
  {
    id: 'forest',
    name: 'Rừng thông',
    ground: '#5ca368',
    foliage: '#2f6e52',
    detail: '#c8eba4',
    atmosphere: '#9ce0a6',
    decoration: 'pine',
  },
  {
    id: 'snow',
    name: 'Miền tuyết',
    ground: '#c5e6ee',
    foliage: '#72a8b8',
    detail: '#f4fbff',
    atmosphere: '#b6e6f5',
    decoration: 'snow',
  },
  {
    id: 'desert',
    name: 'Cồn cát',
    ground: '#e2bc85',
    foliage: '#639b78',
    detail: '#fae0ad',
    atmosphere: '#f7ca88',
    decoration: 'cactus',
  },
  {
    id: 'sakura',
    name: 'Vườn anh đào',
    ground: '#c8b2ab',
    foliage: '#eb9eb4',
    detail: '#ffe0e4',
    atmosphere: '#f2b8cb',
    decoration: 'sakura',
  },
  {
    id: 'volcano',
    name: 'Hỏa sơn',
    ground: '#524044',
    foliage: '#c9532e',
    detail: '#ffb54c',
    atmosphere: '#f58445',
    decoration: 'volcano',
  },
  {
    id: 'celestial',
    name: 'Thiên giới',
    ground: '#e3d5b8',
    foliage: '#e6b850',
    detail: '#fff4c7',
    atmosphere: '#ffe5a3',
    decoration: 'celestial',
  },
  {
    id: 'mushroom',
    name: 'Rừng nấm cổ',
    ground: '#457a75',
    foliage: '#4ea399',
    detail: '#b8f0d8',
    atmosphere: '#86d6ce',
    decoration: 'mushroom',
  },
  {
    id: 'ruins',
    name: 'Phế tích lục bảo',
    ground: '#829c7b',
    foliage: '#4b8262',
    detail: '#dfd098',
    atmosphere: '#b2d4a5',
    decoration: 'ruins',
  },
];

export const maps: MapDefinition[] = [
  {
    id: 'floating-island',
    name: 'Đảo trên mây',
    subtitle: 'Một cuộc đua giữa tầng không',
    layout: 'classic-52',
    base: 'crag',
    environment: 'daybreak',
    surface: '#e2d7b5',
    rock: '#637a7a',
  },
  {
    id: 'moon-garden',
    name: 'Vườn trăng',
    subtitle: 'Dưới ánh sáng của những vì sao',
    layout: 'classic-52',
    base: 'crystal',
    environment: 'moonlight',
    surface: '#b8c9d1',
    rock: '#4e6385',
  },
  {
    id: 'sky-citadel',
    name: 'Thành trì lơ lửng',
    subtitle: 'Thành đá và những trụ chống cổ',
    layout: 'classic-52',
    base: 'citadel',
    environment: 'daybreak',
    surface: '#b8bdb0',
    rock: '#75827d',
  },
  {
    id: 'wandering-isles',
    name: 'Quần đảo phiêu du',
    subtitle: 'Những vệ tinh đá quanh đảo mẹ',
    layout: 'classic-52',
    base: 'archipelago',
    environment: 'daybreak',
    surface: '#b0be9c',
    rock: '#6e827a',
  },
];

export const skies = [
  {
    id: 'daylight',
    name: 'Biển mây',
    image: '/assets/skies/kloofendal_48d_partly_cloudy_puresky.jpg',
    light: '#fff2dc',
    fog: '#9ec4d4',
  },
  {
    id: 'sunset',
    name: 'Hoàng hôn',
    image: '/assets/skies/qwantani_sunset_puresky.jpg',
    light: '#ffd09b',
    fog: '#8b7da3',
  },
  {
    id: 'dusk',
    name: 'Chạng vạng',
    image: '/assets/skies/qwantani_dusk_2_puresky.jpg',
    light: '#becaf5',
    fog: '#6e7ba8',
  },
  {
    id: 'astral',
    name: 'Đêm tinh tú',
    image: '/assets/skies/qwantani_dusk_2_puresky.jpg',
    light: '#bdd0ff',
    fog: '#2c3b59',
  },
];

export const diceStyles = [
  {
    id: 'astral-brass',
    name: 'Đồng tinh tú',
    body: '#223e48',
    metal: '#d4ae6a',
    glow: '#91e5d8',
    shape: 'rounded',
    roughness: 0.25,
  },
  {
    id: 'ivory-relic',
    name: 'Ngà cổ',
    body: '#e2d5b8',
    metal: '#9c7b49',
    glow: '#e8c978',
    shape: 'beveled',
    roughness: 0.5,
  },
  {
    id: 'obsidian',
    name: 'Hắc diệu',
    body: '#282234',
    metal: '#b191cc',
    glow: '#d0adff',
    shape: 'faceted',
    roughness: 0.2,
  },
  {
    id: 'frostglass',
    name: 'Băng ngọc',
    body: '#7ab6c2',
    metal: '#d3e8ee',
    glow: '#c2f2ff',
    shape: 'rounded',
    roughness: 0.16,
  },
  {
    id: 'ember-forge',
    name: 'Lò than hồng',
    body: '#4d312b',
    metal: '#c9814d',
    glow: '#ffb66e',
    shape: 'beveled',
    roughness: 0.38,
  },
] as const;

export const catalogById = <T extends { id: string }>(items: readonly T[], id?: string): T =>
  (id ? items.find((x) => x.id === id) : undefined) ?? items[0];

export interface FactionDefinition {
  id: string;
  name: string;
  title: string;
  metal: string;
  trim: string;
  cloth: string;
  magic: string;
  crest: 'antlers' | 'frost' | 'embers' | 'wings' | 'sun' | 'petals';
}

export const factions: Record<string, FactionDefinition> = {
  forest: {
    id: 'verdant-oath',
    name: 'Lục Thệ',
    title: 'KỴ SĨ RỪNG CỔ',
    metal: '#536553',
    trim: '#c9ab68',
    cloth: '#263c31',
    magic: '#80e5b2',
    crest: 'antlers',
  },
  snow: {
    id: 'frostguard',
    name: 'Sương Vệ',
    title: 'KỴ SĨ BĂNG GIÁ',
    metal: '#c2d5de',
    trim: '#9bc0cf',
    cloth: '#263d59',
    magic: '#9df0ff',
    crest: 'frost',
  },
  volcano: {
    id: 'ashen-order',
    name: 'Hắc Tàn',
    title: 'KỴ SĨ HẮC THIẾT',
    metal: '#3c363e',
    trim: '#bf7c4d',
    cloth: '#5e2124',
    magic: '#ff9d52',
    crest: 'embers',
  },
  celestial: {
    id: 'astral-order',
    name: 'Tinh Ước',
    title: 'KỴ SĨ TINH TÚ',
    metal: '#dfd6bc',
    trim: '#c9a85c',
    cloth: '#564666',
    magic: '#d9c7ff',
    crest: 'wings',
  },
  desert: {
    id: 'sunward',
    name: 'Nhật Vệ',
    title: 'KỴ SĨ MẶT TRỜI',
    metal: '#b89a6d',
    trim: '#edd09b',
    cloth: '#735332',
    magic: '#ffd075',
    crest: 'sun',
  },
  sakura: {
    id: 'thorn-court',
    name: 'Hoa Thệ',
    title: 'KỴ SĨ HOA GAI',
    metal: '#b8adb0',
    trim: '#d4ab82',
    cloth: '#6b3f57',
    magic: '#f2b1dc',
    crest: 'petals',
  },
  mushroom: {
    id: 'spore-wardens',
    name: 'Bào Linh',
    title: 'KỴ SĨ RỪNG NẤM',
    metal: '#66827f',
    trim: '#bfe0b6',
    cloth: '#42385c',
    magic: '#8ef0d4',
    crest: 'petals',
  },
  ruins: {
    id: 'relic-keepers',
    name: 'Cổ Vệ',
    title: 'KỴ SĨ DI TÍCH',
    metal: '#829685',
    trim: '#d6c183',
    cloth: '#345449',
    magic: '#95ebd8',
    crest: 'sun',
  },
};

export const factionForBiome = (id: string): FactionDefinition => factions[id] ?? factions.forest;
