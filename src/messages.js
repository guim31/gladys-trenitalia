// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". Brand, train and place names never translate.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialisation failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names (frozen when the device is created, in the configured language).
export const NAMES = {
  en: {
    next: 'Next train',
    following: 'Following train',
    delay: 'Delay of the next train',
    destination: 'Next train and destination',
    platform: 'Platform of the next train',
    cancelled: 'Cancelled trains',
  },
  fr: {
    next: 'Prochain train',
    following: 'Train suivant',
    delay: 'Retard du prochain train',
    destination: 'Prochain train et destination',
    platform: 'Voie du prochain train',
    cancelled: 'Trains supprimés',
  },
  de: {
    next: 'Nächster Zug',
    following: 'Übernächster Zug',
    delay: 'Verspätung des nächsten Zugs',
    destination: 'Nächster Zug und Ziel',
    platform: 'Gleis des nächsten Zugs',
    cancelled: 'Ausgefallene Züge',
  },
  es: {
    next: 'Próximo tren',
    following: 'Tren siguiente',
    delay: 'Retraso del próximo tren',
    destination: 'Próximo tren y destino',
    platform: 'Vía del próximo tren',
    cancelled: 'Trenes cancelados',
  },
};

// The groups of categories a watch can keep (src/trains.js).
export const GROUPS = {
  en: { regional: 'Regional', high_speed: 'Frecce', intercity: 'Intercity' },
  fr: { regional: 'Régional', high_speed: 'Frecce', intercity: 'Intercity' },
  de: { regional: 'Regional', high_speed: 'Frecce', intercity: 'Intercity' },
  es: { regional: 'Regional', high_speed: 'Frecce', intercity: 'Intercity' },
};

export const TEXT = {
  en: {
    noDeparture: 'No train announced',
    wait: ({ minutes }) => `${minutes} min`,
    noPlatform: '–',
    gone: 'This station is no longer watched: pick it again.',
    unavailable: 'Viaggiatreno has not been read yet: try again in a minute.',
    pickStation: 'Pick a watched station in the settings of this widget.',
    loading: 'Reading Viaggiatreno…',
    onTime: 'on time',
    late: ({ late }) => `+${late} min`,
    platform: ({ platform }) => `pl. ${platform}`,
    cancelledShort: 'cancelled',
    legend: 'Wait · train · platform · delay',
    serviceDown: ({ error }) => `Viaggiatreno cannot be read (${error}).`,
    searchNeedText: 'Type the beginning of a station name.',
    searchFound: ({ count }) => `${count} station(s) found:`,
    searchNone: ({ query }) => `No station starts with "${query}".`,
    searchHint: 'Add one with "Watch a station", by its full name or its code.',
    addUnknown: ({ query }) => `No Italian station matches "${query}".`,
    addAmbiguous: 'Several stations match: type the full name or the code of the one you want.',
    alreadyWatched: ({ name }) => `${name} is already watched.`,
    tooMany: ({ max }) => `${max} stations at most: remove one first.`,
    added: ({ name }) => `${name} added. Create its device in the Discover tab of the integration.`,
    removeUnknown: ({ query }) => `No watched station is called "${query}".`,
    removeAmbiguous: 'Several watched stations match: type the full name shown in the status.',
    removed: ({ name }) => `${name} is no longer watched. Delete its device in Gladys if needed.`,
    statusNone: 'No station watched yet: use "Watch a station".',
    statusStations: ({ count }) => `${count} station(s) watched:`,
    statusCreated: 'device created',
    statusNotCreated: 'device not created yet (Discover tab)',
    statusRefreshed: ({ age }) => `Last read of Viaggiatreno: ${age} s ago.`,
    statusNeverRefreshed: 'Viaggiatreno is read once a device is created.',
    statusError: ({ error }) => `Last error: ${error}`,
    sentence: ({ train, destination, station, when, platform, delay }) =>
      `${train} to ${destination} from ${station}: ${when}${platform}${delay}`,
    in: ({ minutes }) => `in ${minutes} min`,
    now: 'due now',
    onPlatform: ({ platform }) => `, platform ${platform}`,
    delay: ({ late }) => `, ${late} min late`,
    then: ({ train, destination, minutes }) =>
      `, then ${train} to ${destination} in ${minutes} min`,
    nothingAt: ({ station }) => `No train announced from ${station}.`,
  },
  fr: {
    noDeparture: 'Aucun train annoncé',
    wait: ({ minutes }) => `${minutes} min`,
    noPlatform: '–',
    gone: "Cette gare n'est plus suivie : choisissez-la à nouveau.",
    unavailable: "Viaggiatreno n'a pas encore été lu : réessayez dans une minute.",
    pickStation: 'Choisissez une gare suivie dans les réglages de ce widget.',
    loading: 'Lecture de Viaggiatreno…',
    onTime: "à l'heure",
    late: ({ late }) => `+${late} min`,
    platform: ({ platform }) => `voie ${platform}`,
    cancelledShort: 'supprimé',
    legend: 'Attente · train · voie · retard',
    serviceDown: ({ error }) => `Viaggiatreno est illisible (${error}).`,
    searchNeedText: "Tapez le début du nom d'une gare.",
    searchFound: ({ count }) => `${count} gare(s) trouvée(s) :`,
    searchNone: ({ query }) => `Aucune gare ne commence par « ${query} ».`,
    searchHint: 'Ajoutez-en une avec « Suivre une gare », par son nom complet ou son code.',
    addUnknown: ({ query }) => `Aucune gare italienne ne correspond à « ${query} ».`,
    addAmbiguous:
      'Plusieurs gares correspondent : tapez le nom complet ou le code de celle que vous voulez.',
    alreadyWatched: ({ name }) => `${name} est déjà suivie.`,
    tooMany: ({ max }) => `${max} gares au maximum : retirez-en une d'abord.`,
    added: ({ name }) =>
      `${name} ajoutée. Créez son appareil dans l'onglet Découverte de l'intégration.`,
    removeUnknown: ({ query }) => `Aucune gare suivie ne s'appelle « ${query} ».`,
    removeAmbiguous:
      "Plusieurs gares suivies correspondent : tapez le nom complet affiché dans l'état.",
    removed: ({ name }) =>
      `${name} n'est plus suivie. Supprimez son appareil dans Gladys si besoin.`,
    statusNone: 'Aucune gare suivie : utilisez « Suivre une gare ».',
    statusStations: ({ count }) => `${count} gare(s) suivie(s) :`,
    statusCreated: 'appareil créé',
    statusNotCreated: 'appareil pas encore créé (onglet Découverte)',
    statusRefreshed: ({ age }) => `Dernière lecture de Viaggiatreno : il y a ${age} s.`,
    statusNeverRefreshed: "Viaggiatreno est lu dès qu'un appareil est créé.",
    statusError: ({ error }) => `Dernière erreur : ${error}`,
    sentence: ({ train, destination, station, when, platform, delay }) =>
      `${train} pour ${destination} au départ de ${station} : ${when}${platform}${delay}`,
    in: ({ minutes }) => `dans ${minutes} min`,
    now: 'imminent',
    onPlatform: ({ platform }) => `, voie ${platform}`,
    delay: ({ late }) => `, ${late} min de retard`,
    then: ({ train, destination, minutes }) =>
      `, puis ${train} pour ${destination} dans ${minutes} min`,
    nothingAt: ({ station }) => `Aucun train annoncé au départ de ${station}.`,
  },
  de: {
    noDeparture: 'Kein Zug angekündigt',
    wait: ({ minutes }) => `${minutes} Min.`,
    noPlatform: '–',
    gone: 'Dieser Bahnhof wird nicht mehr verfolgt: wähle ihn erneut.',
    unavailable: 'Viaggiatreno wurde noch nicht gelesen: versuch es in einer Minute erneut.',
    pickStation: 'Wähle in den Einstellungen dieses Widgets einen verfolgten Bahnhof.',
    loading: 'Viaggiatreno wird gelesen…',
    onTime: 'pünktlich',
    late: ({ late }) => `+${late} Min.`,
    platform: ({ platform }) => `Gl. ${platform}`,
    cancelledShort: 'fällt aus',
    legend: 'Wartezeit · Zug · Gleis · Verspätung',
    serviceDown: ({ error }) => `Viaggiatreno kann nicht gelesen werden (${error}).`,
    searchNeedText: 'Gib den Anfang eines Bahnhofsnamens ein.',
    searchFound: ({ count }) => `${count} Bahnhof/Bahnhöfe gefunden:`,
    searchNone: ({ query }) => `Kein Bahnhof beginnt mit „${query}“.`,
    searchHint: 'Füge einen mit „Bahnhof verfolgen“ hinzu, per vollständigem Namen oder Code.',
    addUnknown: ({ query }) => `Kein italienischer Bahnhof passt zu „${query}“.`,
    addAmbiguous:
      'Mehrere Bahnhöfe passen: gib den vollständigen Namen oder den Code des gewünschten ein.',
    alreadyWatched: ({ name }) => `${name} wird bereits verfolgt.`,
    tooMany: ({ max }) => `Höchstens ${max} Bahnhöfe: entferne zuerst einen.`,
    added: ({ name }) =>
      `${name} hinzugefügt. Lege sein Gerät im Tab „Entdecken“ der Integration an.`,
    removeUnknown: ({ query }) => `Kein verfolgter Bahnhof heißt „${query}“.`,
    removeAmbiguous:
      'Mehrere verfolgte Bahnhöfe passen: gib den vollständigen Namen aus dem Status ein.',
    removed: ({ name }) =>
      `${name} wird nicht mehr verfolgt. Lösche sein Gerät in Gladys, falls nötig.`,
    statusNone: 'Noch kein Bahnhof verfolgt: nutze „Bahnhof verfolgen“.',
    statusStations: ({ count }) => `${count} Bahnhof/Bahnhöfe verfolgt:`,
    statusCreated: 'Gerät angelegt',
    statusNotCreated: 'Gerät noch nicht angelegt (Tab „Entdecken“)',
    statusRefreshed: ({ age }) => `Letzte Abfrage von Viaggiatreno: vor ${age} s.`,
    statusNeverRefreshed: 'Viaggiatreno wird gelesen, sobald ein Gerät angelegt ist.',
    statusError: ({ error }) => `Letzter Fehler: ${error}`,
    sentence: ({ train, destination, station, when, platform, delay }) =>
      `${train} nach ${destination} ab ${station}: ${when}${platform}${delay}`,
    in: ({ minutes }) => `in ${minutes} Min.`,
    now: 'jetzt',
    onPlatform: ({ platform }) => `, Gleis ${platform}`,
    delay: ({ late }) => `, ${late} Min. Verspätung`,
    then: ({ train, destination, minutes }) =>
      `, danach ${train} nach ${destination} in ${minutes} Min.`,
    nothingAt: ({ station }) => `Kein Zug ab ${station} angekündigt.`,
  },
  es: {
    noDeparture: 'Ningún tren anunciado',
    wait: ({ minutes }) => `${minutes} min`,
    noPlatform: '–',
    gone: 'Esta estación ya no se sigue: selecciónela de nuevo.',
    unavailable: 'Viaggiatreno aún no se ha leído: inténtelo de nuevo en un minuto.',
    pickStation: 'Elija una estación seguida en los ajustes de este widget.',
    loading: 'Leyendo Viaggiatreno…',
    onTime: 'puntual',
    late: ({ late }) => `+${late} min`,
    platform: ({ platform }) => `vía ${platform}`,
    cancelledShort: 'cancelado',
    legend: 'Espera · tren · vía · retraso',
    serviceDown: ({ error }) => `No se puede leer Viaggiatreno (${error}).`,
    searchNeedText: 'Escriba el principio del nombre de una estación.',
    searchFound: ({ count }) => `${count} estación(es) encontrada(s):`,
    searchNone: ({ query }) => `Ninguna estación empieza por «${query}».`,
    searchHint: 'Añada una con «Seguir una estación», por su nombre completo o su código.',
    addUnknown: ({ query }) => `Ninguna estación italiana coincide con «${query}».`,
    addAmbiguous:
      'Varias estaciones coinciden: escriba el nombre completo o el código de la que desea.',
    alreadyWatched: ({ name }) => `${name} ya se sigue.`,
    tooMany: ({ max }) => `${max} estaciones como máximo: elimine una primero.`,
    added: ({ name }) =>
      `${name} añadida. Cree su dispositivo en la pestaña Descubrir de la integración.`,
    removeUnknown: ({ query }) => `Ninguna estación seguida se llama «${query}».`,
    removeAmbiguous:
      'Varias estaciones seguidas coinciden: escriba el nombre completo que aparece en el estado.',
    removed: ({ name }) =>
      `${name} ya no se sigue. Elimine su dispositivo en Gladys si es necesario.`,
    statusNone: 'Ninguna estación seguida: use «Seguir una estación».',
    statusStations: ({ count }) => `${count} estación(es) seguida(s):`,
    statusCreated: 'dispositivo creado',
    statusNotCreated: 'dispositivo aún no creado (pestaña Descubrir)',
    statusRefreshed: ({ age }) => `Última lectura de Viaggiatreno: hace ${age} s.`,
    statusNeverRefreshed: 'Viaggiatreno se lee en cuanto se crea un dispositivo.',
    statusError: ({ error }) => `Último error: ${error}`,
    sentence: ({ train, destination, station, when, platform, delay }) =>
      `${train} a ${destination} desde ${station}: ${when}${platform}${delay}`,
    in: ({ minutes }) => `en ${minutes} min`,
    now: 'inminente',
    onPlatform: ({ platform }) => `, vía ${platform}`,
    delay: ({ late }) => `, ${late} min de retraso`,
    then: ({ train, destination, minutes }) =>
      `, luego ${train} a ${destination} en ${minutes} min`,
    nothingAt: ({ station }) => `Ningún tren anunciado desde ${station}.`,
  },
};

/** One text of a table in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** One text of a table in the four languages: { en, fr, de, es }. */
export function sayAll(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** "Frecce", "Régional". */
export const groupName = (group, language) => (GROUPS[language] ?? GROUPS.en)[group] ?? group;

/** Thrown by an action or a scene action: Gladys shows it in red, in the user's language. */
export class ActionFailure extends Error {
  constructor(text) {
    super(text.en);
    this.message = text;
  }
}
