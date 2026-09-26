package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Alta y edición de la ficha de un animal (el traslado entre potreros está en GanaderiaMovimientoService). */
@Service
public class GanaderiaAnimalService {

    @Autowired private AnimalRepository animalRepository;
    @Autowired private PotreroRepository potreroRepository;
    @Autowired private GanaderiaEngordeService engordeService;
    @Autowired private BajaAnimalRepository bajaAnimalRepository;
    @Autowired private PublicacionesMercadoService publicacionesMercado;

    /** Causa de baja que no es una muerte: el animal sale del hato como ROBADO y no cuenta en la mortalidad. */
    public static final String CAUSA_ROBO = "Robo / abigeato";

    /** Datos del alta de un animal (lo que manda la pantalla). */
    public static class DatosAlta {
        public String arete; // identificador único — puede ser el número de arete físico, chip o QR según tipoIdentificador
        public String tipoIdentificador; // ARETE, CHIP o QR (por defecto ARETE)
        public String nombre;
        public String especie; // BOVINO, CAPRINO, OVINO, PORCINO... (por defecto BOVINO)
        public String raza; // libre, se puede repetir entre animales
        public String sexo; // MACHO o HEMBRA
        public String tipoAnimal; // libre: TERNERO, NOVILLA, VACA, TORO...
        public LocalDate fechaNacimiento;
        public BigDecimal pesoActual;
        public BigDecimal valorEstimado; // opcional — valor de referencia contable para un animal que YA se tenía (no una compra real)
        public Long potreroId;
        public String lote; // Grupo de entrada conjunta o proveedor
        public Long madreId; // opcional: vínculo con la madre para trazabilidad genealógica / nacimiento
        public BigDecimal costoAdquisicion; // precio real de compra o costo inicial
        public String estadoReproductivo; // VACIA, PREÑADA, EN_ESPERA
        public String estadoProductivo; // CRIANDO, ORDEÑO, SECA
    }

    /**
     * Alta directa (nacimiento en finca, compra o animal preexistente), con madre y costo opcionales.
     * El peso de ingreso queda como primer pesaje; todo en una sola transacción.
     */
    @Transactional
    public Animal alta(Long tenantId, DatosAlta d) {
        if (d.arete == null || d.arete.isBlank()) {
            throw new RuntimeException("El identificador del animal (arete/chip/QR) es obligatorio — es como usted lo distingue de los demás");
        }
        if (animalRepository.findByAreteAndTenantId(d.arete, tenantId).isPresent()) {
            throw new RuntimeException("Ya existe un animal registrado con el identificador '" + d.arete + "' — cada animal debe tener uno único");
        }

        Animal animal = new Animal();
        animal.setTenantId(tenantId);
        animal.setArete(d.arete);
        animal.setTipoIdentificador(d.tipoIdentificador != null ? d.tipoIdentificador : "ARETE");
        animal.setNombre(d.nombre);
        animal.setEspecie(d.especie != null ? d.especie : "BOVINO");
        animal.setRaza(d.raza);
        animal.setSexo(d.sexo);
        animal.setTipoAnimal(d.tipoAnimal);
        animal.setFechaNacimiento(d.fechaNacimiento);
        animal.setPesoActual(d.pesoActual);
        animal.setLote(d.lote);
        animal.setCostoAdquisicion(d.costoAdquisicion != null ? d.costoAdquisicion : d.valorEstimado);
        if (d.estadoReproductivo != null && !d.estadoReproductivo.isBlank()) animal.setEstadoReproductivo(d.estadoReproductivo);
        if (d.estadoProductivo != null && !d.estadoProductivo.isBlank()) animal.setEstadoProductivo(d.estadoProductivo);
        animal.setEstado("ACTIVO");

        if (d.madreId != null) {
            animalRepository.findById(d.madreId).filter(m -> tenantId.equals(m.getTenantId())).ifPresent(animal::setMadre);
        }
        if (d.potreroId != null) {
            Potrero potrero = potreroRepository.findById(d.potreroId)
                .orElseThrow(() -> new RuntimeException("Potrero no encontrado: " + d.potreroId));
            if (!potrero.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
            }
            animal.setPotrero(potrero);
        }

        Animal guardado = animalRepository.save(animal);
        engordeService.registrarPesoDeIngreso(tenantId, guardado, null);
        return guardado;
    }

    /**
     * Baja de un animal activo: muerte (queda MUERTO) o robo/abigeato (queda ROBADO). Sale del
     * potrero, queda la constancia con fecha, causa y observaciones, y deja de contar en el hato activo.
     */
    @Transactional
    public BajaAnimal registrarBaja(Long tenantId, Long animalId, LocalDate fecha, String motivo, String observaciones) {
        Animal animal = animalRepository.findForUpdateByIdAndTenantId(animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new RuntimeException("El animal ya no está activo (estado actual: " + animal.getEstado() + ")");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new RuntimeException("El motivo de la baja es obligatorio");
        }
        LocalDate dia = fecha != null ? fecha : LocalDate.now();
        if (dia.isAfter(LocalDate.now())) {
            throw new RuntimeException("La fecha de la baja no puede ser futura");
        }
        animal.setEstado(esRobo(motivo) ? "ROBADO" : "MUERTO");
        animal.setPotrero(null);
        animalRepository.save(animal);
        publicacionesMercado.retirarPublicacionesDe(tenantId, animal.getId());

        BajaAnimal baja = new BajaAnimal();
        baja.setTenantId(tenantId);
        baja.setAnimal(animal);
        baja.setFecha(dia);
        baja.setMotivo(motivo.trim());
        baja.setObservaciones(observaciones);
        return bajaAnimalRepository.save(baja);
    }

    public static boolean esRobo(String motivo) {
        return motivo != null && motivo.trim().toLowerCase().startsWith("robo");
    }

    /** Edición de la ficha: solo cambia lo que viene informado. */
    @Transactional
    public Animal actualizar(Long tenantId, Long id, Animal datos) {
        Animal animal = animalRepository.findById(id)
            .filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (datos.getNombre() != null) animal.setNombre(datos.getNombre());
        if (datos.getRaza() != null) animal.setRaza(datos.getRaza());
        if (datos.getTipoAnimal() != null) animal.setTipoAnimal(datos.getTipoAnimal());
        if (datos.getPesoActual() != null) animal.setPesoActual(datos.getPesoActual());
        if (datos.getEstado() != null) animal.setEstado(datos.getEstado());
        if (datos.getLote() != null) animal.setLote(datos.getLote());
        if (datos.getEstadoReproductivo() != null) animal.setEstadoReproductivo(datos.getEstadoReproductivo());
        if (datos.getEstadoProductivo() != null) animal.setEstadoProductivo(datos.getEstadoProductivo());
        Animal guardado = animalRepository.save(animal);
        if (!"ACTIVO".equals(guardado.getEstado())) publicacionesMercado.retirarPublicacionesDe(tenantId, guardado.getId());
        return guardado;
    }
}
