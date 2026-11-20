# Trenitalia

Los próximos trenes de sus estaciones en Italia, en Gladys: trenes regionales, Frecciarossa,
Intercity… en tiempo real, con retrasos, vías y cancelaciones.

Los datos proceden de [Viaggiatreno](http://www.viaggiatreno.it), el panel en tiempo real de RFI y
Trenitalia: **sin cuenta ni clave**. Viaggiatreno es un sitio web público, no una API oficial:
puede cambiar sin aviso. Esta integración no está afiliada a Trenitalia, RFI ni al grupo Ferrovie
dello Stato Italiane.

> **Desarrollada fuera de Italia: se agradecen sus comentarios.** Se ha construido y probado con el
> servicio Viaggiatreno real (Milano Centrale, Roma Termini, Firenze Santa Maria Novella, Torino
> Porta Nuova), pero aún no se usa a diario.

## Lo que obtiene

- **Un dispositivo por estación seguida**, con filtro opcional por categoría de tren (regionales,
  Frecce, Intercity) y por destino: minutos hasta el próximo tren que circula y hasta el siguiente,
  el retraso del próximo, su hora, número y destino («22:50 FR 9663 → Napoli Centrale»), su vía y
  el número de trenes cancelados en el panel.
- **Un widget del panel**: las próximas salidas de una estación, coloreadas según su retraso, con
  cancelaciones.
- **Tres disparadores de escena**: hora de salir (1 a 30 minutos antes de una salida), tren con
  retraso (5 a 60 minutos) y tren cancelado, cada uno una vez por tren.
- **Una acción de escena**: leer los próximos trenes de una estación, con una frase lista para
  enviar por mensaje o a un altavoz.

## Requisitos

- Gladys Assistant 5.3.0 o posterior.
- Acceso a Internet desde el equipo de Gladys (la integración llama a `www.viaggiatreno.it`).

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub**.
2. Pegue `https://github.com/guim31/gladys-trenitalia` e instale.
3. Abra la pestaña **Configuración** de la integración para seguir estaciones (ver abajo).

## Configuración

### Ajustes

- **Idioma de los textos**: idioma de los nombres de las funciones, de los textos de los
  dispositivos y de las frases enviadas a sus escenas (francés por defecto). Los nombres se fijan
  al crear un dispositivo.
- **Intervalo de actualización**: 1, 2 o 5 minutos. Cada actualización lee un panel por estación
  seguida.

### Seguir una estación

1. **Buscar una estación**: escriba el principio de su nombre («Milano», «Roma T», «Forlì»). La
   respuesta muestra las estaciones encontradas con su código, como `[S01700]`. Viaggiatreno solo
   busca por el principio del nombre.
2. **Seguir una estación**: escriba su nombre completo o su código. Filtros opcionales:
   - **Categoría de tren**: solo regionales (REG, RV), solo Frecce (Frecciarossa, Frecciargento,
     Frecciabianca) o solo Intercity (IC, ICN, EC, EN).
   - **Destino**: parte del destino de los trenes — `Napoli`, `Torino`, `Lecce`…
     Un nombre que coincide con varias estaciones responde con su lista: escriba el nombre
     completo o el código.
3. Abra la pestaña **Descubrir** y cree el dispositivo.

La misma estación puede seguirse varias veces con otros filtros: cada una es un dispositivo.

### Eliminar, comprobar el estado

- **Dejar de seguir una estación**: escriba el nombre que muestra **Estado**. Su dispositivo
  permanece en Gladys hasta que lo elimine.
- **Estado**: las estaciones seguidas, si su dispositivo está creado, la última lectura de
  Viaggiatreno y el último error.

Un fallo (nada encontrado, Viaggiatreno inaccesible) aparece en rojo, un éxito en verde.

## Dispositivos

Cada estación seguida tiene seis funciones:

| Función                  | Valor                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| Próximo tren             | minutos hasta el próximo tren que circula; 1440 si no hay anunciados |
| Tren siguiente           | minutos hasta el siguiente; 1440 si no hay                           |
| Retraso del próximo tren | minutos de retraso (un tren adelantado es puntual); 0 si no hay      |
| Próximo tren y destino   | «22:50 FR 9663 → Napoli Centrale», o «Ningún tren anunciado»         |
| Vía del próximo tren     | la vía real si se conoce, si no la prevista; si no «–»               |
| Trenes cancelados        | el número de trenes cancelados en el panel de la estación seguida    |

Las horas son hora italiana, retraso incluido. Un tren cancelado nunca es «el próximo tren». Un
tren cuya hora ha pasado pero que aún no ha salido cuenta como saliendo ahora, con el retraso de los minutos ya pasados; 15 minutos después de su hora sin noticias, se considera salido. El disparador «Tren con retraso» solo sigue el retraso que anuncia Viaggiatreno. Viaggiatreno solo da
el retraso de un tren una vez que ha salido de su origen: antes, cuenta como puntual. Entre dos
lecturas, las cuentas atrás siguen desde la última respuesta.

## Widgets del panel

**Próximos trenes**: elija una estación seguida. Cada fila muestra la hora y el destino, luego la
espera, el tren, su vía y su retraso: verde puntual, naranja desde 3 minutos de retraso, rojo desde
10 o si está cancelado. Ajustes: el número de salidas mostradas (3 a 10), la leyenda y los trenes
cancelados, ambos ocultables. El título es el nombre del dispositivo en Gladys.

## Disparadores de escena

- **Hora de salir**: un tren sale de la estación elegida en el número de minutos elegido (1 a 30).
- **Tren con retraso**: un tren que sale de la estación elegida alcanza el retraso elegido (5 a 60
  minutos).
- **Tren cancelado**: un tren que sale de la estación elegida se anuncia cancelado.

Cada umbral se dispara una vez por tren. Nada se dispara en la primera lectura tras un arranque: lo
que ya estaba en el panel no es una novedad. Variables: estación, destino, categoría, número del
tren, minutos de espera, retraso, hora prevista y programada, vía.

## Acciones de escena

**Obtener los próximos trenes**: para una estación seguida, devuelve `sentence` («REG 2986 a
Saronno desde Milano Centrale: en 3 min, vía 8, luego REG 2387 a Voghera en 13 min.»),
`station_name`, `destination`, `category`, `train_number`, `minutes`, `following_minutes`,
`delay`, `expected_time`, `scheduled_time`, `platform` y `cancelled` (número de trenes
cancelados). Sin tren, `minutes` vale 1440 y la frase lo dice.

## Ejemplos de escenas

- _Cada día laborable a las 7:30_ → **Obtener los próximos trenes** (Monza, Regional, → Milano) →
  enviar `sentence` a su teléfono.
- **Hora de salir** (Roma Termini, Frecce → Napoli, 15 min) → anunciarlo en un altavoz.
- **Tren cancelado** (su estación) → enviar un mensaje con el número del tren y su hora.

## Datos, actualización y cuotas

La integración lee, solo para los dispositivos creados, las salidas de cada estación (`partenze`,
los trenes de la próxima hora o dos) al intervalo elegido; la búsqueda de estaciones
(`cercaStazione`, `regione`, `dettaglioStazione`) solo cuando busca o añade una estación.
Viaggiatreno no publica cuota ni condiciones para este uso: resérvelo a un uso personal. Una
petición por estación y minuto como máximo mantiene un uso ligero. Su CDN rechaza las peticiones
sin User-Agent de navegador (HTTP 403): la integración envía uno que la identifica. Solo se escribe
`/data/watch.json`: las estaciones seguidas y sus filtros.

## Solución de problemas

- **Ningún valor en un dispositivo nuevo**: espere a la próxima actualización (un minuto) o
  consulte **Estado**.
- **«No se puede leer Viaggiatreno»**: el sitio es inaccesible, rechaza la petición (HTTP 403) o
  responde una página de error; la integración reintenta en cada actualización y las cuentas atrás
  siguen mientras tanto.
- **Falta un tren**: ya ha salido, sale en más de una o dos horas o no coincide con los filtros.
- **Registros**: ajuste `LOG_LEVEL=debug` para ver cada lectura.

## Límites

- Los trenes que muestra Viaggiatreno: Trenitalia y los operadores regionales de la red RFI. Los
  trenes Italo (NTV) no están cubiertos.
- Viaggiatreno es oficioso y no está documentado: un cambio por su parte puede romper la
  integración hasta una actualización.
- Los trenes parcialmente cancelados y los desvíos se muestran como en circulación.
- 10 estaciones seguidas como máximo. Los nombres de las funciones se fijan al crear el
  dispositivo.

## Créditos

Datos: [Viaggiatreno](http://www.viaggiatreno.it), RFI y Trenitalia. El uso de este servicio sigue
la integración `viaggiatreno` de Home Assistant (Apache 2.0). Logotipo de la portada: Trenitalia
(marca de su titular).
