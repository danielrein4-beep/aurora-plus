export interface MedicamentoVademecum {
  id: string;
  nombreGenerico: string;
  nombresComerciales: string;
  categoria: string;
  presentacion: string;
  via: "Oral" | "Intramuscular" | "Intravenosa" | "Sublingual" | "Topica" | "Inhalatoria" | "Oftalmica";
  posologiaSugerida: string;
  indicaciones: string;
  contraindicaciones: string;
  advertencias: string;
}

export const VADEMECUM_CLINICO: MedicamentoVademecum[] = [
  // 1. ANTIBIOTICOS Y ANTIMICROBIANOS
  {
    id: "amox-500",
    nombreGenerico: "Amoxicilina",
    nombresComerciales: "Amoxil, Trimox, Clavumox",
    categoria: "Antibiotico (Aminopenicilina)",
    presentacion: "Capsulas 500 mg / Suspension 250mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 capsula (500mg) cada 8 horas por 7 a 10 dias.",
    indicaciones: "Infecciones respiratorias superiores, otitis, sinusitis, infecciones dentales y urinarias.",
    contraindicaciones: "Hipersensibilidad a betalactamicos o penicilinas.",
    advertencias: "Ajustar dosis en insuficiencia renal. Completar el esquema prescrito."
  },
  {
    id: "amox-clav-875",
    nombreGenerico: "Amoxicilina + Acido Clavulanico",
    nombresComerciales: "Augmentin, Curam, Fulgram, Clavumox",
    categoria: "Antibiotico (Betalactamico + Inhibidor)",
    presentacion: "Comprimidos 875/125 mg / Suspension 400/57mg",
    via: "Oral",
    posologiaSugerida: "1 comprimido cada 12 horas con las comidas por 7 a 10 dias.",
    indicaciones: "Infecciones respiratorias refractarias, celulitis, sinusitis aguda y profilaxis odontologica.",
    contraindicaciones: "Alergia a penicilinas, antecedentes de ictericia colestasica asociada.",
    advertencias: "Tomar al inicio de una comida para reducir molestias gastrointestinales."
  },
  {
    id: "azitro-500",
    nombreGenerico: "Azitromicina",
    nombresComerciales: "Zithromax, Azitrom, Trex",
    categoria: "Antibiotico (Macrolido)",
    presentacion: "Comprimidos 500 mg / Suspension 200mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 comprimido (500mg) una vez al dia por 3 a 5 dias (lejos de las comidas).",
    indicaciones: "Faringoamigdalitis en alergicos a penicilina, neumonia comunitaria, uretritis.",
    contraindicaciones: "Hipersensibilidad a macrolidos, disfuncion hepatica severa.",
    advertencias: "Monitorear intervalo QT en pacientes con arritmias o cardiopatia previa."
  },
  {
    id: "cipro-500",
    nombreGenerico: "Ciprofloxacina",
    nombresComerciales: "Ciprolet, Ciproxina, Serviflox",
    categoria: "Antibiotico (Fluoroquinolona)",
    presentacion: "Comprimidos 500 mg / Ampollas 200mg/100ml",
    via: "Oral",
    posologiaSugerida: "1 comprimido (500mg) cada 12 horas por 5 a 7 dias.",
    indicaciones: "Infecciones de vias urinarias complicadas, prostatitis, gastroenteritis bacteriana.",
    contraindicaciones: "Hipersensibilidad a quinolonas, menores de 18 anos, embarazo.",
    advertencias: "Riesgo de tendinitis. Evitar antiacidos 2h antes/despues."
  },
  {
    id: "cefalex-500",
    nombreGenerico: "Cefalexina",
    nombresComerciales: "Keflex, Cefalex, Betacef",
    categoria: "Antibiotico (Cefalosporina 1ra Gen)",
    presentacion: "Capsulas 500 mg / Suspension 250mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 capsula cada 6 u 8 horas por 7 a 10 dias.",
    indicaciones: "Infecciones de piel y partes blandas, faringitis estreptococica, ITU.",
    contraindicaciones: "Alergia a cefalosporinas o anafilaxia previa a penicilinas.",
    advertencias: "Precaucion en pacientes con antecedentes de colitis."
  },
  {
    id: "ceftriax-1g",
    nombreGenerico: "Ceftriaxona",
    nombresComerciales: "Rocephin, Cefaxona, Triaxone",
    categoria: "Antibiotico (Cefalosporina 3ra Gen)",
    presentacion: "Frasco ampolla 1 g IM/IV",
    via: "Intramuscular",
    posologiaSugerida: "1 g IM cada 24 horas por 3 a 5 dias (reconstituir con lidocaina al 1% para IM).",
    indicaciones: "Infecciones respiratorias bajas severas, pielonefritis aguda, gonorrea (500mg dosis unica).",
    contraindicaciones: "Alergia a cefalosporinas, neonatos con hiperbilirrubinemia.",
    advertencias: "Nunca mezclar con soluciones con calcio."
  },
  {
    id: "metronid-500",
    nombreGenerico: "Metronidazol",
    nombresComerciales: "Flagyl, Metren, Flegyl",
    categoria: "Antiprotozoario y Antibacteriano Anaerobio",
    presentacion: "Comprimidos 500 mg / Suspension 250mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 comprimido (500mg) cada 8 horas por 7 dias.",
    indicaciones: "Amebiasis, giardiasis, tricomoniasis, vaginosis bacteriana, abscesos dentales.",
    contraindicaciones: "Primer trimestre del embarazo, hipersensibilidad.",
    advertencias: "Efecto disulfiram: terminantemente prohibido ingerir alcohol."
  },
  {
    id: "claritro-500",
    nombreGenerico: "Claritromicina",
    nombresComerciales: "Klaricid, Claxid, Adel",
    categoria: "Antibiotico (Macrolido)",
    presentacion: "Comprimidos 500 mg / Suspension 250mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 comprimido cada 12 horas por 7 a 14 dias.",
    indicaciones: "Erradicacion de H. pylori (terapia triple), sinusitis bacteriana, bronquitis aguda.",
    contraindicaciones: "Uso concomitante con estatinas o prolongacion de QT.",
    advertencias: "Sabor metalico residual frecuente."
  },

  // 2. ANALGESICOS Y ANTIINFLAMATORIOS (AINEs)
  {
    id: "aceta-500",
    nombreGenerico: "Acetaminofen (Paracetamol)",
    nombresComerciales: "Atamel, Tachipirin, Tempra, Panadol",
    categoria: "Analgesico y Antipiretico",
    presentacion: "Tabletas 500 mg y 650 mg / Jarabe 120mg/5ml",
    via: "Oral",
    posologiaSugerida: "500 mg a 1000 mg cada 6 u 8 horas (maximo 4000 mg/dia).",
    indicaciones: "Cefalea, mialgias, fiebre, dolor leve a moderado. Primera eleccion en sospecha de dengue.",
    contraindicaciones: "Insuficiencia hepatica severa, hipersensibilidad.",
    advertencias: "Hepatotoxicidad por sobredosis. No duplicar con antigripales combinados."
  },
  {
    id: "ibu-400",
    nombreGenerico: "Ibuprofeno",
    nombresComerciales: "Motrin, Advil, Ibufen, Alivium",
    categoria: "Analgesico / AINE",
    presentacion: "Tabletas 400 mg y 600 mg / Suspension 100mg/5ml",
    via: "Oral",
    posologiaSugerida: "400 mg a 600 mg cada 8 horas despues de comidas (maximo 2400 mg/dia).",
    indicaciones: "Dolor inflamatorio osteoarticular, dismenorrea, odontalgia, traumatismos leves.",
    contraindicaciones: "Ulcera peptica activa, hemorragia digestiva, sospecha de dengue.",
    advertencias: "Tomar con alimentos. Precaucion en hipertensos o dano renal."
  },
  {
    id: "diclo-pot-50",
    nombreGenerico: "Diclofenac Potasico",
    nombresComerciales: "Cataflam, Dicloran, Voltaren Rapid",
    categoria: "Analgesico / AINE de Accion Rapida",
    presentacion: "Grageas 50 mg / Suspension / Gotas",
    via: "Oral",
    posologiaSugerida: "50 mg cada 8 horas despues de comidas por 3 a 5 dias.",
    indicaciones: "Dolor agudo postraumatico, colico renal, crisis migranosa.",
    contraindicaciones: "Ulcera gastroduodenal activa, cardiopatia isquemica establecida.",
    advertencias: "Usar la dosis minima eficaz durante el menor tiempo posible."
  },
  {
    id: "diclo-sod-75",
    nombreGenerico: "Diclofenac Sodico",
    nombresComerciales: "Voltaren, Diclocil",
    categoria: "Analgesico / AINE Parenteral",
    presentacion: "Ampolla 75 mg/3ml / Tabletas LP 100 mg",
    via: "Intramuscular",
    posologiaSugerida: "1 ampolla (75mg) IM profunda en gluteo cada 12 o 24 horas (maximo 2 dias).",
    indicaciones: "Colico nefritico agudo, lumbalgia severa invalidante, dolor postquirurgico.",
    contraindicaciones: "Alergia a AINEs, asma por aspirina, ulcera activa.",
    advertencias: "Inyeccion intraglutea profunda lenta para evitar necrosis tisular."
  },
  {
    id: "keto-100",
    nombreGenerico: "Ketoprofeno",
    nombresComerciales: "Profenid, Ketoflex, Bi-Profenid",
    categoria: "Analgesico / AINE Potente",
    presentacion: "Capsulas 100 mg / Tabletas LP 150mg / Ampollas 100mg",
    via: "Oral",
    posologiaSugerida: "100 mg cada 12 horas o 1 comprimido LP de 150 mg diario con comida.",
    indicaciones: "Artritis reumatoide, gota aguda, osteoartritis dolorosa, traumatismos.",
    contraindicaciones: "Hemorragia digestiva, insuficiencia renal severa.",
    advertencias: "Gastrolesivo: considerar coadministracion con protector gastrico en ancianos."
  },
  {
    id: "dexketo-25",
    nombreGenerico: "Dexketoprofeno Trometamol",
    nombresComerciales: "Enantyum, Ketesse",
    categoria: "Analgesico / AINE Enantiomero Puro",
    presentacion: "Comprimidos 25 mg / Ampollas 50mg/2ml",
    via: "Oral",
    posologiaSugerida: "1 comprimido (25mg) cada 8 horas (maximo 75 mg al dia).",
    indicaciones: "Dolor odontologico agudo, dismenorrea severa, dolor musculoesqueletico agudo.",
    contraindicaciones: "Hipersensibilidad, ulcera peptica, enfermedad inflamatoria intestinal.",
    advertencias: "Maximo 4 a 5 dias continuos."
  },
  {
    id: "melo-15",
    nombreGenerico: "Meloxicam",
    nombresComerciales: "Mobic, Melox, Vivanza",
    categoria: "AINE con Selectividad COX-2 Relativa",
    presentacion: "Tabletas 7.5 mg y 15 mg",
    via: "Oral",
    posologiaSugerida: "15 mg una vez al dia con la comida principal.",
    indicaciones: "Osteoartrosis cronica, espondilitis anquilosante, dolor articular.",
    contraindicaciones: "Insuficiencia renal en dialisis sin ajuste, hemorragia activa.",
    advertencias: "Menor toxicidad gastrica que piroxicam."
  },
  {
    id: "tramadol-50",
    nombreGenerico: "Tramadol Clorhidrato",
    nombresComerciales: "Tramal, Tradol, Zaldiar (+Paracetamol)",
    categoria: "Analgesico Opioide Menor Central",
    presentacion: "Capsulas 50 mg / Gotas 100mg/ml / Ampollas 100mg",
    via: "Oral",
    posologiaSugerida: "50 mg cada 8 horas (o 20 a 30 gotas cada 8h en medio vaso de agua).",
    indicaciones: "Dolor moderado a severo oncologico, neuropatico o postraumatico.",
    contraindicaciones: "Intoxicacion por sedantes o alcohol, uso de IMAO, epilepsia no controlada.",
    advertencias: "Puede producir mareo, nauseas y somnolencia."
  },

  // 3. CARDIOVASCULAR Y ANTIHIPERTENSIVOS
  {
    id: "losar-50",
    nombreGenerico: "Losartan Potasico",
    nombresComerciales: "Cozaar, Simperten, Losapres, Converten",
    categoria: "Antihipertensivo (ARA-II)",
    presentacion: "Tabletas 50 mg y 100 mg",
    via: "Oral",
    posologiaSugerida: "50 mg a 100 mg una vez al dia por la manana.",
    indicaciones: "Hipertension arterial esencial, nefropatia diabetica, falla cardiaca.",
    contraindicaciones: "Embarazo (teratogenico), estenosis bilateral de arteria renal.",
    advertencias: "Monitorear potasio serico y funcion renal periodica."
  },
  {
    id: "enala-10",
    nombreGenerico: "Enalapril Maleato",
    nombresComerciales: "Renitec, Glioten, Enaladil",
    categoria: "Antihipertensivo (IECA)",
    presentacion: "Tabletas 10 mg y 20 mg",
    via: "Oral",
    posologiaSugerida: "10 mg a 20 mg una o dos veces al dia.",
    indicaciones: "Hipertension arterial, insuficiencia cardiaca congestiva, post-infarto.",
    contraindicaciones: "Antecedente de angioedema por IECAs, embarazo, hiperkalemia.",
    advertencias: "Puede provocar tos seca persistente (cambiar a ARA-II si ocurre)."
  },
  {
    id: "amlo-5",
    nombreGenerico: "Amlodipina",
    nombresComerciales: "Norvasc, Amlor, Astudal",
    categoria: "Antihipertensivo (Calcioantagonista)",
    presentacion: "Tabletas 5 mg y 10 mg",
    via: "Oral",
    posologiaSugerida: "5 mg a 10 mg una vez al dia.",
    indicaciones: "Hipertension arterial (excelente en ancianos), angina de pecho estable.",
    contraindicaciones: "Hipotension severa, shock cardiogenico.",
    advertencias: "Efecto adverso frecuente: edema o hinchazon en tobillos."
  },
  {
    id: "atorva-20",
    nombreGenerico: "Atorvastatina",
    nombresComerciales: "Lipitor, Atorlip, Zarator, Lipidan",
    categoria: "Hipolipemiante (Estatina)",
    presentacion: "Tabletas 10, 20 y 40 mg",
    via: "Oral",
    posologiaSugerida: "20 mg a 40 mg una vez al dia por la noche.",
    indicaciones: "Hipercolesterolemia, prevencion primaria y secundaria cardiovascular (ACV, IAM).",
    contraindicaciones: "Enfermedad hepatica activa, embarazo y lactancia.",
    advertencias: "Monitorear enzimas hepaticas y CPK si refiere mialgias."
  },
  {
    id: "carvedilol-12",
    nombreGenerico: "Carvedilol",
    nombresComerciales: "Coreg, Dilatrend, Carvas",
    categoria: "Betabloqueante Alfa y Beta Adrenergico",
    presentacion: "Tabletas 6.25 mg, 12.5 mg y 25 mg",
    via: "Oral",
    posologiaSugerida: "6.25 mg a 12.5 mg dos veces al dia con alimentos (titular progresivamente).",
    indicaciones: "Insuficiencia cardiaca con fraccion reducida, hipertension, cardiopatia isquemica.",
    contraindicaciones: "Asma bronquial, EPOC severo, bloqueo AV grado II o III, bradicardia < 50 lpm.",
    advertencias: "No suspender de forma brusca por riesgo de rebote."
  },

  // 4. GASTROENTEROLOGIA Y PROTECTORES
  {
    id: "omep-20",
    nombreGenerico: "Omeprazol",
    nombresComerciales: "Prilosec, Losec, Gasec, Pepticum",
    categoria: "Inhibidor de Bomba de Protones (IBP)",
    presentacion: "Capsulas 20 mg y 40 mg / Ampolla IV 40mg",
    via: "Oral",
    posologiaSugerida: "20 mg a 40 mg una vez al dia en ayunas (30 min antes del desayuno).",
    indicaciones: "Reflujo gastroesofagico (ERGE), ulcera gastroduodenal, gastroproteccion en AINEs.",
    contraindicaciones: "Hipersensibilidad a benzimidazoles.",
    advertencias: "Tomar entero sin masticar con agua."
  },
  {
    id: "esomep-40",
    nombreGenerico: "Esomeprazol",
    nombresComerciales: "Nexium, Esopraz, Cronopep",
    categoria: "Inhibidor de Bomba de Protones (Isomero S)",
    presentacion: "Comprimidos 20 mg y 40 mg",
    via: "Oral",
    posologiaSugerida: "40 mg una vez al dia 30 minutos antes del desayuno por 4 a 8 semanas.",
    indicaciones: "Esofagitis erosiva, reflujo severo, erradicacion de H. pylori.",
    contraindicaciones: "Coadministracion con nelfinavir o atazanavir.",
    advertencias: "No triturar los comprimidos gastrorresistentes."
  },
  {
    id: "domper-10",
    nombreGenerico: "Domperidona",
    nombresComerciales: "Motilium, Tilium, Moperid",
    categoria: "Procinetico y Antiemetico",
    presentacion: "Comprimidos 10 mg / Gotas y Suspension",
    via: "Oral",
    posologiaSugerida: "10 mg 15 a 30 minutos antes de las comidas principales (maximo 30 mg/dia).",
    indicaciones: "Gastroparesia, plenitud posprandial, reflujo gastroesofagico, nauseas.",
    contraindicaciones: "Prolongacion conocida del intervalo QTc, hemorragia digestiva.",
    advertencias: "Maximo 7 dias consecutivos sin reevaluacion medica."
  },
  {
    id: "ondansetron-8",
    nombreGenerico: "Ondansetron",
    nombresComerciales: "Zofran, Modifical, Danitron",
    categoria: "Antiemetico Antagonista 5-HT3",
    presentacion: "Comprimidos 8 mg / Ampollas 8mg/4ml",
    via: "Oral",
    posologiaSugerida: "8 mg cada 8 o 12 horas segun necesidad o tolerancia.",
    indicaciones: "Nauseas y vomitos en gastroenteritis aguda, quimioterapia o postoperatorio.",
    contraindicaciones: "Uso con apomorfina, hipersensibilidad.",
    advertencias: "Puede causar estrenimiento transitorio y cefalea leve."
  },
  {
    id: "trimebutina-200",
    nombreGenerico: "Trimebutina Maleato",
    nombresComerciales: "Debridat, Polibutin, Colitrans",
    categoria: "Antiespasmodico y Modulador del Transito",
    presentacion: "Comprimidos 200 mg",
    via: "Oral",
    posologiaSugerida: "1 comprimido (200mg) cada 8 horas antes de las comidas.",
    indicaciones: "Sindrome de intestino irritable (colon irritable), colico abdominal, dispepsia.",
    contraindicaciones: "Primer trimestre del embarazo, miastenia gravis.",
    advertencias: "Excelente perfil de seguridad, no causa boca seca ni vision borrosa."
  },

  // 5. METABOLISMO Y ENDOCRINOLOGIA
  {
    id: "metfor-850",
    nombreGenerico: "Metformina Clorhidrato",
    nombresComerciales: "Glucophage, Diaformin, Predial",
    categoria: "Antidiabetico Oral (Biguanida)",
    presentacion: "Tabletas 500 mg, 850 mg y 1000 mg (simple y XR)",
    via: "Oral",
    posologiaSugerida: "850 mg una o dos veces al dia con o despues de las comidas.",
    indicaciones: "Diabetes mellitus tipo 2 (farmaco de primera linea), sindrome de ovario poliquistico.",
    contraindicaciones: "Insuficiencia renal moderada o severa (FG < 30 ml/min), alcoholismo, acidosis lactica.",
    advertencias: "Suspender 48 horas antes de estudios con contraste yodado."
  },
  {
    id: "levotirox-100",
    nombreGenerico: "Levotiroxina Sodica",
    nombresComerciales: "Euthyrox, Synthroid, Levoxyl",
    categoria: "Hormona Tiroidea T4 Sintetica",
    presentacion: "Comprimidos 25, 50, 75, 100 y 125 mcg",
    via: "Oral",
    posologiaSugerida: "Dosis segun TSH en ayuno estricto con agua (30 a 60 min antes del desayuno).",
    indicaciones: "Hipotiroidismo primario y secundario, bocio eutiroideo, tiroiditis de Hashimoto.",
    contraindicaciones: "Tirotoxicosis no tratada, infarto agudo de miocardio reciente.",
    advertencias: "No tomar simultaneamente con hierro, calcio ni antiacidos."
  },

  // 6. RESPIRATORIO Y ANTIALERGICOS
  {
    id: "lorata-10",
    nombreGenerico: "Loratadina",
    nombresComerciales: "Claritin, Loratad, Alergal",
    categoria: "Antihistaminico H1 No Sedante",
    presentacion: "Tabletas 10 mg / Jarabe 5mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 tableta (10mg) una vez al dia.",
    indicaciones: "Rinitis alergica estacional y perenne, urticaria cronica, prurito alergico.",
    contraindicaciones: "Hipersensibilidad, menores de 2 anos (jarabe).",
    advertencias: "Baja tasa de somnolencia."
  },
  {
    id: "deslorata-5",
    nombreGenerico: "Desloratadina",
    nombresComerciales: "Aerius, Desalex, Mailen",
    categoria: "Antihistaminico H1 de 3ra Generacion",
    presentacion: "Tabletas 5 mg / Jarabe 2.5mg/5ml",
    via: "Oral",
    posologiaSugerida: "1 tableta (5mg) una vez al dia por la noche.",
    indicaciones: "Rinitis alergica con congestion nasal, dermatitis alergica, conjuntivitis.",
    contraindicaciones: "Hipersensibilidad a desloratadina o loratadina.",
    advertencias: "Efecto sostenido 24 horas sin interferir en la conduccion de vehiculos."
  },
  {
    id: "salbutamol-inh",
    nombreGenerico: "Salbutamol (Albuterol)",
    nombresComerciales: "Ventolin, Salbutol, Buto-Asma",
    categoria: "Broncodilatador Beta-2 Agonista (SABA)",
    presentacion: "Inhalador presurizado 100 mcg/dosis (200 dosis)",
    via: "Inhalatoria",
    posologiaSugerida: "1 a 2 inhalaciones cada 4 a 6 horas segun crisis de disnea o broncoespasmo.",
    indicaciones: "Crisis aguda de asma bronquial, broncoespasmo en EPOC, asma por esfuerzo.",
    contraindicaciones: "Hipersensibilidad, amenaza de aborto primer trimestre.",
    advertencias: "Usar aerocamara / espaciador para garantizar deposito pulmonar optimo."
  },
  {
    id: "budesonida-inh",
    nombreGenerico: "Budesonida Inhalada",
    nombresComerciales: "Pulmicort, Budeson, Miflonide",
    categoria: "Corticoide Inhalado de Mantenimiento",
    presentacion: "Aerosol 200 mcg/dosis / Suspension nebulizar 0.5mg/2ml",
    via: "Inhalatoria",
    posologiaSugerida: "1 a 2 inhalaciones cada 12 horas de forma reglada diaria.",
    indicaciones: "Control y desinflamacion bronquial en asma persistente y EPOC.",
    contraindicaciones: "Estatus asmatico agudo de rescate inmediato.",
    advertencias: "Enjuagarse la boca con agua tras cada inhalacion para prevenir candidiasis."
  },
  {
    id: "prednisona-50",
    nombreGenerico: "Prednisona",
    nombresComerciales: "Meticorten, Cortic, Prednison",
    categoria: "Corticosteroide Sistemico",
    presentacion: "Tabletas 5, 20 y 50 mg",
    via: "Oral",
    posologiaSugerida: "20 mg a 50 mg diarios por la manana con desayuno por 5 a 7 dias.",
    indicaciones: "Crisis asmatica moderada-grave, laringotraqueitis, reacciones alergicas severas.",
    contraindicaciones: "Infecciones fungicas sistemicas, herpes ocular activo.",
    advertencias: "Desescalar gradualmente si el tratamiento supera los 10 dias."
  },

  // 7. CORTICOIDES PARENTERALES Y URGENCIAS
  {
    id: "dexa-amp-8",
    nombreGenerico: "Dexametasona Fosfato Sodico",
    nombresComerciales: "Decadron, Dexacort, Alin",
    categoria: "Corticoide de Alta Potencia y Larga Accion",
    presentacion: "Ampolla 8 mg/2ml / Tabletas 4mg",
    via: "Intramuscular",
    posologiaSugerida: "1 ampolla (8mg) IM o IV lenta dosis unica o cada 24 horas por maximo 2 a 3 dias.",
    indicaciones: "Edema cerebral, choque anafilactico (coadyuvante), laringitis estridulosa, crisis alergica aguda.",
    contraindicaciones: "Procesos infecciosos bacterianos o virales sin cobertura antimicrobiana adecuada.",
    advertencias: "Eleva transitoriamente la glicemia y presion arterial."
  },
  {
    id: "hidrocor-100",
    nombreGenerico: "Hidrocortisona Succinato Sodico",
    nombresComerciales: "Solu-Cortef, Hidrocort",
    categoria: "Corticoide de Accion Rapida para Urgencias",
    presentacion: "Frasco ampolla 100 mg y 500 mg liofilizado",
    via: "Intravenosa",
    posologiaSugerida: "100 mg a 200 mg IV directa lenta en bolo o infusion en emergencias.",
    indicaciones: "Crisis adrenal aguda, choque anafilactico, broncoespasmo severo refractario.",
    contraindicaciones: "Meningitis tuberculosa sin tratamiento simultaneo.",
    advertencias: "Uso exclusivamente parenteral en situaciones hospitalarias o ambulatorias urgentes."
  }
];
