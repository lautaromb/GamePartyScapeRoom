# 🌴 mis 30 - Lautaro - Escape Room interactivo

Este proyecto es una aplicación web *mobile-first* diseñada para un cumpleaños temático. Funciona como una búsqueda del tesoro / escape room interactivo donde los invitados (~30 personas) deben encontrar códigos ocultos por la casa y resolver acertijos para ganar puntos.

## 🎲 Dinámica del Juego
- **Objetivo:** El primero en llegar a los **30 puntos** gana el juego y lo finaliza para todos.
- **Mecánica de Puntos:** Los códigos y acertijos están físicamente ocultos en el mundo real. 
  - La primera persona en encontrar e ingresar un código se lleva la mayor cantidad de puntos (Ej: 3 puntos).
  - Si alguien más encuentra ese mismo código después, se lleva menos puntos (Ej: 1 punto).
- **Perfiles:** Los jugadores inician sesión simplemente eligiendo un Nickname y un "espíritu de la jungla" (Avatar de animal o fruta). La sesión se mantiene abierta toda la noche mediante `localStorage`.

## 🎨 Temática y Diseño Visual
- **Temática:** **mis 30 - Lautaro**. Aventura, jungla profunda, madera antigua y misterio.
- **Tipografía:** Se utiliza la fuente mágica `Macondo` para los títulos y `Outfit` para la lectura.
- **UI/UX:** Diseño optimizado para celulares (*Mobile-First*). Cuenta con una barra de navegación inferior (Bottom Nav) con tres pestañas:
  1. **Misiones:** Tarjetas visuales con acertijos públicos. Al resolverlos y tocar la tarjeta, se ingresa la respuesta.
  2. **Escáner:** Un input libre para ingresar códigos ocultos que no tienen acertijo (ej. un sticker debajo de una mesa).
  3. **Ranking:** Tabla de posiciones en tiempo real.

## 🛠️ Stack Tecnológico Actual (MVP Local)
- **Frontend / Backend:** [Next.js](https://nextjs.org/) (App Router).
- **Estilos:** Vanilla CSS con efectos de *Glassmorphism* (efecto cristal).
- **Íconos:** `lucide-react`.
- **Base de Datos (Local MVP):** Actualmente usa un archivo local `db.json` administrado por `src/lib/db.ts` para poder probar el juego en la computadora local al instante.

## 🚀 Plan de Producción (Para otra PC)
Para que el juego funcione con todos los invitados el día de la fiesta, se deben realizar dos pasos en la versión final:

1. **Migración de Base de Datos:** 
   - Reemplazar el archivo local `db.json` por **Supabase** (o Firebase). Esto permitirá que el estado del juego (puntajes, ganadores) se actualice en la nube y en tiempo real para todos los celulares.
2. **Despliegue (Hosting):**
   - Publicar el repositorio directamente en **Vercel** (gratis y automático al conectar con GitHub).

## 🔑 Panel de Administración
Existe un panel oculto para que el anfitrión cree los códigos y misiones durante la fiesta.
- **Ruta:** `/admin-secreto`
- **Contraseña por defecto:** `misterio90`

---
*Este proyecto fue iniciado y estructurado con IA como un MVP listo para expandirse y conectarse a la nube.*
