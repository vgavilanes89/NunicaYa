/**
 * Brands sold in Costa Rica, with how to fill their model lists.
 *
 *   fipe:     FIPE (Brazil) brand names to pull models from, matched case-insensitively
 *             across FIPE's cars/trucks (car catalog) or motorcycles (moto catalog).
 *   models:   Costa Rica lineup (current + common used models), curated by hand.
 *   curated:  true → use only `models` (FIPE's list for this brand is mostly Brazil-only
 *             models); otherwise FIPE base models are merged with `models`.
 *   exclude:  FIPE base names to drop (Brazil-only or not real models).
 *
 * Brands with an empty model list still appear; sellers pick "Other" and type the model.
 * Edit this file and rerun `node scripts/build-vehicle-catalog.js` to update data/vehicles-cr.json.
 */

const CAR_BRANDS = {
  // --- Japan ---
  Toyota: {
    fipe: ['Toyota'],
    curated: true,
    models: ['4Runner', 'Avanza', 'Camry', 'C-HR', 'Corolla', 'Corolla Cross', 'Echo', 'FJ Cruiser', 'Fortuner',
      'Hiace', 'Highlander', 'Hilux', 'Land Cruiser', 'Land Cruiser Prado', 'Prius', 'RAV4', 'Raize', 'Rush',
      'Sequoia', 'Sienna', 'Starlet', 'Tacoma', 'Tercel', 'Tundra', 'Yaris', 'Yaris Cross', 'Coaster', 'Dyna'],
  },
  Nissan: {
    fipe: ['Nissan'],
    curated: true,
    models: ['Almera', 'Altima', 'Frontier', 'Juke', 'Kicks', 'Leaf', 'March', 'Murano', 'Navara', 'Note',
      'NP300', 'Pathfinder', 'Patrol', 'Qashqai', 'Rogue', 'Sentra', 'Tiida', 'Urvan', 'Versa', 'X-Trail',
      'Xterra', 'Pick-up D21', 'Sunny'],
  },
  Mitsubishi: {
    fipe: ['Mitsubishi'],
    curated: true,
    models: ['ASX', 'Eclipse Cross', 'L200', 'Lancer', 'Mirage', 'Mirage G4', 'Montero', 'Montero Sport',
      'Nativa', 'Outlander', 'Pajero', 'Xpander', 'Galant', 'Canter', 'L300'],
  },
  Suzuki: {
    fipe: ['Suzuki'],
    curated: true,
    models: ['Alto', 'APV', 'Baleno', 'Celerio', 'Ciaz', 'Dzire', 'Ertiga', 'Fronx', 'Grand Vitara', 'Ignis',
      'Jimny', 'S-Cross', 'S-Presso', 'Samurai', 'Swift', 'Vitara', 'XL7', 'Carry', 'Sidekick'],
  },
  Honda: {
    fipe: ['Honda'],
    curated: true,
    models: ['Accord', 'City', 'Civic', 'CR-V', 'Fit', 'HR-V', 'Odyssey', 'Pilot', 'Ridgeline', 'WR-V', 'Element'],
  },
  Mazda: {
    fipe: ['Mazda'],
    curated: true,
    models: ['BT-50', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-60', 'CX-9', 'CX-90', 'Mazda2', 'Mazda3', 'Mazda6',
      'MX-5', 'B2200', 'B2500', 'Demio', 'Protegé', 'Tribute'],
  },
  Isuzu: {
    fipe: ['Isuzu'],
    curated: true,
    models: ['D-Max', 'MU-X', 'Trooper', 'Rodeo', 'Amigo', 'NPR', 'NQR', 'NHR', 'ELF', 'FVR'],
  },
  Daihatsu: {
    fipe: ['Daihatsu'],
    curated: true,
    models: ['Terios', 'Bego', 'Sirion', 'Cuore', 'Charade', 'Feroza', 'Rocky', 'Delta'],
  },
  Subaru: {
    fipe: ['Subaru'],
    curated: true,
    models: ['BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'WRX', 'XV', 'Evoltis'],
  },
  Lexus: {
    fipe: ['Lexus'],
    curated: true,
    models: ['ES', 'GX', 'IS', 'LX', 'NX', 'RX', 'UX', 'LS', 'RZ'],
  },
  Acura: { fipe: ['Acura'], curated: true, models: ['ILX', 'Integra', 'MDX', 'RDX', 'TLX', 'TSX'] },
  Hino: { fipe: [], models: ['300 Dutro', '500', '700'] },

  // --- Korea ---
  Hyundai: {
    fipe: ['Hyundai'],
    curated: true,
    models: ['Accent', 'Atos', 'Creta', 'Elantra', 'Grand i10', 'Grand Santa Fe', 'H-1', 'Ioniq', 'Ioniq 5',
      'Kona', 'Palisade', 'Porter', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Staria', 'Tucson', 'Venue', 'Galloper',
      'Excel', 'Getz', 'Terracan', 'HD65', 'HD72', 'HD78', 'County'],
  },
  Kia: {
    fipe: ['Kia Motors'],
    curated: true,
    models: ['Carnival', 'EV6', 'K2700', 'K3', 'K5', 'Morning', 'Niro', 'Picanto', 'Rio', 'Seltos', 'Sonet',
      'Sorento', 'Soul', 'Sportage', 'Stinger', 'Cerato', 'Forte', 'Optima', 'Pregio', 'K3000'],
  },
  Genesis: { fipe: [], models: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'] },
  SsangYong: { fipe: ['SSANGYONG'], models: ['Actyon', 'Korando', 'Musso', 'Rexton', 'Tivoli', 'Torres'] },

  // --- USA ---
  Chevrolet: {
    fipe: ['GM - Chevrolet', 'CHEVROLET'],
    curated: true,
    models: ['Aveo', 'Beat', 'Blazer', 'Captiva', 'Colorado', 'Cruze', 'Equinox', 'Groove', 'Luv',
      'Malibu', 'Montana', 'N300', 'Optra', 'Sail', 'S10', 'Silverado', 'Sonic', 'Spark', 'Suburban', 'Tahoe',
      'Tracker', 'Trailblazer', 'Traverse', 'Trax', 'Camaro', 'Corvette', 'NHR', 'NPR'],
  },
  Ford: {
    fipe: ['Ford', 'FORD'],
    curated: true,
    models: ['Bronco', 'Bronco Sport', 'EcoSport', 'Edge', 'Escape', 'Everest', 'Expedition', 'Explorer',
      'F-150', 'F-250', 'F-350', 'Fiesta', 'Focus', 'Fusion', 'Maverick', 'Mustang', 'Ranger', 'Territory',
      'Transit', 'Ka', 'Courier', 'Taurus'],
  },
  Jeep: {
    fipe: ['Jeep'],
    curated: true,
    models: ['Cherokee', 'Commander', 'Compass', 'Gladiator', 'Grand Cherokee', 'Liberty', 'Patriot', 'Renegade',
      'Wagoneer', 'Wrangler', 'CJ'],
  },
  Dodge: {
    fipe: ['Dodge'],
    curated: true,
    models: ['Attitude', 'Challenger', 'Charger', 'Durango', 'Journey', 'Neon', 'Ram', 'Dakota', 'Caliber', 'Nitro'],
  },
  RAM: { fipe: ['RAM'], curated: true, models: ['700', '1200', '1500', '2500', '3500', 'ProMaster', 'Rampage'] },
  Chrysler: { fipe: ['Chrysler'], curated: true, models: ['300', 'Pacifica', 'PT Cruiser', 'Town & Country', 'Voyager'] },
  GMC: { fipe: [], models: ['Acadia', 'Canyon', 'Sierra', 'Terrain', 'Yukon', 'Savana'] },
  Tesla: { fipe: [], models: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'] },
  Cadillac: { fipe: ['Cadillac'], exclude: ['Deville/Eldorado'], models: ['Escalade', 'XT4', 'XT5', 'XT6', 'Lyriq'] },
  Freightliner: { fipe: [], models: ['Cascadia', 'Columbia', 'M2', 'Century', 'Coronado'] },
  International: { fipe: ['NAVISTAR'], exclude: ['International'], models: ['4300', '4400', '7400', 'LT', 'ProStar', 'DuraStar', 'WorkStar'] },
  Kenworth: { fipe: [], models: ['T370', 'T680', 'T800', 'W900'] },
  Mack: { fipe: [], models: ['Anthem', 'Granite', 'Pinnacle', 'Vision'] },

  // --- Europe ---
  Volkswagen: {
    fipe: ['VW - VolksWagen', 'VOLKSWAGEN'],
    curated: true,
    models: ['Amarok', 'Beetle', 'Escarabajo', 'Golf', 'Gol', 'Jetta', 'Nivus', 'Passat', 'Polo', 'Saveiro',
      'T-Cross', 'Taos', 'Teramont', 'Tiguan', 'Touareg', 'Transporter', 'Virtus', 'Crafter', 'ID.4'],
  },
  'Mercedes-Benz': {
    fipe: ['Mercedes-Benz', 'MERCEDES-BENZ'],
    curated: true,
    models: ['A-Class', 'B-Class', 'C-Class', 'CLA', 'E-Class', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS',
      'S-Class', 'Sprinter', 'Vito', 'EQA', 'EQB', 'Accelo', 'Atego', 'Actros', 'Axor'],
  },
  BMW: {
    fipe: ['BMW'],
    curated: true,
    models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X2', 'X3', 'X4',
      'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX'],
  },
  Audi: { fipe: ['Audi'], curated: true, models: ['A1', 'A3', 'A4', 'A5', 'A6', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'TT'] },
  Volvo: {
    fipe: ['Volvo', 'VOLVO'],
    curated: true,
    models: ['C30', 'C40', 'EX30', 'EX40', 'EX90', 'S40', 'S60', 'S80', 'S90', 'V40', 'V60', 'XC40', 'XC60', 'XC70',
      'XC90', 'FH', 'FM', 'FMX', 'VM', 'VNL'],
  },
  'Land Rover': {
    fipe: ['Land Rover'],
    curated: true,
    models: ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque',
      'Range Rover Sport', 'Range Rover Velar'],
  },
  Porsche: { fipe: ['Porsche'], curated: true, models: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman'] },
  MINI: { fipe: ['MINI'], curated: true, models: ['Cooper', 'Countryman', 'Clubman', 'Paceman'] },
  Peugeot: { fipe: ['Peugeot'], curated: true, models: ['208', '2008', '301', '308', '3008', '408', '5008', 'Partner', 'Rifter', 'Boxer', 'Landtrek'] },
  Renault: { fipe: ['Renault'], curated: true, models: ['Arkana', 'Captur', 'Duster', 'Kangoo', 'Koleos', 'Kwid', 'Logan', 'Oroch', 'Sandero', 'Stepway', 'Clio', 'Master'] },
  Citroën: { fipe: ['Citroën'], curated: true, models: ['Berlingo', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C5 Aircross', 'Jumpy'] },
  Fiat: { fipe: ['Fiat', 'FIAT'], curated: true, models: ['500', 'Argo', 'Cronos', 'Ducato', 'Fiorino', 'Mobi', 'Palio', 'Pulse', 'Strada', 'Toro', 'Uno'] },
  Seat: { fipe: ['Seat'], models: ['Arona', 'Ateca', 'Ibiza', 'Leon', 'Tarraco'] },
  'Alfa Romeo': { fipe: ['Alfa Romeo'], models: ['Giulia', 'Stelvio', 'Tonale'] },
  Jaguar: { fipe: ['Jaguar'], exclude: ['Daimler'], models: ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF'] },
  Ferrari: { fipe: ['Ferrari'], exclude: ['12Cilinrdri', 'SF', 'F458'], models: ['12Cilindri', 'SF90'] },
  Lamborghini: { fipe: ['LAMBORGHINI'], exclude: ['Huracan'], models: ['Huracán', 'Urus', 'Aventador'] },
  Maserati: { fipe: ['Maserati'], exclude: ['Gran', 'Coupé', 'Spyder'], models: ['Ghibli', 'Grecale', 'Levante', 'Quattroporte'] },
  Scania: { fipe: ['SCANIA'], curated: true, models: ['G Series', 'P Series', 'R Series', 'S Series'] },
  MAN: { fipe: ['MAN'], models: ['TGS', 'TGX', 'TGM'] },
  Iveco: { fipe: ['IVECO'], models: ['Daily', 'Tector', 'Stralis'] },

  // --- China / India ---
  BYD: {
    fipe: ['BYD'],
    curated: true,
    models: ['Atto 2', 'Atto 3', 'Dolphin', 'Dolphin Mini', 'Han', 'King', 'Seagull', 'Seal', 'Seal U', 'Shark',
      'Song Plus', 'Song Pro', 'Tang', 'Yuan Plus', 'Yuan Pro', 'eT3', 'F0', 'F3'],
  },
  Chery: {
    fipe: ['Caoa Chery', 'Caoa Chery/Chery'],
    curated: true,
    models: ['Arrizo 5', 'Arrizo 8', 'QQ', 'Tiggo 2', 'Tiggo 2 Pro', 'Tiggo 4', 'Tiggo 4 Pro', 'Tiggo 7',
      'Tiggo 7 Pro', 'Tiggo 8', 'Tiggo 8 Pro'],
  },
  Geely: {
    fipe: ['GEELY'],
    curated: true,
    models: ['Coolray', 'Emgrand', 'Geometry C', 'GX3 Pro', 'Monjaro', 'Okavango', 'Starray', 'Tugella', 'EX5', 'Azkarra'],
  },
  JAC: {
    fipe: ['JAC'],
    curated: true,
    models: ['E-JS1', 'E-JS4', 'J4', 'J7', 'JS2', 'JS3', 'JS4', 'JS6', 'JS8', 'T6', 'T8', 'T9', 'Sunray',
      'X200', 'X350', 'S2', 'S3', 'Refine'],
  },
  Changan: {
    fipe: ['Caoa Changan', 'CHANGAN', 'CHANA'],
    curated: true,
    models: ['Alsvin', 'CS15', 'CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'CS85', 'Hunter', 'Uni-K', 'Uni-T',
      'Deepal S07', 'MD201', 'Star Truck', 'Kaicene'],
  },
  'Great Wall': {
    fipe: ['GREAT WALL', 'GWM'],
    curated: true,
    models: ['Poer', 'Wingle 5', 'Wingle 7', 'Cannon', 'Ora 03'],
  },
  Haval: { fipe: [], models: ['H2', 'H6', 'Jolion', 'Dargo', 'H9'] },
  MG: { fipe: ['MG'], curated: true, models: ['3', '4', '5', 'GT', 'HS', 'MG4', 'One', 'RX5', 'RX8', 'ZS', 'ZS EV', 'Cyberster'] },
  Jetour: { fipe: ['Jetour'], models: ['Dashing', 'T2', 'X50', 'X70', 'X70 Plus', 'X90 Plus'] },
  Jaecoo: { fipe: ['Jaecoo'], models: ['J7', 'J8'] },
  Omoda: { fipe: ['Omoda'], models: ['C5', 'E5', 'O5'] },
  GAC: { fipe: ['GAC'], models: ['Aion S', 'Aion Y', 'Emkoo', 'Emzoom', 'GS3', 'GS4', 'GS8', 'GN6', 'GN8'] },
  DFSK: { fipe: ['DFSK'], models: ['500', '580', 'Glory 600', 'K01', 'C31', 'C35', 'C37', 'Seres 3'] },
  Dongfeng: { fipe: [], models: ['AX7', 'Rich 6', 'Mage', 'Captain', 'Forthing T5'] },
  BAIC: { fipe: [], models: ['BJ40', 'BJ60', 'X35', 'X55', 'D20'] },
  Foton: { fipe: ['FOTON'], exclude: ['10-16DT', 'Iblue'], models: ['Aumark', 'Gratour', 'Midi', 'Tunland', 'View', 'Auman', 'Toano'] },
  JMC: { fipe: ['EFFA-JMC'], models: ['Vigus', 'Grand Avenue', 'Carrying', 'N800'] },
  Jinbei: { fipe: ['JINBEI'], models: ['Haise', 'Granse'] },
  Mahindra: { fipe: ['Mahindra'], exclude: ['SUV'], models: ['KUV100', 'Pik-Up', 'Scorpio', 'XUV300', 'XUV500', 'XUV700', 'Thar'] },
  Tata: { fipe: [], models: ['Indica', 'Nano', 'Xenon', 'Super Ace'] },
  Shacman: { fipe: ['SHACMAN'], models: [] },
  Sinotruk: { fipe: ['SINOTRUK'], models: ['Howo'] },
  Daewoo: { fipe: ['Daewoo'], exclude: ['Super'], models: ['Matiz', 'Lanos', 'Nubira', 'Leganza', 'Tico', 'Damas', 'Labo'] },
};

const MOTO_BRANDS = {
  // Costa Rica / regional assemblers: models typed via "Other" until we have a reliable list
  Freedom: { fipe: [], models: [] },
  Serpento: { fipe: [], models: [] },
  Italika: { fipe: [], models: [] },
  UM: { fipe: [], models: ['DSR', 'Renegade', 'Xtreet'] },

  Honda: {
    fipe: ['HONDA'],
    curated: true,
    models: ['Africa Twin', 'CB125F', 'CB190R', 'CB300F', 'CB500F', 'CB500X', 'CB650R', 'CBR250R', 'CBR500R',
      'CBR600RR', 'CBR1000RR', 'CGL125', 'CRF150F', 'CRF230F', 'CRF250L', 'CRF250R', 'CRF300L', 'CRF450R',
      'Dio', 'Elite', 'Forza', 'Navi', 'NC750X', 'PCX', 'Rebel', 'Shadow', 'Transalp', 'Wave', 'XR125L',
      'XR150L', 'XR190L', 'XR250 Tornado', 'XR650L', 'XRE300', 'X-ADV', 'TRX Fourtrax', 'Pioneer'],
  },
  Yamaha: {
    fipe: ['YAMAHA'],
    curated: true,
    models: ['BWS', 'Crypton', 'FZ', 'FZ-S', 'FZ25', 'MT-03', 'MT-07', 'MT-09', 'MT-10', 'NMAX', 'XMAX', 'Aerox',
      'Ray ZR', 'R15', 'YZF-R3', 'YZF-R6', 'YZF-R7', 'YZF-R1', 'Ténéré 700', 'Tracer 9', 'XTZ125', 'XTZ150',
      'XTZ250', 'XT660', 'YBR125', 'YZ250F', 'YZ450F', 'WR250F', 'TTR125', 'DT125', 'Grizzly', 'Kodiak', 'Raptor'],
  },
  Suzuki: {
    fipe: ['SUZUKI'],
    curated: true,
    models: ['AX100', 'Address', 'Burgman', 'DR200', 'DR650', 'DR-Z400', 'EN125', 'GN125', 'Gixxer', 'Gixxer SF',
      'GSX-R600', 'GSX-R750', 'GSX-R1000', 'GSX-S750', 'GSX-S1000', 'GSX150', 'Hayabusa', 'Intruder', 'V-Strom 250',
      'V-Strom 650', 'V-Strom 800', 'V-Strom 1050', 'RM-Z250', 'RM-Z450', 'Boulevard', 'King Quad'],
  },
  Kawasaki: {
    fipe: ['KAWASAKI'],
    curated: true,
    models: ['KLR650', 'KLX140', 'KLX230', 'KLX300', 'KX250', 'KX450', 'Ninja 300', 'Ninja 400', 'Ninja 650',
      'Ninja ZX-6R', 'Ninja ZX-10R', 'Versys 300', 'Versys 650', 'Versys 1000', 'Vulcan S', 'Z400', 'Z650',
      'Z900', 'Z1000', 'Brute Force', 'Mule', 'Teryx'],
  },
  Bajaj: {
    fipe: ['BAJAJ'],
    curated: true,
    models: ['Avenger', 'Boxer', 'CT100', 'Discover', 'Dominar 250', 'Dominar 400', 'Platina', 'Pulsar 135',
      'Pulsar 150', 'Pulsar 180', 'Pulsar 200', 'Pulsar N160', 'Pulsar N250', 'Pulsar NS125', 'Pulsar NS160',
      'Pulsar NS200', 'Pulsar RS200', 'Pulsar 220F', 'Pulsar AS200', 'XCD'],
  },
  TVS: {
    fipe: [],
    models: ['Apache RTR 160', 'Apache RTR 160 4V', 'Apache RTR 180', 'Apache RTR 200', 'Apache RR 310', 'HLX 125',
      'HLX 150', 'Jupiter', 'Ntorq', 'Raider 125', 'Rockz', 'Sport', 'Star', 'Neo'],
  },
  Hero: {
    fipe: ['HERO'],
    curated: true,
    models: ['Dash', 'Eco Deluxe', 'Hunk 150', 'Hunk 160R', 'Ignitor', 'Splendor', 'Thriller', 'Xpulse 200',
      'Xtreme 160R', 'Xtreme 200', 'Hunk 190R'],
  },
  Kymco: {
    fipe: ['KYMCO'],
    curated: true,
    models: ['Agility', 'AK 550', 'Downtown', 'Like', 'People', 'Super 8', 'Xciting', 'X-Town', 'Mongoose', 'MXU'],
  },
  SYM: { fipe: ['SANYANG'], models: ['Crox', 'Fiddle', 'Jet', 'Joyride', 'Maxsym', 'Orbit', 'Symphony', 'NH-X'] },
  KTM: { fipe: ['KTM'], curated: true, models: ['125 Duke', '200 Duke', '390 Duke', '790 Duke', '890 Duke', '1290 Super Duke', 'RC 200', 'RC 390', '390 Adventure', '890 Adventure', '1290 Super Adventure', '250 EXC', '300 EXC', '350 SX-F', '450 SX-F', '690 Enduro'] },
  Husqvarna: { fipe: ['HUSQVARNA'], curated: true, models: ['Svartpilen 401', 'Svartpilen 801', 'Vitpilen 401', 'Vitpilen 701', 'Norden 901', '701 Enduro', 'TE 150', 'TE 300', 'FE 350', 'FE 450', 'FE 501', 'TC 85', 'TC 125', 'FC 250', 'FC 350', 'FC 450'] },
  Haojue: { fipe: ['HAOJUE'], models: ['DK150', 'DR160', 'KA150', 'NK150', 'Chopper Road', 'Lindy', 'Master Ride', 'VR150'] },
  Lifan: { fipe: ['LIFAN'], models: [] },
  Loncin: { fipe: [], models: [] },
  Keeway: { fipe: [], models: ['RKS', 'Superlight', 'TX', 'Vieste', 'K-Light'] },
  Benelli: { fipe: ['Benelli'], models: ['180S', 'Leoncino', 'TNT 135', 'TNT 300', 'TRK 251', 'TRK 502', '302S', '502C'] },
  CFMoto: { fipe: ['CFMOTO'], exclude: ['CL-'], models: ['300NK', '450NK', '650NK', '450MT', '800MT', '450SR', 'CForce', 'UForce', 'ZForce'] },
  Voge: { fipe: ['VOGE'], models: [] },
  Zontes: { fipe: ['ZONTES'], models: [] },
  'Royal Enfield': { fipe: ['Royal Enfield'], curated: true, models: ['Bullet 350', 'Bullet 500', 'Classic 350', 'Classic 500', 'Continental GT 650', 'Guerrilla 450', 'Himalayan', 'Himalayan 450', 'Hunter 350', 'Interceptor 650', 'Meteor 350', 'Scram 411', 'Shotgun 650', 'Super Meteor 650'] },
  BMW: { fipe: ['BMW'], models: ['G 310 GS', 'G 310 R', 'F 750 GS', 'F 850 GS', 'F 900 R', 'R 1250 GS', 'R 1300 GS', 'S 1000 RR', 'C 400 X'] },
  Ducati: { fipe: ['DUCATI'], curated: true, models: ['DesertX', 'Diavel', 'Hypermotard', 'Monster', 'Multistrada', 'Panigale', 'Scrambler', 'Streetfighter'] },
  'Harley-Davidson': { fipe: ['HARLEY-DAVIDSON'], curated: true, models: ['Breakout', 'Electra Glide', 'Fat Bob', 'Fat Boy', 'Heritage Classic', 'Iron 883', 'Iron 1200', 'Low Rider', 'Nightster', 'Pan America', 'Road Glide', 'Road King', 'Softail', 'Sportster', 'Sportster S', 'Street Bob', 'Street Glide', 'Ultra Limited', 'V-Rod', 'X 440'] },
  Triumph: { fipe: ['TRIUMPH'], curated: true, models: ['Bonneville', 'Daytona 660', 'Rocket 3', 'Scrambler 400 X', 'Scrambler 900', 'Scrambler 1200', 'Speed 400', 'Speed Triple', 'Speed Twin', 'Street Triple', 'Thruxton', 'Tiger 660', 'Tiger 800', 'Tiger 900', 'Tiger 1200', 'Trident 660'] },
  Indian: { fipe: ['INDIAN'], models: ['Chief', 'FTR', 'Scout', 'Springfield'] },
  Aprilia: { fipe: ['APRILIA'], curated: true, models: ['RS 457', 'RS 660', 'RSV4', 'SR GT', 'Tuareg 660', 'Tuono'] },
  Vespa: { fipe: ['VESPA'], curated: true, models: ['GTS', 'Primavera', 'Sprint', 'LX'] },
  Piaggio: { fipe: ['PIAGGIO'], curated: true, models: ['Beverly', 'Liberty', 'MP3', 'Zip'] },
  'Can-Am': { fipe: ['BRP'], curated: true, models: ['Defender', 'Maverick', 'Outlander', 'Ryker', 'Spyder', 'Renegade', 'Commander'] },
  Polaris: { fipe: ['POLARIS'], models: ['General', 'Ranger', 'RZR', 'Sportsman', 'Slingshot'] },
};

module.exports = { CAR_BRANDS, MOTO_BRANDS };
