package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.comercio.services.LibroFiscalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/** Libros de compras y ventas por período, para exportar a PDF o Excel y entregar al contador. */
@RestController
@RequestMapping("/api/comercio/libros")
public class LibrosFiscalesController {

    private static final int MAX_DIAS = 400;

    @Autowired
    private LibroFiscalService libroFiscalService;

    @GetMapping("/ventas")
    public LibroFiscalService.Libro<LibroFiscalService.RenglonVenta> ventas(@RequestParam String desde, @RequestParam String hasta) {
        AuthContext.exigirRol("DUENO_ADMIN");
        LocalDate[] r = rango(desde, hasta);
        return libroFiscalService.libroVentas(tenant(), r[0], r[1]);
    }

    @GetMapping("/compras")
    public LibroFiscalService.Libro<LibroFiscalService.RenglonCompra> compras(@RequestParam String desde, @RequestParam String hasta) {
        AuthContext.exigirRol("DUENO_ADMIN");
        LocalDate[] r = rango(desde, hasta);
        return libroFiscalService.libroCompras(tenant(), r[0], r[1]);
    }

    private static Long tenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new RuntimeException("Sesión sin negocio");
        return tenantId;
    }

    private static LocalDate[] rango(String desde, String hasta) {
        LocalDate d = LocalDate.parse(desde);
        LocalDate h = LocalDate.parse(hasta);
        if (h.isBefore(d)) throw new RuntimeException("La fecha final no puede ser anterior a la inicial");
        if (d.plusDays(MAX_DIAS).isBefore(h)) throw new RuntimeException("El período no puede pasar de " + MAX_DIAS + " días");
        return new LocalDate[]{d, h};
    }
}
