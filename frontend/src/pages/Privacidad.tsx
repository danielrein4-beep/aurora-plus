export default function Privacidad() {
  return (
    <main className="pt-28 pb-24 px-4 sm:px-6 max-w-3xl mx-auto">
      <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Legal</p>
      <h1 className="font-['Outfit'] font-black text-4xl sm:text-5xl text-slate-900 dark:text-white mb-4">
        Política de Privacidad
      </h1>
      <p className="text-slate-500 dark:text-white/40 text-sm mb-12">Última actualización: septiembre de 2026.</p>

      <div className="space-y-10 text-slate-600 dark:text-white/60 text-sm leading-relaxed">
        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">1. Qué datos recolectamos</h2>
          <p>Recolectamos la información que tú o tu negocio ingresan directamente a la plataforma: datos de tu cuenta (nombre, correo, contraseña), y los datos operativos propios de tu industria (expedientes de pacientes, inventario, ventas, cotizaciones, etc., según el módulo que uses).</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">2. Cómo protegemos tus datos</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Toda la comunicación entre tu navegador y nuestros servidores viaja cifrada (HTTPS).</li>
            <li>Las contraseñas nunca se guardan en texto plano — se almacenan con un algoritmo de cifrado unidireccional (BCrypt).</li>
            <li>La base de datos tiene respaldo automático diario.</li>
            <li>Los datos de tu negocio están aislados de los de cualquier otro negocio que use Aurora Plus (arquitectura multi-tenant).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">3. Con quién compartimos tus datos</h2>
          <p>No vendemos ni compartimos tus datos con terceros para publicidad. No usamos redes de rastreo o analítica de terceros en la plataforma. Solo el equipo de Aurora Plus tiene acceso administrativo a los servidores, y únicamente para fines de soporte técnico y mantenimiento.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">4. Cuánto tiempo guardamos tus datos</h2>
          <p>Mientras tu cuenta esté activa, conservamos tus datos para que puedas seguir operando con ellos. Si cierras tu cuenta o solicitas la eliminación de tus datos, los eliminamos de nuestros sistemas de producción; los respaldos automáticos se sobrescriben según nuestra política de retención de respaldos.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">5. Tus derechos</h2>
          <p>Puedes solicitarnos en cualquier momento una copia de tus datos, o pedir que los eliminemos, escribiéndonos directamente. Estamos trabajando en habilitar estas solicitudes directamente desde la plataforma.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">6. Cambios a esta política</h2>
          <p>Si cambiamos esta política de forma significativa, te avisaremos por correo o dentro de la plataforma antes de que entre en vigencia.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">7. Contacto</h2>
          <p>Para cualquier pregunta sobre tus datos o esta política, escríbenos a <span className="text-teal-600 dark:text-teal-400 font-medium">auroraplussoftware@gmail.com</span>.</p>
        </section>
      </div>
    </main>
  );
}
