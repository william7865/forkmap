// ── Forkmap i18n — translations ─────────────────────────────
export type Lang = 'fr' | 'en' | 'es' | 'de' | 'ja'

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export type TranslationKey =
  // Header
  | 'search_placeholder'
  | 'filters'
  | 'favorites'
  | 'my_account'
  // Sidebar
  | 'starting_point'
  | 'search_address'
  | 'locate_me'
  | 'places'
  | 'place'
  | 'departure_point'
  | 'clicking'
  // Place detail
  | 'open'
  | 'closed'
  | 'getting_there'
  | 'set_starting_point'
  | 'walk'
  | 'bike'
  | 'drive'
  | 'nearby'
  | 'view_on_osm'
  | 'note'
  | 'share'
  | 'remove_favorite'
  | 'add_favorite'
  // Suggestions
  | 'suggestions_title'
  | 'suggestions_subtitle'
  | 'based_on_favorites'
  | 'no_suggestions'
  | 'explore_map'
  | 'try_also'
  // Filters
  | 'sort_by'
  | 'cuisine'
  | 'price'
  | 'open_now'
  | 'reset'
  | 'sort_score'
  | 'sort_rating'
  | 'sort_distance'
  | 'sort_name'
  // Common
  | 'loading'
  | 'error'
  | 'retry'
  | 'close'
  | 'cancel'
  | 'save'
  | 'saved'
  | 'removed'
  | 'login_to_save'
  | 'search_this_area'
  // Account / Favorites
  | 'my_favorites'
  | 'saved_places'
  | 'no_saved_places'
  | 'explore'
  | 'sign_out'
  | 'sign_in'
  | 'delete_account'
  | 'member_since'
  | 'cuisines'
  | 'last_added'
  | 'recently_saved'
  | 'see_all'
  | 'view_on_map'
  | 'remove'
  | 'keep'
  | 'remove_from_favorites'
  | 'sort_recent'
  | 'sort_oldest'
  | 'sort_az'
  | 'sort_rating_tab'
  | 'filter_by_cuisine'
  | 'all'
  | 'no_results'
  | 'reset_filters'
  // Nearby
  | 'italian'
  | 'french'
  | 'japanese'
  | 'chinese'
  | 'mexican'
  // Footer
  | 'footerBackToMap'
  | 'footerPrivacy'
  | 'footerTerms'
  | 'footerAttribution'
  // Imports (posts partagés depuis les réseaux)
  | 'importsRowTitle'
  | 'importPending'
  | 'importPendingHint'
  | 'importNeedsConfirm'
  | 'importNotFound'
  | 'importNotFoundHint'
  | 'importRetry'
  | 'importWrongPlace'
  | 'importCorrectHint'
  | 'importCorrectCancel'
  | 'importWhichOne'
  | 'importSearchManually'
  | 'importSearchPlaceholder'
  | 'importSearching'
  | 'importNoSearchResult'
  | 'importFoundTitle'
  | 'importAlsoSeenIn'
  | 'importOpenSource'
  | 'importAddNote'
  | 'importNoteTitle'
  | 'importWhereTitle'
  | 'importRoute'
  | 'importSaveAction'
  | 'importSavedAction'
  | 'importReviews'
  | 'importFriendSavedOne'
  | 'importFriendsSavedMany'
  | 'importPlay'
  | 'importMissing'
  | 'importBack'
  | 'importDelete'
  | 'importDeleteTitle'
  | 'importDeleteBody'
  | 'importDeleteCancel'
  | 'importDeleteFailed'
  | 'importMichelin'
  | 'importMichelinStars'

type Translations = Record<Lang, Record<TranslationKey, string>>

export const t: Translations = {
  fr: {
    search_placeholder: 'Filtrer par nom ou cuisine…',
    filters: 'Filtres',
    favorites: 'Favoris',
    my_account: 'Mon compte',
    starting_point: 'POINT DE DÉPART',
    search_address: 'Rechercher une adresse…',
    locate_me: 'Me localiser',
    places: 'lieux',
    place: 'lieu',
    departure_point: 'Point départ',
    clicking: 'Cliquez…',
    open: 'Ouvert',
    closed: 'Fermé',
    getting_there: 'Y ALLER',
    set_starting_point: 'Définissez un point de départ pour voir les itinéraires en temps réel',
    walk: 'Marche',
    bike: 'Vélo',
    drive: 'Voiture',
    nearby: 'À PROXIMITÉ',
    view_on_osm: 'Voir sur OpenStreetMap',
    note: 'Note',
    share: 'Partager',
    remove_favorite: 'Retirer des favoris',
    add_favorite: 'Ajouter aux favoris',
    suggestions_title: 'Suggestions pour vous',
    suggestions_subtitle: 'Basé sur vos goûts',
    based_on_favorites: "D'après vos favoris",
    no_suggestions: 'Explorez la carte pour découvrir des restaurants',
    explore_map: 'Explorer la carte',
    try_also: 'Vous pourriez aimer',
    sort_by: 'Trier',
    cuisine: 'Cuisine',
    price: 'Prix',
    open_now: 'Ouvert',
    reset: 'Réinitialiser',
    sort_score: 'Score',
    sort_rating: 'Note',
    sort_distance: 'Distance',
    sort_name: 'Nom',
    loading: 'Chargement…',
    error: 'Erreur',
    retry: 'Réessayer',
    close: 'Fermer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saved: 'Sauvegardé ✓',
    removed: 'Retiré',
    login_to_save: 'Connectez-vous pour sauvegarder vos favoris',
    search_this_area: 'Rechercher ici',
    my_favorites: 'Mes favoris',
    saved_places: 'Lieux sauvegardés',
    no_saved_places: 'Aucun lieu sauvegardé',
    explore: 'Explorer les restaurants →',
    sign_out: 'Se déconnecter',
    sign_in: 'Se connecter',
    delete_account: 'Supprimer le compte',
    member_since: 'Membre depuis',
    cuisines: 'Cuisines',
    last_added: 'Dernier ajout',
    recently_saved: 'Récemment sauvegardés',
    see_all: 'Voir tous mes favoris',
    view_on_map: 'Voir sur la carte',
    remove: 'Retirer',
    keep: 'Garder',
    remove_from_favorites: 'Retirer des favoris ?',
    sort_recent: 'Récent',
    sort_oldest: 'Ancien',
    sort_az: 'A → Z',
    sort_rating_tab: 'Note',
    filter_by_cuisine: 'Filtrer',
    all: 'Tout',
    no_results: 'Aucun résultat',
    reset_filters: 'Réinitialiser',
    italian: 'Italien',
    french: 'Français',
    japanese: 'Japonais',
    chinese: 'Chinois',
    mexican: 'Mexicain',
    footerBackToMap: 'Carte',
    footerPrivacy: 'Confidentialité',
    footerTerms: 'Conditions',
    footerAttribution: 'Sources des données',
    importsRowTitle: 'Vus sur les réseaux',
    importPending: 'Analyse en cours…',
    importPendingHint: 'On cherche le resto de ce post. Ouvre l’app pour finir l’analyse.',
    importNeedsConfirm: 'À confirmer',
    importNotFound: 'Resto non reconnu',
    importNotFoundHint: 'On n’a pas reconnu le resto. Cherche-le à la main.',
    importRetry: 'Réessayer la reconnaissance',
    importWrongPlace: 'Ce n’est pas le bon resto ?',
    importCorrectHint: 'Cherche le bon resto pour corriger.',
    importCorrectCancel: 'Garder ce resto',
    importWhichOne: 'C’est lequel ?',
    importSearchManually: 'Chercher à la main',
    importSearchPlaceholder: 'Nom du resto, ville…',
    importSearching: 'Recherche…',
    importNoSearchResult: 'Aucun résultat.',
    importFoundTitle: 'Ce qu’on a trouvé',
    importAlsoSeenIn: 'Vu aussi dans',
    importOpenSource: 'Voir le post',
    importAddNote: 'Ajoute une note…',
    importNoteTitle: 'Ma note',
    importWhereTitle: 'Où c’est',
    importRoute: 'Itinéraire',
    importSaveAction: 'Enregistrer',
    importSavedAction: 'Enregistré',
    importReviews: 'avis',
    importFriendSavedOne: 'ami l’a enregistré',
    importFriendsSavedMany: 'amis l’ont enregistré',
    importPlay: 'Lire la vidéo',
    importMissing: 'Import introuvable.',
    importBack: 'Retour',
    importDelete: 'Supprimer',
    importDeleteTitle: 'Supprimer cet import ?',
    importDeleteBody:
      'Ce post disparaîtra de « Vus sur les réseaux ». Le restaurant reste dans tes favoris s’il y est.',
    importDeleteCancel: 'Annuler',
    importDeleteFailed: 'Suppression impossible. Réessaie.',
    importMichelin: 'Étoilé Michelin',
    importMichelinStars: 'étoiles Michelin',
  },
  en: {
    search_placeholder: 'Filter by name or cuisine…',
    filters: 'Filters',
    favorites: 'Favorites',
    my_account: 'My account',
    starting_point: 'STARTING POINT',
    search_address: 'Search address…',
    locate_me: 'Locate me',
    places: 'places',
    place: 'place',
    departure_point: 'Set start',
    clicking: 'Click…',
    open: 'Open',
    closed: 'Closed',
    getting_there: 'GETTING THERE',
    set_starting_point: 'Set a starting point to see real-time routes',
    walk: 'Walk',
    bike: 'Bike',
    drive: 'Drive',
    nearby: 'NEARBY',
    view_on_osm: 'View on OpenStreetMap',
    note: 'Note',
    share: 'Share',
    remove_favorite: 'Remove from favorites',
    add_favorite: 'Add to favorites',
    suggestions_title: 'Suggestions for you',
    suggestions_subtitle: 'Based on your taste',
    based_on_favorites: 'Based on your favorites',
    no_suggestions: 'Explore the map to discover restaurants',
    explore_map: 'Explore map',
    try_also: 'You might also like',
    sort_by: 'Sort',
    cuisine: 'Cuisine',
    price: 'Price',
    open_now: 'Open now',
    reset: 'Reset',
    sort_score: 'Score',
    sort_rating: 'Rating',
    sort_distance: 'Distance',
    sort_name: 'Name',
    loading: 'Loading…',
    error: 'Error',
    retry: 'Retry',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    saved: 'Saved ✓',
    removed: 'Removed',
    login_to_save: 'Sign in to save favorites',
    search_this_area: 'Search this area',
    my_favorites: 'My favorites',
    saved_places: 'Saved places',
    no_saved_places: 'No saved places',
    explore: 'Explore restaurants →',
    sign_out: 'Sign out',
    sign_in: 'Sign in',
    delete_account: 'Delete account',
    member_since: 'Member since',
    cuisines: 'Cuisines',
    last_added: 'Last added',
    recently_saved: 'Recently saved',
    see_all: 'See all saved places',
    view_on_map: 'View on map',
    remove: 'Remove',
    keep: 'Keep',
    remove_from_favorites: 'Remove from favorites?',
    sort_recent: 'Recent',
    sort_oldest: 'Oldest',
    sort_az: 'A → Z',
    sort_rating_tab: 'Rating',
    filter_by_cuisine: 'Filter',
    all: 'All',
    no_results: 'No results',
    reset_filters: 'Reset filters',
    italian: 'Italian',
    french: 'French',
    japanese: 'Japanese',
    chinese: 'Chinese',
    mexican: 'Mexican',
    footerBackToMap: 'Map',
    footerPrivacy: 'Privacy',
    footerTerms: 'Terms',
    footerAttribution: 'Data attribution',
    importsRowTitle: 'Seen on social',
    importPending: 'Analysing…',
    importPendingHint: 'We’re looking for the restaurant in this post. Open the app to finish.',
    importNeedsConfirm: 'To confirm',
    importNotFound: 'Restaurant not recognised',
    importNotFoundHint: 'We couldn’t recognise the restaurant. Search for it by hand.',
    importRetry: 'Try recognition again',
    importWrongPlace: 'Wrong restaurant?',
    importCorrectHint: 'Search for the right restaurant to fix it.',
    importCorrectCancel: 'Keep this one',
    importWhichOne: 'Which one is it?',
    importSearchManually: 'Search by hand',
    importSearchPlaceholder: 'Restaurant name, city…',
    importSearching: 'Searching…',
    importNoSearchResult: 'No result.',
    importFoundTitle: 'What we found',
    importAlsoSeenIn: 'Also seen in',
    importOpenSource: 'View the post',
    importAddNote: 'Add a note…',
    importNoteTitle: 'My note',
    importWhereTitle: 'Where it is',
    importRoute: 'Directions',
    importSaveAction: 'Save',
    importSavedAction: 'Saved',
    importReviews: 'reviews',
    importFriendSavedOne: 'friend saved it',
    importFriendsSavedMany: 'friends saved it',
    importPlay: 'Play the video',
    importMissing: 'Import not found.',
    importBack: 'Back',
    importDelete: 'Delete',
    importDeleteTitle: 'Delete this import?',
    importDeleteBody:
      'This post will disappear from “Seen on social”. The restaurant stays in your favourites if it’s there.',
    importDeleteCancel: 'Cancel',
    importDeleteFailed: 'Could not delete. Try again.',
    importMichelin: 'Michelin-starred',
    importMichelinStars: 'Michelin stars',
  },
  es: {
    search_placeholder: 'Filtrar por nombre o cocina…',
    filters: 'Filtros',
    favorites: 'Favoritos',
    my_account: 'Mi cuenta',
    starting_point: 'PUNTO DE PARTIDA',
    search_address: 'Buscar dirección…',
    locate_me: 'Ubicarme',
    places: 'lugares',
    place: 'lugar',
    departure_point: 'Punto inicio',
    clicking: 'Haciendo clic…',
    open: 'Abierto',
    closed: 'Cerrado',
    getting_there: 'CÓMO LLEGAR',
    set_starting_point: 'Establece un punto de partida para ver rutas',
    walk: 'A pie',
    bike: 'Bici',
    drive: 'Coche',
    nearby: 'CERCA',
    view_on_osm: 'Ver en OpenStreetMap',
    note: 'Nota',
    share: 'Compartir',
    remove_favorite: 'Quitar de favoritos',
    add_favorite: 'Añadir a favoritos',
    suggestions_title: 'Sugerencias para ti',
    suggestions_subtitle: 'Basado en tus gustos',
    based_on_favorites: 'Según tus favoritos',
    no_suggestions: 'Explora el mapa para descubrir restaurantes',
    explore_map: 'Explorar mapa',
    try_also: 'También te puede gustar',
    sort_by: 'Ordenar',
    cuisine: 'Cocina',
    price: 'Precio',
    open_now: 'Abierto',
    reset: 'Restablecer',
    sort_score: 'Puntuación',
    sort_rating: 'Valoración',
    sort_distance: 'Distancia',
    sort_name: 'Nombre',
    loading: 'Cargando…',
    error: 'Error',
    retry: 'Reintentar',
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    saved: 'Guardado ✓',
    removed: 'Eliminado',
    login_to_save: 'Inicia sesión para guardar favoritos',
    search_this_area: 'Buscar aquí',
    my_favorites: 'Mis favoritos',
    saved_places: 'Lugares guardados',
    no_saved_places: 'Sin lugares guardados',
    explore: 'Explorar restaurantes →',
    sign_out: 'Cerrar sesión',
    sign_in: 'Iniciar sesión',
    delete_account: 'Eliminar cuenta',
    member_since: 'Miembro desde',
    cuisines: 'Cocinas',
    last_added: 'Último añadido',
    recently_saved: 'Guardados recientemente',
    see_all: 'Ver todos mis favoritos',
    view_on_map: 'Ver en el mapa',
    remove: 'Quitar',
    keep: 'Mantener',
    remove_from_favorites: '¿Quitar de favoritos?',
    sort_recent: 'Reciente',
    sort_oldest: 'Antiguo',
    sort_az: 'A → Z',
    sort_rating_tab: 'Nota',
    filter_by_cuisine: 'Filtrar',
    all: 'Todo',
    no_results: 'Sin resultados',
    reset_filters: 'Restablecer filtros',
    italian: 'Italiano',
    french: 'Francés',
    japanese: 'Japonés',
    chinese: 'Chino',
    mexican: 'Mexicano',
    footerBackToMap: 'Mapa',
    footerPrivacy: 'Privacidad',
    footerTerms: 'Condiciones',
    footerAttribution: 'Fuentes de datos',
    importsRowTitle: 'Vistos en redes',
    importPending: 'Analizando…',
    importPendingHint: 'Buscamos el restaurante de esta publicación. Abre la app para terminar.',
    importNeedsConfirm: 'Por confirmar',
    importNotFound: 'Restaurante no reconocido',
    importNotFoundHint: 'No hemos reconocido el restaurante. Búscalo a mano.',
    importRetry: 'Reintentar el reconocimiento',
    importWrongPlace: '¿Restaurante incorrecto?',
    importCorrectHint: 'Busca el restaurante correcto para corregirlo.',
    importCorrectCancel: 'Mantener este',
    importWhichOne: '¿Cuál es?',
    importSearchManually: 'Buscar a mano',
    importSearchPlaceholder: 'Nombre del restaurante, ciudad…',
    importSearching: 'Buscando…',
    importNoSearchResult: 'Sin resultados.',
    importFoundTitle: 'Lo que hemos encontrado',
    importAlsoSeenIn: 'Visto también en',
    importOpenSource: 'Ver la publicación',
    importAddNote: 'Añade una nota…',
    importNoteTitle: 'Mi nota',
    importWhereTitle: 'Dónde está',
    importRoute: 'Cómo llegar',
    importSaveAction: 'Guardar',
    importSavedAction: 'Guardado',
    importReviews: 'opiniones',
    importFriendSavedOne: 'amigo lo ha guardado',
    importFriendsSavedMany: 'amigos lo han guardado',
    importPlay: 'Ver el vídeo',
    importMissing: 'Importación no encontrada.',
    importBack: 'Volver',
    importDelete: 'Eliminar',
    importDeleteTitle: '¿Eliminar esta importación?',
    importDeleteBody:
      'Esta publicación desaparecerá de «Visto en redes». El restaurante permanece en tus favoritos si está allí.',
    importDeleteCancel: 'Cancelar',
    importDeleteFailed: 'No se pudo eliminar. Inténtalo de nuevo.',
    importMichelin: 'Estrella Michelin',
    importMichelinStars: 'estrellas Michelin',
  },
  de: {
    search_placeholder: 'Nach Name oder Küche filtern…',
    filters: 'Filter',
    favorites: 'Favoriten',
    my_account: 'Mein Konto',
    starting_point: 'STARTPUNKT',
    search_address: 'Adresse suchen…',
    locate_me: 'Meinen Standort',
    places: 'Orte',
    place: 'Ort',
    departure_point: 'Startpunkt',
    clicking: 'Klicken…',
    open: 'Geöffnet',
    closed: 'Geschlossen',
    getting_there: 'ANFAHRT',
    set_starting_point: 'Startpunkt festlegen für Routen',
    walk: 'Fuß',
    bike: 'Rad',
    drive: 'Auto',
    nearby: 'IN DER NÄHE',
    view_on_osm: 'Auf OpenStreetMap',
    note: 'Notiz',
    share: 'Teilen',
    remove_favorite: 'Aus Favoriten entfernen',
    add_favorite: 'Zu Favoriten hinzufügen',
    suggestions_title: 'Empfehlungen für Sie',
    suggestions_subtitle: 'Basierend auf Ihrem Geschmack',
    based_on_favorites: 'Basierend auf Ihren Favoriten',
    no_suggestions: 'Erkunden Sie die Karte',
    explore_map: 'Karte erkunden',
    try_also: 'Das könnte Ihnen gefallen',
    sort_by: 'Sortieren',
    cuisine: 'Küche',
    price: 'Preis',
    open_now: 'Geöffnet',
    reset: 'Zurücksetzen',
    sort_score: 'Bewertung',
    sort_rating: 'Note',
    sort_distance: 'Entfernung',
    sort_name: 'Name',
    loading: 'Laden…',
    error: 'Fehler',
    retry: 'Erneut',
    close: 'Schließen',
    cancel: 'Abbrechen',
    save: 'Speichern',
    saved: 'Gespeichert ✓',
    removed: 'Entfernt',
    login_to_save: 'Anmelden um Favoriten zu speichern',
    search_this_area: 'Hier suchen',
    my_favorites: 'Meine Favoriten',
    saved_places: 'Gespeicherte Orte',
    no_saved_places: 'Keine gespeicherten Orte',
    explore: 'Restaurants entdecken →',
    sign_out: 'Abmelden',
    sign_in: 'Anmelden',
    delete_account: 'Konto löschen',
    member_since: 'Mitglied seit',
    cuisines: 'Küchen',
    last_added: 'Zuletzt hinzugefügt',
    recently_saved: 'Zuletzt gespeichert',
    see_all: 'Alle gespeicherten Orte',
    view_on_map: 'Auf Karte anzeigen',
    remove: 'Entfernen',
    keep: 'Behalten',
    remove_from_favorites: 'Aus Favoriten entfernen?',
    sort_recent: 'Neueste',
    sort_oldest: 'Älteste',
    sort_az: 'A → Z',
    sort_rating_tab: 'Bewertung',
    filter_by_cuisine: 'Filtern',
    all: 'Alle',
    no_results: 'Keine Ergebnisse',
    reset_filters: 'Filter zurücksetzen',
    italian: 'Italienisch',
    french: 'Französisch',
    japanese: 'Japanisch',
    chinese: 'Chinesisch',
    mexican: 'Mexikanisch',
    footerBackToMap: 'Karte',
    footerPrivacy: 'Datenschutz',
    footerTerms: 'Nutzungsbedingungen',
    footerAttribution: 'Datenquellen',
    importsRowTitle: 'In sozialen Netzwerken gesehen',
    importPending: 'Wird analysiert…',
    importPendingHint: 'Wir suchen das Restaurant aus diesem Post. Öffne die App zum Abschließen.',
    importNeedsConfirm: 'Zu bestätigen',
    importNotFound: 'Restaurant nicht erkannt',
    importNotFoundHint: 'Wir haben das Restaurant nicht erkannt. Suche es von Hand.',
    importRetry: 'Erkennung erneut versuchen',
    importWrongPlace: 'Falsches Restaurant?',
    importCorrectHint: 'Suche das richtige Restaurant, um es zu korrigieren.',
    importCorrectCancel: 'Dieses behalten',
    importWhichOne: 'Welches ist es?',
    importSearchManually: 'Manuell suchen',
    importSearchPlaceholder: 'Name des Restaurants, Stadt…',
    importSearching: 'Suche…',
    importNoSearchResult: 'Kein Ergebnis.',
    importFoundTitle: 'Das haben wir gefunden',
    importAlsoSeenIn: 'Auch gesehen in',
    importOpenSource: 'Post ansehen',
    importAddNote: 'Notiz hinzufügen…',
    importNoteTitle: 'Meine Notiz',
    importWhereTitle: 'Wo es liegt',
    importRoute: 'Route',
    importSaveAction: 'Speichern',
    importSavedAction: 'Gespeichert',
    importReviews: 'Bewertungen',
    importFriendSavedOne: 'Freund hat es gespeichert',
    importFriendsSavedMany: 'Freunde haben es gespeichert',
    importPlay: 'Video abspielen',
    importMissing: 'Import nicht gefunden.',
    importBack: 'Zurück',
    importDelete: 'Löschen',
    importDeleteTitle: 'Diesen Import löschen?',
    importDeleteBody:
      'Dieser Beitrag verschwindet aus „In sozialen Netzwerken gesehen“. Das Restaurant bleibt in deinen Favoriten, falls vorhanden.',
    importDeleteCancel: 'Abbrechen',
    importDeleteFailed: 'Löschen fehlgeschlagen. Versuch es erneut.',
    importMichelin: 'Michelin-Stern',
    importMichelinStars: 'Michelin-Sterne',
  },
  ja: {
    search_placeholder: '名前や料理で絞り込み…',
    filters: 'フィルター',
    favorites: 'お気に入り',
    my_account: 'マイアカウント',
    starting_point: '出発地',
    search_address: '住所を検索…',
    locate_me: '現在地',
    places: '件',
    place: '件',
    departure_point: '出発地設定',
    clicking: 'クリック…',
    open: '営業中',
    closed: '閉店',
    getting_there: 'ルート',
    set_starting_point: '出発地を設定するとルートが表示されます',
    walk: '徒歩',
    bike: '自転車',
    drive: '車',
    nearby: '近くのお店',
    view_on_osm: 'OpenStreetMapで見る',
    note: 'メモ',
    share: 'シェア',
    remove_favorite: 'お気に入りから削除',
    add_favorite: 'お気に入りに追加',
    suggestions_title: 'おすすめ',
    suggestions_subtitle: 'あなたの好みに基づく',
    based_on_favorites: 'お気に入りに基づく',
    no_suggestions: '地図を探索してレストランを発見',
    explore_map: '地図を探索',
    try_also: 'こちらもいかがですか',
    sort_by: '並び替え',
    cuisine: '料理',
    price: '価格',
    open_now: '営業中',
    reset: 'リセット',
    sort_score: 'スコア',
    sort_rating: '評価',
    sort_distance: '距離',
    sort_name: '名前',
    loading: '読み込み中…',
    error: 'エラー',
    retry: '再試行',
    close: '閉じる',
    cancel: 'キャンセル',
    save: '保存',
    saved: '保存しました ✓',
    removed: '削除しました',
    login_to_save: 'お気に入りを保存するにはログイン',
    search_this_area: 'このエリアで検索',
    my_favorites: 'お気に入り',
    saved_places: '保存済みの場所',
    no_saved_places: '保存済みの場所なし',
    explore: 'レストランを探す →',
    sign_out: 'サインアウト',
    sign_in: 'サインイン',
    delete_account: 'アカウント削除',
    member_since: '登録日',
    cuisines: '料理の種類',
    last_added: '最終追加',
    recently_saved: '最近保存',
    see_all: 'すべての保存済みを見る',
    view_on_map: '地図で見る',
    remove: '削除',
    keep: '保持',
    remove_from_favorites: 'お気に入りから削除しますか？',
    sort_recent: '最新',
    sort_oldest: '古い順',
    sort_az: 'A → Z',
    sort_rating_tab: '評価',
    filter_by_cuisine: 'フィルター',
    all: '全て',
    no_results: '結果なし',
    reset_filters: 'フィルターをリセット',
    italian: 'イタリアン',
    french: 'フレンチ',
    japanese: '和食',
    chinese: '中華',
    mexican: 'メキシカン',
    footerBackToMap: '地図',
    footerPrivacy: 'プライバシー',
    footerTerms: '利用規約',
    footerAttribution: 'データソース',
    importsRowTitle: 'SNSで見つけた店',
    importPending: '解析中…',
    importPendingHint: '投稿のレストランを探しています。アプリを開くと解析が完了します。',
    importNeedsConfirm: '要確認',
    importNotFound: 'レストランを特定できません',
    importNotFoundHint: 'レストランを特定できませんでした。手動で検索してください。',
    importRetry: '認識をもう一度試す',
    importWrongPlace: 'お店が違いますか？',
    importCorrectHint: '正しいお店を検索して修正してください。',
    importCorrectCancel: 'このお店のままにする',
    importWhichOne: 'どれですか？',
    importSearchManually: '手動で検索',
    importSearchPlaceholder: '店名、都市…',
    importSearching: '検索中…',
    importNoSearchResult: '結果がありません。',
    importFoundTitle: '見つかった店',
    importAlsoSeenIn: 'こちらでも紹介',
    importOpenSource: '投稿を見る',
    importAddNote: 'メモを追加…',
    importNoteTitle: 'マイメモ',
    importWhereTitle: '場所',
    importRoute: 'ルート',
    importSaveAction: '保存',
    importSavedAction: '保存済み',
    importReviews: '件のレビュー',
    importFriendSavedOne: '人の友達が保存',
    importFriendsSavedMany: '人の友達が保存',
    importPlay: '動画を再生',
    importMissing: 'インポートが見つかりません。',
    importBack: '戻る',
    importDelete: '削除',
    importDeleteTitle: 'このインポートを削除しますか？',
    importDeleteBody:
      'この投稿は「SNSで見つけた」から消えます。お気に入りに登録済みの場合、レストランは残ります。',
    importDeleteCancel: 'キャンセル',
    importDeleteFailed: '削除できませんでした。もう一度お試しください。',
    importMichelin: 'ミシュラン星付き',
    importMichelinStars: 'つ星（ミシュラン）',
  },
}
