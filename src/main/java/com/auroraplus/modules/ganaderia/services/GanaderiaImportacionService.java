package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Carga inicial del hato de una finca que recién adquiere Aurora (migración desde
 * Excel/cuaderno). A diferencia de una compra, NO genera proveedor, gasto ni
 * movimiento de caja: son animales que la finca ya tenía.
 *
 * Todo o nada: primero se valida el archivo completo y, si una sola fila tiene
 * error, no se guarda ninguna — así el ganadero corrige su Excel y vuelve a
 * subirlo sin quedar con medio hato cargado y duplicados al reintentar.
 */
@Service
public class GanaderiaImportacionService {

    public static final int MAX_FILAS = 5000;

    private static final Set<String> TIPOS_HEMBRA = Set.of("BECERRA", "MAUTA", "NOVILLA", "VACA");
    private static final Set<String> TIPOS_MACHO = Set.of("TERNERO", "BECERRO", "MAUTE", "NOVILLO", "TORO");
    private static final Set<String> TIPOS_IDENTIFICADOR = Set.of("ARETE", "CHIP", "QR");
    private static final List<DateTimeFormatter> FORMATOS_FECHA = List.of(
        DateTimeFormatter.ISO_LOCAL_DATE,
        DateTimeFormatter.ofPattern("d/M/yyyy"),
        DateTimeFormatter.ofPattern("d-M-yyyy"),
        DateTimeFormatter.ofPattern("d.M.yyyy")
    );

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private EventoReproductivoRepository eventoReproductivoRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    /** Una fila del Excel tal como la escribió el ganadero: todo texto, se valida aquí. */
    public static class FilaImportacion {
        public String arete;
        public String tipoIdentificador;
        public String nombre;
        public String especie;
        public String raza;
        public String sexo;
        public String tipoAnimal;
        public String fechaNacimiento;
        public String pesoActual;
        public String valorEstimado;
        public String potrero;           // nombre del potrero ya creado en Aurora
        public String lote;
        public String areteMadre;        // arete de la madre (en el archivo o ya en el hato)
        public String aretePadre;        // arete del padre (en el archivo o ya en el hato)
        public String estadoReproductivo; // VACIA, PREÑADA, EN_ESPERA
        public String estadoProductivo;   // CRIANDO, ORDEÑO, SECA
        public String padrotePrenez;      // arete del toro que la preñó, o nombre/pajuela externa
        public String fechaProbableParto;
    }

    public static class ErrorFila {
        public int fila;
        public String campo;
        public String mensaje;

        ErrorFila(int fila, String campo, String mensaje) {
            this.fila = fila;
            this.campo = campo;
            this.mensaje = mensaje;
        }
    }

    public static class ResultadoImportacion {
        public boolean confirmado;
        public int totalFilas;
        public int animalesImportados;
        public int preneces;
        public List<ErrorFila> errores = new ArrayList<>();
        public Map<String, Integer> porTipo = new TreeMap<>();
        public Map<String, Integer> porRaza = new TreeMap<>();
    }

    /** Fila ya validada y normalizada, lista para persistir. */
    private static class FilaValida {
        int numero;
        String arete;
        String tipoIdentificador;
        String nombre;
        String especie;
        String raza;
        String sexo;
        String tipoAnimal;
        LocalDate fechaNacimiento;
        BigDecimal pesoActual;
        BigDecimal valorEstimado;
        Potrero potrero;
        String lote;
        String areteMadre;
        String aretePadre;
        String estadoReproductivo;
        String estadoProductivo;
        String padrotePrenez;
        LocalDate fechaProbableParto;
    }

    /**
     * @param confirmar false = solo vista previa (valida y resume, no guarda nada).
     */
    @Transactional
    public ResultadoImportacion importar(Long tenantId, List<FilaImportacion> filas, boolean confirmar) {
        ResultadoImportacion resultado = new ResultadoImportacion();
        if (filas == null || filas.isEmpty()) {
            resultado.errores.add(new ErrorFila(0, null, "El archivo no trae animales"));
            return resultado;
        }
        if (filas.size() > MAX_FILAS) {
            resultado.errores.add(new ErrorFila(0, null,
                "El archivo trae " + filas.size() + " filas; el máximo por importación es " + MAX_FILAS + ". Divídalo en varios archivos."));
            return resultado;
        }
        resultado.totalFilas = filas.size();

        Map<String, Potrero> potrerosPorNombre = new HashMap<>();
        for (Potrero p : potreroRepository.findByTenantId(tenantId)) {
            if (p.getNombre() != null) potrerosPorNombre.put(clave(p.getNombre()), p);
        }
        Map<String, Animal> hatoExistente = new HashMap<>();
        for (Animal a : animalRepository.findByTenantId(tenantId)) {
            hatoExistente.put(clave(a.getArete()), a);
        }

        // ── Pasada 1: validar y normalizar cada fila por sí sola ──
        List<FilaValida> validas = new ArrayList<>();
        Map<String, FilaValida> enArchivo = new HashMap<>();
        for (int i = 0; i < filas.size(); i++) {
            int numero = i + 2; // fila 1 del Excel son los encabezados
            FilaValida v = validarFila(numero, filas.get(i), potrerosPorNombre, resultado.errores);
            if (v == null) continue;
            String k = clave(v.arete);
            if (enArchivo.containsKey(k)) {
                resultado.errores.add(new ErrorFila(numero, "arete",
                    "El arete '" + v.arete + "' está repetido en el archivo (también en la fila " + enArchivo.get(k).numero + ")"));
                continue;
            }
            if (hatoExistente.containsKey(k)) {
                resultado.errores.add(new ErrorFila(numero, "arete",
                    "El arete '" + v.arete + "' ya está registrado en su hato"));
                continue;
            }
            enArchivo.put(k, v);
            validas.add(v);
        }

        // ── Pasada 2: relaciones (madre, padre, padrote) contra el archivo + hato ──
        for (FilaValida v : validas) {
            if (v.areteMadre != null) {
                String sexo = sexoDe(v.areteMadre, enArchivo, hatoExistente);
                if (sexo == null) {
                    resultado.errores.add(new ErrorFila(v.numero, "areteMadre",
                        "La madre '" + v.areteMadre + "' no está en el archivo ni en su hato"));
                } else if (!"HEMBRA".equals(sexo)) {
                    resultado.errores.add(new ErrorFila(v.numero, "areteMadre", "La madre '" + v.areteMadre + "' no es hembra"));
                } else if (clave(v.areteMadre).equals(clave(v.arete))) {
                    resultado.errores.add(new ErrorFila(v.numero, "areteMadre", "Un animal no puede ser su propia madre"));
                }
            }
            if (v.aretePadre != null) {
                String sexo = sexoDe(v.aretePadre, enArchivo, hatoExistente);
                if (sexo == null) {
                    resultado.errores.add(new ErrorFila(v.numero, "aretePadre",
                        "El padre '" + v.aretePadre + "' no está en el archivo ni en su hato"));
                } else if (!"MACHO".equals(sexo)) {
                    resultado.errores.add(new ErrorFila(v.numero, "aretePadre", "El padre '" + v.aretePadre + "' no es macho"));
                }
            }
            if (v.padrotePrenez != null) {
                // Si coincide con un arete conocido debe ser macho; si no, se toma como
                // referencia externa (toro prestado, pajuela de inseminación...).
                String sexo = sexoDe(v.padrotePrenez, enArchivo, hatoExistente);
                if (sexo != null && !"MACHO".equals(sexo)) {
                    resultado.errores.add(new ErrorFila(v.numero, "padrotePrenez",
                        "'" + v.padrotePrenez + "' está registrado como hembra, no puede ser el padrote"));
                }
            }
        }

        for (FilaValida v : validas) {
            resultado.porTipo.merge(v.tipoAnimal != null ? v.tipoAnimal : "SIN TIPO", 1, Integer::sum);
            resultado.porRaza.merge(v.raza != null ? v.raza : "Sin raza", 1, Integer::sum);
            if ("PREÑADA".equals(v.estadoReproductivo)) resultado.preneces++;
        }

        if (!resultado.errores.isEmpty() || !confirmar) {
            resultado.errores.sort(Comparator.comparingInt(e -> e.fila));
            return resultado;
        }

        // ── Persistir: primero todos los animales, luego las relaciones entre ellos ──
        Map<String, Animal> creados = new HashMap<>();
        for (FilaValida v : validas) {
            Animal a = new Animal();
            a.setTenantId(tenantId);
            a.setArete(v.arete);
            a.setTipoIdentificador(v.tipoIdentificador);
            a.setNombre(v.nombre);
            a.setEspecie(v.especie);
            a.setRaza(v.raza);
            a.setSexo(v.sexo);
            a.setTipoAnimal(v.tipoAnimal);
            a.setFechaNacimiento(v.fechaNacimiento);
            a.setPesoActual(v.pesoActual);
            a.setCostoAdquisicion(v.valorEstimado);
            a.setPotrero(v.potrero);
            a.setLote(v.lote);
            a.setEstado("ACTIVO");
            if (v.estadoReproductivo != null) a.setEstadoReproductivo(v.estadoReproductivo);
            if (v.estadoProductivo != null) a.setEstadoProductivo(v.estadoProductivo);
            creados.put(clave(v.arete), animalRepository.save(a));
        }

        LocalDate hoy = LocalDate.now();
        for (FilaValida v : validas) {
            Animal a = creados.get(clave(v.arete));
            boolean cambio = false;
            if (v.areteMadre != null) {
                a.setMadre(buscar(v.areteMadre, creados, hatoExistente));
                cambio = true;
            }
            if (v.aretePadre != null) {
                a.setPadre(buscar(v.aretePadre, creados, hatoExistente));
                cambio = true;
            }
            if (cambio) animalRepository.save(a);

            if ("PREÑADA".equals(v.estadoReproductivo)) {
                EventoReproductivo e = new EventoReproductivo();
                e.setTenantId(tenantId);
                e.setHembra(a);
                e.setTipo("DIAGNOSTICO_PRENEZ");
                e.setFecha(hoy);
                e.setResultado("POSITIVO (carga inicial del hato)");
                e.setFechaProbableParto(v.fechaProbableParto);
                if (v.padrotePrenez != null) {
                    Animal semental = buscar(v.padrotePrenez, creados, hatoExistente);
                    if (semental != null) e.setSemental(semental);
                    else e.setSementalReferenciaExterna(v.padrotePrenez);
                }
                eventoReproductivoRepository.save(e);
            }
        }

        resultado.confirmado = true;
        resultado.animalesImportados = creados.size();
        auditoriaService.registrar(tenantId, "GANADERIA", "IMPORTAR", "Animal", null,
            "Importó la carga inicial del hato: " + creados.size() + " animales"
                + (resultado.preneces > 0 ? " (" + resultado.preneces + " preñadas)" : ""));
        return resultado;
    }

    /** Una hembra preñada activa y de quién está preñada. */
    public static class PrenezActual {
        public Long hembraId;
        public Long sementalId;
        public String padrote;
        public LocalDate fechaProbableParto;
    }

    /**
     * Cada hembra activa marcada PREÑADA con el padrote de su último servicio o
     * diagnóstico que lo indique. Las que no tienen padrote registrado salen con
     * padrote null (la UI las agrupa como "Sin padrote registrado").
     */
    @Transactional(readOnly = true)
    public List<PrenezActual> prenezActual(Long tenantId) {
        Map<Long, PrenezActual> porHembra = new LinkedHashMap<>();
        for (Animal h : animalRepository.findByTenantIdAndEstado(tenantId, "ACTIVO")) {
            if (!"PREÑADA".equals(h.getEstadoReproductivo())) continue;
            PrenezActual p = new PrenezActual();
            p.hembraId = h.getId();
            porHembra.put(h.getId(), p);
        }
        // Eventos vienen del más reciente al más viejo: el primero con padrote gana.
        for (EventoReproductivo e : eventoReproductivoRepository.findEventosPrenezActual(tenantId)) {
            PrenezActual p = porHembra.get(e.getHembra().getId());
            if (p == null) continue;
            if (p.fechaProbableParto == null) p.fechaProbableParto = e.getFechaProbableParto();
            if (p.padrote != null) continue;
            if (e.getSemental() != null) {
                Animal s = e.getSemental();
                p.sementalId = s.getId();
                p.padrote = s.getNombre() != null && !s.getNombre().isBlank()
                    ? s.getNombre() + " (" + s.getArete() + ")" : s.getArete();
            } else if (texto(e.getSementalReferenciaExterna()) != null) {
                p.padrote = e.getSementalReferenciaExterna().trim();
            }
        }
        return new ArrayList<>(porHembra.values());
    }

    private FilaValida validarFila(int numero, FilaImportacion f, Map<String, Potrero> potreros, List<ErrorFila> errores) {
        int erroresAntes = errores.size();
        FilaValida v = new FilaValida();
        v.numero = numero;

        v.arete = texto(f.arete);
        if (v.arete == null) {
            errores.add(new ErrorFila(numero, "arete", "Falta el arete (identificador del animal)"));
        } else if (v.arete.length() > 30) {
            errores.add(new ErrorFila(numero, "arete", "El arete no puede tener más de 30 caracteres"));
        }

        String tipoId = mayus(f.tipoIdentificador);
        v.tipoIdentificador = tipoId != null ? tipoId : "ARETE";
        if (!TIPOS_IDENTIFICADOR.contains(v.tipoIdentificador)) {
            errores.add(new ErrorFila(numero, "tipoIdentificador", "Tipo de identificador no válido: use ARETE, CHIP o QR"));
        }

        v.nombre = texto(f.nombre);
        String especie = mayus(f.especie);
        v.especie = especie != null ? especie : "BOVINO";
        v.raza = texto(f.raza);
        v.lote = texto(f.lote);

        v.sexo = normalizarSexo(f.sexo);
        if (v.sexo == null) {
            errores.add(new ErrorFila(numero, "sexo", texto(f.sexo) == null
                ? "Falta el sexo (MACHO o HEMBRA)" : "Sexo no reconocido: '" + f.sexo.trim() + "'. Use MACHO o HEMBRA"));
        }

        v.fechaNacimiento = fecha(f.fechaNacimiento, numero, "fechaNacimiento", errores);
        if (v.fechaNacimiento != null && v.fechaNacimiento.isAfter(LocalDate.now())) {
            errores.add(new ErrorFila(numero, "fechaNacimiento", "La fecha de nacimiento está en el futuro"));
        }
        v.pesoActual = numeroPositivo(f.pesoActual, numero, "pesoActual", errores);
        v.valorEstimado = numeroPositivo(f.valorEstimado, numero, "valorEstimado", errores);

        String tipo = sinAcentos(mayus(f.tipoAnimal));
        if (tipo != null && v.sexo != null) {
            Set<String> permitidos = "HEMBRA".equals(v.sexo) ? TIPOS_HEMBRA : TIPOS_MACHO;
            Set<String> contrarios = "HEMBRA".equals(v.sexo) ? TIPOS_MACHO : TIPOS_HEMBRA;
            if (contrarios.contains(tipo) && !permitidos.contains(tipo)) {
                errores.add(new ErrorFila(numero, "tipoAnimal",
                    "El tipo '" + tipo + "' no corresponde a un animal " + v.sexo.toLowerCase()));
            }
        }
        v.tipoAnimal = tipo != null ? tipo : sugerirTipo(v.sexo, v.fechaNacimiento);

        String potrero = texto(f.potrero);
        if (potrero != null) {
            v.potrero = potreros.get(clave(potrero));
            if (v.potrero == null) {
                errores.add(new ErrorFila(numero, "potrero",
                    "El potrero '" + potrero + "' no existe. Créelo primero en Mapa & Potreros o deje la celda vacía"));
            }
        }

        v.areteMadre = texto(f.areteMadre);
        v.aretePadre = texto(f.aretePadre);

        v.estadoReproductivo = normalizarEstadoReproductivo(f.estadoReproductivo);
        if (texto(f.estadoReproductivo) != null && v.estadoReproductivo == null) {
            errores.add(new ErrorFila(numero, "estadoReproductivo", "Estado reproductivo no reconocido: use VACIA, PREÑADA o EN_ESPERA"));
        }
        v.estadoProductivo = normalizarEstadoProductivo(f.estadoProductivo);
        if (texto(f.estadoProductivo) != null && v.estadoProductivo == null) {
            errores.add(new ErrorFila(numero, "estadoProductivo", "Estado productivo no reconocido: use CRIANDO, ORDEÑO o SECA"));
        }
        if ("MACHO".equals(v.sexo) && v.estadoReproductivo != null && !"VACIA".equals(v.estadoReproductivo)) {
            errores.add(new ErrorFila(numero, "estadoReproductivo", "Un macho no puede estar " + v.estadoReproductivo.toLowerCase()));
        }

        v.padrotePrenez = texto(f.padrotePrenez);
        v.fechaProbableParto = fecha(f.fechaProbableParto, numero, "fechaProbableParto", errores);
        if ((v.padrotePrenez != null || v.fechaProbableParto != null) && !"PREÑADA".equals(v.estadoReproductivo)) {
            errores.add(new ErrorFila(numero, "estadoReproductivo",
                "Indicó padrote o fecha de parto pero el estado reproductivo no es PREÑADA"));
        }

        return errores.size() == erroresAntes ? v : null;
    }

    /** Misma regla que el alta manual: por sexo y edad; sin fecha no se adivina. */
    static String sugerirTipo(String sexo, LocalDate nacimiento) {
        if (sexo == null || nacimiento == null) return null;
        long meses = java.time.temporal.ChronoUnit.MONTHS.between(nacimiento, LocalDate.now());
        boolean hembra = "HEMBRA".equals(sexo);
        if (meses < 12) return hembra ? "BECERRA" : "TERNERO";
        if (meses < 24) return hembra ? "MAUTA" : "MAUTE";
        if (meses < 36) return hembra ? "NOVILLA" : "NOVILLO";
        return hembra ? "VACA" : "TORO";
    }

    private static String sexoDe(String arete, Map<String, FilaValida> enArchivo, Map<String, Animal> hato) {
        FilaValida f = enArchivo.get(clave(arete));
        if (f != null) return f.sexo;
        Animal a = hato.get(clave(arete));
        return a != null ? mayus(a.getSexo()) : null;
    }

    private static Animal buscar(String arete, Map<String, Animal> creados, Map<String, Animal> hato) {
        Animal a = creados.get(clave(arete));
        return a != null ? a : hato.get(clave(arete));
    }

    private static String normalizarSexo(String s) {
        String v = sinAcentos(mayus(s));
        if (v == null) return null;
        return switch (v) {
            case "M", "MACHO" -> "MACHO";
            case "H", "F", "HEMBRA" -> "HEMBRA";
            default -> null;
        };
    }

    private static String normalizarEstadoReproductivo(String s) {
        String v = sinAcentos(mayus(s));
        if (v == null) return null;
        v = v.replace(' ', '_');
        return switch (v) {
            case "VACIA", "NO", "NEGATIVO" -> "VACIA";
            case "PRENADA", "PRENADO", "SI", "POSITIVO" -> "PREÑADA";
            case "EN_ESPERA", "SERVIDA", "INSEMINADA" -> "EN_ESPERA";
            default -> null;
        };
    }

    private static String normalizarEstadoProductivo(String s) {
        String v = sinAcentos(mayus(s));
        if (v == null) return null;
        return switch (v) {
            case "CRIANDO", "CRIA" -> "CRIANDO";
            case "ORDENO", "ORDENANDO", "EN_ORDENO", "EN ORDENO" -> "ORDEÑO";
            case "SECA", "SECO" -> "SECA";
            default -> null;
        };
    }

    private static LocalDate fecha(String s, int fila, String campo, List<ErrorFila> errores) {
        String v = texto(s);
        if (v == null) return null;
        for (DateTimeFormatter f : FORMATOS_FECHA) {
            try {
                return LocalDate.parse(v, f);
            } catch (DateTimeParseException ignored) {
                // se prueba el siguiente formato
            }
        }
        errores.add(new ErrorFila(fila, campo, "Fecha no reconocida: '" + v + "'. Use día/mes/año, p. ej. 15/03/2021"));
        return null;
    }

    private static BigDecimal numeroPositivo(String s, int fila, String campo, List<ErrorFila> errores) {
        String v = texto(s);
        if (v == null) return null;
        String limpio = v.replace(" ", "");
        // "1.250,50" (formato venezolano/colombiano) o "1250.50" o "1250,5"
        if (limpio.contains(",") && limpio.contains(".")) {
            limpio = limpio.lastIndexOf(',') > limpio.lastIndexOf('.')
                ? limpio.replace(".", "").replace(',', '.')
                : limpio.replace(",", "");
        } else {
            limpio = limpio.replace(',', '.');
        }
        try {
            BigDecimal n = new BigDecimal(limpio);
            if (n.signum() < 0) {
                errores.add(new ErrorFila(fila, campo, "El valor no puede ser negativo"));
                return null;
            }
            return n;
        } catch (NumberFormatException e) {
            errores.add(new ErrorFila(fila, campo, "Número no reconocido: '" + v + "'"));
            return null;
        }
    }

    private static String texto(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String mayus(String s) {
        String t = texto(s);
        return t == null ? null : t.toUpperCase(Locale.ROOT);
    }

    private static String sinAcentos(String s) {
        if (s == null) return null;
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    private static String clave(String arete) {
        return arete == null ? "" : arete.trim().toUpperCase(Locale.ROOT);
    }
}
