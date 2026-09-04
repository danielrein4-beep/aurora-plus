package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Auditoria;
import com.auroraplus.modules.tamanacocomercial.repositories.AuditoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tamanaco-comercial/auditoria")
public class AuditoriaController {

    @Autowired
    private AuditoriaRepository auditoriaRepository;

    @GetMapping
    public List<Auditoria> getUltimosRegistros() {
        return auditoriaRepository.findTop500ByOrderByFechaDesc();
    }
}
