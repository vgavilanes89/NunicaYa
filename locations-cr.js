// This file contains the location data for Costa Rica
// (Provinces, Cantons, and Districts)
// Sourced from official data, formatted for this project.

const costaRicaLocations = {
    "sanjose": {
        "nombre": "San José",
        "cantones": {
            "san-jose": {
                "nombre": "San José",
                "distritos": ["Carmen", "Merced", "Hospital", "Catedral", "Zapote", "San Francisco de Dos Ríos", "Uruca", "Mata Redonda", "Pavas", "Hatillo", "San Sebastián"]
            },
            "escazu": {
                "nombre": "Escazú",
                "distritos": ["Escazú", "San Antonio", "San Rafael"]
            },
            "desamparados": {
                "nombre": "Desamparados",
                "distritos": ["Desamparados", "San Miguel", "San Juan de Dios", "San Rafael Arriba", "San Antonio", "Frailes", "Patarrá", "San Cristóbal", "Rosario", "Damas", "San Rafael Abajo", "Gravilias", "Los Guido"]
            },
            "puriscal": {
                "nombre": "Puriscal",
                "distritos": ["Santiago", "Mercedes Sur", "Barbacoas", "Grifo Alto", "San Rafael", "Candelarita", "Desamparaditos", "San Antonio", "Chires"]
            },
            "tarrazu": {
                "nombre": "Tarrazú",
                "distritos": ["San Marcos", "San Lorenzo", "San Carlos"]
            },
            "aserri": {
                "nombre": "Aserrí",
                "distritos": ["Aserrí", "Tarbaca", "Vuelta de Jorco", "San Gabriel", "Legua", "Monterrey", "Salitrillos"]
            },
            "mora": {
                "nombre": "Mora",
                "distritos": ["Colón", "Guayabo", "Tabarcia", "Piedras Negras", "Picagres", "Jaris", "Quitirrisí"]
            },
            "goicoechea": {
                "nombre": "Goicoechea",
                "distritos": ["Guadalupe", "San Francisco", "Calle Blancos", "Mata de Plátano", "Ipís", "Rancho Redondo", "Purral"]
            },
            "santa-ana": {
                "nombre": "Santa Ana",
                "distritos": ["Santa Ana", "Salitral", "Pozos", "Uruca", "Piedades", "Brasil"]
            },
            "alajuelita": {
                "nombre": "Alajuelita",
                "distritos": ["Alajuelita", "San Josecito", "San Antonio", "Concepción", "San Felipe"]
            },
            "vazquez-de-coronado": {
                "nombre": "Vázquez de Coronado",
                "distritos": ["San Isidro", "San Rafael", "Dulce Nombre de Jesús", "Patalillo", "Cascajal"]
            },
            "acosta": {
                "nombre": "Acosta",
                "distritos": ["San Ignacio", "Guaitil", "Palmichal", "Cangrejal", "Sabanillas"]
            },
            "tibas": {
                "nombre": "Tibás",
                "distritos": ["San Juan", "Cinco Esquinas", "Anselmo Llorente", "León XIII", "Colima"]
            },
            "moravia": {
                "nombre": "Moravia",
                "distritos": ["San Vicente", "San Jerónimo", "La Trinidad"]
            },
            "montes-de-oca": {
                "nombre": "Montes de Oca",
                "distritos": ["San Pedro", "Sabanilla", "Mercedes", "San Rafael"]
            },
            "turrubares": {
                "nombre": "Turrubares",
                "distritos": ["San Pablo", "San Pedro", "San Juan de Mata", "San Luis", "Carara"]
            },
            "dota": {
                "nombre": "Dota",
                "distritos": ["Santa María", "Jardín", "Copey"]
            },
            "curridabat": {
                "nombre": "Curridabat",
                "distritos": ["Curridabat", "Granadilla", "Sánchez", "Tirrases"]
            },
            "perez-zeledon": {
                "nombre": "Pérez Zeledón",
                "distritos": ["San Isidro de El General", "El General", "Daniel Flores", "Rivas", "San Pedro", "Platanares", "Pejibaye", "Cajón", "Barú", "Río Nuevo", "Páramo", "La Amistad"]
            },
            "leon-cortes": {
                "nombre": "León Cortés Castro",
                "distritos": ["San Pablo", "San Andrés", "Llano Bonito", "San Isidro", "Santa Cruz", "San Antonio"]
            }
        }
    },
    "alajuela": {
        "nombre": "Alajuela",
        "cantones": {
            "alajuela": {
                "nombre": "Alajuela",
                "distritos": ["Alajuela", "San José", "Carrizal", "San Antonio", "Guácima", "San Isidro", "Sabanilla", "San Rafael", "Río Segundo", "Desamparados", "Turrúcares", "Tambor", "Garita", "Sarapiquí"]
            },
            "san-ramon": {
                "nombre": "San Ramón",
                "distritos": ["San Ramón", "Santiago", "San Juan", "Piedades Norte", "Piedades Sur", "San Rafael", "San Isidro", "Ángeles", "Alfaro", "Volio", "Concepción", "Zapotal", "Peñas Blancas", "San Lorenzo"]
            },
            "grecia": {
                "nombre": "Grecia",
                "distritos": ["Grecia", "San Isidro", "San José", "San Roque", "Tacares", "Río Cuarto", "Puente de Piedra", "Bolívar"]
            },
            "san-mateo": {
                "nombre": "San Mateo",
                "distritos": ["San Mateo", "Desmonte", "Jesús María", "Labrador"]
            },
            "atenas": {
                "nombre": "Atenas",
                "distritos": ["Atenas", "Jesús", "Mercedes", "San Isidro", "Concepción", "San José", "Santa Eulalia", "Escobal"]
            },
            "naranjo": {
                "nombre": "Naranjo",
                "distritos": ["Naranjo", "San Miguel", "San José", "Cirrí Sur", "San Jerónimo", "San Juan", "El Rosario", "Palmitos"]
            },
            "palmares": {
                "nombre": "Palmares",
                "distritos": ["Palmares", "Zaragoza", "Buenos Aires", "Santiago", "Candelaria", "Esquipulas", "La Granja"]
            },
            "poas": {
                "nombre": "Poás",
                "distritos": ["San Pedro", "San Juan", "San Rafael", "Carrillos", "Sabana Redonda"]
            },
            "orotina": {
                "nombre": "Orotina",
                "distritos": ["Orotina", "El Mastate", "Hacienda Vieja", "Coyolar", "La Ceiba"]
            },
            "san-carlos": {
                "nombre": "San Carlos",
                "distritos": ["Quesada", "Florencia", "Buenavista", "Aguas Zarcas", "Venecia", "Pital", "La Fortuna", "La Tigra", "La Palmera", "Venado", "Cutris", "Monterrey", "Pocosol"]
            },
            "zarcero": {
                "nombre": "Zarcero",
                "distritos": ["Zarcero", "Laguna", "Tapesco", "Guadalupe", "Palmira", "Zapote", "Brisas"]
            },
            "sarchi": {
                "nombre": "Sarchí",
                "distritos": ["Sarchí Norte", "Sarchí Sur", "Toro Amarillo", "San Pedro", "Rodríguez"]
            },
            "upala": {
                "nombre": "Upala",
                "distritos": ["Upala", "Aguas Claras", "San José (Pizote)", "Bijagua", "Delicias", "Dos Ríos", "Yolillal", "Canalete"]
            },
            "los-chiles": {
                "nombre": "Los Chiles",
                "distritos": ["Los Chiles", "Caño Negro", "El Amparo", "San Jorge"]
            },
            "guatuso": {
                "nombre": "Guatuso",
                "distritos": ["San Rafael", "Buenavista", "Cote", "Katira"]
            },
            "rio-cuarto": {
                "nombre": "Río Cuarto",
                "distritos": ["Río Cuarto", "Santa Isabel", "Santa Rita"]
            }
        }
    },
    "cartago": {
        "nombre": "Cartago",
        "cantones": {
            "cartago": {
                "nombre": "Cartago",
                "distritos": ["Oriental", "Occidental", "Carmen", "San Nicolás", "Agua Caliente (San Francisco)", "Guadalupe (Arenilla)", "Corralillo", "Tierra Blanca", "Dulce Nombre", "Llano Grande", "Quebradilla"]
            },
            "paraiso": {
                "nombre": "Paraíso",
                "distritos": ["Paraíso", "Santiago", "Orosi", "Cachí", "Llanos de Santa Lucía"]
            },
            "la-union": {
                "nombre": "La Unión",
                "distritos": ["Tres Ríos", "San Diego", "San Juan", "San Rafael", "Concepción", "Dulce Nombre", "San Ramón", "Río Azul"]
            },
            "jimenez": {
                "nombre": "Jiménez",
                "distritos": ["Juan Viñas", "Tucurrique", "Pejibaye"]
            },
            "turrialba": {
                "nombre": "Turrialba",
                "distritos": ["Turrialba", "La Suiza", "Peralta", "Santa Cruz", "Santa Teresita", "Pascua", "Tayutic", "Santa Rosa", "Tres Equis", "La Isabel", "Chirripó", "Jicotea"]
            },
            "alvarado": {
                "nombre": "Alvarado",
                "distritos": ["Pacayas", "Cervantes", "Capellades"]
            },
            "oreamuno": {
                "nombre": "Oreamuno",
                "distritos": ["San Rafael", "Cot", "Potrero Cerrado", "Cipreses", "Santa Rosa"]
            },
            "el-guarco": {
                "nombre": "El Guarco",
                "distritos": ["El Tejar", "San Isidro", "Tobosi", "Patio de Agua"]
            }
        }
    },
    "heredia": {
        "nombre": "Heredia",
        "cantones": {
            "heredia": {
                "nombre": "Heredia",
                "distritos": ["Heredia", "Mercedes", "San Francisco", "Ulloa", "Varablanca"]
            },
            "barva": {
                "nombre": "Barva",
                "distritos": ["Barva", "San Pedro", "San Pablo", "San Roque", "Santa Lucía", "San José de la Montaña"]
            },
            "santo-domingo": {
                "nombre": "Santo Domingo",
                "distritos": ["Santo Domingo", "San Vicente", "San Miguel", "Paracito", "Santo Tomás", "Santa Rosa", "Tures", "Pará"]
            },
            "santa-barbara": {
                "nombre": "Santa Bárbara",
                "distritos": ["Santa Bárbara", "San Pedro", "San Juan", "Jesús", "Santo Domingo", "Purabá"]
            },
            "san-rafael": {
                "nombre": "San Rafael",
                "distritos": ["San Rafael", "San Josecito", "Santiago", "Ángeles", "Concepción"]
            },
            "san-isidro": {
                "nombre": "San Isidro",
                "distritos": ["San Isidro", "San José", "Concepción", "San Francisco"]
            },
            "belen": {
                "nombre": "Belén",
                "distritos": ["San Antonio", "La Ribera", "La Asunción"]
            },
            "flores": {
                "nombre": "Flores",
                "distritos": ["San Joaquín", "Barrantes", "Llorente"]
            },
            "san-pablo": {
                "nombre": "San Pablo",
                "distritos": ["San Pablo", "Rincón de Sabanilla"]
            },
            "sarapiqui": {
                "nombre": "Sarapiquí",
                "distritos": ["Puerto Viejo", "La Virgen", "Horquetas", "Llanuras del Gaspar", "Cureña"]
            }
        }
    },
    "guanacaste": {
        "nombre": "Guanacaste",
        "cantones": {
            "liberia": {
                "nombre": "Liberia",
                "distritos": ["Liberia", "Cañas Dulces", "Mayorga", "Nacascolo", "Curubandé"]
            },
            "nicoya": {
                "nombre": "Nicoya",
                "distritos": ["Nicoya", "Mansión", "San Antonio", "Quebrada Honda", "Sámara", "Nosara", "Belén de Nosarita"]
            },
            "santa-cruz": {
                "nombre": "Santa Cruz",
                "distritos": ["Santa Cruz", "Bolsón", "Veintisiete de Abril", "Tempate", "Cartagena", "Cuajiniquil", "Diriá", "Cabo Velas", "Tamarindo"]
            },
            "bagaces": {
                "nombre": "Bagaces",
                "distritos": ["Bagaces", "La Fortuna", "Mogote", "Río Naranjo"]
            },
            "carrillo": {
                "nombre": "Carrillo",
                "distritos": ["Filadelfia", "Palmira", "Sardinal", "Belén"]
            },
            "canas": {
                "nombre": "Cañas",
                "distritos": ["Cañas", "Palmira", "San Miguel", "Bebedero", "Porozal"]
            },
            "abangares": {
                "nombre": "Abangares",
                "distritos": ["Las Juntas", "Sierra", "San Juan", "Colorado"]
            },
            "tilaran": {
                "nombre": "Tilarán",
                "distritos": ["Tilarán", "Quebrada Grande", "Tronadora", "Santa Rosa", "Líbano", "Tierras Morenas", "Arenal"]
            },
            "nandayure": {
                "nombre": "Nandayure",
                "distritos": ["Carmona", "Santa Rita", "Zapotal", "San Pablo", "Porvenir", "Bejuco"]
            },
            "la-cruz": {
                "nombre": "La Cruz",
                "distritos": ["La Cruz", "Santa Cecilia", "La Garita", "Santa Elena"]
            },
            "hojancha": {
                "nombre": "Hojancha",
                "distritos": ["Hojancha", "Monte Romo", "Puerto Carrillo", "Huacas", "Matambú"]
            }
        }
    },
    "puntarenas": {
        "nombre": "Puntarenas",
        "cantones": {
            "puntarenas": {
                "nombre": "Puntarenas",
                "distritos": ["Puntarenas", "Pitahaya", "Chomes", "Lepanto", "Paquera", "Manzanillo", "Guacimal", "Barranca", "Monte Verde", "Isla del Coco", "Cóbano", "Chacarita", "Chira", "Acapulco", "El Roble", "Arancibia"]
            },
            "esparza": {
                "nombre": "Esparza",
                "distritos": ["Espíritu Santo", "San Juan Grande", "Macacona", "San Rafael", "San Jerónimo", "Caldera"]
            },
            "buenos-aires": {
                "nombre": "Buenos Aires",
                "distritos": ["Buenos Aires", "Volcán", "Potrero Grande", "Boruca", "Pilas", "Colinas", "Chánguena", "Biolley", "Brunka"]
            },
            "montes-de-oro": {
                "nombre": "Montes de Oro",
                "distritos": ["Miramar", "La Unión", "San Isidro"]
            },
            "osa": {
                "nombre": "Osa",
                "distritos": ["Puerto Cortés", "Palmar", "Sierpe", "Bahía Ballena", "Piedras Blancas", "Bahía Drake"]
            },
            "quezpos": {
                "nombre": "Quepos",
                "distritos": ["Quepos", "Savegre", "Naranjito"]
            },
            "golfito": {
                "nombre": "Golfito",
                "distritos": ["Golfito", "Puerto Jiménez", "Guaycará", "Pavón"]
            },
            "coto-brus": {
                "nombre": "Coto Brus",
                "distritos": ["San Vito", "Sabalito", "Agua Buena", "Limóncito", "Pittier", "Gutiérrez Braun"]
            },
            "parrita": {
                "nombre": "Parrita",
                "distritos": ["Parrita"]
            },
            "corredores": {
                "nombre": "Corredores",
                "distritos": ["Corredor", "La Cuesta", "Canoas", "Laurel", "Gutiérrez Braun"]
            },
            "garabito": {
                "nombre": "Garabito",
                "distritos": ["Jacó", "Tárcoles"]
            }
        }
    },
    "limon": {
        "nombre": "Limón",
        "cantones": {
            "limon": {
                "nombre": "Limón",
                "distritos": ["Limón", "Valle La Estrella", "Río Blanco", "Matama"]
            },
            "pococi": {
                "nombre": "Pococí",
                "distritos": ["Guápiles", "Jiménez", "La Rita", "Roxana", "Cariari", "Colorado", "La Colonia"]
            },
            "siquirres": {
                "nombre": "Siquirres",
                "distritos": ["Siquirres", "Pacuarito", "Florida", "Germania", "El Cairo", "Alegría"]
            },
            "talamanca": {
                "nombre": "Talamanca",
                "distritos": ["Bratsi", "Sixaola", "Cahuita", "Telire"]
            },
            "matina": {
                "nombre": "Matina",
                "distritos": ["Matina", "Batán", "Carrandí"]
            },
            "guacimo": {
                "nombre": "Guácimo",
                "distritos": ["Guácimo", "Mercedes", "Pocora", "Río Jiménez", "Duacarí"]
            }
        }
    }
};

// Make it available for scripts that load it
window.costaRicaLocations = costaRicaLocations;