// Zentry's picks — shown when the Radio Browser directory is unreachable
// (it has had multi-hour outages). Every stream here was checked to answer
// with audio over HTTPS and plays in a plain <audio> element (no HLS).
// Shaped like Radio Browser stations so the page treats them the same.
// `rank` stands in for clickcount (higher = listed first).

const S = (id, name, countrycode, country, tags, lat, lon, url, codec = 'MP3', bitrate = 128) => ({
  stationuuid: `zentry-${id}`, name, countrycode, country, tags,
  url, url_resolved: url, codec, bitrate, favicon: '',
  geo_lat: lat, geo_long: lon,
})

const LIST = [
  S('rp-main',      'Radio Paradise',             'US', 'United States', 'eclectic,rock',          39.73, -121.84, 'https://stream.radioparadise.com/aac-128', 'AAC'),
  S('fip',          'FIP',                        'FR', 'France',        'eclectic,jazz,world',    48.857,   2.352, 'https://icecast.radiofrance.fr/fip-hifi.aac', 'AAC', 192),
  S('bbc-ws',       'BBC World Service',          'GB', 'United Kingdom','news,talk',              51.507,  -0.128, 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', 'MP3', 56),
  S('kexp',         'KEXP 90.3',                  'US', 'United States', 'indie,rock',             47.61, -122.33, 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3'),
  S('soma-groove',  'SomaFM Groove Salad',        'US', 'United States', 'ambient,chillout,electronic', 37.77, -122.42, 'https://ice2.somafm.com/groovesalad-128-mp3'),
  S('classicfm',    'Classic FM',                 'GB', 'United Kingdom','classical',              51.51,  -0.14, 'https://media-ice.musicradio.com/ClassicFMMP3'),
  S('swiss-jazz',   'Radio Swiss Jazz',           'CH', 'Switzerland',   'jazz',                   47.56,   7.59, 'https://stream.srg-ssr.ch/m/rsj/mp3_128'),
  S('wnyc',         'WNYC 93.9 FM',               'US', 'United States', 'news,talk',              40.71, -74.01, 'https://fm939.wnyc.org/wnycfm'),
  S('nts',          'NTS Radio',                  'GB', 'United Kingdom','electronic,eclectic',    51.54,  -0.06, 'https://stream-relay-geo.ntslive.net/stream'),
  S('france-inter', 'France Inter',               'FR', 'France',        'news,talk',              48.85,   2.28, 'https://icecast.radiofrance.fr/franceinter-hifi.aac', 'AAC', 192),
  S('fip-jazz',     'FIP Jazz',                   'FR', 'France',        'jazz',                   48.87,   2.33, 'https://icecast.radiofrance.fr/fipjazz-hifi.aac', 'AAC', 192),
  S('wqxr',         'WQXR 105.9',                 'US', 'United States', 'classical',              40.73, -73.99, 'https://stream.wqxr.org/wqxr'),
  S('capital',      'Capital FM',                 'GB', 'United Kingdom','pop,hits',               51.50,  -0.12, 'https://media-ice.musicradio.com/CapitalMP3'),
  S('dlf',          'Deutschlandfunk',            'DE', 'Germany',       'news,talk',              50.94,   6.96, 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3'),
  S('soma-secret',  'SomaFM Secret Agent',        'US', 'United States', 'lounge,jazz',            37.78, -122.40, 'https://ice2.somafm.com/secretagent-128-mp3'),
  S('rp-mellow',    'Radio Paradise Mellow',      'US', 'United States', 'chillout,eclectic',      39.75, -121.86, 'https://stream.radioparadise.com/mellow-128', 'AAC'),
  S('nova',         'Radio Nova',                 'FR', 'France',        'eclectic,world,hiphop',  48.86,   2.37, 'https://novazz.ice.infomaniak.ch/novazz-128.mp3'),
  S('1live',        '1LIVE',                      'DE', 'Germany',       'pop,hits',               50.95,   6.98, 'https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3'),
  S('fm4',          'FM4',                        'AT', 'Austria',       'indie,electronic',       48.21,  16.37, 'https://orf-live.ors-shoutcast.at/fm4-q2a'),
  S('rai3',         'Rai Radio 3',                'IT', 'Italy',         'classical,culture',      41.91,  12.49, 'https://icestreaming.rai.it/3.mp3'),
  S('soma-drone',   'SomaFM Drone Zone',          'US', 'United States', 'ambient',                37.76, -122.44, 'https://ice2.somafm.com/dronezone-128-mp3'),
  S('france-musique','France Musique',            'FR', 'France',        'classical',              48.84,   2.30, 'https://icecast.radiofrance.fr/francemusique-hifi.aac', 'AAC', 192),
  S('lbc',          'LBC',                        'GB', 'United Kingdom','news,talk',              51.52,  -0.10, 'https://media-ice.musicradio.com/LBCUKMP3'),
  S('npo2',         'NPO Radio 2',                'NL', 'Netherlands',   'pop,hits',               52.23,   5.18, 'https://icecast.omroep.nl/radio2-bb-mp3'),
  S('rp-rock',      'Radio Paradise Rock',        'US', 'United States', 'rock',                   39.71, -121.82, 'https://stream.radioparadise.com/rock-128', 'AAC'),
  S('swiss-classic','Radio Swiss Classic',        'CH', 'Switzerland',   'classical',              46.95,   7.45, 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128'),
  S('soma-indie',   'SomaFM Indie Pop Rocks!',    'US', 'United States', 'indie,pop',              37.79, -122.41, 'https://ice2.somafm.com/indiepop-128-mp3'),
  S('rte1',         'RTÉ Radio 1',                'IE', 'Ireland',       'news,talk',              53.35,  -6.26, 'https://icecast.rte.ie/radio1'),
  S('antenne',      'Antenne Bayern',             'DE', 'Germany',       'pop,hits',               48.14,  11.58, 'https://stream.antenne.de/antenne'),
  S('rai1',         'Rai Radio 1',                'IT', 'Italy',         'news,talk',              41.90,  12.50, 'https://icestreaming.rai.it/1.mp3'),
  S('swiss-pop',    'Radio Swiss Pop',            'CH', 'Switzerland',   'pop',                    47.37,   8.54, 'https://stream.srg-ssr.ch/m/rsp/mp3_128'),
  S('jazzradio',    'Jazz Radio',                 'FR', 'France',        'jazz',                   45.76,   4.84, 'https://jazzradio.ice.infomaniak.ch/jazzradio-high.mp3'),
  S('npo1',         'NPO Radio 1',                'NL', 'Netherlands',   'news,talk',              52.22,   5.17, 'https://icecast.omroep.nl/radio1-bb-mp3'),
  S('france-culture','France Culture',            'FR', 'France',        'talk,culture',           48.83,   2.27, 'https://icecast.radiofrance.fr/franceculture-hifi.aac', 'AAC', 192),
  S('soma-lush',    'SomaFM Lush',                'US', 'United States', 'chillout,electronic',    37.75, -122.43, 'https://ice2.somafm.com/lush-128-mp3'),
  S('oe1',          'Ö1',                         'AT', 'Austria',       'classical,culture',      48.20,  16.36, 'https://orf-live.ors-shoutcast.at/oe1-q2a'),
  S('ndr-blue',     'NDR Blue',                   'DE', 'Germany',       'indie,rock',             53.55,   9.99, 'https://icecast.ndr.de/ndr/ndrblue/live/mp3/128/stream.mp3'),
  S('bayern1',      'Bayern 1',                   'DE', 'Germany',       'pop,oldies',             48.15,  11.57, 'https://dispatcher.rndfnk.com/br/br1/obb/mp3/128/stream.mp3'),
  S('swiss-classic-fr','Radio Swiss Classic (FR)','CH', 'Switzerland',   'classical',              46.52,   6.63, 'https://stream.srg-ssr.ch/m/rsc_fr/mp3_128'),
  S('shonan',       'Shonan Beach FM',            'JP', 'Japan',         'jazz,lounge',            35.30, 139.58, 'https://shonanbeachfm.out.airtime.pro/shonanbeachfm_a'),
  S('jazz-sakura',  'Jazz Sakura',                'JP', 'Japan',         'jazz',                   35.68, 139.69, 'https://kathy.torontocast.com:3330/stream'),
  S('antena1',      'Antena 1',                   'BR', 'Brazil',        'pop,hits',              -23.55, -46.63, 'https://antenaone.crossradio.com.br/stream/1', 'AAC+', 64),
  S('nacional',     'Radio Nacional',             'AR', 'Argentina',     'news,talk',             -34.60, -58.38, 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad1'),
  S('cooperativa',  'Radio Cooperativa',          'CL', 'Chile',         'news,talk',             -33.45, -70.67, 'https://unlimited4-us.dps.live/cooperativafm/aac/icecast.audio', 'AAC+', 64),
  S('smooth-au',    'Smooth FM 95.3',             'AU', 'Australia',     'pop,soft',              -33.87, 151.21, 'https://playerservices.streamtheworld.com/api/livestream-redirect/SMOOTH953.mp3'),
]

export const FALLBACK_STATIONS = LIST.map((s, i) => ({ ...s, clickcount: LIST.length - i }))
