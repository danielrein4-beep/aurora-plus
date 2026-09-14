package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.AsignacionEmpleado;
import com.auroraplus.core.personal.entities.Cargo;
import com.auroraplus.core.personal.entities.Empleado;
import com.auroraplus.core.personal.repositories.AsignacionEmpleadoRepository;
import com.auroraplus.core.personal.repositories.CargoRepository;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import com.auroraplus.core.personal.services.PersonalAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/personal/directorio")
public class DirectorioPersonalController {

    @Autowired private PersonalAccessService accessService;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private AsignacionEmpleadoRepository asignacionRepository;
    @Autowired private CargoRepository cargoRepository;

    public record EntradaDirectorio(
        Long id,
        String nombreCompleto,
        String documentoIdentidad,
        LocalDate fechaIngreso,
        LocalDate fechaEgreso,
        String cargo,
        String moduloOrigen,
        String tipoSalario,
        BigDecimal salarioPactado,
        String monedaSalario
    ) {}

    @GetMapping
    public List<EntradaDirectorio> listar() {
        Long tenantId = TenantContext.getCurrentTenant();
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        accessService.exigirVerDirectorioPersonal(tenantId);
        boolean incluirMontos = accessService.puedeVerMontosGenerales(tenantId);

        Map<Long, AsignacionEmpleado> asignaciones = asignacionRepository
            .findByTenantIdAndVigenciaHastaIsNull(tenantId).stream()
            .collect(Collectors.toMap(AsignacionEmpleado::getEmpleadoId, Function.identity(), (a, b) -> a));
        Map<Long, Cargo> cargos = cargoRepository.findByTenantId(tenantId).stream()
            .collect(Collectors.toMap(Cargo::getId, Function.identity()));

        return empleadoRepository.findByTenantId(tenantId).stream().map(empleado -> {
            AsignacionEmpleado asignacion = asignaciones.get(empleado.getId());
            Cargo cargo = asignacion == null ? null : cargos.get(asignacion.getCargoId());
            return new EntradaDirectorio(
                empleado.getId(), empleado.getNombreCompleto(), empleado.getDocumentoIdentidad(),
                empleado.getFechaIngreso(), empleado.getFechaEgreso(),
                cargo == null ? null : cargo.getNombre(),
                asignacion == null ? null : asignacion.getModuloOrigen(),
                asignacion == null || asignacion.getTipoSalario() == null ? null : asignacion.getTipoSalario().name(),
                incluirMontos && asignacion != null ? asignacion.getSalarioPactado() : null,
                incluirMontos && asignacion != null ? asignacion.getMonedaSalario() : null
            );
        }).toList();
    }
}
