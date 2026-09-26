package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.*;
import com.auroraplus.core.personal.repositories.*;
import com.auroraplus.core.personal.services.AjusteNominaService;
import com.auroraplus.core.personal.services.PersonalAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/personal/nomina/periodos")
public class DetallePeriodoNominaController {

    @Autowired private PeriodoNominaRepository periodoRepository;
    @Autowired private NominaEmpleadoRepository nominaRepository;
    @Autowired private DetalleNominaRepository detalleRepository;
    @Autowired private AjusteNominaRepository ajusteRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private AsignacionEmpleadoRepository asignacionRepository;
    @Autowired private CargoRepository cargoRepository;
    @Autowired private AjusteNominaService ajusteService;
    @Autowired private PersonalAccessService accessService;

    public record Linea(
        Long id, String descripcion, String tipo, BigDecimal cantidad,
        BigDecimal montoUnitario, BigDecimal montoTotal, String moneda,
        Long conceptoId, Long reglaAplicadaId
    ) {}

    public record Ajuste(
        Long id, String tipo, String motivo, BigDecimal montoAjuste,
        String moneda, java.time.LocalDateTime fecha
    ) {}

    public record Recibo(
        Long id, Long empleadoId, String empleadoNombre, String cargo,
        String estado, BigDecimal totalAsignaciones, BigDecimal totalDeducciones,
        BigDecimal totalAportesPatronales, BigDecimal netoCalculado,
        BigDecimal netoEfectivo, String moneda, List<Linea> lineas, List<Ajuste> ajustes,
        // Lo que el dueño revisa antes de pagar y cómo se le paga a esta persona.
        BigDecimal diasTrabajados, BigDecimal horasMarcadas, BigDecimal bono, BigDecimal descuento, String nota,
        String tipoSalario, BigDecimal salario, String frecuencia, java.time.LocalDateTime fechaPago
    ) {}

    public record DetallePeriodo(PeriodoNomina periodo, List<Recibo> recibos) {}

    @GetMapping("/{periodoId}/detalle")
    public DetallePeriodo obtener(@PathVariable Long periodoId) {
        Long tenantId = TenantContext.getCurrentTenant();
        accessService.exigirNomina(tenantId);
        accessService.exigirVerMontosDeNominaEnGeneral(tenantId);
        PeriodoNomina periodo = periodoRepository.findByTenantIdAndId(tenantId, periodoId)
            .orElseThrow(() -> new RuntimeException("Período de nómina no encontrado"));

        List<Recibo> recibos = nominaRepository.findByTenantIdAndPeriodoId(tenantId, periodoId).stream()
            .map(nomina -> mapearRecibo(tenantId, nomina)).toList();
        return new DetallePeriodo(periodo, recibos);
    }

    private Recibo mapearRecibo(Long tenantId, NominaEmpleado nomina) {
        Empleado empleado = empleadoRepository.findByTenantIdAndId(tenantId, nomina.getEmpleadoId())
            .orElseThrow(() -> new RuntimeException("Empleado de la nómina no encontrado"));
        AsignacionEmpleado asignacion = asignacionRepository.findById(nomina.getAsignacionEmpleadoId())
            .filter(item -> tenantId.equals(item.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Asignación histórica de la nómina no encontrada"));
        Cargo cargo = cargoRepository.findByTenantIdAndId(tenantId, asignacion.getCargoId()).orElse(null);
        List<Linea> lineas = detalleRepository.findByTenantIdAndNominaEmpleadoId(tenantId, nomina.getId()).stream()
            .map(item -> new Linea(item.getId(), item.getDescripcion(), item.getTipo().name(), item.getCantidad(),
                item.getMontoUnitario(), item.getMontoTotal(), item.getMoneda(), item.getConceptoId(), item.getReglaAplicadaId()))
            .toList();
        List<Ajuste> ajustes = ajusteRepository.findByTenantIdAndNominaEmpleadoId(tenantId, nomina.getId()).stream()
            .map(item -> new Ajuste(item.getId(), item.getTipo().name(), item.getMotivo(), item.getMontoAjuste(),
                item.getMoneda(), item.getFecha())).toList();
        return new Recibo(nomina.getId(), empleado.getId(), empleado.getNombreCompleto(),
            cargo == null ? null : cargo.getNombre(), nomina.getEstado().name(), nomina.getTotalAsignaciones(),
            nomina.getTotalDeducciones(), nomina.getTotalAportesPatronales(), nomina.getNetoAPagar(),
            ajusteService.calcularNetoEfectivo(tenantId, nomina), nomina.getMoneda(), lineas, ajustes,
            nomina.getDiasTrabajados(), nomina.getHorasMarcadas(), nomina.getBono(), nomina.getDescuento(), nomina.getNota(),
            asignacion.getTipoSalario().name(), asignacion.getSalarioPactado(),
            com.auroraplus.core.personal.services.MotorNominaService.frecuenciaDe(asignacion), nomina.getFechaPago());
    }
}
