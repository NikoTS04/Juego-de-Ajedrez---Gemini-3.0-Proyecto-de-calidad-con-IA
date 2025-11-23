# Ajedrez Online Real-Time

Aplicación web de ajedrez multijugador en tiempo real utilizando Node.js, Socket.io y Chess.js.

## Requisitos

- Node.js instalado (v14 o superior).

## Instalación

1.  Abre una terminal en la carpeta del proyecto.
2.  Instala las dependencias:
    ```bash
    npm install
    ```

## Ejecución

1.  Inicia el servidor:
    ```bash
    npm start
    ```
2.  Abre tu navegador y ve a: `http://localhost:3000`
3.  Para jugar contra ti mismo o probar:
    - Abre una pestaña, ingresa un nombre de sala (ej: "sala1") y selecciona el tiempo. Haz clic en "Jugar".
    - Abre otra pestaña (o ventana de incógnito), ingresa el **mismo nombre de sala** ("sala1"). Haz clic en "Jugar".
4.  ¡Juega!

## Características

- **Tablero Interactivo:** Arrastrar y soltar piezas.
- **Validación de Reglas:** Movimientos legales, jaque, jaque mate, tablas.
- **Reloj de Ajedrez:** Sincronizado con el servidor. Decrementa el tiempo del jugador activo.
- **Tiempo Real:** Los movimientos se reflejan instantáneamente en ambas pantallas.
- **Detección de Fin de Juego:** Por jaque mate o por tiempo agotado.

## Tecnologías

- **Backend:** Node.js, Express, Socket.io.
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla + jQuery para UI).
- **Librerías:** Chess.js (Lógica), Chessboard.js (UI).
