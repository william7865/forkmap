// Mapping des valeurs de cuisine OSM (anglais/slug) vers un libellé FR.
// Les valeurs OSM `cuisine=` sont en anglais et parfois multiples (`a;b`).
const MAP: Record<string, string> = {
  french: 'Français',
  italian: 'Italien',
  japanese: 'Japonais',
  chinese: 'Chinois',
  thai: 'Thaï',
  vietnamese: 'Vietnamien',
  indian: 'Indien',
  mexican: 'Mexicain',
  spanish: 'Espagnol',
  greek: 'Grec',
  lebanese: 'Libanais',
  turkish: 'Turc',
  moroccan: 'Marocain',
  korean: 'Coréen',
  american: 'Américain',
  burger: 'Burger',
  pizza: 'Pizza',
  sushi: 'Sushi',
  kebab: 'Kebab',
  seafood: 'Fruits de mer',
  steak_house: 'Grill',
  barbecue: 'Barbecue',
  sandwich: 'Sandwich',
  bakery: 'Boulangerie',
  cafe: 'Café',
  coffee_shop: 'Café',
  ice_cream: 'Glacier',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
  asian: 'Asiatique',
  regional: 'Régional',
  international: 'International',
  fast_food: 'Fast-food',
  tapas: 'Tapas',
  ramen: 'Ramen',
  noodle: 'Nouilles',
  fish_and_chips: 'Fish & chips',
  crepe: 'Crêperie',
  portuguese: 'Portugais',
  brazilian: 'Brésilien',
  argentinian: 'Argentin',
  german: 'Allemand',
  african: 'Africain',
  ethiopian: 'Éthiopien',
  caribbean: 'Antillais',
}

function capitalize(s: string): string {
  const t = s.replace(/_/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

export function frCuisine(raw: string): string {
  if (!raw) return ''
  const first = raw.split(/[;,]/)[0]?.trim() ?? ''
  if (!first) return ''
  const key = first.toLowerCase().replace(/\s+/g, '_')
  return MAP[key] ?? capitalize(first)
}
