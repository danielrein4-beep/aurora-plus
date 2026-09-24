package com.auroraplus.modules.pacientesapp.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Interruptor de Mediclinic Pacientes. Apagado por defecto: mientras esté apagado,
 * ninguna ruta de la app ni de la bandeja de solicitudes responde (404), y las
 * clínicas no ven nada nuevo. Se prende con AURORA_PACIENTES_APP=true.
 */
@Component
public class PacientesAppConfig {

    @Value("${aurora.pacientes-app.habilitada:${AURORA_PACIENTES_APP:false}}")
    private boolean habilitada;

    public boolean habilitada() {
        return habilitada;
    }

    public void exigirHabilitada() {
        if (!habilitada) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No encontrado");
    }
}
