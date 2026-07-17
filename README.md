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

## Notas

- El mapa y las fotos de lugares turísticos requieren internet (se cargan desde Google/CartoDB).
- Las fotos del alojamiento y de los anfitriones están incrustadas — no requieren internet.
- El botón de pago no funcionará hasta completar los Pasos 3 y 4.
