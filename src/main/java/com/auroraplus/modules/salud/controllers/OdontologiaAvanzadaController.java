package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.modules.salud.entities.CobroConsulta;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.entities.SalaEspera;
import com.auroraplus.modules.salud.repositories.CobroConsultaRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.auroraplus.modules.salud.repositories.SalaEsperaRepository;
import com.auroraplus.modules.salud.services.OdontologiaInsumosService;
import com.auroraplus.modules.salud.services.SalaEsperaService;
import com.auroraplus.modules.salud.services.SaludFinanzasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/salud/odontologia")
public class OdontologiaAvanzadaController {

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired(required = false)
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SalaEsperaService salaEsperaService;

    @Autowired
    private SalaEsperaRepository salaEsperaRepository;

    @Autowired
    private SaludFinanzasService saludFinanzasService;

    @Autowired
    private CobroConsultaRepository cobroConsultaRepository;

    @Autowired
    private OdontologiaInsumosService odontologiaInsumosService;

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: El expediente odontologico es informacion clinica confidencial.");
        }
    }

    // Evita leer o escribir expedientes de pacientes de otra clinica.
    private void validarPacienteDelTenant(Long tenantId, Long pacienteId) {
        if (pacienteId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente requerido.");
        }
        pacienteRepository.findByTenantIdAndId(tenantId, pacienteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente no encontrado."));
    }

    // Si el formulario no trae odontologo se firma con el usuario de la sesion.
    private String nombreOdontologo(String enviado) {
        if (enviado != null && !enviado.isBlank()) return enviado.trim();
        String usuario = AuthContext.getUsername();
        return usuario != null && !usuario.isBlank() ? usuario : "Odontologo Tratante";
    }

    private BigDecimal obtenerTasaBcv(Long tenantId) {
        BigDecimal tasa = BigDecimal.valueOf(50.0);
        if (tasaCambioRepository != null) {
            Optional<TasaCambio> tc = tasaCambioRepository
                .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, "USD", "VES");
            if (tc.isPresent() && tc.get().getTasa() != null && tc.get().getTasa().compareTo(BigDecimal.ZERO) > 0) {
                tasa = tc.get().getTasa();
            }
        }
        return tasa;
    }

    // ==========================================
    // 1. PERIODONTOGRAMA (Sondaje de 6 puntos)
    // ==========================================

    @GetMapping("/periodontograma")
    public ResponseEntity<?> listarPeriodontograma(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_periodontograma WHERE tenant_id = ? AND paciente_id = ? ORDER BY diente_fdi ASC",
            tenantId, pacienteId
        );

        // Indice de sangrado (BOP %): el sangrado se registra por pieza, asi que el
        // denominador son las piezas evaluadas, no 6 puntos por pieza.
        int piezasSangrado = 0;
        int sitiosBolsa = 0;
        for (Map<String, Object> f : filas) {
            if (Boolean.TRUE.equals(f.get("sangrado_bop"))) {
                piezasSangrado += 1;
            }
            for (String col : new String[]{"sondaje_mv", "sondaje_v", "sondaje_dv", "sondaje_ml", "sondaje_l", "sondaje_dl"}) {
                Object v = f.get(col);
                if (v instanceof Number n && n.intValue() >= 4) {
                    sitiosBolsa += 1;
                }
            }
        }
        double indiceBop = filas.isEmpty() ? 0.0 : ((double) piezasSangrado / filas.size()) * 100.0;

        Map<String, Object> resp = new HashMap<>();
        resp.put("filas", filas);
        resp.put("totalPiezasEvaluadas", filas.size());
        resp.put("indiceSangradoBop", Math.round(indiceBop * 10.0) / 10.0);
        resp.put("sitiosBolsaMayor4mm", sitiosBolsa);

        return ResponseEntity.ok(resp);
    }

    public static class ActualizarPeriodontoRequest {
        public Long pacienteId;
        public Integer dienteFdi;
        public Integer sondajeMv;
        public Integer sondajeV;
        public Integer sondajeDv;
        public Integer sondajeMl;
        public Integer sondajeL;
        public Integer sondajeDl;
        public Integer margenMv;
        public Integer margenV;
        public Integer margenDv;
        public Integer margenMl;
        public Integer margenL;
        public Integer margenDl;
        public Boolean sangradoBop;
        public Boolean placa;
        public Integer movilidad;
        public Integer furca;
        public String notas;
    }

    @PutMapping("/periodontograma")
    @Transactional
    public ResponseEntity<?> actualizarPeriodontograma(@RequestBody ActualizarPeriodontoRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        if (req.pacienteId == null || req.dienteFdi == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente y Diente FDI son requeridos.");
        }
        validarPacienteDelTenant(tenantId, req.pacienteId);

        Object[] sondajes = {
            sondaje(req.sondajeMv), sondaje(req.sondajeV), sondaje(req.sondajeDv),
            sondaje(req.sondajeMl), sondaje(req.sondajeL), sondaje(req.sondajeDl)
        };
        Object[] margenes = {
            margen(req.margenMv), margen(req.margenV), margen(req.margenDv),
            margen(req.margenMl), margen(req.margenL), margen(req.margenDl)
        };
        boolean bop = Boolean.TRUE.equals(req.sangradoBop);
        boolean placa = Boolean.TRUE.equals(req.placa);
        int movilidad = req.movilidad != null ? Math.max(0, Math.min(3, req.movilidad)) : 0;
        int furca = req.furca != null ? Math.max(0, Math.min(3, req.furca)) : 0;

        List<Object> vigente = new ArrayList<>(List.of(tenantId, req.pacienteId, req.dienteFdi));
        vigente.addAll(Arrays.asList(sondajes));
        vigente.addAll(Arrays.asList(margenes));
        vigente.addAll(Arrays.asList(bop, placa, movilidad, furca, req.notas));
        jdbcTemplate.update(
            "INSERT INTO salud_periodontograma (" +
            "tenant_id, paciente_id, diente_fdi, sondaje_mv, sondaje_v, sondaje_dv, " +
            "sondaje_ml, sondaje_l, sondaje_dl, margen_mv, margen_v, margen_dv, margen_ml, margen_l, margen_dl, " +
            "sangrado_bop, placa, movilidad, furca, notas, fecha_registro" +
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()) " +
            "ON CONFLICT (paciente_id, diente_fdi) DO UPDATE SET " +
            "sondaje_mv = EXCLUDED.sondaje_mv, sondaje_v = EXCLUDED.sondaje_v, sondaje_dv = EXCLUDED.sondaje_dv, " +
            "sondaje_ml = EXCLUDED.sondaje_ml, sondaje_l = EXCLUDED.sondaje_l, sondaje_dl = EXCLUDED.sondaje_dl, " +
            "margen_mv = EXCLUDED.margen_mv, margen_v = EXCLUDED.margen_v, margen_dv = EXCLUDED.margen_dv, " +
            "margen_ml = EXCLUDED.margen_ml, margen_l = EXCLUDED.margen_l, margen_dl = EXCLUDED.margen_dl, " +
            "sangrado_bop = EXCLUDED.sangrado_bop, placa = EXCLUDED.placa, movilidad = EXCLUDED.movilidad, " +
            "furca = EXCLUDED.furca, notas = EXCLUDED.notas, fecha_registro = now()",
            vigente.toArray()
        );

        List<Object> historial = new ArrayList<>(List.of(tenantId, req.pacienteId, req.dienteFdi));
        historial.addAll(Arrays.asList(sondajes));
        historial.addAll(Arrays.asList(margenes));
        historial.addAll(Arrays.asList(bop, placa, movilidad, furca, AuthContext.getUsername()));
        jdbcTemplate.update(
            "INSERT INTO salud_periodontograma_historial (" +
            "tenant_id, paciente_id, diente_fdi, sondaje_mv, sondaje_v, sondaje_dv, sondaje_ml, sondaje_l, sondaje_dl, " +
            "margen_mv, margen_v, margen_dv, margen_ml, margen_l, margen_dl, sangrado_bop, placa, movilidad, furca, usuario" +
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            historial.toArray()
        );

        return ResponseEntity.ok(Map.of("mensaje", "Medicion periodontal actualizada correctamente."));
    }

    private static int sondaje(Integer mm) {
        return mm != null ? Math.max(0, Math.min(15, mm)) : 1;
    }

    // Margen gingival: positivo = recesion, negativo = agrandamiento gingival.
    private static int margen(Integer mm) {
        return mm != null ? Math.max(-10, Math.min(15, mm)) : 0;
    }

    /**
     * Estado periodontal tal como estaba al cierre de una fecha (la ultima medicion
     * de cada pieza hasta ese dia), mas las fechas con mediciones para elegir.
     */
    @GetMapping("/periodontograma/historial")
    public ResponseEntity<?> periodontogramaHistorico(@RequestParam Long pacienteId, @RequestParam(required = false) String fecha) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);

        List<String> fechas = jdbcTemplate.queryForList(
            "SELECT DISTINCT CAST(fecha_registro AS date)::text AS f FROM salud_periodontograma_historial " +
            "WHERE tenant_id = ? AND paciente_id = ? ORDER BY f DESC",
            String.class, tenantId, pacienteId);

        List<Map<String, Object>> filas = List.of();
        if (fecha != null && !fecha.isBlank()) {
            try {
                LocalDate.parse(fecha);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha invalida.");
            }
            filas = jdbcTemplate.queryForList(
                "SELECT DISTINCT ON (diente_fdi) * FROM salud_periodontograma_historial " +
                "WHERE tenant_id = ? AND paciente_id = ? AND fecha_registro < (CAST(? AS date) + 1) " +
                "ORDER BY diente_fdi, fecha_registro DESC, id DESC",
                tenantId, pacienteId, fecha);
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("fechas", fechas);
        resp.put("filas", filas);
        return ResponseEntity.ok(resp);
    }

    // ==========================================
    // 2. PLANES DE TRATAMIENTO Y FASES
    // ==========================================

    @GetMapping("/planes")
    public ResponseEntity<?> listarPlanes(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);
        BigDecimal tasaBcv = obtenerTasaBcv(tenantId);

        List<Map<String, Object>> planes = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND paciente_id = ? ORDER BY id DESC",
            tenantId, pacienteId
        );

        for (Map<String, Object> p : planes) {
            Long planId = ((Number) p.get("id")).longValue();
            List<Map<String, Object>> items = jdbcTemplate.queryForList(
                "SELECT * FROM salud_odontologia_plan_items WHERE tenant_id = ? AND plan_id = ? ORDER BY id ASC",
                tenantId, planId
            );
            p.put("items", items);
            p.put("tasaBcv", tasaBcv);
            p.put("saldo_pendiente_usd",
                ((BigDecimal) p.get("monto_total_usd")).subtract((BigDecimal) p.get("monto_pagado_usd")));
        }

        return ResponseEntity.ok(planes);
    }

    public static class CrearPlanRequest {
        public Long pacienteId;
        public String nombrePlan;
        public String notas;
        public List<ItemPlanDTO> items;
    }

    public static class ItemPlanDTO {
        public String fase;
        public Integer dienteFdi;
        public String cara;
        public String procedimiento;
        public BigDecimal costoUsd;
        public String odontologoResponsable;
    }

    @PostMapping("/planes")
    @Transactional
    public ResponseEntity<?> crearPlan(@RequestBody CrearPlanRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        BigDecimal tasaBcv = obtenerTasaBcv(tenantId);

        if (req.pacienteId == null || req.nombrePlan == null || req.nombrePlan.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente y nombre del plan son requeridos.");
        }
        validarPacienteDelTenant(tenantId, req.pacienteId);

        BigDecimal totalUsd = BigDecimal.ZERO;
        if (req.items != null) {
            for (ItemPlanDTO item : req.items) {
                if (item.costoUsd != null) {
                    totalUsd = totalUsd.add(item.costoUsd);
                }
            }
        }
        BigDecimal totalVes = totalUsd.multiply(tasaBcv).setScale(2, RoundingMode.HALF_UP);

        Long planId = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_planes_tratamiento (tenant_id, paciente_id, nombre_plan, monto_total_usd, monto_total_ves, notas) " +
            "VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.nombrePlan, totalUsd, totalVes, req.notas
        );

        if (req.items != null) {
            for (ItemPlanDTO item : req.items) {
                jdbcTemplate.update(
                    "INSERT INTO salud_odontologia_plan_items (tenant_id, plan_id, fase, diente_fdi, cara, procedimiento, costo_usd, odontologo_responsable) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    tenantId, planId,
                    item.fase != null ? item.fase : "FASE_1_HIGIENE",
                    item.dienteFdi, item.cara, item.procedimiento,
                    item.costoUsd != null ? item.costoUsd : BigDecimal.ZERO,
                    item.odontologoResponsable
                );
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", planId,
            "mensaje", "Plan de tratamiento creado exitosamente",
            "montoTotalUsd", totalUsd,
            "montoTotalVes", totalVes
        ));
    }

    @PostMapping("/planes/{planId}/aprobar")
    @Transactional
    public ResponseEntity<?> aprobarPlan(@PathVariable Long planId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        int filas = jdbcTemplate.update(
            "UPDATE salud_odontologia_planes_tratamiento SET estado = 'APROBADO', fecha_aprobacion = now() WHERE tenant_id = ? AND id = ?",
            tenantId, planId
        );
        if (filas == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado.");
        }
        return ResponseEntity.ok(Map.of("mensaje", "Plan aprobado por el paciente y listo para ejecucion por fases."));
    }

    public static class AbonoPlanRequest {
        public String claveIdempotencia;
        public BigDecimal montoUsd;
        public String monedaPago;
        public BigDecimal montoRecibido;
        public CobroConsulta.MetodoPago metodoPago;
        public String referenciaPago;
    }

    @GetMapping("/planes/{planId}/abonos")
    public ResponseEntity<?> listarAbonos(@PathVariable Long planId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(jdbcTemplate.queryForList(
            "SELECT a.id, a.monto_usd, a.fecha_registro, c.metodo_pago, c.moneda_pago, c.monto_recibido, " +
            "c.referencia_pago, c.cajero_usuario " +
            "FROM salud_odontologia_plan_abonos a JOIN salud_cobros_consulta c ON c.id = a.cobro_id " +
            "WHERE a.tenant_id = ? AND a.plan_id = ? ORDER BY a.fecha_registro DESC",
            tenantId, planId));
    }

    // Abono a un plan: pasa por el cobro de salud (movimiento real de caja) y
    // solo despues suma al monto pagado del plan.
    @PostMapping("/planes/{planId}/abonos")
    @Transactional
    public ResponseEntity<?> registrarAbono(@PathVariable Long planId, @RequestBody AbonoPlanRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> planes = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND id = ? FOR UPDATE",
            tenantId, planId);
        if (planes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado.");
        }
        Map<String, Object> plan = planes.get(0);
        if ("CANCELADO".equals(plan.get("estado"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se puede abonar a un plan cancelado.");
        }
        if (req.claveIdempotencia == null || req.claveIdempotencia.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clave de idempotencia requerida.");
        }

        // Reintento del mismo abono (doble clic o reconexion): se devuelve lo ya registrado.
        Optional<CobroConsulta> previo = cobroConsultaRepository.findByTenantIdAndClaveIdempotencia(tenantId, req.claveIdempotencia);
        if (previo.isPresent()) {
            return ResponseEntity.ok(Map.of("cobroId", previo.get().getId(), "mensaje", "Abono ya registrado."));
        }

        BigDecimal total = (BigDecimal) plan.get("monto_total_usd");
        BigDecimal pagado = (BigDecimal) plan.get("monto_pagado_usd");
        BigDecimal saldo = total.subtract(pagado);
        if (req.montoUsd == null || req.montoUsd.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto del abono debe ser mayor a cero.");
        }
        if (req.montoUsd.compareTo(saldo) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El abono (" + req.montoUsd + " USD) supera el saldo pendiente del plan (" + saldo + " USD).");
        }

        Long pacienteId = ((Number) plan.get("paciente_id")).longValue();
        Paciente paciente = pacienteRepository.findByTenantIdAndId(tenantId, pacienteId).orElse(null);

        SaludFinanzasService.CobroRequest cobroReq = new SaludFinanzasService.CobroRequest();
        cobroReq.claveIdempotencia = req.claveIdempotencia;
        cobroReq.pacienteId = pacienteId;
        cobroReq.concepto = "Abono plan odontologico: " + plan.get("nombre_plan")
            + (paciente != null ? " - " + paciente.getNombreCompleto() : "");
        cobroReq.montoTotal = req.montoUsd;
        cobroReq.monedaCobrada = "USD";
        cobroReq.monedaPago = req.monedaPago;
        cobroReq.montoRecibido = req.montoRecibido;
        cobroReq.metodoPago = req.metodoPago;
        cobroReq.referenciaPago = req.referenciaPago;
        cobroReq.cajeroUsuario = nombreOdontologo(null);

        CobroConsulta cobro;
        try {
            cobro = saludFinanzasService.procesarCobro(tenantId, cobroReq, paciente);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        jdbcTemplate.update(
            "INSERT INTO salud_odontologia_plan_abonos (tenant_id, plan_id, cobro_id, monto_usd) VALUES (?, ?, ?, ?)",
            tenantId, planId, cobro.getId(), req.montoUsd);
        jdbcTemplate.update(
            "UPDATE salud_odontologia_planes_tratamiento SET monto_pagado_usd = monto_pagado_usd + ? WHERE tenant_id = ? AND id = ?",
            req.montoUsd, tenantId, planId);

        BigDecimal nuevoSaldo = saldo.subtract(req.montoUsd);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "cobroId", cobro.getId(),
            "saldoPendienteUsd", nuevoSaldo,
            "mensaje", "Abono registrado en caja. Saldo pendiente: " + nuevoSaldo + " USD."
        ));
    }

    // 3. DESCARGA AUTOMATICA DE INSUMOS AL REALIZAR PROCEDIMIENTO
    @PostMapping("/planes/items/{itemId}/realizar")
    @Transactional
    public ResponseEntity<?> marcarItemRealizado(@PathVariable Long itemId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_plan_items WHERE tenant_id = ? AND id = ?",
            tenantId, itemId
        );
        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item no encontrado.");
        }
        Map<String, Object> item = filas.get(0);
        String proc = (String) item.get("procedimiento");

        if ("REALIZADO".equals(item.get("estado"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este procedimiento ya estaba marcado como realizado.");
        }

        jdbcTemplate.update(
            "UPDATE salud_odontologia_plan_items SET estado = 'REALIZADO', fecha_realizado = now(), " +
            "odontologo_responsable = COALESCE(odontologo_responsable, ?) WHERE tenant_id = ? AND id = ?",
            nombreOdontologo(null), tenantId, itemId
        );

        // El plan pasa a EN_CURSO con el primer item hecho y a COMPLETADO cuando
        // no quedan items pendientes.
        Long planId = ((Number) item.get("plan_id")).longValue();
        Integer pendientes = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM salud_odontologia_plan_items WHERE tenant_id = ? AND plan_id = ? AND estado NOT IN ('REALIZADO', 'ANULADO')",
            Integer.class, tenantId, planId
        );
        String estadoPlan = (pendientes != null && pendientes == 0) ? "COMPLETADO" : "EN_CURSO";
        jdbcTemplate.update(
            "UPDATE salud_odontologia_planes_tratamiento SET estado = ? WHERE tenant_id = ? AND id = ? AND estado <> 'CANCELADO'",
            estadoPlan, tenantId, planId
        );

        // Descuento real del inventario segun el kit del procedimiento; lo que no se
        // pudo descontar queda informado en el item, sin revertir el procedimiento.
        OdontologiaInsumosService.ResultadoDescuento descuento = odontologiaInsumosService.descontarKit(tenantId, proc, itemId);
        jdbcTemplate.update(
            "UPDATE salud_odontologia_plan_items SET kit_descargado = ?, detalle_insumos = ? WHERE tenant_id = ? AND id = ?",
            descuento.completo(), descuento.resumen(), tenantId, itemId
        );

        return ResponseEntity.ok(Map.of(
            "mensaje", "Procedimiento completado. " + descuento.resumen(),
            "estado", "REALIZADO",
            "estadoPlan", estadoPlan,
            "insumos", descuento.comoMapa()
        ));
    }

    // ==========================================
    // 4. AGENDA MULTIDIMENSIONAL (Sillon + Doctor + Paciente)
    // ==========================================

    @GetMapping("/agenda")
    public ResponseEntity<?> listarAgenda(
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) Long pacienteId) {
        Long tenantId = TenantContext.getCurrentTenant();
        String f = (fecha != null && !fecha.isBlank()) ? fecha : LocalDate.now().toString();

        List<Map<String, Object>> citas;
        if (pacienteId != null) {
            citas = jdbcTemplate.queryForList(
                "SELECT c.*, (p.nombres || ' ' || p.apellidos) as nombre_paciente, p.identificacion as cedula_paciente, p.telefono as telefono_paciente " +
                "FROM salud_odontologia_citas_agenda c " +
                "JOIN salud_pacientes p ON c.paciente_id = p.id " +
                "WHERE c.tenant_id = ? AND c.paciente_id = ? ORDER BY c.fecha_cita ASC, c.hora_inicio ASC",
                tenantId, pacienteId
            );
        } else {
            citas = jdbcTemplate.queryForList(
                "SELECT c.*, (p.nombres || ' ' || p.apellidos) as nombre_paciente, p.identificacion as cedula_paciente, p.telefono as telefono_paciente " +
                "FROM salud_odontologia_citas_agenda c " +
                "JOIN salud_pacientes p ON c.paciente_id = p.id " +
                "WHERE c.tenant_id = ? AND c.fecha_cita = ?::date ORDER BY c.sillon_box ASC, c.hora_inicio ASC",
                tenantId, f
            );
        }

        return ResponseEntity.ok(citas);
    }

    public static class CrearCitaRequest {
        public Long pacienteId;
        public String odontologo;
        public String especialidad;
        public String sillonBox;
        public String fechaCita;
        public String horaInicio;
        public String horaFin;
        public String motivo;
    }

    @PostMapping("/agenda")
    @Transactional
    public ResponseEntity<?> crearCita(@RequestBody CrearCitaRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);
        if (req.fechaCita == null || req.horaInicio == null || req.horaFin == null
                || req.motivo == null || req.motivo.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha, hora de inicio, hora de fin y motivo son requeridos.");
        }
        LocalTime inicio;
        LocalTime fin;
        try {
            LocalDate.parse(req.fechaCita);
            inicio = LocalTime.parse(req.horaInicio);
            fin = LocalTime.parse(req.horaFin);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha u hora con formato invalido.");
        }
        if (!fin.isAfter(inicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La hora de fin debe ser posterior a la de inicio.");
        }
        if (req.sillonBox == null || req.sillonBox.isBlank()) {
            req.sillonBox = "SILLON_1";
        }
        req.odontologo = nombreOdontologo(req.odontologo);

        // Dos rangos se solapan si cada uno empieza antes de que termine el otro.
        Integer colisionesSillon = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM salud_odontologia_citas_agenda " +
            "WHERE tenant_id = ? AND fecha_cita = ?::date AND sillon_box = ? " +
            "AND estado NOT IN ('CANCELADA', 'NO_ASISTIO') " +
            "AND hora_inicio < ?::time AND hora_fin > ?::time",
            Integer.class,
            tenantId, req.fechaCita, req.sillonBox, req.horaFin, req.horaInicio
        );

        if (colisionesSillon != null && colisionesSillon > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Colision horaria detectada: El " + req.sillonBox + " ya se encuentra ocupado en ese horario.");
        }

        Integer colisionesDoctor = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM salud_odontologia_citas_agenda " +
            "WHERE tenant_id = ? AND fecha_cita = ?::date AND LOWER(odontologo) = LOWER(?) " +
            "AND estado NOT IN ('CANCELADA', 'NO_ASISTIO') " +
            "AND hora_inicio < ?::time AND hora_fin > ?::time",
            Integer.class,
            tenantId, req.fechaCita, req.odontologo, req.horaFin, req.horaInicio
        );
        if (colisionesDoctor != null && colisionesDoctor > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Colision horaria detectada: " + req.odontologo + " ya tiene otra cita en ese horario.");
        }

        Long citaId = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_citas_agenda " +
            "(tenant_id, paciente_id, odontologo, especialidad, sillon_box, fecha_cita, hora_inicio, hora_fin, motivo) " +
            "VALUES (?, ?, ?, ?, ?, ?::date, ?::time, ?::time, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.odontologo,
            req.especialidad != null ? req.especialidad : "ODONTOLOGIA_GENERAL",
            req.sillonBox,
            req.fechaCita, req.horaInicio, req.horaFin, req.motivo
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", citaId,
            "mensaje", "Cita agendada correctamente sin colisiones."
        ));
    }

    @GetMapping("/agenda/{citaId}/whatsapp-recordatorio")
    public ResponseEntity<?> generarRecordatorioWhatsApp(@PathVariable Long citaId) {
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT c.*, (p.nombres || ' ' || p.apellidos) as nombre_paciente, p.telefono as telefono_paciente " +
            "FROM salud_odontologia_citas_agenda c " +
            "JOIN salud_pacientes p ON c.paciente_id = p.id " +
            "WHERE c.tenant_id = ? AND c.id = ?",
            tenantId, citaId
        );

        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cita no encontrada.");
        }
        Map<String, Object> c = filas.get(0);

        String paciente = (String) c.get("nombre_paciente");
        String doctor = (String) c.get("odontologo");
        String sillon = (String) c.get("sillon_box");
        String fecha = c.get("fecha_cita").toString();
        String hora = c.get("hora_inicio").toString().substring(0, 5);
        String motivo = (String) c.get("motivo");
        String telefono = (String) c.get("telefono_paciente");

        String mensaje = "Estimado(a) " + paciente + ", le recordamos su cita odontologica en nuestra clinica:\n\n" +
            "Fecha: " + fecha + "\n" +
            "Hora: " + hora + "\n" +
            "Doctor(a): " + doctor + "\n" +
            "Area: " + sillon + " (" + motivo + ")\n\n" +
            "Por favor confirme su asistencia respondiendo a este mensaje. Le esperamos puntual.";

        jdbcTemplate.update(
            "UPDATE salud_odontologia_citas_agenda SET recordatorio_whatsapp_enviado = true WHERE tenant_id = ? AND id = ?",
            tenantId, citaId
        );

        return ResponseEntity.ok(Map.of(
            "telefono", telefono != null ? telefono : "",
            "mensaje", mensaje,
            "waLink", "https://wa.me/" + (telefono != null ? telefono.replaceAll("[^0-9]", "") : "") + "?text=" + java.net.URLEncoder.encode(mensaje, java.nio.charset.StandardCharsets.UTF_8)
        ));
    }

    private static final Set<String> ESTADOS_CITA = Set.of(
        "PROGRAMADA", "CONFIRMADA", "EN_SALA", "EN_ATENCION", "COMPLETADA", "CANCELADA", "NO_ASISTIO");

    public static class CambiarEstadoCitaRequest {
        public String estado;
    }

    @PatchMapping("/agenda/{citaId}/estado")
    @Transactional
    public ResponseEntity<?> cambiarEstadoCita(@PathVariable Long citaId, @RequestBody CambiarEstadoCitaRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        String estado = req.estado != null ? req.estado.trim().toUpperCase() : "";
        if (!ESTADOS_CITA.contains(estado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de cita invalido: " + req.estado);
        }
        int filas = jdbcTemplate.update(
            "UPDATE salud_odontologia_citas_agenda SET estado = ? WHERE tenant_id = ? AND id = ?",
            estado, tenantId, citaId
        );
        if (filas == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cita no encontrada.");
        }

        // Al llegar el paciente, entra a la sala de espera compartida de la clinica.
        // citaId queda en null: esa columna apunta a salud_citas (agenda medica).
        boolean enviadoASala = false;
        if ("EN_SALA".equals(estado)) {
            Map<String, Object> cita = jdbcTemplate.queryForMap(
                "SELECT paciente_id, odontologo, sillon_box FROM salud_odontologia_citas_agenda WHERE tenant_id = ? AND id = ?",
                tenantId, citaId);
            Long pacienteId = ((Number) cita.get("paciente_id")).longValue();
            boolean yaEnCola = salaEsperaRepository.findByTenantIdAndEstadoInOrderByHoraLlegadaAsc(
                    tenantId, List.of(SalaEspera.EstadoEspera.EN_ESPERA, SalaEspera.EstadoEspera.EN_CONSULTA))
                .stream()
                .anyMatch(e -> e.getPaciente() != null && pacienteId.equals(e.getPaciente().getId()));
            if (!yaEnCola) {
                SalaEspera entrada = new SalaEspera();
                entrada.setPaciente(pacienteRepository.findByTenantIdAndId(tenantId, pacienteId).orElseThrow());
                entrada.setMedicoNombre((String) cita.get("odontologo"));
                entrada.setConsultorio((String) cita.get("sillon_box"));
                salaEsperaService.checkIn(tenantId, entrada);
                enviadoASala = true;
            }
        }
        return ResponseEntity.ok(Map.of("id", citaId, "estado", estado, "enviadoASalaEspera", enviadoASala));
    }

    // ==========================================
    // 5. RADIOGRAFIAS E IMAGENOLOGIA DENTAL
    // ==========================================

    @GetMapping("/radiografias")
    public ResponseEntity<?> listarRadiografias(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);

        List<Map<String, Object>> fotos = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_radiografias WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_toma DESC, id DESC",
            tenantId, pacienteId
        );
        return ResponseEntity.ok(fotos);
    }

    public static class GuardarRadiografiaRequest {
        public Long pacienteId;
        public String tipoEstudio;
        public String titulo;
        public String urlArchivo;
        public String hallazgos;
        public Integer dienteAsociado;
    }

    @PostMapping("/radiografias")
    @Transactional
    public ResponseEntity<?> guardarRadiografia(@RequestBody GuardarRadiografiaRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        if (req.pacienteId == null || req.titulo == null || req.urlArchivo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente, titulo y archivo son requeridos.");
        }
        validarPacienteDelTenant(tenantId, req.pacienteId);

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_radiografias (tenant_id, paciente_id, tipo_estudio, titulo, url_archivo, hallazgos, diente_asociado) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId,
            req.tipoEstudio != null ? req.tipoEstudio : "PANORAMICA",
            req.titulo, req.urlArchivo, req.hallazgos, req.dienteAsociado
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", id,
            "mensaje", "Radiografia dental guardada en expediente con exito."
        ));
    }

    // ==========================================
    // 6. KITS DE INSUMOS DENTALES
    // ==========================================

    @GetMapping("/kits")
    public ResponseEntity<?> listarKits() {
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> kits = jdbcTemplate.queryForList(
            "SELECT id, procedimiento_clave, nombre_kit, insumos_json::text AS insumos_json, palabras_clave, activo " +
            "FROM salud_odontologia_kits_procedimientos WHERE tenant_id = ? AND activo = true ORDER BY nombre_kit ASC",
            tenantId
        );
        return ResponseEntity.ok(kits);
    }

    // ==========================================
    // 7. ANAMNESIS DE RIESGO ESTOMATOLOGICO
    // ==========================================

    @GetMapping("/anamnesis")
    public ResponseEntity<?> obtenerAnamnesis(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_anamnesis_riesgo WHERE tenant_id = ? AND paciente_id = ?",
            tenantId, pacienteId
        );

        if (filas.isEmpty()) {
            // Retorno inicial por defecto
            Map<String, Object> def = new HashMap<>();
            def.put("paciente_id", pacienteId);
            def.put("alergia_anestesia", false);
            def.put("toma_anticoagulantes", false);
            def.put("profilaxis_antibiotica_requerida", false);
            def.put("trastorno_coagulacion", false);
            def.put("hipertension", false);
            def.put("diabetes", false);
            def.put("embarazo_lactancia", false);
            def.put("bruxismo_atm", false);
            def.put("tabaquismo", false);
            def.put("detalle_alergias", "");
            def.put("observaciones_medicas", "");
            return ResponseEntity.ok(def);
        }

        return ResponseEntity.ok(filas.get(0));
    }

    public static class ActualizarAnamnesisRequest {
        public Long pacienteId;
        public Boolean alergiaAnestesia;
        public String detalleAlergias;
        public Boolean tomaAnticoagulantes;
        public Boolean profilaxisAntibioticaRequerida;
        public Boolean trastornoCoagulacion;
        public Boolean hipertension;
        public Boolean diabetes;
        public Boolean embarazoLactancia;
        public Boolean bruxismoAtm;
        public Boolean tabaquismo;
        public String observacionesMedicas;
    }

    @PutMapping("/anamnesis")
    @Transactional
    public ResponseEntity<?> actualizarAnamnesis(@RequestBody ActualizarAnamnesisRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        if (req.pacienteId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente ID requerido.");
        }
        validarPacienteDelTenant(tenantId, req.pacienteId);

        jdbcTemplate.update(
            "INSERT INTO salud_odontologia_anamnesis_riesgo (" +
            "tenant_id, paciente_id, alergia_anestesia, detalle_alergias, toma_anticoagulantes, " +
            "profilaxis_antibiotica_requerida, trastorno_coagulacion, hipertension, diabetes, " +
            "embarazo_lactancia, bruxismo_atm, tabaquismo, observaciones_medicas, fecha_actualizacion" +
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()) " +
            "ON CONFLICT (tenant_id, paciente_id) DO UPDATE SET " +
            "alergia_anestesia = EXCLUDED.alergia_anestesia, detalle_alergias = EXCLUDED.detalle_alergias, " +
            "toma_anticoagulantes = EXCLUDED.toma_anticoagulantes, " +
            "profilaxis_antibiotica_requerida = EXCLUDED.profilaxis_antibiotica_requerida, " +
            "trastorno_coagulacion = EXCLUDED.trastorno_coagulacion, hipertension = EXCLUDED.hipertension, " +
            "diabetes = EXCLUDED.diabetes, embarazo_lactancia = EXCLUDED.embarazo_lactancia, " +
            "bruxismo_atm = EXCLUDED.bruxismo_atm, tabaquismo = EXCLUDED.tabaquismo, " +
            "observaciones_medicas = EXCLUDED.observaciones_medicas, fecha_actualizacion = now()",
            tenantId, req.pacienteId,
            Boolean.TRUE.equals(req.alergiaAnestesia),
            req.detalleAlergias,
            Boolean.TRUE.equals(req.tomaAnticoagulantes),
            Boolean.TRUE.equals(req.profilaxisAntibioticaRequerida),
            Boolean.TRUE.equals(req.trastornoCoagulacion),
            Boolean.TRUE.equals(req.hipertension),
            Boolean.TRUE.equals(req.diabetes),
            Boolean.TRUE.equals(req.embarazoLactancia),
            Boolean.TRUE.equals(req.bruxismoAtm),
            Boolean.TRUE.equals(req.tabaquismo),
            req.observacionesMedicas
        );

        return ResponseEntity.ok(Map.of("mensaje", "Anamnesis de riesgo quirurgico actualizada."));
    }

    // ==========================================
    // 8. BITACORA DE EVOLUCION CLINICA POR SESION
    // ==========================================

    @GetMapping("/evolucion")
    public ResponseEntity<?> listarEvolucion(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);

        List<Map<String, Object>> sesiones = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_evolucion_sesiones WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_sesion DESC, id DESC",
            tenantId, pacienteId
        );
        return ResponseEntity.ok(sesiones);
    }

    public static class RegistrarSesionRequest {
        public Long pacienteId;
        public String fechaSesion;
        public Integer dienteFdi;
        public String procedimientoRealizado;
        public String tecnicaAislamiento;
        public String anestesiaAdministrada;
        public String conductometriaNotas;
        public String medicacionIndicada;
        public String proximaCitaConducta;
        public String odontologo;
    }

    @PostMapping("/evolucion")
    @Transactional
    public ResponseEntity<?> registrarSesion(@RequestBody RegistrarSesionRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        if (req.pacienteId == null || req.procedimientoRealizado == null || req.procedimientoRealizado.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente y procedimiento realizado son requeridos.");
        }
        validarPacienteDelTenant(tenantId, req.pacienteId);

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_evolucion_sesiones (" +
            "tenant_id, paciente_id, fecha_sesion, diente_fdi, procedimiento_realizado, " +
            "tecnica_aislamiento, anestesia_administrada, conductometria_notas, medicacion_indicada, " +
            "proxima_cita_conducta, odontologo" +
            ") VALUES (?, ?, COALESCE(?::date, CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.fechaSesion, req.dienteFdi,
            req.procedimientoRealizado,
            req.tecnicaAislamiento != null ? req.tecnicaAislamiento : "ABSOLUTO_DIQUE",
            req.anestesiaAdministrada,
            req.conductometriaNotas,
            req.medicacionIndicada,
            req.proximaCitaConducta,
            nombreOdontologo(req.odontologo)
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", id,
            "mensaje", "Nota de evolucion clinica registrada con exito."
        ));
    }
}
