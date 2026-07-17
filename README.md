# Guía del Huésped — Isla de Margarita (2026)

## Estructura de la carpeta

```
guest-guide-2026/
├── index.html                ← la página principal (ábrela con doble clic para verla localmente)
├── api/
│   └── wompi-sign.js         ← función que genera la firma de pago de forma segura
├── README.md                  ← este archivo
└── assets/
    ├── property-photos/       ← fotos originales del apartaestudio
    └── profile-photos/        ← fotos de anfitrión/co-anfitrión
```

## 🚀 Publicar desde cero (GitHub + Vercel)

### Paso 1 — Crear el repositorio en GitHub

1. Ve a [github.com](https://github.com) → ícono **"+"** (arriba a la derecha) → **"New repository"**
2. Nombre: por ejemplo `apartaestudio-margarita` (sin espacios ni tildes)
3. Clic en **"Create repository"** (sin marcar ninguna casilla adicional)

### Paso 2 — Subir los archivos (⚠️ el paso donde más se confunde la gente)

1. En tu computadora, **abre la carpeta `guest-guide-2026`** (haz doble clic para entrar, no la selecciones desde afuera)
2. Adentro deberías ver: `index.html`, `README.md`, la carpeta `api`, la carpeta `assets`
3. **Selecciona esos 4 elementos** (haz clic en el primero, mantén `Shift` y haz clic en el último para seleccionar todos)
4. En GitHub, en tu repositorio nuevo, busca el link **"uploading an existing file"**
5. **Arrastra los 4 elementos seleccionados** (no la carpeta `guest-guide-2026` completa) hacia el recuadro punteado
6. Espera a que termine de cargar, baja hasta el final, clic en **"Commit changes"**

✅ Verifica: en la página principal de tu repositorio deberías ver `index.html` **directamente en la lista**, no dentro de otra carpeta. Si ves una carpeta llamada `guest-guide-2026` ahí, algo se arrastró mal — bórrala y repite el paso 2.

### Paso 3 — Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) → **"Sign Up"** → **"Continue with GitHub"**
2. En tu panel, **"Add New..."** → **"Project"**
3. Busca tu repositorio → **"Import"**
4. Deja todo por defecto → **"Deploy"**

### Paso 4 — Activar el pago

1. En tu proyecto de Vercel → **"Settings"** → **"Environment Variables"**
2. **"Add Environment Variable"**
   - Key: `WOMPI_INTEGRITY_SECRET`
   - Value: tu secreto de integridad de sandbox (`test_integrity_...`) — cópialo con el botón de copiar de Wompi, no lo selecciones a mano, para evitar espacios de más
3. Guarda
4. Ve a **"Deployments"** → tres puntos (⋯) del último deploy → **"Redeploy"**

## 💳 Configurar Wompi

En `index.html`, busca `BOOKING_CONFIG` y verifica tu llave pública:

```js
wompiPublicKey: "pub_test_...",   // sandbox, mientras pruebas
// wompiPublicKey: "pub_prod_...", // producción, cuando quieras cobrar de verdad
```

⚠️ La llave privada y el secreto de integridad **nunca van en este archivo** — solo la variable de entorno de Vercel (Paso 4).

## 💰 Ajustar precios y condiciones

También en `BOOKING_CONFIG`:

```js
const BOOKING_CONFIG = {
  basePriceUSD: 30,      // precio base por noche en USD
  weekDiscount: 0.15,    // -15% si la estancia es de 7 noches o más
  monthDiscount: 0.30,   // -30% si la estancia es de 30 noches o más
  minGapDays: 1,         // días mínimos libres entre reservas (informativo)
  exchangeRate: 4100,    // COP por 1 USD — actualízala periódicamente
};
```

## Dónde editar cada cosa (dentro de `index.html`)

| Qué quieres cambiar                          | Busca esto en el archivo         |
|-----------------------------------------------|-----------------------------------|
| Textos e idiomas (ES/EN/FR/IT/DE/RU)          | `const UI = {`                   |
| Categorías del mapa/guía                      | `const categories = [`           |
| Lugares recomendados                          | `const places = [`               |
| Fotos de la galería del alojamiento           | `const PROPERTY_PHOTOS = [`      |
| Precios y condiciones de reserva              | `const BOOKING_CONFIG = {`       |
| Enlace de reserva de Airbnb                   | `airbnb.mx/rooms`                |
| Números de contacto (WhatsApp)                | `wa.me/`                         |
| Ubicación del alojamiento                     | `const HOME = {lat:`             |
| Hora de check-in / check-out                  | `checkinTime` / `checkoutTime`   |

## 🌐 Correos en el idioma del huésped + número de huéspedes

El formulario de reserva ahora pide también el **número de huéspedes**
(1 a 3). Tanto ese dato como el **idioma que el huésped tenía
seleccionado** en la página quedan guardados junto con la reserva, y se
usan para:

- Enviar el correo de confirmación, cancelación y cambio de fechas **en
  el idioma correcto** para el huésped (los correos internos para ti y
  Juan siempre van en español)
- Mostrar el número de huéspedes en el panel de administración

## 💳 Sobre restringir Wompi a solo tarjetas

Investigué esto a fondo: **actualmente Wompi no ofrece ninguna forma de
limitar qué métodos de pago se muestran** en el Widget o Web Checkout
(la integración simple que estamos usando) — se muestran todos los que
tengas habilitados en tu cuenta. De hecho, encontré que otros comercios
le han pedido exactamente esto a Wompi como solicitud de función, y
todavía no existe.

La única forma real de lograrlo sería dejar de usar el Web Checkout y
construir tu propio formulario de tarjeta usando la API de
Transacciones directamente (especificando `payment_method.type: "CARD"`),
lo cual es una integración mucho más compleja: requiere manejar
tokenización de tarjetas en el navegador, aumenta el alcance de
cumplimiento PCI, y pierde la simplicidad y seguridad del enlace a la
página hospedada de Wompi que tenemos ahora.

**Mi recomendación:** no vale la pena el riesgo/complejidad adicional
solo para ocultar Nequi/PSE — si te preocupa que los huéspedes se
confundan, es más simple ponerlo como nota informativa en la página
("aceptamos tarjetas de crédito/débito internacionales"). Si en algún
momento esto se vuelve una prioridad real para el negocio, es un
proyecto aparte que podemos explorar con más calma.

## Notas

- El mapa y las fotos de lugares turísticos requieren internet (se cargan desde Google/CartoDB).
- Las fotos del alojamiento y de los anfitriones están incrustadas — no requieren internet.
- El botón de pago no funcionará hasta completar los Pasos 3 y 4.

---

## 🔔 Notificaciones automáticas + 📅 Bloqueo de calendario

Estas dos funciones trabajan juntas: cuando un huésped paga con éxito,
Wompi le avisa a tu sitio (webhook), y automáticamente:
1. Se crea un evento en tu Google Calendar bloqueando esas fechas.
2. Se envían 3 correos: uno a ti, uno a Juan, y uno de confirmación al huésped.

Necesitas configurar **dos cuentas nuevas** (ambas gratis) y **6 variables
de entorno más** en Vercel. Son varios pasos, pero cada uno es sencillo.

### A) Crear la cuenta de servicio de Google (para leer y escribir en el calendario)

1. Ve a [console.cloud.google.com](https://console.cloud.google.com) e inicia sesión con la cuenta de Google donde está tu calendario
2. Arriba, crea un **proyecto nuevo** (cualquier nombre, ej. "apartaestudio-calendario")
3. En el buscador superior, escribe **"Google Calendar API"** → ábrela → **"Habilitar"**
4. Ve a **"Credenciales"** (menú izquierdo) → **"+ Crear credenciales"** → **"Cuenta de servicio"**
5. Dale un nombre (ej. "calendario-bot") → **"Crear y continuar"** → **"Listo"** (sin roles adicionales)
6. En la lista de cuentas de servicio, haz clic en la que creaste
7. Pestaña **"Claves"** → **"Agregar clave"** → **"Crear clave nueva"** → tipo **JSON** → **"Crear"**
   - Esto descarga un archivo `.json` a tu computadora — **guárdalo, lo necesitas ahora**
8. Abre ese archivo con un editor de texto. Vas a necesitar dos valores de adentro:
   - `client_email` (algo como `calendario-bot@tu-proyecto.iam.gserviceaccount.com`)
   - `private_key` (un texto largo que empieza con `-----BEGIN PRIVATE KEY-----`)

### B) Compartir tu calendario con esa cuenta de servicio

1. Ve a [calendar.google.com](https://calendar.google.com)
2. En tu calendario "Disponibilidad Apartaestudio" → ⋮ → **"Configuración y uso compartido"**
3. En "Compartir con determinadas personas", agrega el `client_email` del paso anterior
4. Dale permiso **"Realizar cambios en los eventos"**

### C) Generar una "Contraseña de aplicación" de Gmail (para enviar los correos)

Vas a usar tu propia cuenta de Gmail para que el sitio envíe los correos, sin
necesidad de dominio propio ni servicios externos.

1. **Requisito:** tu cuenta de Google debe tener activada la "Verificación en
   2 pasos". Revisa en [myaccount.google.com/security](https://myaccount.google.com/security) —
   si no la tienes activada, actívala primero (te pedirá tu número de teléfono).
2. Ve a **[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**
3. Dale un nombre a la aplicación, por ejemplo "Apartaestudio Margarita"
4. Google te muestra una contraseña de **16 caracteres** (sin espacios al copiarla) — **guárdala**, solo se muestra una vez
5. Esta contraseña es distinta a tu contraseña normal de Gmail — es específica para que aplicaciones externas envíen correo en tu nombre de forma segura

### D) Configurar el webhook en Wompi

1. Dashboard Wompi → **Desarrolladores** → **Eventos** (o "Webhooks")
2. Agrega la URL: `https://tu-sitio.vercel.app/api/wompi-webhook`
   (usa la URL real de tu proyecto en Vercel)
3. Copia el **"Secreto de eventos"** que te muestra ahí — es distinto al secreto de integridad

### E) Agregar todas las variables en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**, y agrega una por una:

| Key | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | el `client_email` del paso A |
| `GOOGLE_PRIVATE_KEY` | el `private_key` completo del paso A (con los `-----BEGIN...`) |
| `GMAIL_USER` | tu correo de Gmail (ej. tucorreo@gmail.com) |
| `GMAIL_APP_PASSWORD` | la contraseña de aplicación de 16 caracteres del paso C |
| `NOTIFY_HOST_EMAIL` | tu correo (Jose Guillermo) |
| `NOTIFY_COHOST_EMAIL` | el correo de Juan |
| `WOMPI_EVENTS_SECRET` | el secreto de eventos del paso D |

Después de agregarlas todas: **Deployments → Redeploy**.

### Probar que funcione

1. Haz una reserva de prueba completa (en sandbox) hasta pagar
2. En unos segundos deberías ver: el evento nuevo en tu Google Calendar, y 3 correos llegando
3. Si algo no llega, revisa **Vercel → Deployments → (tu deploy) → Functions → wompi-webhook**
   para ver los logs y el mensaje de error específico

## 🚀 Pasar a producción (cobros reales)

Cuando ya probaste todo el flujo y quieras cobrar de verdad:

1. En `index.html`, busca `BOOKING_CONFIG` y cambia la línea de `wompiPublicKey`
   por tu llave de producción (`pub_prod_...`)
2. En Vercel, actualiza `WOMPI_INTEGRITY_SECRET` con tu secreto de integridad
   de **producción** (no el de sandbox)
3. En Wompi, configura una **URL de eventos separada para producción**
   apuntando también a `/api/wompi-webhook`, y actualiza `WOMPI_EVENTS_SECRET`
   en Vercel con el secreto de eventos de producción
4. Sube el `index.html` actualizado a GitHub → Vercel lo despliega solo

---

## 🗂️ Panel de administración (buscar, ver y cancelar reservas)

Cada reserva pagada ahora queda registrada en una base de datos (Supabase),
con un código corto (ej. `MAR-0001`) que el huésped recibe por correo. Tú y
Juan pueden entrar a un panel privado para buscar, revisar y cancelar
reservas — accesible en:

```
https://tu-sitio.vercel.app/admin.html
```

### A) Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **"Start your project"** → crea cuenta gratis
2. **"New Project"** → ponle un nombre, genera una contraseña de base de datos
   (guárdala, aunque no la necesitas para nada de esto) → elige la región más
   cercana (ej. São Paulo) → **"Create new project"** (tarda 1-2 min en aprovisionarse)
3. Una vez listo, ve a **"SQL Editor"** (menú izquierdo) → **"New query"**
4. Pega y ejecuta (▶ Run) esta instrucción para crear la tabla de reservas:

```sql
create table bookings (
  id bigint generated always as identity primary key,
  booking_code text unique,
  guest_name text,
  guest_email text,
  guest_phone text,
  checkin date,
  checkout date,
  nights integer,
  amount_cop_charged bigint,
  wompi_reference text,
  calendar_event_id text,
  status text default 'confirmed',
  refund_percent integer,
  refund_amount_cop bigint,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz default now()
);
```

5. Ve a **"Project Settings"** (ícono de engranaje) → **"API"**
6. Copia dos valores:
   - **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
   - **service_role key** (en la sección "Project API keys" — ⚠️ es la
     secreta, distinta a la "anon public"; nunca la publiques ni la pongas
     en el HTML)
7. Si ya habías creado la tabla `bookings` antes (en una configuración
   previa), ve de nuevo a **"SQL Editor"** y corre esto para agregar la
   columna de notas internas:

```sql
alter table bookings add column if not exists internal_notes text;
alter table bookings add column if not exists guests integer;
alter table bookings add column if not exists lang text;
```

### B) Definir la contraseña del panel de administración

Inventa una contraseña segura (la usarán tú y Juan) y una "frase secreta"
cualquiera para firmar las sesiones — no necesitan significar nada, solo
ser difíciles de adivinar.

### C) Agregar las nuevas variables en Vercel

| Key | Value |
|---|---|
| `SUPABASE_URL` | tu Project URL del paso A |
| `SUPABASE_SERVICE_ROLE_KEY` | tu service_role key del paso A |
| `ADMIN_PASSWORD` | la contraseña que definiste en el paso B |
| `ADMIN_SESSION_SECRET` | la frase secreta del paso B |

Redeploy después de agregarlas.

### D) Subir el archivo nuevo

Sube también `admin.html` a la raíz de tu repositorio de GitHub (al mismo
nivel que `index.html`), junto con todos los archivos nuevos de la carpeta
`api/` (`_supabase.js`, `_mailer.js`, `_calendar.js`, `_adminAuth.js`,
`_refundPolicy.js`, `admin-login.js`, `admin-search.js`, `admin-cancel.js`,
`admin-list.js`, `admin-update.js`, `admin-reset.js`, `_trm.js`,
`_emailTemplates.js`).

### E) Una variable más: el enlace a tu guía en los correos

Para que cada correo (confirmación, cancelación, cambio de fechas —
tanto los tuyos como los del huésped) incluya un enlace directo al
Panel de Información y Reservas, agrega en Vercel:

| Key | Value |
|---|---|
| `SITE_URL` | la URL pública de tu sitio, ej. `https://tu-sitio.vercel.app` (sin `/` al final) |

### Cómo usar el panel

1. Entra a `https://tu-sitio.vercel.app/admin.html`
2. Ingresa la contraseña del paso B
3. Verás un **dashboard** con: reservas confirmadas, ingresos totales
   confirmados, y la próxima entrada
4. Debajo, una **lista de todas las reservas** (más recientes primero),
   con pestañas para filtrar por **Todas / Confirmadas / Canceladas** —
   o puedes buscar directo por código
5. Al hacer clic en cualquier reserva, se abre su detalle completo, donde puedes:
   - Dejar una **nota interna** (solo la ven los anfitriones, nunca el huésped)
   - **Modificar las fechas** — verifica automáticamente disponibilidad,
     mueve el evento en el calendario, y notifica al huésped por correo
     (en el idioma que seleccionó al reservar)
   - **Cancelar la reserva** — libera la fecha en el calendario, calcula el
     reembolso según la política vigente (mostrado en USD a la TRM actual),
     y notifica a todos por correo

El dashboard también muestra los **ingresos confirmados en dólares** (a la
TRM del momento) y un contador de **reservas canceladas**, que ahora se ven
en rojo en toda la interfaz para distinguirlas rápido de un vistazo.

### ⚠️ Zona de peligro: borrar el historial

Al final del panel hay un botón **"Borrar historial de reservas"** —
pensado para limpiar reservas de prueba (sandbox) antes de pasar a
producción. Borra permanentemente todas las filas de la base de datos y
libera del calendario cualquier fecha que siguiera bloqueada. Pide
confirmación doble (un aviso + escribir la palabra "BORRAR") porque es
irreversible.

### Política de reembolso (editable)

Vive en `api/_refundPolicy.js`. Política actual — **Flexible**:

```js
const REFUND_TIERS = [
  { minDaysBefore: 3, percent: 100 },  // 3+ días antes: reembolso completo
  { minDaysBefore: 1, percent: 50 },   // 1-2 días antes: reembolso del 50%
  { minDaysBefore: 0, percent: 0 },    // mismo día de la entrada: sin reembolso
];
```

Puedes ajustar estos días/porcentajes cuando quieras, editando ese archivo
y subiéndolo de nuevo a GitHub.

⚠️ **Importante:** el panel **calcula** el reembolso, pero **no mueve dinero
automáticamente**. Después de cancelar una reserva, debes ir tú mismo al
Dashboard de Wompi → Transacciones → busca la referencia (te la muestra el
panel) → botón "Reembolsar", y ahí sí ejecutar el reembolso por el monto
calculado. Esto es intencional, para que ningún error de código pueda mover
dinero sin que tú lo confirmes.

