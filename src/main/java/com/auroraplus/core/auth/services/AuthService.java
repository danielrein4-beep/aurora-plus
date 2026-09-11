package com.auroraplus.core.auth.services;

import com.auroraplus.core.auth.entities.TokenRecuperacionClave;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import com.auroraplus.core.auth.repositories.TokenRecuperacionClaveRepository;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import com.auroraplus.core.config.CorreoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuthService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private UsuarioSuperAdminRepository usuarioSuperAdminRepository;

    @Autowired
    private TokenRecuperacionClaveRepository tokenRecuperacionClaveRepository;

    @Autowired
    private CorreoService correoService;

    @Autowired
    private JwtService jwtService;

    @Value("${app.frontend.url:http://localhost:8443}")
    private String frontendUrl;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public static class ResultadoLogin {
        public final String token;
        public final String rol;
        public final String username;
        public final Long tenantId;
        public ResultadoLogin(String token, String rol, String username, Long tenantId) {
            this.token = token;
            this.rol = rol;
            this.username = username;
            this.tenantId = tenantId;
        }
    }

    /**
     * Requisito de producto: distinguir "la cuenta no existe" de "contraseña
     * incorrecta" con un mensaje propio ("Cuenta no existente, por favor
     * registrarse..."). OJO — esto es un trade-off de seguridad deliberado,
     * no un descuido: revelar si un correo/usuario existe o no es lo que se
     * conoce como "enumeración de usuarios" (OWASP), porque le permite a
     * quien ataca probar una lista de correos y aprender cuáles están
     * registrados en Aurora sin nunca acertar una contraseña. Antes de este
     * cambio, login() devolvía el MISMO mensaje genérico en ambos casos
     * exactamente para cerrar esa puerta.
     *
     * Mitigación ya presente en el sistema que hace este riesgo aceptable:
     * RateLimitInterceptor limita /api/auth/login a 5 intentos/minuto por IP
     * (ver WebConfig), así que enumerar en masa es lento y queda registrado.
     * Si el negocio necesita cerrar esto del todo más adelante, la opción es
     * volver al mensaje genérico o añadir CAPTCHA tras varios intentos.
     */
    public ResultadoLogin login(Long tenantId, String username, String password) {
        Usuario usuario = usuarioRepository.buscarPorTenantYUsername(tenantId, username)
            .orElseThrow(() -> new RuntimeException("Cuenta no existente, por favor registrarse..."));

        if (!usuario.isActivo() || !passwordEncoder.matches(password, usuario.getPasswordHash())) {
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        String token = jwtService.generarTokenTenant(tenantId, usuario.getUsername(), usuario.getRol().name(), usuario.getTokenVersion());
        return new ResultadoLogin(token, usuario.getRol().name(), usuario.getUsername(), tenantId);
    }

    /**
     * Login solo con username/password, sin que el cliente conozca su tenantId
     * (pensado para el frontend público, donde el usuario solo tiene un correo
     * y contraseña). Busca el username en todos los tenants; si aparece en más
     * de uno, no se puede resolver de forma segura sin más información.
     */
    public ResultadoLogin loginPorUsername(String username, String password) {
        String cleanUser = username != null ? username.trim() : "";
        List<Usuario> candidatos = usuarioRepository.buscarPorUsernameEnTodosLosTenants(cleanUser);
        if (candidatos.isEmpty() && !cleanUser.contains("@")) {
            candidatos = usuarioRepository.buscarPorUsernameEnTodosLosTenants(cleanUser + "@gmail.com");
        }
        if (candidatos.isEmpty()) {
            // Mismo trade-off deliberado que en login() — ver el comentario ahí.
            throw new RuntimeException("Cuenta no existente, por favor registrarse...");
        }

        // Buscar entre los candidatos aquel cuya contraseña coincida
        List<Usuario> coincidentes = candidatos.stream()
            .filter(u -> u.isActivo() && passwordEncoder.matches(password, u.getPasswordHash()))
            .sorted((a, b) -> Long.compare(b.getTenantId(), a.getTenantId()))
            .toList();

        if (coincidentes.isEmpty()) {
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }
        Usuario usuario = coincidentes.get(0);
        String token = jwtService.generarTokenTenant(usuario.getTenantId(), usuario.getUsername(), usuario.getRol().name(), usuario.getTokenVersion());
        return new ResultadoLogin(token, usuario.getRol().name(), usuario.getUsername(), usuario.getTenantId());
    }

    /** Para el registro público: verificar que el correo elegido no esté ya en uso en ningún tenant. */
    public boolean existeUsername(String username) {
        return !usuarioRepository.buscarPorUsernameEnTodosLosTenants(username).isEmpty();
    }

    public String loginSuperAdmin(String username, String password) {
        UsuarioSuperAdmin admin = usuarioSuperAdminRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Usuario o contraseña incorrectos"));

        if (!admin.isActivo() || !passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        return jwtService.generarTokenSuperAdmin(admin.getUsername());
    }

    public Usuario crearUsuario(Long tenantId, String username, String password, Usuario.Rol rol, String nombreCompleto) {
        if (username == null || username.isBlank()) {
            throw new RuntimeException("El nombre de usuario es obligatorio");
        }
        // Normalizado a minúsculas al guardar: el username casi siempre es un correo, y un correo
        // es case-insensitive por convención — sin esto, "Nombre@Gmail.com" y "nombre@gmail.com"
        // podían terminar como dos filas "distintas" con la misma identidad real.
        String usernameNormalizado = username.trim().toLowerCase();
        if (password == null || password.length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }
        if (usuarioRepository.buscarPorTenantYUsername(tenantId, usernameNormalizado).isPresent()) {
            throw new RuntimeException("Ya existe un usuario '" + username + "' en este negocio");
        }

        Usuario usuario = new Usuario();
        usuario.setTenantId(tenantId);
        usuario.setUsername(usernameNormalizado);
        usuario.setPasswordHash(passwordEncoder.encode(password));
        usuario.setRol(rol);
        usuario.setNombreCompleto(nombreCompleto);
        return usuarioRepository.save(usuario);
    }

    public List<Usuario> listarUsuarios(Long tenantId) {
        return usuarioRepository.findByTenantId(tenantId);
    }

    public void desactivarUsuario(Long tenantId, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (!usuario.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: usuario no pertenece a este tenant");
        }
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }

    public void crearSuperAdmin(String username, String password) {
        UsuarioSuperAdmin admin = new UsuarioSuperAdmin();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(password));
        usuarioSuperAdminRepository.save(admin);
    }

    private String generarToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    /**
     * "Olvidé mi clave": genera un token de un solo uso (30 min de vigencia) y lo manda por correo
     * con el link de reseteo. Deliberadamente NO indica si el correo existe o no en la respuesta —
     * eso evita que alguien use este endpoint para averiguar qué correos están registrados
     * (enumeración de usuarios). Si hay más de una cuenta con ese correo (en distintos tenants), se
     * manda un token para cada una.
     */
    @Transactional
    public void solicitarRecuperacionClave(String email) {
        if (email == null || email.isBlank()) return;
        List<Usuario> candidatos = usuarioRepository.buscarPorUsernameEnTodosLosTenants(email.trim());
        for (Usuario usuario : candidatos) {
            if (!usuario.isActivo()) continue;
            TokenRecuperacionClave token = new TokenRecuperacionClave();
            token.setUsuarioId(usuario.getId());
            token.setToken(generarToken());
            token.setExpiraEn(LocalDateTime.now().plusMinutes(30));
            tokenRecuperacionClaveRepository.save(token);

            String enlace = frontendUrl + "/resetear-clave?token=" + token.getToken();
            String cuerpo = "<p>Hola,</p>"
                + "<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Aurora Plus (" + usuario.getUsername() + ").</p>"
                + "<p><a href=\"" + enlace + "\">Haz clic aquí para elegir una nueva contraseña</a></p>"
                + "<p>Este enlace vence en 30 minutos. Si no fuiste tú quien lo solicitó, puedes ignorar este correo.</p>";
            correoService.enviarHtml(usuario.getUsername(), "Restablecer tu contraseña — Aurora Plus", cuerpo);
        }
    }

    /** Aplica la nueva contraseña si el token es válido, no venció y no se usó antes. */
    @Transactional
    public void resetearClave(String token, String nuevaClave) {
        if (nuevaClave == null || nuevaClave.length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }
        TokenRecuperacionClave tokenEntity = tokenRecuperacionClaveRepository.findByToken(token)
            .orElseThrow(() -> new RuntimeException("Enlace de recuperación inválido"));
        if (tokenEntity.isUsado()) {
            throw new RuntimeException("Este enlace ya fue usado — solicita uno nuevo");
        }
        if (tokenEntity.getExpiraEn().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Este enlace venció — solicita uno nuevo");
        }
        Usuario usuario = usuarioRepository.findById(tokenEntity.getUsuarioId())
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setPasswordHash(passwordEncoder.encode(nuevaClave));
        // Invalida cualquier token emitido antes de este cambio — ver el comentario en
        // Usuario.tokenVersion y la verificación en TenantInterceptor.
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.save(usuario);

        tokenEntity.setUsado(true);
        tokenRecuperacionClaveRepository.save(tokenEntity);
    }
}
