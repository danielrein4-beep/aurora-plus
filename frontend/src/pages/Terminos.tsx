export default function Terminos() {
  return (
    <main className="pt-28 pb-24 px-4 sm:px-6 max-w-3xl mx-auto">
      <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Legal</p>
      <h1 className="font-['Outfit'] font-black text-4xl sm:text-5xl text-slate-900 dark:text-white mb-4">
        Términos de Servicio
      </h1>
      <p className="text-slate-500 dark:text-white/40 text-sm mb-12">Última actualización: septiembre de 2026.</p>

      <div className="space-y-10 text-slate-600 dark:text-white/60 text-sm leading-relaxed">
        <div className="apple-glass rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5">
          <p className="text-amber-700 dark:text-amber-300 font-medium">
            Aurora Plus está en fase de piloto cerrado — todavía no está disponible al 100% para el público general. Estos términos se actualizarán conforme el servicio se abra comercialmente.
          </p>
        </div>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">1. Qué es Aurora Plus</h2>
          <p>Aurora Plus es un software de gestión administrativa multi-industria, ofrecido por el equipo fundador de Aurora Plus. Al usar la plataforma durante la fase de piloto, aceptas que el servicio está en desarrollo activo y puede cambiar sin previo aviso.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">2. Tu cuenta</h2>
          <p>Eres responsable de mantener la confidencialidad de tu usuario y contraseña, y de toda actividad que ocurra bajo tu cuenta. Avísanos de inmediato si sospechas un acceso no autorizado.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">3. Uso aceptable</h2>
          <p>No debes usar Aurora Plus para actividades ilegales, para intentar vulnerar la seguridad de la plataforma, ni para acceder a datos de otros negocios distintos al tuyo.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">4. Pagos y período de prueba</h2>
          <p>Durante la fase de piloto, el acceso se otorga bajo un período de prueba y los pagos, cuando aplican, se coordinan directamente con el equipo de Aurora Plus — todavía no existe cobro automático dentro de la plataforma.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">5. Disponibilidad del servicio</h2>
          <p>Al estar en fase de piloto, Aurora Plus no garantiza un nivel de disponibilidad (SLA) específico todavía. Trabajamos activamente en la estabilidad del servicio y te avisaremos de interrupciones planificadas cuando sea posible.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">6. Tus datos son tuyos</h2>
          <p>Los datos que ingreses a Aurora Plus (información de clientes, pacientes, inventario, etc.) te pertenecen a ti o a tu negocio. Puedes solicitar una copia o la eliminación de tus datos escribiéndonos — ver Política de Privacidad.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">7. Terminación</h2>
          <p>Puedes dejar de usar Aurora Plus en cualquier momento. Nos reservamos el derecho de suspender cuentas que violen estos términos o que representen un riesgo de seguridad para otros usuarios de la plataforma.</p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">8. Ley aplicable y arbitraje</h2>
          <p className="mb-3">
            Estos Términos de Servicio se rigen e interpretan de acuerdo con las leyes de la República Bolivariana de Venezuela.
          </p>
          <p className="mb-3">
            Cualquier controversia, reclamo o discrepancia que surja de estos Términos o del uso de Aurora Plus —incluyendo su existencia, validez, interpretación, alcance o terminación— se resolverá mediante arbitraje institucional administrado por el <strong>Centro de Arbitraje de la Cámara de Caracas (CACC)</strong>, conforme a su Reglamento vigente al momento de iniciarse el procedimiento. El arbitraje será de derecho, con sede en Caracas, Venezuela, y se sustanciará en idioma español. El laudo arbitral será definitivo y vinculante para ambas partes, sin perjuicio de los recursos que la ley venezolana reconozca como irrenunciables.
          </p>
          <p className="mb-3">
            Cualquiera de las partes podrá acudir a un tribunal competente únicamente para solicitar medidas cautelares o de urgencia mientras se constituye el tribunal arbitral, sin que ello implique renuncia al arbitraje como mecanismo de resolución del fondo de la controversia.
          </p>
          <p>
            <strong>Renuncia a acciones colectivas.</strong> Toda controversia se resolverá de forma individual. Ni tú ni Aurora Plus podrán iniciar o participar, como demandante o miembro de una clase, en una demanda o arbitraje colectivo, consolidado o representativo de otros usuarios de la plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-3">9. Contacto</h2>
          <p>Para cualquier pregunta sobre estos términos, escríbenos a <span className="text-teal-600 dark:text-teal-400 font-medium">auroraplussoftware@gmail.com</span>.</p>
        </section>
      </div>
    </main>
  );
}
