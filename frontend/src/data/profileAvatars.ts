import avatar01 from '../assets/avatar-01-azul.png'
import avatar02 from '../assets/avatar-02-rojo.png'
import avatar03 from '../assets/avatar-03-encapuchado.png'
import avatar04 from '../assets/avatar-04-cabello-blanco.png'
import avatar05 from '../assets/avatar-05-zorro.png'
import avatar06 from '../assets/avatar-06-barbudo.png'

export type ProfileAvatarCategory =
  | 'Ciencia ficción'
  | 'Fantasía'
  | 'Acción'
  | 'Aventura'

export type ProfileAvatar = {
  id: string
  name: string
  category: ProfileAvatarCategory
  avatarPath: string
  coverPath: null
  accent: string
}

export const profileAvatars: ProfileAvatar[] = [
  {
    id: 'nova-guardian',
    name: 'Exploradora azul',
    category: 'Ciencia ficción',
    avatarPath: avatar01,
    coverPath: null,
    accent: '#38bdf8',
  },
  {
    id: 'wild-warden',
    name: 'Guerrero barbudo',
    category: 'Acción',
    avatarPath: avatar06,
    coverPath: null,
    accent: '#4ade80',
  },
  {
    id: 'ember-mage',
    name: 'Guerrera de cabello blanco',
    category: 'Fantasía',
    avatarPath: avatar04,
    coverPath: null,
    accent: '#c084fc',
  },
  {
    id: 'neon-racer',
    name: 'Guerrero rojo',
    category: 'Acción',
    avatarPath: avatar02,
    coverPath: null,
    accent: '#f472b6',
  },
  {
    id: 'orbit-android',
    name: 'Zorro explorador',
    category: 'Aventura',
    avatarPath: avatar05,
    coverPath: null,
    accent: '#22d3ee',
  },
  {
    id: 'tide-seeker',
    name: 'Viajero encapuchado',
    category: 'Aventura',
    avatarPath: avatar03,
    coverPath: null,
    accent: '#60a5fa',
  },
]

export function getProfileAvatar(avatarId: string | null): ProfileAvatar | null {
  return profileAvatars.find((avatar) => avatar.id === avatarId) ?? null
}
