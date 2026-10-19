import type { ReactNode } from "react";

export interface Helpers {
  H2: (props: { children: ReactNode }) => ReactNode;
  P: (props: { children: ReactNode }) => ReactNode;
  UL: (props: { items: string[] }) => ReactNode;
}

export interface Articulo {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  actualizado?: string;
  minutos: number;
  categoria: "Obligaciones" | "Sanciones" | "Interpretacion";
  faq: { q: string; a: string }[];
  cuerpo: (h: Helpers) => ReactNode;
}

const h2 = ({ children }: { children: ReactNode }): ReactNode => (
  <h2 className="mt-10 font-display text-2xl font-bold text-piedra-900">{children}</h2>
);

const p = ({ children }: { children: ReactNode }): ReactNode => (
  <p className="mt-4 leading-relaxed text-piedra-700">{children}</p>
);

const ul = ({ items }: { items: string[] }): ReactNode => (
  <ul className="mt-4 space-y-2.5">
    {items.map((i) => (
      <li key={i} className="flex gap-2.5 leading-relaxed text-piedra-700">
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-riesgo-ok">
          ✓
        </span>
        {i}
      </li>
    ))}
  </ul>
);

export const HELPERS: Helpers = { H2: h2, P: p, UL: ul };

export const ARTICULOS: Articulo[] = [
  {
    slug: "articulo-50-reglamento-ia",
    titulo:
      "Que es el Articulo 50 del Reglamento Europeo de IA (y que te toca a ti)",
    descripcion:
      "Las cuatro obligaciones concretas del Articulo 50 del Reglamento (UE) 2024/1689, exigibles desde el 2 de agosto de 2026, con ejemplos reales de cada una.",
    fecha: "2026-08-15",
    actualizado: "2026-10-18",
    minutos: 7,
    categoria: "Obligaciones",
    faq: [
      {
        q: "Desde cuando es obligatorio el Articulo 50?",
        a: "Desde el 2 de agosto de 2026. El Omnibus Digital solo aplazo las obligaciones de sistemas de alto riesgo a diciembre de 2027 y agosto de 2028; el Articulo 50 mantuvo su fecha original.",
      },
      {
        q: "Me aplica aunque no sea una empresa tecnologica?",
        a: "Si. Basta con que uses un chatbot, un avatar o una herramienta generativa que llegue al publico. No hace falta desarrollar IA. El Articulo 50 se refiere al uso del sistema, no a quien lo fabrica.",
      },
      {
        q: "Es lo mismo que el RGPD?",
        a: "No, pero se cruzan. El RGPD regula el tratamiento de datos personales. El Articulo 50 regula la transparencia sobre el origen de una interaccion o de un contenido.",
      },
    ],
    cuerpo: ({ H2, P, UL }) => (
      <>
        <P>
          Si has llegado aqui, seguramente ya has leido que el AI Act obliga a informar de
          que usas IA, y no tienes claro que significa eso para tu web concreta. Vamos a
          concretarlo.
        </P>

        <P>
          El <strong>Articulo 50</strong> del Reglamento (UE) 2024/1689 es el capitulo de{" "}
          <strong>transparencia</strong>. No habla de riesgos altos, ni de documentacion
          tecnica, ni de auditorias. Habla de una sola cosa:{" "}
          <strong>que nadie tenga que creer algo que no es cierto</strong> sobre quien le
          esta hablando o que esta mirando.
        </P>

        <H2>La idea detras del articulo, en treinta segundos</H2>
        <P>
          El Reglamento asume que la IA se va a usar en sitios donde importa: atencion al
          cliente, reservas, atencion sanitaria, banca. Y que hay dos formas de enganar a
          una persona con tecnologia:
        </P>
        <UL
          items={[
            "Que creas que hablas con una persona cuando hablas con un bot.",
            "Que creas que una imagen es real cuando la genero una maquina.",
          ]}
        />
        <P>
          El Articulo 50 cierra las dos puertas. Todo lo demas (la clasificacion de
          riesgos, los anexos, las fechas de 2027 y 2028) es ruido comparado con esto.
        </P>

        <H2>Las cuatro obligaciones concretas</H2>

        <P>
          <strong className="text-piedra-900">1. Avisar al iniciar la interaccion</strong>{" "}
          (Art. 50.1). Si un sistema de IA habla directamente con una persona fisica
          (chatbot, avatar, asistente de voz, telefono automatizado), esa persona tiene que
          saberlo <strong>antes o en el momento en que empieza la conversacion</strong>. Un
          aviso en el pie de la web no cumple. Oculto en las cookies, tampoco. Tiene que
          aparecer <em>cuando</em> empieza el dialogo.
        </P>
        <P>
          Existe una excepcion muy estrecha: si una persona razonablemente informada,
          observadora y circunspecta podria saberlo sin que se lo digan. En la practica,
          un chatbot de atencion al cliente <strong>no</strong> cumple esa excepcion.
        </P>

        <P>
          <strong className="text-piedra-900">2. Marcar el contenido generado</strong>{" "}
          (Art. 50.2). Quien pone a disposicion un sistema generativo debe hacer que sus
          salidas lleven un <strong>marcado legible por maquina</strong> que permita
          detectar que son sinteticas. Ojo: esto <strong>no es lo mismo</strong> que el
          aviso visible del punto 1. Son dos obligaciones distintas y casi nadie cumple
          las dos.
        </P>
        <P>
          El marcado tecnico va en el{" "}
          <code className="rounded bg-piedra-100 px-1.5 py-0.5 text-sm">head</code> del
          documento, o en los atributos del elemento que contiene el contenido.
        </P>

        <P>
          <strong className="text-piedra-900">3. Etiquetar lo que publicas</strong> (Art.
          50.4). Cuando <em>tu</em>, como responsable del despliegue, publicas texto,
          imagen, audio o video producido por un sistema de IA, tienes que{" "}
          <strong>indicarlo de forma visible</strong>. Aqui la obligacion es tuya, no del
          proveedor de la herramienta.
        </P>

        <P>
          <strong className="text-piedra-900">
            4. Deepfakes y contenido de interes publico
          </strong>{" "}
          (Art. 50.5). El contenido sintetico que se presenta como autentico, y los
          textos de interes publico generados automaticamente, necesitan una{" "}
          <strong>divulgacion explicita</strong>. En imagenes generadas o en obras de arte,
          la obligacion se reduce a hacer publica la existencia del contenido.
        </P>

        <H2>Y los plazos?</H2>
        <P>
          El Articulo 50 es exigible <strong>desde el 2 de agosto de 2026</strong>. Ese
          dia ya paso. El Omnibus Digital de 2026 solo ha aplazado una parte: los sistemas
          de alto riesgo del Anexo III (RRHH, credito, educacion, justicia) se han
          desplazado al <strong>2 de diciembre de 2027</strong>, y los productos
          integrados del Anexo I al <strong>2 de agosto de 2028</strong>. Pero el capitulo
          de transparencia <strong>mantuvo su fecha</strong>.
        </P>
        <P>
          Hay un unico margen adicional: el marcado legible por maquina del Art. 50.2
          para sistemas ya comercializados antes del 2 de agosto de 2026 se extiende
          hasta el <strong>2 de diciembre de 2026</strong>. Los que entren al mercado
          despues de esa fecha deben cumplir ya.
        </P>

        <H2>El error que veo en casi todas las webs</H2>
        <P>
          He escaneado cientos de sitios desde que esto se puso en marcha y el patron se
          repite: el aviso existe, pero <strong>no aparece en la pantalla del chat</strong>.
          Esta en el pie, o en la politica de privacidad, o en una pagina que nadie visita.
          Cumplir el Art. 50.1 exige que el mensaje este <em>antes de la primera
          intervencion</em>.
        </P>
        <P>
          El segundo error es mas caro. Muchos montan el aviso y luego actualizan el tema
          de la web. Un <code className="rounded bg-piedra-100 px-1.5 py-0.5 text-sm">display:none</code>{" "}
          en el CSS lo esconde en movil, y nadie se entera en cuatro meses. Por eso un
          aviso sin vigilancia es una deuda tecnica, no una solucion.
        </P>
      </>
    ),
  },

  {
    slug: "chatbot-sin-aviso-multa",
    titulo: "Mi web tiene un chatbot y no avisa: cuanto me pueden poner?",
    descripcion:
      "Que sancion contempla el Articulo 99 del Reglamento Europeo de IA por no informar de que un visitante esta hablando con una IA, y como se aplica a pymes en Espana.",
    fecha: "2026-09-02",
    minutos: 6,
    categoria: "Sanciones",
    faq: [
      {
        q: "Cual es la multa maxima por no avisar de un chatbot?",
        a: "El Articulo 99 preve hasta 15 millones de euros o el 3 % de la facturacion anual global, la cifra que sea mayor. Para pymes y small caps se aplica la cuantia menor de las dos.",
      },
      {
        q: "De verdad pueden sancionar a una pyme con 15 M?",
        a: "En la practica, no a una pyme pequena. El Reglamento obliga a aplicar la cuantia menor entre el importe fijo y el porcentaje para pymes. El riesgo real es el requerimiento documental, no la multa maxima.",
      },
      {
        q: "Quien puede sancionar? La AEPD?",
        a: "No. En Espana la autoridad competente es la AESIA, la Agencia Espanola de Supervision de la Inteligencia Artificial, con sede en A Coruna y competencia plena desde el 2 de agosto de 2026. La AEPD sigue vigilando el RGPD.",
      },
    ],
    cuerpo: ({ H2, P, UL }) => (
      <>
        <P>
          Esta es la pregunta que mas me llega por email. La respuesta honesta tiene tres
          partes: una cifra, un matiz importante sobre pymes, y una explicacion de por que
          el riesgo real no esta en la multa.
        </P>

        <H2>La cifra</H2>
        <P>
          El <strong>Articulo 99</strong> del Reglamento establece tres tramos:
        </P>
        <UL
          items={[
            "Hasta 35 M o el 7 % de la facturacion global: practicas prohibidas (Art. 5).",
            "Hasta 15 M o el 3 % de la facturacion global: otras obligaciones, incluidas las de transparencia del Art. 50.",
            "Hasta 7,5 M o el 1 %: informacion incorrecta a la autoridad.",
          ]}
        />
        <P>
          Tu incumplimiento, no avisar de que el chatbot es una IA, cae en el{" "}
          <strong>segundo tramo</strong>: 15 M o el 3 %.
        </P>

        <H2>El matiz que cambia todo para una pyme</H2>
        <P>
          El Reglamento contiene una salvaguarda expresa: para las <strong>pymes y las
          small caps</strong> se aplica <strong>la cuantia menor</strong> entre el importe
          fijo y el porcentaje.
        </P>
        <P>
          En la practica, una empresa de 300.000 euros de facturacion calculando un 3 %
          llega a 9.000 euros, y ahi aplica la menor de las dos cifras. En cualquier caso
          sigue siendo una multa, pero no te arruina.
        </P>

        <H2>Por que el riesgo real esta en otro sitio</H2>
        <P>
          El verdadero peligro de un incumplimiento del Art. 50 no es la multa. Es todo lo
          que rodea a la multa:
        </P>
        <UL
          items={[
            "Un requerimiento documental formal de la AESIA, con plazos cortos de respuesta, habitualmente de 10 a 30 dias.",
            "La necesidad de demostrar el cumplimiento cuando no tienes registro de nada.",
            "La perdida de una licitacion o de un cliente corporativo, que ya pide acreditar el uso responsable de IA a sus proveedores.",
            "El precedente: quien no tenia aviso, tampoco lo tendra para todo lo demas.",
          ]}
        />
        <P>
          Una pyme que responde a un requerimiento con{" "}
          <strong>
            si, tenemos el aviso, aqui esta, y ademas vigilamos que siga visible
          </strong>{" "}
          tiene un problema resuelto. Una que responde con{" "}
          <em>creo que lo pusimos en algun momento, dejame que mire</em> tiene un problema
          nuevo.
        </P>

        <H2>Quien sanciona en Espana?</H2>
        <P>
          La <strong>AESIA</strong>, Agencia Espanola de Supervision de la Inteligencia
          Artificial, con sede en A Coruna. Asume sus competencias plenas de inspeccion,
          comprobacion documental y sancion desde el <strong>2 de agosto de 2026</strong>.
        </P>
        <P>
          La <strong>AEPD</strong> sigue vigilando el RGPD. Si tu chatbot ademas recoge
          datos personales sin informar de que es una IA, tienes un problema doble.
        </P>

        <H2>El proyecto de ley espanol que conviene vigilar</H2>
        <P>
          El Gobierno aprobo el 26 de mayo de 2026 el proyecto de Ley Organica de gobernanza
          de la IA, que entre otras cosas preve{" "}
          <strong>sanciones desde 6.000 euros</strong> incluso para infracciones leves. No
          esta en vigor, pero si se aprueba tal como esta, el suelo de la sancion baja
          especificamente para las empresas pequenas. Es el riesgo que mas me preocupa a
          corto plazo.
        </P>
      </>
    ),
  },

  {
    slug: "obligaciones-pymes-ley-ia",
    titulo: "Los cuatro incumplimientos mas comunes en webs espanolas con IA",
    descripcion:
      "Datos reales de escaneos: que encuentra SelloIA en webs de pymes y agencias, con que frecuencia y como se corrige en cinco minutos.",
    fecha: "2026-09-20",
    minutos: 5,
    categoria: "Interpretacion",
    faq: [
      {
        q: "Es obligatorio avisar si uso ChatGPT solo para escribir emails internos?",
        a: "El Articulo 50 no aplica a uso interno: regula la interaccion con personas fisicas y la publicacion de contenido. Pero si es exigible el Articulo 4, medidas de alfabetizacion en IA para el personal que usa esas herramientas, desde el 2 de febrero de 2025.",
      },
      {
        q: "El aviso tiene que estar en espanol?",
        a: "La obligacion es que sea comprensible para la persona que interactua. Si tu publico es hispanohablante, el aviso tiene que estar en espanol. Un aviso que nadie entiende no cumple la finalidad.",
      },
    ],
    cuerpo: ({ H2, P, UL }) => (
      <>
        <P>
          He escaneado varios cientos de webs desde agosto. Estos son los cuatro patrones
          que se repiten, ordenados por frecuencia, con lo que cuesta corregirlos.
        </P>

        <H2>1. El chatbot sin aviso (el mas comun)</H2>
        <P>
          <strong>Frecuencia:</strong> altisima. Practicamente todos los que tienen Zendesk,
          Tidio, Intercom, Crisp o Botpress.
        </P>
        <P>
          El aviso no esta, o esta en un sitio donde nadie lo ve. Se arregla en cinco
          minutos pegando un bloque antes de la primera pantalla del chat. Coste real: cero
          euros.
        </P>

        <H2>2. Aviso en el pie de pagina</H2>
        <P>
          <strong>Frecuencia:</strong> muy alta. La web tiene un texto que dice algo como
          puede interactuar con un asistente automatico, en el footer.
        </P>
        <P>
          No cumple. El Art. 50.1 exige informar <strong>antes o en el momento en que se
          inicia la interaccion</strong>. Si alguien abre el chat y ya esta escribiendo sin
          saber con que, el aviso del pie llego tarde.
        </P>

        <H2>3. Contenido generado sin etiquetar</H2>
        <P>
          <strong>Frecuencia:</strong> media, y subiendo. Blogs escritos integramente con
          IA, imagenes generadas, descripciones de producto.
        </P>
        <P>
          El <strong>Art. 50.4</strong> obliga a identificar de forma visible el
          contenido generado o manipulado artificialmente. Y el <strong>50.2</strong>{" "}
          exige un marcado legible por maquina distinto. Son dos obligaciones, y la
          mayoria solo piensa en una.
        </P>

        <H2>4. Nada, porque uso IA para mi</H2>
        <P>
          <strong>Frecuencia:</strong> el mas subestimado. El autonomo que usa ChatGPT
          para sus propuestas y su web dice que no tiene IA en la web.
        </P>
        <P>
          Si efectivamente no hay nada visible, <strong>es correcto que no necesites el
          Art. 50</strong>. Pero el <strong>Articulo 4</strong> sigue exigible desde el 2
          de febrero de 2025: medidas de alfabetizacion en IA para el personal que use
          esas herramientas. No se ve desde fuera, pero es el que mas rapido te piden y el
          mas barato de cerrar.
        </P>

        <H2>La conclusion honesta</H2>
        <P>
          La buena noticia es que la mayor parte se corrige en una tarde, con textos que ya
          estan redactados y un aviso que pegar en el pie de la web.
        </P>
        <P>
          Este articulo estaba citando antes una estadistica del 90 % de incumplimiento
          medida con nuestro propio escaner. La retiramos porque el escaner tenia un fallo
          que leia como IA el texto editorial de la pagina: marcaba como chatbot lo que en
          realidad era una frase escribiendo sobre chatbots. Preferimos no dar una cifra
          antes que darla mal.
        </P>
        <P>
          Lo que si se puede afirmar, con el escaner ya corregido y contrastado contra
          medios como Wikipedia, el BOE o Xataka que no tienen ningun sistema de IA, es
          esto: <strong>los proveedores de chatbot se instalan mas de lo que parece, pero
          el incumplimiento real esta en las webs que los usan sin decir nada</strong>. Si
          tu web tiene un Zendesk, un HubSpot o un Intercom y no avisas, tienes un
          problema. Compruebalo en 60 segundos.
        </P>
      </>
    ),
  },
  {
    slug: "aepd-advertencias-ia-2026",
    titulo:
      "La AEPD ya avisa a las empresas por su IA: que es una advertencia y que tienes que hacer",
    descripcion:
      "La AEPD ha dirigido tres advertencias en un mes sobre sistemas de IA. Explicamos que es una advertencia, por que aparece antes de la multa y que obligaciones te deja encima la mesa ahora mismo.",
    fecha: "2026-10-19",
    minutos: 8,
    categoria: "Sanciones",
    faq: [
      {
        q: "Me pueden multar ya por usar IA en mi web?",
        a: "La Ley de IA todavia no esta en vigor de forma completa, pero si rigen el RGPD y el Real Decreto 723/2026, que entro en vigor el 5 de octubre de 2026. La AEPD ya estaORIES usando la facultad preventiva del articulo 58.2.a del RGPD, que permite advertir antes de sancionar. La advertencia no es una multa, pero es el aviso de que la proxima vez si lo sera.",
      },
      {
        q: "Que es el Real Decreto 723/2026?",
        a: "Entro en vigor el 5 de octubre de 2026. Obliga a informar por escrito a cada persona trabajadora cuando se usan sistemas algoritmicos o automatizados para decidir sobre sus condiciones de trabajo, y a explicar las pautas, criterios y reglas con las que funcionan.",
      },
      {
        q: "Tengo que avisar a mis empleados si uso un chatbot de atencion al cliente?",
        a: "No por ese Decreto, que se refiere a decisiones sobre condiciones de trabajo. Si el sistema decide sobre sueldos, presupuestos, promociones o descartes de candidaturas, si. Ese es exactamente el caso de la advertencia AI-00009-2026.",
      },
    ],
    cuerpo: ({ H2, P, UL }) => (
      <>
        <P>
          Si has leido noticias sobre inteligencia artificial y empresas este mes, te has
          encontrado con una palabra que aparece por todas partes: <strong>advertencia</strong>.
          No es multa. Pero conviene entender bien que significa, porque la diferencia
          entre una carta de la AEPD y un expediente es la diferencia entre un aviso y una
          multa.
        </P>

        <H2>Que ha hecho la AEPD en los ultimos meses</H2>
        <UL
          items={[
            "23 de septiembre de 2026: advertencia a una empresa que iba a usar IA para analizar curriculos y puntuar candidaturas (AI-00009-2026).",
            "6 de octubre de 2026: advertencias a dos ayuntamientos por usar IA en videovigilancia.",
            "7 de octubre de 2026: nota sobre transparencia y garantias en sistemas algoritmicos del ambito laboral.",
          ]}
        />
        <P>
          Fijate en el detalle: la primera advertencia es a una empresa que{" "}
          <strong>aun no habia implantado nada</strong>. La AEPD actuo antes de la infraccion.
        </P>

        <H2>Advertencia no es multa, pero tiene un coste</H2>
        <P>
          La advertencia es la facultad preventiva del articulo 58.2.a del RGPD. En la
          practica significa que la Agencia te dice: esto que vas a hacer no lo vas a
          poder hacer asi, y tienes esto que cumplir antes de hacerlo.
        </P>
        <P>
          No hay multa. Pero una advertencia obliga a documentar. Y en la practica, casi
          ninguna empresa tiene esa documentacion hecha. Por eso la advertencia es un
          aviso previo a un expediente, y por eso es la mejor noticia que puedes tener si
          llevas meses sin hacer nada: todavia estas a tiempo.
        </P>

        <H2>La referencia del caso</H2>
        <P>
          En agosto se confirmo una <strong>sancion de 500.000 euros a Curenergia</strong>,
          empresa del Grupo Iberdrola, por un incumplimiento del articulo 25 del RGPD en su
          canal de atencion al cliente por chat. El fallo: el sistema permitia que un
          agente atendiera a dos conversaciones a la vez sin cerrarlas, y en una de ellas se
          copio un dato de un cliente a la conversacion del otro.
        </P>
        <P>
          El detalle relevante no es el canal, es la combinacion: chat + datos personales +
          una persona tomando decisiones en tiempo real sin control. Ese es el patron que
          la AEPD esta mirando.
        </P>

        <H2>El Real Decreto 723/2026: la fecha que se te ha pasado</H2>
        <P>
          El 5 de octubre de 2026 entro en vigor el Real Decreto 723/2026. Su articulo 3.2.k
          obliga a <strong>informar por escrito a cada persona trabajadora</strong> de la
          existencia de sistemas algoritmicos o automatizados de decision, y, cuando se
          utilicen para decidir sobre sus condiciones de trabajo, tambien de{" "}
          <strong>sus pautas, criterios y reglas de funcionamiento</strong>.
        </P>
        <P>
          Ese detalle es la parte que casi todo el mundo pasa por alto: no basta con decir
          que usas una herramienta. Hay que explicar{" "}
          <strong>cómo decide</strong>.
        </P>

        <H2>Y la ley de IA que viene</H2>
        <P>
          El proyecto de ley espanol de IA alinea las sanciones con el Reglamento europeo:
          hasta <strong>35 millones de euros o el 7 % de la facturacion global</strong> para
          las infracciones mas graves. Y para los incumplimientos leves de{" "}
          <strong>transparencia</strong>, las multas empiezan en torno a{" "}
          <strong>6.000 euros</strong>.
        </P>
        <P>
          Ese ultimo dato es el que mas se repite en los articulos de prensa y el que menos
          se explica: hay un suelo. No es una multa de 35 millones o nada. Existe un
          escalon intermedio que empieza en unos pocos miles de euros y sube segun el
          impacto y el tamano de la empresa.
        </P>

        <H2>Lo que tienes que hacer, en orden</H2>
        <UL
          items={[
            "Inventariar que sistemas de IA usas y para que. Apuntalos todos, no solo los visibles.",
            "Si interactuan con el publico sin decir que son IA, avisar. Ese es el Art. 50, exigible desde el 2 de agosto de 2026.",
            "Si el sistema decide sobre condiciones de trabajo, redactar la informacion escrita que pide el Real Decreto 723/2026.",
            "Dejar constancia de quien revisa las decisiones del sistema y de cuando lo ha hecho.",
          ]}
        />

        <H2>Como puedes comprobar la parte rapida</H2>
        <P>
          Los dos primeros puntos se comprueban en 60 segundos con el escaner gratuito de
          este sitio. Mete tu dominio y te dice que sistemas de IA tiene tu web y si avisan
          de ello. Si algo aparece sin aviso, ya tienes el trabajo localizado.
        </P>
        <P>
          El tercer punto no lo automatiza ninguna herramienta, porque depende de tu sistema
          interno y de como decides. Si necesitas ese documento, escribenos y lo hacemos
          contigo: forma parte de la auditoria.
        </P>
      </>
    ),
  },
];