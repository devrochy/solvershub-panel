// Pruebas del agente en memoria para el backend de prueba (SPEC-53, HU-AOS-105): escenarios, estimado con costo por k,
// corridas que avanzan en_cola → corriendo → terminada con cada consulta, informe con una falla y su arreglo, aplicar
// y «esto no es una falla». Sin LLM ni base: son las formas del contrato de agent-core (docs/openapi.json).
//
//   PRUEBAS_AGENTE=1          datos para ver las cuatro pantallas
//   PRUEBAS_AGENTE=sin-saldo  el saldo no alcanza (aviso «Comprar créditos»)
//   PRUEBAS_AGENTE=vacio      agente sin escenarios
//   MASTER=1                  el estimado trae `costo_usd` (solo lo ve el master)
const MODO = process.env.PRUEBAS_AGENTE ?? "1";
const MASTER = process.env.MASTER === "1";
const K_MAX = 4;
const BASE_POR_ESCENARIO = 95;
const CUOTA = MODO === "sin-saldo" ? 0 : 180;
const SALDO = MODO === "sin-saldo" ? 100 : 2450;

const ahora = () => new Date().toISOString();
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let siguiente = 900;

const escenario = (n, titulo, objetivo, estado, origen = "ia") => ({
  id: uuid(100 + n),
  agent_id: "",
  titulo,
  objetivo_cliente: objetivo,
  datos_cliente: {},
  criterios: ["Responde con la información correcta"],
  tools_esperadas: [],
  tools_prohibidas: [],
  origen,
  estado,
  created_at: ahora(),
  updated_at: ahora(),
});

const TITULOS = [
  [
    "Cliente pregunta el precio de un producto",
    "Quiere saber cuánto cuesta una camiseta.",
    "aprobado",
    "ia",
  ],
  [
    "Cliente pide agendar una cita para el sábado",
    "Quiere una cita el sábado en la tarde.",
    "aprobado",
    "ia",
  ],
  [
    "Cliente reclama un cobro duplicado",
    "Le cobraron dos veces el mismo pedido.",
    "aprobado",
    "manual",
  ],
  [
    "Cliente pregunta por un producto agotado",
    "Busca una gorra que ya no hay.",
    "aprobado",
    "ia",
  ],
  [
    "Cliente envía una foto del comprobante",
    "Manda la foto de su transferencia.",
    "borrador",
    "ia",
  ],
  [
    "Cliente pregunta por el envío a otra ciudad",
    "Vive en Cali y quiere saber el costo.",
    "borrador",
    "ia",
  ],
];

let escenarios =
  MODO === "vacio"
    ? []
    : TITULOS.map(([t, o, e, or], i) => escenario(i, t, o, e, or));
const corridas = new Map();
const resultadosMarcados = new Set();
const aplicados = new Map();
let lock = 7;

function intento(n, caseId, pasa, extra = {}) {
  const id = `${caseId.slice(0, 24)}${String(n).padStart(12, "0")}`;
  const falla = !pasa;
  return {
    result_id: id,
    intento: n,
    estado: pasa ? "pasa" : "falla",
    fin: "objetivo",
    criterio_incumplido: falla
      ? "Ofrece solo horarios dentro del horario de atención"
      : null,
    razon: falla
      ? "El agente ofreció las 7:00 p. m. y el negocio cierra a las 5:00 p. m."
      : null,
    transcripcion: falla
      ? [
          { quien: "cliente", texto: "Quiero una cita el sábado en la tarde." },
          {
            quien: "agente",
            texto: "Claro. El sábado tengo disponible a las 7:00 p. m.",
          },
          { quien: "cliente", texto: "Perfecto, agéndala." },
        ]
      : [
          {
            quien: "cliente",
            texto: "Hola, ¿cuánto cuesta la camiseta básica?",
          },
          {
            quien: "agente",
            texto: "La camiseta básica cuesta $35.000. ¿Te la separo?",
          },
        ],
    tools_llamadas: [],
    arreglo: falla
      ? {
          tipo: "regla",
          porque: "No hay una regla que limite los horarios de los sábados.",
          regla: {
            name: "horario_sabado",
            kind: "frase",
            action: "responder",
            phrases: [
              "Los sábados solo ofrezco citas entre 9:00 a. m. y 5:00 p. m.",
            ],
          },
          texto: null,
          procedimiento: null,
          seccion: null,
          aplicable: !aplicados.has(id),
          motivo_no_aplicable: aplicados.has(id) ? "ya_aplicado" : null,
          diff: aplicados.has(id)
            ? []
            : [
                {
                  ruta: "guardrails[2]",
                  antes: null,
                  despues:
                    "Los sábados solo ofrezco citas entre 9:00 a. m. y 5:00 p. m.",
                },
              ],
        }
      : null,
    arreglo_aplicado_en: aplicados.get(id) ?? null,
    juez_equivocado: resultadosMarcados.has(id),
    ...extra,
  };
}

function informe(run) {
  const total = run.caseIds.length * run.k;
  // Cada consulta avanza la corrida: la primera la deja corriendo y las siguientes van sumando intentos hasta terminar.
  if (run.estado !== "terminada" && run.estado !== "cancelada") {
    run.consultas += 1;
    run.hechos = Math.min(
      total,
      Math.max(0, (run.consultas - 1) * Math.ceil(total / 3)),
    );
    run.estado =
      run.consultas === 1
        ? "en_cola"
        : run.hechos >= total
          ? "terminada"
          : "corriendo";
    if (run.estado === "terminada") run.terminada_en = ahora();
  }
  const escenariosInforme = run.caseIds.map((caseId, i) => {
    const e = escenarios.find((x) => x.id === caseId);
    const hechosDelEscenario = Math.max(
      0,
      Math.min(run.k, run.hechos - i * run.k),
    );
    const intentos = Array.from({ length: hechosDelEscenario }, (_, j) =>
      intento(j + 1, caseId, !(e?.titulo ?? "").includes("agendar")),
    );
    return { case_id: caseId, titulo: e?.titulo ?? "Escenario", intentos };
  });
  const todos = escenariosInforme.flatMap((e) => e.intentos);
  const fallan = todos.filter(
    (i) => i.estado === "falla" && !i.juez_equivocado,
  ).length;
  const pasan = todos.filter((i) => i.estado === "pasa").length;
  return {
    id: run.id,
    agent_id: run.agentId,
    estado: run.estado,
    k: run.k,
    reintento_de: run.reintentoDe ?? null,
    version_probada: "borrador",
    iniciada_en: run.iniciada_en,
    terminada_en: run.terminada_en ?? null,
    creditos_estimados: run.estimado,
    creditos_reales: Math.round(
      (run.estimado * run.hechos) / Math.max(total, 1),
    ),
    creditos_reales_de_cuota: Math.min(
      CUOTA,
      Math.round((run.estimado * run.hechos) / Math.max(total, 1)),
    ),
    creditos_reales_del_saldo: Math.max(
      0,
      Math.round((run.estimado * run.hechos) / Math.max(total, 1)) - CUOTA,
    ),
    tope_creditos: Math.round(run.estimado * 1.5),
    progreso: { hechos: run.hechos, total },
    resumen: {
      pasan,
      fallan,
      no_se_pudo_probar: 0,
      juez_equivocado: todos.filter((i) => i.juez_equivocado).length,
      porcentaje:
        pasan + fallan ? Math.round((pasan * 100) / (pasan + fallan)) : null,
    },
    borrador_lock_version: lock,
    escenarios: escenariosInforme,
  };
}

// Una corrida ya terminada para que la lista muestre «última prueba» desde el primer momento.
if (MODO !== "vacio") {
  const aprobados = escenarios
    .filter((e) => e.estado === "aprobado")
    .map((e) => e.id);
  const id = uuid(500);
  corridas.set(id, {
    id,
    agentId: "",
    caseIds: aprobados,
    k: 1,
    estimado: aprobados.length * BASE_POR_ESCENARIO,
    estado: "terminada",
    consultas: 9,
    hechos: aprobados.length,
    iniciada_en: new Date(Date.now() - 3_600_000).toISOString(),
    terminada_en: new Date(Date.now() - 3_300_000).toISOString(),
  });
}

function estimadoPara(casos, k = 1) {
  const por = casos * BASE_POR_ESCENARIO * k;
  const deCuota = Math.min(CUOTA, por);
  const delSaldo = por - deCuota;
  return {
    k,
    estimado: por,
    de_la_cuota: deCuota,
    del_saldo: delSaldo,
    saldo_despues: SALDO - delSaldo,
    alcanza: delSaldo <= SALDO,
    ...(MASTER
      ? { costo_usd: Number((0.0014 * por).toFixed(2)) }
      : { costo_usd: null }),
  };
}
const estimadoOut = (casos) => ({
  escenarios: casos,
  nivel_ia: "estandar",
  k_por_defecto: 1,
  k_maximo: K_MAX,
  saldo: SALDO,
  cuota_gratis_restante: CUOTA,
  por_k: Array.from({ length: K_MAX }, (_, i) => estimadoPara(casos, i + 1)),
});

/** `[estado, cuerpo]` si la ruta es de las pruebas del agente; si no, `null`. */
export function pruebasDelAgente(metodo, ruta, cuerpo) {
  const m = ruta.match(/^\/admin\/agents\/([^/]+)\/pruebas(\/.*)?$/);
  if (!m) return null;
  const agentId = m[1];
  const resto = m[2] ?? "";
  escenarios = escenarios.map((e) => ({ ...e, agent_id: agentId }));
  for (const c of corridas.values()) c.agentId = agentId;

  if (resto === "" && metodo === "GET") {
    const ultima = [...corridas.values()].at(-1);
    return [
      200,
      {
        escenarios,
        tope: 50,
        ultima_corrida: ultima
          ? {
              id: ultima.id,
              estado: ultima.estado,
              k: ultima.k,
              iniciada_en: ultima.iniciada_en,
              terminada_en: ultima.terminada_en ?? null,
            }
          : null,
      },
    ];
  }
  if (resto === "" && metodo === "POST") {
    const e = {
      ...escenario(
        siguiente++,
        cuerpo.titulo,
        cuerpo.objetivo_cliente,
        cuerpo.estado ?? "borrador",
        "manual",
      ),
      criterios: cuerpo.criterios ?? [],
      agent_id: agentId,
    };
    e.id = uuid(siguiente);
    escenarios.push(e);
    return [201, e];
  }
  if (resto === "/proponer" && metodo === "POST") {
    const nuevos = [
      "Cliente pide hablar con una persona",
      "Cliente cambia de idea a mitad del pedido",
    ].map((t, i) => {
      const e = escenario(
        siguiente++,
        t,
        "Quiere cambiar su pedido.",
        "borrador",
        "ia",
      );
      e.id = uuid(siguiente + i);
      return e;
    });
    escenarios.push(...nuevos);
    return [201, { escenarios: nuevos, descartados: 0, creditos: 12 }];
  }
  const caso = resto.match(/^\/([0-9a-f-]{36})$/);
  if (caso && metodo === "PATCH") {
    escenarios = escenarios.map((e) =>
      e.id === caso[1] ? { ...e, ...cuerpo, updated_at: ahora() } : e,
    );
    return [200, escenarios.find((e) => e.id === caso[1])];
  }
  if (caso && metodo === "DELETE") {
    escenarios = escenarios.filter((e) => e.id !== caso[1]);
    return [204, null];
  }
  if (resto === "/estimado" && metodo === "POST")
    return [200, estimadoOut((cuerpo.case_ids ?? []).length)];
  if (resto === "/corridas" && metodo === "POST") {
    const k = Number(cuerpo.k);
    const esperado = estimadoPara(cuerpo.case_ids.length, k);
    if (cuerpo.confirmo_creditos !== esperado.estimado)
      return [
        409,
        {
          error: {
            code: "estimado_cambio",
            message: "El estimado cambió.",
            details: { estimado: esperado.estimado },
          },
        },
      ];
    if (!esperado.alcanza)
      return [
        409,
        {
          error: {
            code: "plan_limit_creditos",
            message: "No te alcanza el saldo.",
            details: { metric: "creditos", used: 0, limit: SALDO },
          },
        },
      ];
    const id = uuid(siguiente++);
    corridas.set(id, {
      id,
      agentId,
      caseIds: cuerpo.case_ids,
      k,
      estimado: esperado.estimado,
      estado: "en_cola",
      consultas: 0,
      hechos: 0,
      iniciada_en: ahora(),
    });
    return [
      202,
      {
        id,
        agent_id: agentId,
        estado: "en_cola",
        k,
        escenarios: cuerpo.case_ids.length,
        creditos_estimados: esperado.estimado,
        creditos_de_cuota: esperado.de_la_cuota,
        tope_creditos: Math.round(esperado.estimado * 1.5),
        created_at: ahora(),
      },
    ];
  }
  const corrida = resto.match(/^\/corridas\/([0-9a-f-]{36})(\/.*)?$/);
  if (corrida) {
    const run = corridas.get(corrida[1]);
    if (!run)
      return [
        404,
        { error: { code: "no_encontrado", message: "No encontrado." } },
      ];
    const sub = corrida[2] ?? "";
    if (sub === "" && metodo === "GET") return [200, informe(run)];
    if (sub === "/cancelar" && metodo === "POST") {
      run.estado = "cancelada";
      run.terminada_en = ahora();
      return [
        200,
        {
          id: run.id,
          agent_id: agentId,
          estado: "cancelada",
          creditos_reales: 40,
          terminada_en: run.terminada_en,
        },
      ];
    }
    const fallidas = informe(run)
      .escenarios.filter((e) =>
        e.intentos.some((i) => i.estado === "falla" && !i.juez_equivocado),
      )
      .map((e) => e.case_id);
    if (sub === "/volver-a-probar/estimado" && metodo === "POST")
      return fallidas.length
        ? [200, estimadoOut(fallidas.length)]
        : [
            422,
            { error: { code: "sin_fallidas", message: "No hay fallidas." } },
          ];
    if (sub === "/volver-a-probar" && metodo === "POST") {
      const k = Number(cuerpo.k);
      const esperado = estimadoPara(fallidas.length, k);
      if (cuerpo.confirmo_creditos !== esperado.estimado)
        return [
          409,
          {
            error: {
              code: "estimado_cambio",
              message: "El estimado cambió.",
              details: { estimado: esperado.estimado },
            },
          },
        ];
      const id = uuid(siguiente++);
      corridas.set(id, {
        id,
        agentId,
        caseIds: fallidas,
        k,
        estimado: esperado.estimado,
        estado: "en_cola",
        consultas: 0,
        hechos: 0,
        iniciada_en: ahora(),
        reintentoDe: run.id,
      });
      return [
        202,
        {
          id,
          agent_id: agentId,
          estado: "en_cola",
          k,
          escenarios: fallidas.length,
          creditos_estimados: esperado.estimado,
          creditos_de_cuota: esperado.de_la_cuota,
          tope_creditos: Math.round(esperado.estimado * 1.5),
          created_at: ahora(),
        },
      ];
    }
  }
  const resultado = resto.match(
    /^\/resultados\/([0-9a-f-]{36})\/(aplicar|juez-equivocado)$/,
  );
  if (resultado && metodo === "POST") {
    if (resultado[2] === "aplicar") {
      if (cuerpo.lock_version !== lock)
        return [
          409,
          {
            error: {
              code: "stale_lock_version",
              message: "El borrador cambió.",
            },
          },
        ];
      aplicados.set(resultado[1], ahora());
      lock += 1;
      return [
        200,
        {
          result_id: resultado[1],
          arreglo_aplicado_en: aplicados.get(resultado[1]),
          borrador_lock_version: lock,
          cambios: [],
          publicado: false,
        },
      ];
    }
    if (cuerpo.juez_equivocado === false)
      resultadosMarcados.delete(resultado[1]);
    else resultadosMarcados.add(resultado[1]);
    return [
      200,
      {
        result_id: resultado[1],
        estado: "falla",
        juez_equivocado: cuerpo.juez_equivocado !== false,
      },
    ];
  }
  return [404, { error: { code: "no_encontrado", message: "No encontrado." } }];
}
