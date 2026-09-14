package com.auroraplus.core.kpi;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.kpi.controllers.EmpresaKpiController;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EmpresaKpiControllerTest {

    @Test
    void unCajeroNoPuedeConsultarElConsolidadoFinancieroDeLaEmpresa() {
        AuthContext.set("cajero-prueba", "CAJERO_VENDEDOR");
        try {
            EmpresaKpiController controller = new EmpresaKpiController();
            assertEquals(HttpStatus.FORBIDDEN, controller.kpis(
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)).getStatusCode());
        } finally {
            AuthContext.clear();
        }
    }
}
