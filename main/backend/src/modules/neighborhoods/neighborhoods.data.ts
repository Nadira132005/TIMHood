export type NeighborhoodSeed = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mapTop: number;
  mapLeft: number;
  mapWidth: number;
  mapHeight: number;
};

export const TIMISOARA_NEIGHBORHOODS: NeighborhoodSeed[] = [
  {
    id: 'mehala',
    name: 'Mehala',
    slug: 'mehala',
    description: 'Zona istorica din partea de nord-vest a orasului.',
    mapTop: 16,
    mapLeft: 24,
    mapWidth: 92,
    mapHeight: 58
  },
  {
    id: 'aradului',
    name: 'Aradului',
    slug: 'aradului',
    description: 'Cartierul din nord, spre Calea Aradului.',
    mapTop: 24,
    mapLeft: 132,
    mapWidth: 94,
    mapHeight: 54
  },
  {
    id: 'circumvalatiunii',
    name: 'Circumvalatiunii',
    slug: 'circumvalatiunii',
    description: 'Zona centrala-nordica de locuire densa.',
    mapTop: 84,
    mapLeft: 84,
    mapWidth: 112,
    mapHeight: 52
  },
  {
    id: 'cetate',
    name: 'Cetate',
    slug: 'cetate',
    description: 'Centrul istoric al Timisoarei.',
    mapTop: 142,
    mapLeft: 114,
    mapWidth: 86,
    mapHeight: 48
  },
  {
    id: 'iosefin',
    name: 'Iosefin',
    slug: 'iosefin',
    description: 'Cartierul vestic al orasului, spre gara.',
    mapTop: 198,
    mapLeft: 48,
    mapWidth: 94,
    mapHeight: 56
  },
  {
    id: 'elisabetin',
    name: 'Elisabetin',
    slug: 'elisabetin',
    description: 'Zona rezidentiala dintre centru si sud.',
    mapTop: 206,
    mapLeft: 150,
    mapWidth: 92,
    mapHeight: 58
  },
  {
    id: 'fabric',
    name: 'Fabric',
    slug: 'fabric',
    description: 'Cartierul din est, cu zona istorica si artere comerciale.',
    mapTop: 148,
    mapLeft: 214,
    mapWidth: 88,
    mapHeight: 58
  },
  {
    id: 'dacia',
    name: 'Dacia',
    slug: 'dacia',
    description: 'Zona nord-estica dintre centru si Lipovei.',
    mapTop: 82,
    mapLeft: 214,
    mapWidth: 84,
    mapHeight: 50
  },
  {
    id: 'lipovei',
    name: 'Lipovei',
    slug: 'lipovei',
    description: 'Cartierul din nord-est al orasului.',
    mapTop: 28,
    mapLeft: 238,
    mapWidth: 86,
    mapHeight: 48
  },
  {
    id: 'soarelui',
    name: 'Soarelui',
    slug: 'soarelui',
    description: 'Zona sud-estica cu blocuri si legaturi spre bulevardele mari.',
    mapTop: 274,
    mapLeft: 176,
    mapWidth: 100,
    mapHeight: 54
  },
  {
    id: 'girocului',
    name: 'Girocului',
    slug: 'girocului',
    description: 'Cartierul sudic spre Calea Martirilor si Giroc.',
    mapTop: 268,
    mapLeft: 68,
    mapWidth: 96,
    mapHeight: 58
  },
  {
    id: 'braytim',
    name: 'Braytim',
    slug: 'braytim',
    description: 'Zona rezidentiala din extremitatea de sud-est.',
    mapTop: 338,
    mapLeft: 188,
    mapWidth: 96,
    mapHeight: 54
  },
  {
    id: 'dambovita',
    name: 'Dambovita',
    slug: 'dambovita',
    description: 'Cartierul sud-vestic din jurul Caii Sagului si al bulevardelor largi.',
    mapTop: 292,
    mapLeft: 10,
    mapWidth: 88,
    mapHeight: 52
  },
  {
    id: 'calea-sagului',
    name: 'Calea Sagului',
    slug: 'calea-sagului',
    description: 'Zona de sud-vest dezvoltata in jurul Caii Sagului.',
    mapTop: 350,
    mapLeft: 18,
    mapWidth: 110,
    mapHeight: 54
  },
  {
    id: 'odobescu',
    name: 'Odobescu',
    slug: 'odobescu',
    description: 'Zona adiacenta Iosefinului si axelor rezidentiale spre sud-vest.',
    mapTop: 244,
    mapLeft: 24,
    mapWidth: 80,
    mapHeight: 42
  },
  {
    id: 'tipografilor',
    name: 'Tipografilor',
    slug: 'tipografilor',
    description: 'Zona est-centrala dintre Fabric si arterele spre nord.',
    mapTop: 108,
    mapLeft: 256,
    mapWidth: 78,
    mapHeight: 40
  },
  {
    id: 'calea-martirilor',
    name: 'Calea Martirilor',
    slug: 'calea-martirilor',
    description: 'Zona sudica dezvoltata de-a lungul Caii Martirilor.',
    mapTop: 326,
    mapLeft: 110,
    mapWidth: 98,
    mapHeight: 46
  },
  {
    id: 'steaua',
    name: 'Steaua',
    slug: 'steaua',
    description: 'Cartierul din sud-vest mentionat frecvent in interventiile municipale.',
    mapTop: 382,
    mapLeft: 74,
    mapWidth: 94,
    mapHeight: 46
  },
  {
    id: 'complexul-studentesc',
    name: 'Complexul Studentesc',
    slug: 'complexul-studentesc',
    description: 'Zona universitara cu camine, servicii si viata de noapte.',
    mapTop: 210,
    mapLeft: 250,
    mapWidth: 92,
    mapHeight: 46
  },
  {
    id: 'torontalului',
    name: 'Torontalului',
    slug: 'torontalului',
    description: 'Zona nord-vestica spre Calea Torontalului.',
    mapTop: 18,
    mapLeft: 86,
    mapWidth: 90,
    mapHeight: 42
  },
  {
    id: 'stadion',
    name: 'Stadion',
    slug: 'stadion',
    description: 'Zona din jurul stadionului si a arterelor estice apropiate.',
    mapTop: 168,
    mapLeft: 294,
    mapWidth: 62,
    mapHeight: 44
  }
];

function normalizeNeighborhoodName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function findNeighborhoodSeedByName(name: string): NeighborhoodSeed | null {
  const normalized = normalizeNeighborhoodName(name);
  return TIMISOARA_NEIGHBORHOODS.find(
    (neighborhood) =>
      normalizeNeighborhoodName(neighborhood.name) === normalized ||
      normalizeNeighborhoodName(neighborhood.slug) === normalized
  ) || null;
}
