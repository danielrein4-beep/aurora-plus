package com.auroraplus.modules.salud.laboratorio;

import com.auroraplus.modules.salud.laboratorio.entities.AdjuntoResultadoLab;
import com.auroraplus.modules.salud.laboratorio.entities.OrdenLaboratorio;
import com.auroraplus.modules.salud.laboratorio.entities.ResultadoLaboratorio;
import com.auroraplus.modules.salud.laboratorio.services.SaludLaboratorioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
@Transactional
public class MultiTenantLaboratorioRealPracticeTest {

    @Autowired
    private SaludLaboratorioService laboratorioService;

    @Test
    @DisplayName("Simulación de práctica real: 3 Tenants concurrentes, aislamiento estricto, sellado anti-manipulación y flujo de inbox médico")
    void testPracticaRealVariosTenantsAlMismoTiempo() {
        System.out.println("\n==========================================================================");
        System.out.println("  INICIANDO SIMULACIÓN DE RED DE LABORATORIO MULTI-TENANT EN PRÁCTICA REAL");
        System.out.println("==========================================================================");

        Long tenantCentroLaTrinidad = 101L;
        Long tenantClinicaAvila = 202L;
        Long tenantMetropolitana = 303L;

        // ---------------------------------------------------------------------------------
        // PASO 1: Los médicos de cada clínica emiten órdenes digitales desde sus consultas
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 1] Doctores emitiendo órdenes digitales en sus respectivas clínicas...");

        // Tenant 1: Dr. Carlos Mendoza emite orden para Juan Carlos Valero
        OrdenLaboratorio ordenT1 = new OrdenLaboratorio();
        ordenT1.setPacienteId(501L);
        ordenT1.setPacienteNombre("Juan Carlos Valero");
        ordenT1.setPacienteCedula("V-18492311");
        ordenT1.setPacienteTelefono("+58 414 111 2233");
        ordenT1.setMedicoId(88L);
        ordenT1.setMedicoNombre("Dr. Carlos Mendoza (Medicina Interna)");
        ordenT1.setExamenesSolicitados("Perfil 20 Completo, Uroanálisis con Sedimento");
        ordenT1.setIndicacionesClinicas("Sospecha de síndrome metabólico, esteatosis hepática");
        OrdenLaboratorio creadaT1 = laboratorioService.crearOrden(tenantCentroLaTrinidad, ordenT1);

        assertNotNull(creadaT1.getId());
        assertNotNull(creadaT1.getTokenSeguro());
        assertEquals("EMITIDA", creadaT1.getEstado());
        System.out.println("  > [Tenant 101 - La Trinidad] Orden creada: " + creadaT1.getCodigoOrden() + " | Token público: " + creadaT1.getTokenSeguro().substring(0, 10) + "...");

        // Tenant 2: Dra. Valentina Salazar emite orden para Sofía Antonella Rossi
        OrdenLaboratorio ordenT2 = new OrdenLaboratorio();
        ordenT2.setPacienteId(502L);
        ordenT2.setPacienteNombre("Sofía Antonella Rossi");
        ordenT2.setPacienteCedula("V-24810902");
        ordenT2.setPacienteTelefono("+58 424 555 7788");
        ordenT2.setMedicoId(92L);
        ordenT2.setMedicoNombre("Dra. Valentina Salazar (Endocrinología)");
        ordenT2.setExamenesSolicitados("Perfil Tiroideo (TSH, T3, T4 Libre), Cortisol Matutino");
        ordenT2.setIndicacionesClinicas("Control hipotiroidismo primario y astenia");
        OrdenLaboratorio creadaT2 = laboratorioService.crearOrden(tenantClinicaAvila, ordenT2);

        assertNotNull(creadaT2.getId());
        assertNotNull(creadaT2.getTokenSeguro());
        assertNotEquals(creadaT1.getTokenSeguro(), creadaT2.getTokenSeguro());
        System.out.println("  > [Tenant 202 - Clínica Ávila] Orden creada: " + creadaT2.getCodigoOrden() + " | Token público: " + creadaT2.getTokenSeguro().substring(0, 10) + "...");

        // Tenant 3: Dr. Roberto Castillo emite orden para Pedro Infante
        OrdenLaboratorio ordenT3 = new OrdenLaboratorio();
        ordenT3.setPacienteId(503L);
        ordenT3.setPacienteNombre("Pedro Infante");
        ordenT3.setPacienteCedula("V-12003445");
        ordenT3.setMedicoId(77L);
        ordenT3.setMedicoNombre("Dr. Roberto Castillo (Hematología)");
        ordenT3.setExamenesSolicitados("Biometría Hemática Completa, Ferritina Sérica");
        ordenT3.setIndicacionesClinicas("Anemia microcítica en estudio");
        OrdenLaboratorio creadaT3 = laboratorioService.crearOrden(tenantMetropolitana, ordenT3);

        System.out.println("  > [Tenant 303 - Metropolitana] Orden creada: " + creadaT3.getCodigoOrden() + " | Token público: " + creadaT3.getTokenSeguro().substring(0, 10) + "...");

        // ---------------------------------------------------------------------------------
        // PASO 2: Verificación de Inbox Inicial (Órdenes emitidas pero no selladas aún)
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 2] Verificando Inboxes médicos antes del procesamiento por laboratorio...");
        // El inbox solo muestra resultados sellados por bioanalistas que están listos para revisión médica
        assertEquals(0, laboratorioService.contarPendientesInbox(tenantCentroLaTrinidad));
        assertEquals(0, laboratorioService.contarPendientesInbox(tenantClinicaAvila));
        assertEquals(0, laboratorioService.contarPendientesInbox(tenantMetropolitana));
        System.out.println("  > Confirmado: Ningún médico tiene pendientes falsos antes de que el laboratorio suba resultados.");

        // ---------------------------------------------------------------------------------
        // PASO 3: Laboratorios externos independientes cargan resultados vía Token público
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 3] Laboratorios bioanalíticos externos procesan muestras y cargan resultados...");

        // Lab A: "Laboratorio Bio-Clínico Express" procesa la Orden 1 (Tenant 101)
        SaludLaboratorioService.AdjuntoPayload foto1 = new SaludLaboratorioService.AdjuntoPayload();
        foto1.nombreArchivo = "sedimento_urinario_40x.jpg";
        foto1.tipoMime = "image/jpeg";
        foto1.contenidoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD_MOCK_MICROSCOPY_SLIDE";

        SaludLaboratorioService.AdjuntoPayload foto2 = new SaludLaboratorioService.AdjuntoPayload();
        foto2.nombreArchivo = "informe_bioquimica_analizador.jpg";
        foto2.tipoMime = "image/jpeg";
        foto2.contenidoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD_MOCK_ANALYZER_REPORT";

        OrdenLaboratorio selladaT1 = laboratorioService.cargarResultadoYSealar(
                creadaT1.getTokenSeguro(),
                "Laboratorio Bio-Clínico Express",
                "Lic. Mariángel Rivas",
                "CB-4189",
                "Glicemia: 142 mg/dL. Colesterol Total: 268 mg/dL. Triglicéridos: 310 mg/dL. HDL: 32 mg/dL. Uroanálisis: Escasos leucocitos 2-4 x cpo, uratos amorfos abundantes.",
                "Dislipidemia mixta severa y alteración glucémica en ayunas. Sedimento urinario dentro de límites normales.",
                "Muestra en ayuno 12h, suero moderadamente lipémico.",
                false,
                null,
                List.of(foto1, foto2),
                "190.204.18.52"
        );

        assertEquals("SELLADA", selladaT1.getEstado());
        assertNotNull(selladaT1.getResultado());
        assertEquals(2, selladaT1.getResultado().getAdjuntos().size());
        System.out.println("  > Orden 1 SELLADA con éxito por 'Laboratorio Bio-Clínico Express' con 2 fotos adjuntas.");

        // Lab B: "Laboratorio Diagnóstico Central" procesa la Orden 2 (Tenant 202) con VALOR CRÍTICO
        SaludLaboratorioService.AdjuntoPayload curvaHormonal = new SaludLaboratorioService.AdjuntoPayload();
        curvaHormonal.nombreArchivo = "curva_quimioluminiscencia.png";
        curvaHormonal.tipoMime = "image/png";
        curvaHormonal.contenidoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA_MOCK_CHART";

        OrdenLaboratorio selladaT2 = laboratorioService.cargarResultadoYSealar(
                creadaT2.getTokenSeguro(),
                "Laboratorio Diagnóstico Central",
                "Lic. Fernando Alarcón",
                "CB-6204",
                "TSH Ultra: 18.5 uIU/mL (Ref: 0.40 - 4.00). T4 Libre: 0.42 ng/dL (Ref: 0.89 - 1.76). Cortisol Matutino 8am: 14.2 ug/dL.",
                "Hipotiroidismo primario descompensado con hipotiroxinemia franca.",
                "Muestra suero sin hemólisis, centrifugación oportuna.",
                true, // VALOR CRÍTICO ALERTA ROJA
                "¡ALERTA!: TSH severamente elevada (> 15 uIU/mL) con supresión de T4 libre.",
                List.of(curvaHormonal),
                "200.74.192.10"
        );

        assertEquals("SELLADA", selladaT2.getEstado());
        assertTrue(selladaT2.getResultado().isValoresCriticos());
        System.out.println("  > Orden 2 SELLADA con éxito con ¡VALORES CRÍTICOS (ALERTA ROJA)! por 'Laboratorio Diagnóstico Central'.");

        // ---------------------------------------------------------------------------------
        // PASO 4: Prueba de Seguridad Anti-Manipulación / Inmutabilidad
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 4] Verificando protección contra re-edición y reutilización de QR...");
        assertThrows(IllegalStateException.class, () -> {
            laboratorioService.cargarResultadoYSealar(
                    creadaT1.getTokenSeguro(),
                    "Laboratorio Malicioso o Re-escaneo",
                    "Intruso",
                    "CB-0000",
                    "Intento de sobrescribir resultado",
                    "Alteración no permitida",
                    "",
                    false,
                    null,
                    null,
                    "1.1.1.1"
            );
        }, "Debe arrojar IllegalStateException porque la orden ya está SELLADA");
        System.out.println("  > Confirmado: Una orden SELLADA rechaza categóricamente cualquier intento de alteración.");

        // ---------------------------------------------------------------------------------
        // PASO 5: Verificación estricta de Aislamiento Multi-Tenant
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 5] Verificando aislamiento absoluto entre clínicas (Zero Leakage)...");

        // Listado de órdenes por Tenant
        List<OrdenLaboratorio> ordenesT1 = laboratorioService.listarPorTenant(tenantCentroLaTrinidad);
        List<OrdenLaboratorio> ordenesT2 = laboratorioService.listarPorTenant(tenantClinicaAvila);
        List<OrdenLaboratorio> ordenesT3 = laboratorioService.listarPorTenant(tenantMetropolitana);

        assertEquals(1, ordenesT1.size(), "Tenant 101 debe ver exactamente 1 orden propia");
        assertEquals(1, ordenesT2.size(), "Tenant 202 debe ver exactamente 1 orden propia");
        assertEquals(1, ordenesT3.size(), "Tenant 303 debe ver exactamente 1 orden propia");

        assertEquals("Juan Carlos Valero", ordenesT1.get(0).getPacienteNombre());
        assertEquals("Sofía Antonella Rossi", ordenesT2.get(0).getPacienteNombre());
        assertEquals("Pedro Infante", ordenesT3.get(0).getPacienteNombre());

        // Verificación de Inboxes Médicos
        List<OrdenLaboratorio> inboxT1 = laboratorioService.listarInbox(tenantCentroLaTrinidad);
        List<OrdenLaboratorio> inboxT2 = laboratorioService.listarInbox(tenantClinicaAvila);
        List<OrdenLaboratorio> inboxT3 = laboratorioService.listarInbox(tenantMetropolitana);

        assertEquals(1, inboxT1.size(), "Doctor de La Trinidad debe tener 1 examen en su inbox");
        assertEquals(1, inboxT2.size(), "Doctora de Clínica Ávila debe tener 1 examen en su inbox");
        assertEquals(0, inboxT3.size(), "Doctor de Metropolitana no debe tener exámenes listos (aún en proceso)");

        assertEquals(1, laboratorioService.contarPendientesInbox(tenantCentroLaTrinidad));
        assertEquals(1, laboratorioService.contarPendientesInbox(tenantClinicaAvila));
        assertEquals(0, laboratorioService.contarPendientesInbox(tenantMetropolitana));

        // Inspección del contenido en Inbox:
        assertFalse(inboxT1.get(0).getResultado().isValoresCriticos());
        assertTrue(inboxT2.get(0).getResultado().isValoresCriticos(), "El examen de la Dra. Salazar debe mostrar la insignia de ALERTA CRÍTICA");
        System.out.println("  > Confirmado: Cada clínica ve ÚNICAMENTE sus propios pacientes y alertas sin interferencia.");

        // Aislamiento a nivel de paciente
        List<OrdenLaboratorio> ordenesPacienteT1DesdeT1 = laboratorioService.listarPorPaciente(tenantCentroLaTrinidad, 501L);
        assertEquals(1, ordenesPacienteT1DesdeT1.size());

        List<OrdenLaboratorio> intentoEspiarPacienteT2DesdeT1 = laboratorioService.listarPorPaciente(tenantCentroLaTrinidad, 502L);
        assertEquals(0, intentoEspiarPacienteT2DesdeT1.size(), "Tenant 101 no puede ver los exámenes del paciente de Tenant 202");
        System.out.println("  > Confirmado: Consulta de historia clínica bloquea cualquier intento de fuga entre tenants.");

        // ---------------------------------------------------------------------------------
        // PASO 6: Intento de Acceso Malicioso Cruzado (Cross-Tenant Unauthorized Operation)
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 6] Intentando operación no autorizada entre tenants...");
        assertThrows(SecurityException.class, () -> {
            // El médico de Tenant 101 intenta marcar como revisada la orden de Tenant 202
            laboratorioService.marcarRevisadoPorMedico(tenantCentroLaTrinidad, creadaT2.getId(), "Intento de aprobación indebida");
        }, "Debe rechazar con SecurityException por violación de tenant");
        System.out.println("  > Confirmado: SecurityException bloquea cualquier acción de un médico sobre órdenes de otra clínica.");

        // ---------------------------------------------------------------------------------
        // PASO 7: Ciclo de Revisión Médica y Actualización de Inbox
        // ---------------------------------------------------------------------------------
        System.out.println("\n[PASO 7] Médicos revisan resultados y limpian su Inbox...");

        // Dr. Carlos Mendoza (Tenant 101) revisa y anota
        OrdenLaboratorio revisadaT1 = laboratorioService.marcarRevisadoPorMedico(
                tenantCentroLaTrinidad,
                creadaT1.getId(),
                "Plan: Dieta baja en carbohidratos simples, Atorvastatina 20mg OD nocturna. Re-evaluación en 6 semanas."
        );
        assertTrue(revisadaT1.isRevisadoPorMedico());
        assertNotNull(revisadaT1.getFechaRevisionMedico());
        assertEquals("Plan: Dieta baja en carbohidratos simples, Atorvastatina 20mg OD nocturna. Re-evaluación en 6 semanas.", revisadaT1.getNotasRevisionMedico());

        // Pendientes en Tenant 101 se reducen a 0
        assertEquals(0, laboratorioService.contarPendientesInbox(tenantCentroLaTrinidad));
        System.out.println("  > Dr. Carlos Mendoza revisó orden. Contador de pendientes en Tenant 101: 0.");

        // Tenant 202 NO debe verse afectado en lo más mínimo por la acción de Tenant 101
        assertEquals(1, laboratorioService.contarPendientesInbox(tenantClinicaAvila), "Tenant 202 debe seguir teniendo 1 pendiente");
        System.out.println("  > Tenant 202 mantiene su pendiente de forma intacta.");

        // Dra. Valentina Salazar (Tenant 202) revisa el valor crítico
        OrdenLaboratorio revisadaT2 = laboratorioService.marcarRevisadoPorMedico(
                tenantClinicaAvila,
                creadaT2.getId(),
                "URGENTE: Contactada la paciente. Ajuste de Levotiroxina a 100mcg/día. Perfil control en 4 semanas."
        );
        assertTrue(revisadaT2.isRevisadoPorMedico());
        assertEquals(0, laboratorioService.contarPendientesInbox(tenantClinicaAvila));
        System.out.println("  > Dra. Valentina Salazar atendió la alerta crítica. Contador de pendientes en Tenant 202: 0.");

        System.out.println("\n==========================================================================");
        System.out.println("  ¡TODAS LAS PRUEBAS DE PRÁCTICA REAL MULTI-TENANT PASARON CON ÉXITO AL 100%!");
        System.out.println("==========================================================================\n");
    }
}
