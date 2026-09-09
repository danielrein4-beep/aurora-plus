package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.CasoHistoricoImportado;
import com.auroraplus.modules.salud.repositories.CasoHistoricoImportadoRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.usermodel.DateUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;

/**
 * Importador de historiales epidemiológicos desde Excel — para que un
 * hospital/clínica NUEVO no tenga que esperar 5-7 años acumulando datos
 * propios antes de que el Canal Endémico sirva de algo. Si ya tienen los
 * boletines del Ministerio (o su propio historial en papel/Excel), los
 * cargan una vez y el corredor histórico funciona desde el día 1.
 *
 * Formato esperado (primera fila = encabezados, se ignora): columnas
 * Año | CIE10 | Semana | Mes | Casos | Fecha (F, opcional).
 *
 * Dos modos, según lo que se tenga a mano:
 * 1) Boletín ya agregado (típico de un ministerio): sin fecha real, solo un
 *    total de casos por semana O por mes — "Semana" y "Mes" son mutuamente
 *    excluyentes en este modo (una fila no puede traer ambas), porque sin una
 *    fecha real no hay forma de saber a qué mes calendario pertenece una
 *    semana epidemiológica (puede caer a caballo entre dos meses).
 * 2) Historial propio con fecha real (típico de un consultorio con sus
 *    propios pacientes): si la columna Fecha viene con dato, semana, mes Y
 *    año se calculan automáticamente de esa fecha (ignora lo que haya en
 *    A/C/D) — con una sola fila alimenta las 3 vistas (Semana/Mes/Año) sin
 *    ambigüedad, porque ya no es un total agregado sino un caso con fecha.
 */
@Service
public class SaludImportacionHistoricaService {

    private static final WeekFields SEMANA_ISO = WeekFields.ISO;
    private static final DateTimeFormatter[] FORMATOS_FECHA = {
        DateTimeFormatter.ISO_LOCAL_DATE,          // 2024-05-14
        DateTimeFormatter.ofPattern("dd/MM/yyyy"), // 14/05/2024
        DateTimeFormatter.ofPattern("d/M/yyyy"),   // 14/5/2024
    };

    @Autowired
    private CasoHistoricoImportadoRepository casoHistoricoImportadoRepository;

    public record ErrorFila(int numeroFila, String motivo) {}

    public record ResultadoImportacion(int filasImportadas, int filasConError, List<ErrorFila> errores) {}

    @Transactional
    public ResultadoImportacion importar(Long tenantId, InputStream excel, String nombreArchivo) {
        List<CasoHistoricoImportado> aGuardar = new ArrayList<>();
        List<ErrorFila> errores = new ArrayList<>();

        try (Workbook libro = WorkbookFactory.create(excel)) {
            Sheet hoja = libro.getSheetAt(0);

            for (Row fila : hoja) {
                int numeroFila = fila.getRowNum() + 1; // 1-based para el mensaje de error, como lo ve el usuario en Excel
                if (numeroFila == 1) continue; // encabezado

                if (esFilaVacia(fila)) continue;

                try {
                    String cie10 = leerTexto(fila, 1);
                    Integer casos = leerEntero(fila, 4);
                    LocalDate fecha = leerFecha(fila, 5);

                    Integer anio;
                    Integer semana;
                    Integer mes;
                    if (fecha != null) {
                        anio = fecha.getYear();
                        semana = fecha.get(SEMANA_ISO.weekOfWeekBasedYear());
                        mes = fecha.getMonthValue();
                    } else {
                        anio = leerEntero(fila, 0);
                        semana = leerEntero(fila, 2);
                        mes = leerEntero(fila, 3);
                        if (semana != null && mes != null) throw new IllegalArgumentException("Una fila no puede traer semana Y mes a la vez sin una fecha real (columna F) — son excluyentes");
                    }

                    if (anio == null) throw new IllegalArgumentException("Falta el año (columna A) o una fecha (columna F)");
                    if (cie10 == null || cie10.isBlank()) throw new IllegalArgumentException("Falta el código CIE-10 (columna B)");
                    if (casos == null) throw new IllegalArgumentException("Falta el número de casos (columna E)");
                    if (casos < 0) throw new IllegalArgumentException("Los casos no pueden ser negativos");
                    if (semana != null && (semana < 1 || semana > 53)) throw new IllegalArgumentException("Semana fuera de rango (1-53): " + semana);
                    if (mes != null && (mes < 1 || mes > 12)) throw new IllegalArgumentException("Mes fuera de rango (1-12): " + mes);

                    CasoHistoricoImportado caso = new CasoHistoricoImportado();
                    caso.setTenantId(tenantId);
                    caso.setDiagnosticoCie10(cie10.trim().toUpperCase());
                    caso.setAnio(anio);
                    caso.setSemana(semana);
                    caso.setMes(mes);
                    caso.setCasos(casos);
                    caso.setFuente(nombreArchivo);
                    aGuardar.add(caso);
                } catch (Exception ex) {
                    errores.add(new ErrorFila(numeroFila, ex.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("No se pudo leer el archivo Excel: " + e.getMessage());
        }

        casoHistoricoImportadoRepository.saveAll(aGuardar);
        return new ResultadoImportacion(aGuardar.size(), errores.size(), errores);
    }

    /** Deshace una importación completa por si se cargó el archivo equivocado o con datos malos. */
    @Transactional
    public void deshacerImportacion(String nombreArchivo) {
        casoHistoricoImportadoRepository.deleteByFuente(nombreArchivo);
    }

    private boolean esFilaVacia(Row fila) {
        for (int i = 0; i < 6; i++) {
            Cell c = fila.getCell(i);
            if (c != null && c.getCellType() != CellType.BLANK) return false;
        }
        return true;
    }

    /** Columna F opcional: fecha real de la ocurrencia. Acepta una celda de fecha de Excel o texto
     * en AAAA-MM-DD / DD/MM/AAAA. Si viene, semana+mes+año se derivan de aquí (ver cabecera de la clase). */
    private LocalDate leerFecha(Row fila, int columna) {
        Cell c = fila.getCell(columna);
        if (c == null || c.getCellType() == CellType.BLANK) return null;
        if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c)) {
            return c.getLocalDateTimeCellValue().toLocalDate();
        }
        String texto = c.toString().trim();
        if (texto.isEmpty()) return null;
        for (DateTimeFormatter formato : FORMATOS_FECHA) {
            try {
                return LocalDate.parse(texto, formato);
            } catch (DateTimeParseException ignorado) {
                // probar el siguiente formato
            }
        }
        throw new IllegalArgumentException("Fecha no reconocida en la columna F: '" + texto + "' (use AAAA-MM-DD o DD/MM/AAAA)");
    }

    private String leerTexto(Row fila, int columna) {
        Cell c = fila.getCell(columna);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC) return String.valueOf((long) c.getNumericCellValue());
        String valor = c.toString().trim();
        return valor.isEmpty() ? null : valor;
    }

    private Integer leerEntero(Row fila, int columna) {
        Cell c = fila.getCell(columna);
        if (c == null) return null;
        if (c.getCellType() == CellType.BLANK) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return (int) c.getNumericCellValue();
            String texto = c.toString().trim();
            return texto.isEmpty() ? null : Integer.parseInt(texto);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Valor no numérico en la columna " + (char) ('A' + columna) + ": '" + c + "'");
        }
    }
}
