import { BREED_TRAITS } from "./breed-traits.js?v=20260810h";

const CATALOG_VERSION = "2026-08-10";
const REGISTRY_CHECKED_ON = "2026-08-10";
const REGISTRY_EFFECTIVE_ON = "2026-01-01";
const REGISTRY_SOURCE = "https://www.akc.org/press-center/articles-resources/facts-and-stats/breeds-year-recognized/";
const GROUP_SOURCE = "https://www.akc.org/akc-breeds-by-group/";
const AKC_PROFILE_BASE = "https://www.akc.org/dog-breeds";

const GROUP_ROWS = Object.freeze({
  sporting: `
American Water Spaniel|american-water-spaniel
Barbet|barbet
Boykin Spaniel|boykin-spaniel
Bracco Italiano|bracco-italiano
Brittany|brittany
Chesapeake Bay Retriever|chesapeake-bay-retriever
Clumber Spaniel|clumber-spaniel
Cocker Spaniel|cocker-spaniel
Curly-Coated Retriever|curly-coated-retriever
English Cocker Spaniel|english-cocker-spaniel
English Setter|english-setter
English Springer Spaniel|english-springer-spaniel
Field Spaniel|field-spaniel
Flat-Coated Retriever|flat-coated-retriever
German Shorthaired Pointer|german-shorthaired-pointer
German Wirehaired Pointer|german-wirehaired-pointer
Golden Retriever|golden-retriever
Gordon Setter|gordon-setter
Irish Red and White Setter|irish-red-and-white-setter
Irish Setter|irish-setter
Irish Water Spaniel|irish-water-spaniel
Labrador Retriever|labrador-retriever
Lagotto Romagnolo|lagotto-romagnolo
Nederlandse Kooikerhondje|nederlandse-kooikerhondje
Nova Scotia Duck Tolling Retriever|nova-scotia-duck-tolling-retriever
Pointer|pointer
Spinone Italiano|spinone-italiano
Sussex Spaniel|sussex-spaniel
Vizsla|vizsla
Weimaraner|weimaraner
Welsh Springer Spaniel|welsh-springer-spaniel
Wirehaired Pointing Griffon|wirehaired-pointing-griffon
Wirehaired Vizsla|wirehaired-vizsla`,
  hound: `
Afghan Hound|afghan-hound
American English Coonhound|american-english-coonhound
American Foxhound|american-foxhound
Azawakh|azawakh
Basenji|basenji
Basset Fauve de Bretagne|basset-fauve-de-bretagne
Basset Hound|basset-hound
Beagle|beagle
Black and Tan Coonhound|black-and-tan-coonhound
Bloodhound|bloodhound
Bluetick Coonhound|bluetick-coonhound
Borzoi|borzoi
Cirneco dell’Etna|cirneco-delletna
Dachshund|dachshund
English Foxhound|english-foxhound
Grand Basset Griffon Vendeen|grand-basset-griffon-vendeen
Greyhound|greyhound
Harrier|harrier
Ibizan Hound|ibizan-hound
Irish Wolfhound|irish-wolfhound
Norwegian Elkhound|norwegian-elkhound
Otterhound|otterhound
Petit Basset Griffon Vendeen|petit-basset-griffon-vendeen
Pharaoh Hound|pharaoh-hound
Plott Hound|plott-hound
Portuguese Podengo Pequeno|portuguese-podengo-pequeno
Redbone Coonhound|redbone-coonhound
Rhodesian Ridgeback|rhodesian-ridgeback
Saluki|saluki
Scottish Deerhound|scottish-deerhound
Sloughi|sloughi
Treeing Walker Coonhound|treeing-walker-coonhound
Whippet|whippet`,
  working: `
Akita|akita
Alaskan Malamute|alaskan-malamute
Anatolian Shepherd Dog|anatolian-shepherd-dog
Bernese Mountain Dog|bernese-mountain-dog
Black Russian Terrier|black-russian-terrier
Boerboel|boerboel
Boxer|boxer
Bullmastiff|bullmastiff
Cane Corso|cane-corso
Chinook|chinook
Danish-Swedish Farmdog|danish-swedish-farmdog
Doberman Pinscher|doberman-pinscher
Dogo Argentino|dogo-argentino
Dogue de Bordeaux|dogue-de-bordeaux
German Pinscher|german-pinscher
Giant Schnauzer|giant-schnauzer
Great Dane|great-dane
Great Pyrenees|great-pyrenees
Greater Swiss Mountain Dog|greater-swiss-mountain-dog
Komondor|komondor
Kuvasz|kuvasz
Leonberger|leonberger
Mastiff|mastiff
Neapolitan Mastiff|neapolitan-mastiff
Newfoundland|newfoundland
Portuguese Water Dog|portuguese-water-dog
Rottweiler|rottweiler
St. Bernard|st-bernard
Samoyed|samoyed
Siberian Husky|siberian-husky
Standard Schnauzer|standard-schnauzer
Tibetan Mastiff|tibetan-mastiff`,
  terrier: `
Airedale Terrier|airedale-terrier
American Hairless Terrier|american-hairless-terrier
American Staffordshire Terrier|american-staffordshire-terrier
Australian Terrier|australian-terrier
Bedlington Terrier|bedlington-terrier
Border Terrier|border-terrier
Bull Terrier|bull-terrier
Cairn Terrier|cairn-terrier
Cesky Terrier|cesky-terrier
Dandie Dinmont Terrier|dandie-dinmont-terrier
Glen of Imaal Terrier|glen-of-imaal-terrier
Irish Terrier|irish-terrier
Kerry Blue Terrier|kerry-blue-terrier
Lakeland Terrier|lakeland-terrier
Manchester Terrier|manchester-terrier-standard,manchester-terrier-toy
Miniature Bull Terrier|miniature-bull-terrier
Miniature Schnauzer|miniature-schnauzer
Norfolk Terrier|norfolk-terrier
Norwich Terrier|norwich-terrier
Parson Russell Terrier|parson-russell-terrier
Rat Terrier|rat-terrier
Russell Terrier|russell-terrier
Scottish Terrier|scottish-terrier
Sealyham Terrier|sealyham-terrier
Skye Terrier|skye-terrier
Smooth Fox Terrier|smooth-fox-terrier
Soft Coated Wheaten Terrier|soft-coated-wheaten-terrier
Staffordshire Bull Terrier|staffordshire-bull-terrier
Teddy Roosevelt Terrier|teddy-roosevelt-terrier
Welsh Terrier|welsh-terrier
West Highland White Terrier|west-highland-white-terrier
Wire Fox Terrier|wire-fox-terrier`,
  toy: `
Affenpinscher|affenpinscher
Biewer Terrier|biewer-terrier
Brussels Griffon|brussels-griffon
Cavalier King Charles Spaniel|cavalier-king-charles-spaniel
Chihuahua|chihuahua
Chinese Crested|chinese-crested
English Toy Spaniel|english-toy-spaniel
Havanese|havanese
Italian Greyhound|italian-greyhound
Japanese Chin|japanese-chin
Maltese|maltese
Miniature Pinscher|miniature-pinscher
Papillon|papillon
Pekingese|pekingese
Pomeranian|pomeranian
Pug|pug
Russian Toy|russian-toy
Russian Tsvetnaya Bolonka|russian-tsvetnaya-bolonka
Shih Tzu|shih-tzu
Silky Terrier|silky-terrier
Toy Fox Terrier|toy-fox-terrier
Yorkshire Terrier|yorkshire-terrier`,
  "non-sporting": `
American Eskimo Dog|american-eskimo-dog
Bichon Frise|bichon-frise
Boston Terrier|boston-terrier
Bulldog|bulldog
Chinese Shar-Pei|chinese-shar-pei
Chow Chow|chow-chow
Coton de Tulear|coton-de-tulear
Dalmatian|dalmatian
Finnish Spitz|finnish-spitz
French Bulldog|french-bulldog
Keeshond|keeshond
Lhasa Apso|lhasa-apso
Lowchen|lowchen
Norwegian Lundehund|norwegian-lundehund
Poodle|poodle-standard,poodle-miniature,poodle-toy
Schipperke|schipperke
Shiba Inu|shiba-inu
Tibetan Spaniel|tibetan-spaniel
Tibetan Terrier|tibetan-terrier
Xoloitzcuintli|xoloitzcuintli`,
  herding: `
Australian Cattle Dog|australian-cattle-dog
Australian Shepherd|australian-shepherd
Bearded Collie|bearded-collie
Beauceron|beauceron
Belgian Laekenois|belgian-laekenois
Belgian Malinois|belgian-malinois
Belgian Sheepdog|belgian-sheepdog
Belgian Tervuren|belgian-tervuren
Bergamasco Sheepdog|bergamasco-sheepdog
Berger Picard|berger-picard
Border Collie|border-collie
Bouvier des Flandres|bouvier-des-flandres
Briard|briard
Canaan Dog|canaan-dog
Cardigan Welsh Corgi|cardigan-welsh-corgi
Collie|collie
Entlebucher Mountain Dog|entlebucher-mountain-dog
Finnish Lapphund|finnish-lapphund
German Shepherd Dog|german-shepherd-dog
Icelandic Sheepdog|icelandic-sheepdog
Lancashire Heeler|lancashire-heeler
Miniature American Shepherd|miniature-american-shepherd
Mudi|mudi
Norwegian Buhund|norwegian-buhund
Old English Sheepdog|old-english-sheepdog
Pembroke Welsh Corgi|pembroke-welsh-corgi
Polish Lowland Sheepdog|polish-lowland-sheepdog
Puli|puli
Pumi|pumi
Pyrenean Shepherd|pyrenean-shepherd
Shetland Sheepdog|shetland-sheepdog
Spanish Water Dog|spanish-water-dog
Swedish Vallhund|swedish-vallhund`
});

const GROUP_DEFAULTS = Object.freeze({
  sporting: { activity: "active", training: "ongoing", grooming: "regular", shedding: "moderate", goals: ["companion", "walks", "adventure", "sport"], purpose: "cooperative field, pointing, flushing, or retrieving work" },
  hound: { activity: "active", training: "ongoing", grooming: "simple", shedding: "moderate", goals: ["companion", "walks", "adventure"], purpose: "scent or sight pursuit" },
  working: { activity: "active", training: "skilled", grooming: "regular", shedding: "moderate", goals: ["companion", "walks", "adventure", "sport"], purpose: "guarding, draft, rescue, or other practical work" },
  terrier: { activity: "active", training: "ongoing", grooming: "regular", shedding: "moderate", goals: ["companion", "walks", "sport"], purpose: "determined vermin-control and farm work" },
  toy: { activity: "steady", training: "routine", grooming: "regular", shedding: "moderate", goals: ["companion", "walks"], purpose: "close companionship in a small package" },
  "non-sporting": { activity: "active", training: "ongoing", grooming: "regular", shedding: "moderate", goals: ["companion", "walks"], purpose: "varied companionship or utility work" },
  herding: { activity: "very-active", training: "skilled", grooming: "regular", shedding: "high", goals: ["walks", "adventure", "sport"], purpose: "livestock movement and handler-focused work" }
});

function parseRows(group, text) {
  return text.trim().split("\n").map((line) => {
    const [name, slugText] = line.split("|");
    const sourceSlugs = slugText.split(",");
    const id = name === "Manchester Terrier" ? "manchester-terrier" : name === "Poodle" ? "poodle" : sourceSlugs[0];
    return { id, name, group, sourceSlugs };
  });
}

const CAUTION_COPY = Object.freeze({
  "heat-health": "Short-muzzled body shape can add breathing, heat-management, and ongoing-care questions; put health before convenience.",
  "giant-logistics": "Giant-dog food, transport, handling, housing, and veterinary costs need a real plan before the dog comes home.",
  guardian: "Guardian heritage makes visitor plans, secure management, and evidence about the individual dog especially important.",
  "conformation-health": "Body shape makes health history, movement, weight, and suitable activity questions part of the decision.",
  chase: "Pursuit heritage makes secure handling, recall expectations, and small-animal introductions real management questions.",
  "professional-coat": "The coat needs recurring skilled care; low shedding never means low maintenance.",
  "high-engagement": "This is an engaged-routine choice: regular physical work, brain work, and training cannot be saved for weekends.",
  "heavy-coat": "Expect meaningful shedding or coat work, including seasonal peaks and extra cleanup.",
  vocal: "Voice can be part of the package, so housing, neighbors, and a realistic management plan matter.",
  independent: "An independent working style can make patient training and secure management more important than eager compliance.",
  sensitive: "Ask how this individual handles change, noise, unfamiliar people, and recovery after stress.",
  "secure-containment": "Secure leads, fencing, and door habits deserve a concrete plan rather than an off-leash assumption."
});

function cautionFor(profile) {
  const priorities = ["heat-health", "giant-logistics", "guardian", "conformation-health", "chase", "professional-coat", "high-engagement", "heavy-coat", "vocal", "independent", "secure-containment"];
  const first = priorities.find((flag) => profile.flags.includes(flag));
  if (first) return CAUTION_COPY[first];
  return `Research the individual dog alongside the breed’s ${profile.activity} activity, ${profile.training} training, and ${profile.grooming} coat-care bands.`;
}

function profileFromRow(row) {
  const defaults = GROUP_DEFAULTS[row.group];
  const traits = BREED_TRAITS[row.id];
  if (!traits) throw new Error(`Missing explicit trait row for ${row.name}.`);
  const profile = {
    ...row,
    secondaryGroups: row.id === "manchester-terrier" ? ["toy"] : row.id === "poodle" ? ["toy"] : [],
    sizes: traits.sizes,
    activity: traits.activity,
    training: traits.training,
    grooming: traits.grooming,
    shedding: traits.shedding,
    goals: traits.goals,
    flags: traits.flags,
    purpose: defaults.purpose,
    source: `${AKC_PROFILE_BASE}/${row.sourceSlugs[0]}/`,
    sourceUrls: row.sourceSlugs.map((slug) => `${AKC_PROFILE_BASE}/${slug}/`),
    catalogVersion: CATALOG_VERSION,
    reviewedOn: CATALOG_VERSION,
    traitBasis: "editorial broad-fit review",
    registryEffectiveOn: REGISTRY_EFFECTIVE_ON
  };
  profile.caution = cautionFor(profile);
  profile.cautions = profile.flags.map((flag) => CAUTION_COPY[flag]).filter(Boolean);
  return Object.freeze({
    ...profile,
    secondaryGroups: Object.freeze(profile.secondaryGroups),
    sizes: Object.freeze(profile.sizes),
    goals: Object.freeze(profile.goals),
    flags: Object.freeze(profile.flags),
    cautions: Object.freeze(profile.cautions),
    sourceUrls: Object.freeze(profile.sourceUrls)
  });
}

const BREEDS = Object.freeze(
  Object.entries(GROUP_ROWS)
    .flatMap(([group, rows]) => parseRows(group, rows))
    .map(profileFromRow)
    .sort((left, right) => left.name.localeCompare(right.name))
);

if (BREEDS.length !== 205 || new Set(BREEDS.map(({ id }) => id)).size !== 205) {
  throw new Error(`Breed catalog integrity failure: expected 205 unique records, received ${BREEDS.length}.`);
}

const GROUP_COUNTS = Object.freeze(
  BREEDS.reduce((counts, breed) => ({ ...counts, [breed.group]: (counts[breed.group] || 0) + 1 }), {})
);

export {
  BREEDS,
  CATALOG_VERSION,
  GROUP_COUNTS,
  GROUP_SOURCE,
  REGISTRY_CHECKED_ON,
  REGISTRY_EFFECTIVE_ON,
  REGISTRY_SOURCE
};
