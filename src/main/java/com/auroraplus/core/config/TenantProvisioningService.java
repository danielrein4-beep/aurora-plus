package com.auroraplus.core.config;

import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Alta de un tenant nuevo: usada tanto por el super-admin (panel interno)
 * como por el registro de autoservicio público (POST /api/auth/registro-negocio)
 * — misma lógica, dos puertas de entrada distintas.
 */
@Service
public class TenantProvisioningService {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @Autowired
    private AuthService authService;

    public static class AltaTenantRequest {
        public String nombreEmpresa;
        public String moduloPrincipal;
        public LicenciaTenant.TipoLicencia tipoLicencia;
        public String emailContacto;
        public String telefonoContacto;
        public Integer mesesVigencia;
        public String monedaBase;
        public String usuarioInicial;
        public String passwordInicial;
    }

    @Transactional
    public LicenciaTenant crear(AltaTenantRequest request) {
        if (request.nombreEmpresa == null || request.nombreEmpresa.isBlank()) {
            throw new RuntimeException("El nombre de la empresa es obligatorio");
        }
        if (request.moduloPrincipal == null || request.moduloPrincipal.isBlank()) {
            throw new RuntimeException("El módulo principal es obligatorio");
        }
        if (request.tipoLicencia == null) {
            throw new RuntimeException("El tipo de licencia es obligatorio");
        }

        Long nuevoTenantId = licenciaTenantRepository.buscarMaximoTenantId() + 1;
        int meses = request.mesesVigencia != null ? request.mesesVigencia : 1;

        LicenciaTenant licencia = new LicenciaTenant();
        licencia.setTenantId(nuevoTenantId);
        licencia.setNombreEmpresa(request.nombreEmpresa);
        licencia.setModuloPrincipal(request.moduloPrincipal);
        licencia.setTipoLicencia(request.tipoLicencia);
        licencia.setActiva(true);
        licencia.setFechaVencimientoPago(LocalDate.now().plusMonths(meses));
        licencia.setEmailContacto(request.emailContacto);
        licencia.setTelefonoContacto(request.telefonoContacto);
        licencia.setFechaAlta(LocalDate.now());
        if (request.monedaBase != null && !request.monedaBase.isBlank()) {
            licencia.setMonedaBase(request.monedaBase);
        }

        LicenciaTenant guardada = licenciaTenantRepository.save(licencia);

        ModuloTenant moduloInicial = new ModuloTenant();
        moduloInicial.setTenantId(nuevoTenantId);
        moduloInicial.setModuloNombre(request.moduloPrincipal);
        moduloInicial.setActivo(true);
        moduloTenantRepository.save(moduloInicial);

        if (request.usuarioInicial != null && !request.usuarioInicial.isBlank()) {
            // Salud es "un solo médico por tenant" (ver MedicoTenantResolver): el
            // usuario inicial debe tener rol MEDICO para que el sistema lo reconozca
            // como el médico del consultorio y le auto-asigne citas/consultas —
            // DUENO_ADMIN no cuenta para ese resuelto, aunque igual tenga acceso.
            Usuario.Rol rolInicial = "salud".equals(request.moduloPrincipal) ? Usuario.Rol.MEDICO : Usuario.Rol.DUENO_ADMIN;
            authService.crearUsuario(nuevoTenantId, request.usuarioInicial, request.passwordInicial,
                rolInicial, request.nombreEmpresa);
        }

        return guardada;
    }
}
