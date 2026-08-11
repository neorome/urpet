// Public rescue contacts are mapped at city level unless the organization publishes a visit address.
// Contact before traveling: many Honduran rescue groups operate through foster networks.
const HONDURAS_RESCUES = Object.freeze([
  { id: "organizacion-ari", name: "Organización Ari", latitude: 14.1058135, longitude: -87.2047053, city: "Tegucigalpa", region: "Francisco Morazán", phone: "+504 3158-2017" },
  { id: "amor-y-abrigo", name: "Refugio Amor y Abrigo", latitude: 15.5053535, longitude: -88.0250839, city: "San Pedro Sula", region: "Cortés", phone: "+504 9824-8715", website: "https://www.amoryabrigohn.org/", sourceUrl: "https://www.amoryabrigohn.org/", sourceLabel: "official website" },
  { id: "smc-protege", name: "Refugio SMC Protege", latitude: 13.3714203, longitude: -87.0713958, city: "Choluteca", region: "Choluteca", phone: "+504 3382-4490" },
  { id: "asa-rescatistas", name: "ASA Rescatistas", latitude: 15.7833743, longitude: -86.7917749, city: "La Ceiba", region: "Atlántida", phone: "+504 9860-1997" },
  { id: "corazon-canino-src", name: "Corazón Canino SRC", latitude: 14.7675556, longitude: -88.7780977, city: "Santa Rosa de Copán", region: "Copán", phone: "+504 9521-4200" },
  { id: "rescatistas-de-corazon", name: "Fundación Refugio Rescatistas de Corazón HN", latitude: 15.6127426, longitude: -87.950694, city: "Choloma", region: "Cortés", phone: "+504 9853-0895" },
  { id: "salvando-huellas", name: "Fundación Salvando Huellas", latitude: 15.4009458, longitude: -87.8120187, city: "El Progreso", region: "Yoro" },
  { id: "jaspers-utila", name: "Jaspers Útila Animal Shelter", latitude: 16.1005116, longitude: -86.8949856, city: "Utila", region: "Islas de la Bahía", phone: "+504 9230-3024" },
  { id: "casa-de-bruno", name: "La Casa de Bruno", latitude: 14.6672029, longitude: -86.2195829, city: "Juticalpa", region: "Olancho", phone: "+504 3170-1916" },
  { id: "refugio-de-aslan", name: "Refugio de Aslan", latitude: 14.1546577, longitude: -88.0347414, city: "Marcala", region: "La Paz", phone: "+504 3177-8080" },
  { id: "roatan-animal-welfare", name: "Roatán Animal Welfare", latitude: 16.3490211, longitude: -86.4977513, city: "Roatán", region: "Islas de la Bahía", phone: "+504 3286-0495" },
  { id: "proa-puerto-cortes", name: "Refugio PROA Puerto Cortés", latitude: 15.851465, longitude: -87.9426681, city: "Puerto Cortés", region: "Cortés" }
].map((rescue) => Object.freeze({
  ...rescue,
  country: "Honduras",
  locationPrecision: "city",
  sourceUrl: rescue.sourceUrl || "https://honduras.cuentanos.org/es/articles/10000358807965",
  sourceLabel: rescue.sourceLabel || "Honduras rescue directory"
})));

export { HONDURAS_RESCUES };
