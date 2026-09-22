import { useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./home.css";

const SECTORS = [
  { name: "Comercio", label: "Del mostrador a tu próxima decisión.", description: "Conecta las ventas, las existencias y las cuentas de tu negocio. Conoce lo que tienes, lo que vendes y lo que está pendiente.", modules: ["Punto de venta", "Inventario y proveedores", "Catálogo online", "Cuentas por cobrar"], steps: ["Registra la venta", "Actualiza existencias", "Consulta tu caja"], context: "Venta por mostrador", result: "Una operación. Todo en orden." },
  { name: "Restaurantes", label: "Más atención a tus clientes. Más orden en tu operación.", description: "Organiza pedidos, cocina e insumos desde un mismo espacio. Sigue cada comanda hasta el cobro y consulta los movimientos del turno.", modules: ["Comandas y cocina", "Recetas e insumos", "Cobros y caja", "Reportes de ventas"], steps: ["Toma el pedido", "Coordina la cocina", "Registra el cobro"], context: "Servicio del restaurante", result: "Del pedido al cierre de caja." },
  { name: "Salud", label: "La información a mano. El paciente primero.", description: "Reúne la agenda, la historia clínica y el trabajo de recepción. Dale continuidad a cada consulta con información organizada.", modules: ["Agenda médica", "Historias clínicas", "Sala de espera", "Cotizaciones y cobros"], steps: ["Organiza la agenda", "Registra la consulta", "Gestiona el cobro"], context: "Atención en la clínica", result: "Cada consulta, con contexto." },
  { name: "Odontología", label: "Cada tratamiento, con una visión completa.", description: "Organiza el diagnóstico, las fases de tratamiento y los presupuestos. Mantén el seguimiento de cada paciente en un mismo lugar.", modules: ["Odontograma", "Periodontograma", "Planes de tratamiento", "Presupuestos"], steps: ["Registra el diagnóstico", "Planifica las fases", "Consulta el avance"], context: "Plan de tratamiento", result: "Claridad para ti y tu paciente." },
  { name: "Ganadería", label: "Conoce tu finca. Cuida cada detalle.", description: "Lleva el registro de animales, potreros, producción y sanidad. Consulta el historial que necesitas para decidir en el campo.", modules: ["Registro de animales", "Rotación de potreros", "Sanidad y vacunación", "Producción y ventas"], steps: ["Registra el animal", "Controla su sanidad", "Sigue la producción"], context: "Gestión de la finca", result: "Información que sigue a tu ganado." },
] as const;

const FAQ = [
  { question: "¿Aurora se adapta a mi tipo de negocio?", answer: "Aurora tiene herramientas específicas para comercio, restaurantes, salud, odontología y ganadería. En la sección Industrias puedes conocer el alcance de cada solución. Nuestro equipo también puede ayudarte a revisar cuál corresponde a tu operación." },
  { question: "¿Puedo trabajar con diferentes monedas?", answer: "Aurora contempla USD, bolívares y pesos colombianos. Las operaciones que requieren conversión utilizan las tasas configuradas para tu negocio. El alcance de cada flujo depende del módulo que utilices." },
  { question: "¿Tengo que instalar un programa?", answer: "Puedes acceder desde el navegador de tu computadora, tablet o teléfono. Para comenzar, crea tu cuenta y configura tu negocio. Las funciones que trabajan con dispositivos o sin conexión tienen requisitos específicos." },
  { question: "¿Cómo sé qué plan necesito?", answer: "Básico reúne las herramientas esenciales de cada sector. Full suma funcionalidades especializadas y acompañamiento. Puedes comparar los planes publicados o contactar al equipo para revisar tu caso antes de elegir." },
];

/** Editorial illustration of a workflow, never a source of business metrics. */
function OperationPreview() {
  return (
    <figure className="lp-preview">
      <div className="lp-preview-top">
        <span className="lp-preview-brand">aurora<span>+</span></span>
        <span>Tu espacio de trabajo</span><span className="lp-preview-avatar" aria-hidden="true">A</span>
      </div>
      <div className="lp-preview-body">
        <div className="lp-preview-heading"><span className="lp-overline">VISTA GENERAL</span><span className="lp-preview-date">Todo conectado</span></div>
        <h2>La tranquilidad de<br />tenerlo en orden.</h2>
        <div className="lp-preview-summary">
          <span>Tu operación</span><strong>Una sola visión.</strong>
          <p>Ventas, inventario y caja, en el mismo lugar.</p><div className="lp-preview-rule" />
        </div>
        <div className="lp-preview-feed">
          <div><span className="lp-preview-index">01</span><span><strong>Venta registrada</strong><small>El comienzo de todo</small></span><span className="lp-status">Ventas</span></div>
          <div><span className="lp-preview-index">02</span><span><strong>Existencias actualizadas</strong><small>Cada movimiento cuenta</small></span><span className="lp-status">Inventario</span></div>
          <div><span className="lp-preview-index">03</span><span><strong>Información para decidir</strong><small>Consulta el resultado</small></span><span className="lp-status">Reportes</span></div>
        </div>
      </div>
      <figcaption>Visualización ilustrativa del flujo de trabajo</figcaption>
    </figure>
  );
}

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [sectorIndex, setSectorIndex] = useState(0);
  const sector = SECTORS[sectorIndex];
  const accountPath = isLoggedIn ? "/dashboard" : "/auth";
  const accountLabel = isLoggedIn ? "Ir a mi cuenta" : "Comenzar con Aurora";

  function handleSectorKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % SECTORS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + SECTORS.length) % SECTORS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = SECTORS.length - 1;
    else return;
    event.preventDefault();
    setSectorIndex(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <main className="premium-home" id="contenido-principal">
      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-overline lp-hero-kicker"><span aria-hidden="true" /> SOFTWARE DE GESTIÓN EMPRESARIAL</p>
            <h1 id="lp-title">Tu negocio,<br /><span>bajo control.</span></h1>
            <p className="lp-lead">Menos tareas dispersas. Más claridad para decidir.</p>
            <p className="lp-hero-description">Ventas, inventario y administración conectados, con herramientas que entienden cómo trabaja tu negocio.</p>
            <div className="lp-actions">
              <Link className="lp-button lp-button-dark" to={accountPath}>{accountLabel}<span aria-hidden="true">↗</span></Link>
              <a className="lp-text-link" href="#sectores">Encuentra tu solución<span aria-hidden="true">↓</span></a>
            </div>
            <div className="lp-hero-note"><span>Desde <strong>US$25 / mes</strong></span><span className="lp-note-separator" aria-hidden="true" /><span>Accede desde tu navegador</span></div>
          </div>
          <div className="lp-hero-visual">
            <span className="lp-visual-label">ORDEN PARA TU DÍA A DÍA</span><OperationPreview />
            <span className="lp-visual-footnote">El trabajo fluye. Tú ves el panorama completo.</span>
          </div>
        </div>
        <div className="lp-container lp-sector-strip">
          <span>Un mismo propósito.<br /><strong>Distintas formas de trabajar.</strong></span>
          <ul aria-label="Sectores de Aurora"><li>Comercio</li><li>Restaurantes</li><li>Salud</li><li>Odontología</li><li>Ganadería</li></ul>
        </div>
      </section>

      <section className="lp-section lp-container" id="plataforma" aria-labelledby="lp-value-title">
        <div className="lp-section-heading">
          <div><p className="lp-overline">EL ORDEN CAMBIA TODO</p><h2 id="lp-value-title">Menos piezas sueltas.<br />Más negocio.</h2></div>
          <p>Cuando la información está conectada, el trabajo se vuelve más claro. Para ti y para tu equipo.</p>
        </div>
        <div className="lp-value-grid">
          <article><span className="lp-index">01 / OPERACIÓN</span><h3>Tu día, sin perder el hilo.</h3><p>Registra ventas, consulta existencias y organiza las tareas de tu sector desde un mismo espacio.</p><Link className="lp-inline-link" to="/soluciones">Conoce la plataforma <span aria-hidden="true">↗</span></Link></article>
          <article><span className="lp-index">02 / ADMINISTRACIÓN</span><h3>Las cuentas, más claras.</h3><p>Revisa ingresos, gastos y cuentas pendientes. Identifica lo que necesita tu atención con información de tu operación.</p><Link className="lp-inline-link" to="/soluciones">Explora las herramientas <span aria-hidden="true">↗</span></Link></article>
          <article><span className="lp-index">03 / EQUIPO</span><h3>Cada persona, en su lugar.</h3><p>Organiza los accesos por rol y consulta los registros disponibles de actividad de tu negocio.</p><Link className="lp-inline-link" to="/industrias">Encuentra tu solución <span aria-hidden="true">↗</span></Link></article>
        </div>
      </section>

      <section className="lp-industries" id="sectores" aria-labelledby="lp-sector-title">
        <div className="lp-container">
          <div className="lp-section-heading"><div><p className="lp-overline">HECHO PARA TU FORMA DE TRABAJAR</p><h2 id="lp-sector-title">Tu sector tiene sus reglas.<br />Tu software también.</h2></div><Link className="lp-text-link" to="/industrias">Todas las soluciones <span aria-hidden="true">↗</span></Link></div>
          <div className="lp-sector-tabs" role="tablist" aria-label="Explorar por sector">
            {SECTORS.map((item, index) => <button type="button" key={item.name} role="tab" id={`lp-sector-${index}`} aria-controls="lp-sector-panel" aria-selected={sectorIndex === index} tabIndex={sectorIndex === index ? 0 : -1} onClick={() => setSectorIndex(index)} onKeyDown={(event) => handleSectorKey(event, index)}>{item.name}</button>)}
          </div>
          <div className="lp-sector-panel" id="lp-sector-panel" role="tabpanel" aria-labelledby={`lp-sector-${sectorIndex}`} tabIndex={0}>
            <div className="lp-sector-description">
              <span className="lp-sector-label">AURORA / {sector.name.toLocaleUpperCase("es")}</span><h3>{sector.label}</h3><p>{sector.description}</p>
              <ul>{sector.modules.map((module) => <li key={module}>{module}</li>)}</ul>
              <Link className="lp-button lp-button-outline" to="/industrias">Conocer el alcance <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="lp-workflow" aria-label={`Ejemplo de flujo de ${sector.name}`}>
              <div className="lp-workflow-header"><span>{sector.context}</span><span aria-hidden="true">A+</span></div>
              <ol>{sector.steps.map((step, index) => <li key={step}><span className="lp-workflow-number">0{index + 1}</span><span>{step}</span></li>)}</ol>
              <div className="lp-workflow-result"><span className="lp-overline">EL RESULTADO</span><strong>{sector.result}</strong><small>Flujo ilustrativo. Funciones según módulo y plan.</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-container lp-principles" aria-labelledby="lp-principles-title">
        <div className="lp-principles-intro"><p className="lp-overline">PENSADO PARA EL TRABAJO REAL</p><h2 id="lp-principles-title">La complejidad es nuestra.<br /><span>La claridad es tuya.</span></h2><p>Una experiencia que pone primero lo que necesitas hacer. Sin obligarte a entender cómo está construido el software.</p><Link className="lp-text-link" to="/nosotros">Conoce al equipo <span aria-hidden="true">↗</span></Link></div>
        <div className="lp-principle-list">
          <article><span>01</span><div><h3>Habla el idioma de tu negocio.</h3><p>Comandas, pacientes, productos o animales. Herramientas organizadas alrededor de tu trabajo.</p></div></article>
          <article><span>02</span><div><h3>Cada moneda, con su contexto.</h3><p>Trabaja con USD, bolívares y pesos colombianos, con tasas configuradas para las operaciones que requieren conversión.</p></div></article>
          <article><span>03</span><div><h3>Un equipo con quien conversar.</h3><p>Cuéntanos cómo trabajas. Te ayudamos a entender el alcance de la solución y a elegir por dónde empezar.</p></div></article>
        </div>
      </section>

      <section className="lp-pricing-section" id="planes" aria-labelledby="lp-pricing-title">
        <div className="lp-container">
          <div className="lp-section-heading"><div><p className="lp-overline">UNA INVERSIÓN CON SENTIDO</p><h2 id="lp-pricing-title">Empieza con lo esencial.<br />Avanza a tu ritmo.</h2></div><p>Elige según tu operación.<br />Consulta los detalles y condiciones de cada plan.</p></div>
          <div className="lp-pricing-grid">
            <article className="lp-plan"><div className="lp-plan-heading"><h3>Aurora Básico</h3><span>PARA EMPEZAR</span></div><p>Orden para el día a día de tu negocio.</p><div className="lp-price"><strong>US$25</strong><span>/ mes</span></div><ul><li>Herramientas esenciales de tu sector</li><li>Acceso web desde computadora y móvil</li><li>Inventario, caja y reportes según módulo</li></ul><Link className="lp-button lp-button-outline" to="/precios">Ver plan Básico <span aria-hidden="true">↗</span></Link></article>
            <article className="lp-plan lp-plan-featured"><div className="lp-plan-heading"><h3>Aurora Full</h3><span>PARA IR MÁS ALLÁ</span></div><p>Más herramientas para una operación más completa.</p><div className="lp-price"><small>Desde</small><strong>US$40</strong><span>/ mes</span></div><ul><li>Todo lo incluido en Básico</li><li>Funciones especializadas por sector</li><li>Acompañamiento directo del equipo</li></ul><Link className="lp-button lp-button-dark" to="/precios">Explorar plan Full <span aria-hidden="true">↗</span></Link><small className="lp-plan-note">El precio de Full varía según la industria.</small></article>
          </div>
        </div>
      </section>

      <section className="lp-section lp-container lp-faq" aria-labelledby="lp-faq-title">
        <div><p className="lp-overline">ANTES DE EMPEZAR</p><h2 id="lp-faq-title">Hablemos claro.</h2><p>Lo que necesitas saber para dar el siguiente paso.</p><Link className="lp-text-link" to="/nosotros">Tengo otra pregunta <span aria-hidden="true">↗</span></Link></div>
        <div className="lp-faq-list">{FAQ.map((item) => <details key={item.question}><summary>{item.question}<span className="lp-faq-toggle" aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="lp-final" aria-labelledby="lp-final-title">
        <div className="lp-container"><p className="lp-overline">EL SIGUIENTE PASO ES TUYO</p><h2 id="lp-final-title">Dale espacio<br />a lo que viene.</h2><p>Empieza a gestionar tu negocio con más claridad.</p><div className="lp-actions"><Link className="lp-button lp-button-light" to={accountPath}>{accountLabel} <span aria-hidden="true">↗</span></Link><Link className="lp-final-contact" to="/nosotros">Hablemos de tu negocio <span aria-hidden="true">↗</span></Link></div><span className="lp-final-signature" aria-hidden="true">A+</span></div>
      </section>
    </main>
  );
}
