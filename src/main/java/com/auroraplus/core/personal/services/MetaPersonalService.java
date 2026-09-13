package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.MetaPersonal;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.entities.SeguimientoMeta;
import com.auroraplus.core.personal.repositories.MetaPersonalRepository;
import com.auroraplus.core.personal.repositories.SeguimientoMetaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class MetaPersonalService {

    private static final Set<RolPersonal> PUEDEN_ESCRIBIR = EnumSet.of(RolPersonal.RRHH, RolPersonal.NOMINA, RolPersonal.SUPERVISOR);

    @Autowired
    private MetaPersonalRepository metaPersonalRepository;

    @Autowired
    private SeguimientoMetaRepository seguimientoMetaRepository;

    @Autowired
    private PersonalAccessService accessService;

    @Transactional
    public MetaPersonal crear(Long tenantId, MetaPersonal meta) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_METAS);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        meta.setTenantId(tenantId);
        meta.setId(null);
        return metaPersonalRepository.save(meta);
    }

    public List<MetaPersonal> listarDeEmpleado(Long tenantId, Long empleadoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_METAS);
        Long empleadoPropio = accessService.empleadoIdPropioSiAplica(tenantId);
        if (empleadoPropio != null && !empleadoPropio.equals(empleadoId)) {
            throw new PersonalAccessService.AccesoPersonalDenegadoException("No puedes consultar las metas de otro empleado");
        }
        return metaPersonalRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId);
    }

    @Transactional
    public SeguimientoMeta registrarAvance(Long tenantId, Long metaId, SeguimientoMeta seguimiento) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_METAS);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        metaPersonalRepository.findByTenantIdAndId(tenantId, metaId)
            .orElseThrow(() -> new RuntimeException("Meta no encontrada"));
        seguimiento.setTenantId(tenantId);
        seguimiento.setMetaId(metaId);
        seguimiento.setId(null);
        return seguimientoMetaRepository.save(seguimiento);
    }
}
