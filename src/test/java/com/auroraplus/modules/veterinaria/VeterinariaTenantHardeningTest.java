package com.auroraplus.modules.veterinaria;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.Mascota;
import com.auroraplus.modules.veterinaria.repositories.MascotaRepository;
import com.auroraplus.modules.veterinaria.repositories.PropietarioRepository;
import com.auroraplus.modules.veterinaria.services.MascotaService;
import com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VeterinariaTenantHardeningTest {

    @Mock MascotaRepository mascotaRepository;
    @Mock PropietarioRepository propietarioRepository;
    @InjectMocks MascotaService mascotaService;

    @AfterEach
    void limpiarTenant() {
        TenantContext.clear();
    }

    @Test
    void ignoraLaPosibilidadDeSeleccionarOtroTenant() {
        TenantContext.setCurrentTenant(10L);
        assertEquals(10L, VeterinariaTenantGuard.resolver(null));
        assertEquals(10L, VeterinariaTenantGuard.resolver(10L));
        assertThrows(SecurityException.class, () -> VeterinariaTenantGuard.resolver(20L));
    }

    @Test
    void rechazaRequestSinTenantAutenticado() {
        assertThrows(SecurityException.class, () -> VeterinariaTenantGuard.resolver(10L));
    }

    @Test
    void noPermiteReasignarMascotaDeOtraEmpresaDuranteActualizacion() {
        Mascota datos = new Mascota();
        datos.setId(77L);
        when(mascotaRepository.findByTenantIdAndId(10L, 77L)).thenReturn(Optional.empty());

        assertThrows(SecurityException.class, () -> mascotaService.registrarOActualizar(10L, datos));
        verify(mascotaRepository, never()).save(any());
    }
}
