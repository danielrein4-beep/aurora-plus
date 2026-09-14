package com.auroraplus.core.kpi.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.kpi.dto.EmpresaKpiDTO;
import com.auroraplus.core.kpi.services.EmpresaKpiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;

/**
 * docs/finance-contract.md §3.2/§3.3. Sin `tenantId` de query a propósito: el tenant sale de
 * TenantContext (ya resuelto por TenantInterceptor desde el JWT verificado) — aceptar un
 * tenantId del cliente permitiría a cualquier usuario autenticado pedir el KPI de otro negocio
 * con solo cambiar el número.
 */
@RestController
@RequestMapping("/api/empresa")
public class EmpresaKpiController {

    @Autowired
    private EmpresaKpiService empresaKpiService;

    @GetMapping("/kpis")
    public ResponseEntity<EmpresaKpiDTO> kpis(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        String rol = AuthContext.getRol();
        // Salud crea actualmente al dueño inicial con rol MEDICO; por eso ambos roles
        // administrativos pueden consultar el consolidado. Caja, inventario y recepción no.
        if (!"DUENO_ADMIN".equals(rol) && !"MEDICO".equals(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(empresaKpiService.obtenerKpis(tenantId, desde, hasta));
    }
}
