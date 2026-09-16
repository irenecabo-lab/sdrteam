# Mapon Outbound Battle

Scoreboard en vivo para la competición de outbound del equipo SDR España (22–30 sept 2026). Next.js 14 + TypeScript + Tailwind, con datos de HubSpot (portal 25084478, EU1) o de un fichero manual.

## Las dos piezas del proyecto

1. **La landing de reglas / kickoff** (`landing/mapon-outbound-battle-landing.html`): la página de presentación en estilo pixel-RPG, ya publicada como artifact — es la que enseña la mecánica del juego, los equipos, los KPI y el bonus "BOOST POR EMPRESAS TOCHAS". Al final tiene el botón **🚀 EMPEZAR A JUGAR**, que enlaza al scoreboard real.
2. **Esta app Next.js**: el scoreboard en vivo (`/battle`) que muestra puntos, ruta del pipeline, meetings, flotas capturadas e historial de batalla, día a día.

Son dos cosas publicadas por separado a propósito: la landing es una página estática de reglas (no cambia), y la app es la que necesita desplegarse en un hosting real (Vercel, por ejemplo) para tener su propia URL, base de datos de caché y variables de entorno con el token de HubSpot.

## Cómo se actualizan los datos cada día (automático)

Importante (16/9/26): el plan gratuito de Vercel (Hobby) solo permite **una** cron job al día, y encima con hasta 59 minutos de margen de imprecisión — no permite dos horarios exactos como 14:00 y 18:00. Así que en vez de depender del cron propio de Vercel (que además ni siquiera se podría desplegar tal cual con dos disparos diarios en Hobby), la app se apoya en un **programador externo gratuito** que simplemente hace una petición HTTP a una URL dos veces al día:

1. Despliega la app (ver más abajo).
2. Da de alta una cuenta gratuita en algo como [cron-job.org](https://cron-job.org) (no hace falta tarjeta).
3. Crea dos tareas que llamen a `https://TU-APP.vercel.app/api/refresh?manual=1`:
   - Una a las 14:00 hora de España
   - Otra a las 18:00 hora de España
4. Listo. Cada llamada hace un pull real a HubSpot y guarda el snapshot en caché (`lib/store.ts`), que es lo que `/battle` lee al cargar. El endpoint acepta tanto GET como POST, por si el programador que uses solo soporta uno de los dos.

También hay un botón **↻ REFRESH BATTLE** en el propio dashboard para forzar una actualización manual en cualquier momento (llama a la misma URL).

Esto lo hace la app sola, desplegada — no es algo que yo controle a mano desde el chat, ni tampoco necesita que esta conversación siga abierta. Si algún día pasáis a un plan de pago de Vercel (Pro, con cron de verdad y precisión al minuto), `app/api/refresh/route.ts` ya sabe manejar ambos casos: puedes reactivar un cron real en `vercel.json` apuntando a `/api/refresh` sin `?manual=1`, y solo hará el pull cuando la hora coincida exactamente con `REFRESH_TIMES_LOCAL` (en `config/scoring.config.ts`) — así uno más frecuente no dispara pulls de más. Si algún día quieres cambiar los horarios de refresco, es esa misma línea la que hay que tocar (y las dos tareas del programador externo).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellena las variables si vas a usar HubSpot
npm run dev                  # http://localhost:3000/battle
```

Por defecto `DATA_SOURCE=manual`, así que arranca con los datos de ejemplo de `data/competition-data.example.json` (números inventados, claramente marcados como ejemplo). Copia ese fichero a `data/competition-data.json` y edítalo (a mano, o desde `/admin` cuando esté listo) para probar con datos reales sin tocar HubSpot todavía.

Para usar HubSpot de verdad:

```
DATA_SOURCE=hubspot
HUBSPOT_PRIVATE_APP_TOKEN=pat-eu1-...
```

El token necesita estos scopes: `crm.objects.calls.read`, `crm.objects.meetings.read`, `crm.objects.deals.read`, `crm.objects.companies.read`, `crm.objects.owners.read`. Nunca se hardcodea ni se manda al navegador — solo lo usa `lib/data/hubspot-provider.ts`, que corre en el servidor.

## Verificar que el motor de puntos no se ha roto

```bash
npm run verify:scoring
```

Corre el cálculo completo contra los datos de ejemplo y comprueba que los números cuadran (nada negativo, los totales suman bien, etc). Rápido de correr después de tocar cualquier fichero en `config/` o `lib/scoring/`.

## Desplegar

Pensado para Vercel, pero cualquier hosting Node persistente funciona igual de bien (ver la nota del programador externo arriba).

**¿Es gratis?** El plan Hobby de Vercel no cuesta nada, pero sus propias condiciones lo limitan explícitamente a uso personal/no comercial — un despliegue interno de Mapon, aunque sea para un juego de equipo, cae dentro de "uso comercial" según esas condiciones. En la práctica esto no os va a parar (Vercel no persigue proyectos internos pequeños de este tamaño) y el Hobby da de sobra para esta app: 1M de invocaciones de función al mes, 100GB de transferencia — muy por encima de lo que dos pulls diarios de HubSpot y el tráfico de la oficina van a generar. Pero para ir sobre seguro y cumplir sus condiciones al pie de la letra, lo correcto es desplegarlo bajo una cuenta/organización de pago (Pro, desde 20$/mes por asiento) si Mapon ya tiene una, o hablarlo con quien gestione el hosting de la empresa.

**Pasos** (los hace quien tenga o cree la cuenta de Vercel - yo no tengo acceso a vuestra cuenta, así que no puedo desplegarlo por vosotros):

1. Sube este proyecto a un repositorio de GitHub (o usa la Vercel CLI con `vercel deploy` directamente desde esta carpeta, sin necesidad de GitHub).
2. En [vercel.com](https://vercel.com), "Add New Project" → importa el repo (o confirma el despliegue si usaste la CLI).
3. En Project Settings → Environment Variables, añade `DATA_SOURCE=hubspot` y `HUBSPOT_PRIVATE_APP_TOKEN` (el token real, nunca lo subas al repo).
4. Deploy. La URL que te da Vercel (algo como `mapon-outbound-battle.vercel.app`) es la que hay que poner en el botón "EMPEZAR A JUGAR" de la landing y en las dos tareas del programador externo.

Importante: `lib/store.ts` usa un fichero JSON en disco para la caché — en Vercel esto funciona en un despliegue normal, pero si en algún momento pasáis a funciones verdaderamente stateless sin disco persistente, hay que cambiarlo por un KV/DB real (Vercel KV, Postgres...) — está documentado en el propio fichero.

Después de desplegar, actualiza el enlace **EMPEZAR A JUGAR** de la landing (`landing/mapon-outbound-battle-landing.html`, sección `.play-cta`) y el `APP_ORIGIN` del script del podio (sección `.final`, al final del archivo) con la URL real, y vuelve a publicarla. Dímelo y te lo actualizo yo mismo en cuanto tengas la URL.

## Qué queda pendiente / decisiones abiertas

- **Filtro de "outbound" en HubSpot**: resuelto (16/9/26) inspeccionando los reports reales del dashboard `Spain - NB CVR% Outbound` (y sus variantes por SDR) en el portal — usan `lead_master_source = "false"` (outbound) combinado con `company_master_type != "Existing client"` (solo negocio nuevo, no upsell/cross-sell a cliente existente). Ya está aplicado en `lib/data/hubspot-provider.ts`. Ver `config/hubspot-stages.config.ts`.
- **Talk time objetivo de Irache**: no se ha dado un número específico, así que usa el valor por defecto del equipo (90 min/día). Sus objetivos de calls (20/día) y meetings (5/día) sí están confirmados. Ver `config/owners.config.ts`.
- **Panel `/admin`**: todavía no está construido (carga manual de datos, log de auditoría de overrides). Es el siguiente bloque de trabajo.
- **Avatares de equipo**: son diseños originales (un arquetipo sabueso/llama en cian para el Team 1, uno redondo/martillo en magenta para el Team 2) — no son Houndoom ni Tinkaton ni ningún otro personaje con copyright. Es una decisión firme, no solo de estilo: reproducir personajes registrados de Pokémon no es algo que pueda hacer, así que si en algún momento hace falta, lo mejor es encargar ilustraciones propias a un diseñador.

## Estructura

```
app/
  page.tsx              -> índice mínimo, enlaza a /battle
  battle/
    page.tsx             -> server component: lee el snapshot y calcula el estado
    BattleDashboard.tsx   -> el dashboard interactivo (toggle TOTAL/NORMALIZADO/POR SDR, historial, feed)
    Avatars.tsx            -> las criaturas originales de cada equipo
    RefreshButton.tsx       -> botón de refresco manual
  api/refresh/route.ts   -> el endpoint que llama el cron (y el botón manual)
config/                  -> toda la config del juego: equipos, stages de HubSpot, puntos
lib/
  types.ts               -> el shape canónico de los datos (CompetitionSnapshot)
  data/                  -> ManualProvider y HubSpotProvider (misma interfaz, distinto origen)
  scoring/                -> el motor de puntos (transiciones de stage, actividad, bonus, XP)
  store.ts                -> caché del snapshot + log de overrides del admin
data/                    -> fixture de ejemplo para DATA_SOURCE=manual
landing/                 -> la landing de reglas (HTML standalone, ya publicada aparte)
scripts/verify-scoring.ts -> sanity check rápido del motor de puntos
```
