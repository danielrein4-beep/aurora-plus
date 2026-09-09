package com.auroraplus.modules.salud;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Importador de historiales epidemiológicos desde Excel — resuelve el
 * "problema del arranque en frío": un hospital nuevo no debería esperar 5-7
 * años acumulando datos propios antes de que el Canal Endémico sirva. Si
 * ya tienen boletines oficiales (o su propio historial), los cargan una vez.
 */
class SaludImportacionHistoricaTest extends SaludIntegrationTestBase {

    /** Arma un .xlsx en memoria con columnas Año | CIE10 | Semana | Mes | Casos, tal como lo espera el importador. */
    private byte[] construirExcel(Object[]... filas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet("Historico");
            Row encabezado = hoja.createRow(0);
            String[] columnas = {"Año", "CIE10", "Semana", "Mes", "Casos"};
            for (int i = 0; i < columnas.length; i++) encabezado.createCell(i).setCellValue(columnas[i]);

            int numeroFila = 1;
            for (Object[] fila : filas) {
                Row r = hoja.createRow(numeroFila++);
                for (int col = 0; col < fila.length; col++) {
                    Object valor = fila[col];
                    if (valor == null) continue; // celda vacía = columna no aplica en esa fila
                    if (valor instanceof Number n) r.createCell(col).setCellValue(n.doubleValue());
                    else r.createCell(col).setCellValue(valor.toString());
                }
            }
            libro.write(out);
            return out.toByteArray();
        }
    }

    private ResponseEntity<JsonNode> subirExcel(Sesion sesion, byte[] contenido, String nombreArchivo) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("archivo", new ByteArrayResource(contenido) {
            @Override
            public String getFilename() { return nombreArchivo; }
        });
        HttpHeaders headers = headers(sesion);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return rest.postForEntity(url("/api/salud/canal-endemico/historico/importar"), new HttpEntity<>(body, headers), JsonNode.class);
    }

    @Test
    void importaUnExcelYLoFusionaConElCorredorHistorico() throws Exception {
        Sesion clinica = registrarClinica("Clinica Importadora " + UUID.randomUUID());
        String cie10 = "A90";

        // Boletín ministerial ficticio: 3 años de totales anuales (2021,2022,2023) + un dato
        // semanal de 2023 (semana 10, 4 casos) para probar que también arma el corredor semanal.
        byte[] excel = construirExcel(
            new Object[]{2021, cie10, null, null, 8},
            new Object[]{2022, cie10, null, null, 10},
            new Object[]{2023, cie10, null, null, 9},
            new Object[]{2023, cie10, 10, null, 4}
        );

        ResponseEntity<JsonNode> resp = subirExcel(clinica, excel, "boletin_ministerio.xlsx");
        assertEquals(HttpStatus.OK, resp.getStatusCode(), "La importación debe responder 200: " + resp.getBody());
        assertEquals(4, resp.getBody().get("filasImportadas").asInt());
        assertEquals(0, resp.getBody().get("filasConError").asInt());

        ResponseEntity<JsonNode> canal = get(clinica, "/api/salud/canal-endemico?cie10=" + cie10 + "&anio=2026");
        assertEquals(HttpStatus.OK, canal.getStatusCode());

        // 2023 tenía un total anual de 9 EN LA FILA ANUAL, más 4 de la fila semanal = 13 en total para ese año.
        JsonNode porAnio = canal.getBody().get("porAnio");
        boolean encontro2023 = false;
        for (JsonNode p : porAnio) {
            if (p.get("anio").asInt() == 2023) {
                encontro2023 = true;
                assertEquals(13, p.get("casos").asInt(), "2023 = 9 (anual) + 4 (semanal) = 13");
            }
        }
        assertTrue(encontro2023, "El año 2023 importado debe aparecer en porAnio");

        assertEquals(3, canal.getBody().get("aniosHistoricosUsados").asInt(), "Los 3 años importados cuentan como historia usada");

        // El dato semanal importado (semana 10 de 2023, 4 casos) debe reflejarse en el corredor semanal.
        JsonNode corredor = canal.getBody().get("corredorHistorico");
        JsonNode semana10 = corredor.get(9); // índice 9 = periodo 10 (arreglo 1-based empezando en índice 0 = semana 1)
        assertEquals(10, semana10.get("periodo").asInt());
        assertEquals(4.0, semana10.get("maximo").asDouble(), 0.001,
            "El único dato histórico de la semana 10 es el importado (4 casos), así que máximo=mínimo=mediana=4");
    }

    @Test
    void reportaErroresDeFilaSinTumbarLasFilasBuenas() throws Exception {
        Sesion clinica = registrarClinica("Clinica Importadora Errores " + UUID.randomUUID());

        byte[] excel = construirExcel(
            new Object[]{2021, "A90", null, null, 5},   // válida
            new Object[]{null, "A90", null, null, 3},   // sin año -> error
            new Object[]{2022, "A90", 60, null, 2},      // semana fuera de rango -> error
            new Object[]{2023, "A90", 5, 6, 1}           // semana Y mes a la vez -> error
        );

        ResponseEntity<JsonNode> resp = subirExcel(clinica, excel, "con_errores.xlsx");
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals(1, resp.getBody().get("filasImportadas").asInt(), "Solo la primera fila es válida");
        assertEquals(3, resp.getBody().get("filasConError").asInt());
        assertEquals(3, resp.getBody().get("errores").size());
    }
}
