<p align="center">
  <img src="assets/quickfill_logo.png" alt="Logo de la extensión" width="180">
</p>

<p align="center">
  <strong>Extensión de Navegador · Enrolamiento rápido para Citonova</strong>
</p>

<p align="center">
  👉 <a href="https://chromewebstore.google.com/detail/quickfill-para-citonova/nofkpkmfjmikegbopmnedkmmeepcabhk" target="_blank">
    <strong>Instalar desde Chrome Web Store</strong>
  </a>
</p>


# QuickFill para Citonova

Extensión de navegador para **automatizar el ingreso de personas en Citonova** a partir de filas copiadas desde Google Sheets.

Desarrollada para el **control de acceso en Puerto Velero**, optimizada para **equipos de bajo rendimiento** y uso operativo continuo.

---

## 🎯 Propósito

Agilizar el proceso de enrolamiento en Citonova, reduciendo errores humanos y tiempos de digitación manual.

La extensión permite:
- Copiar una fila desde Google Sheets
- Pegar automáticamente los datos en el formulario de Citonova
- Configurar accesos, fechas y observaciones según reglas definidas

---

## 🚀 Impacto

Este proyecto optimiza el proceso de enrolamiento en Citonova, reduciendo significativamente el tiempo operativo:

- ⏱️ **Antes:** ~70 segundos por registro (proceso manual)
- ⚡ **Después:** ~15 segundos por registro (con la extensión)
- 📉 **Reducción de tiempo:** **≈80%**
- 📈 **Mejora de velocidad:** **x4,6 más rápido**

Esta mejora permite un flujo de trabajo más eficiente, reduce errores humanos y es especialmente efectiva en equipos de bajo rendimiento.

---

## ✅ Funcionalidades

- 📋 Lectura del portapapeles (formato TSV de Google Sheets)
- 🧠 Interpretación robusta de filas copiadas
- 📝 Autocompletado de campos:
  - RUT
  - Nombre
  - Teléfono
  - Fechas de ingreso y salida
  - Observaciones normalizadas
  - Clasificación del residente
- 🚧 Detección automática de **CON BARRERA / SIN BARRERA**
- 🔑 Creación automática de accesos:
  - RUT (siempre)
  - PATENTE (solo si corresponde)
- ☑️ Activación correcta de checkboxes de acceso
- 🖥️ Popup simple, liviano y rápido
- 🔄 Inyección automática del content script si no está cargado

---

## 🗂️ Estructura del proyecto

```
.
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── assets
│   └── quickfill_logo.png
└── icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png

```

---

## ⚙️ Requisitos

- Google Chrome (Manifest V3)
- Acceso a Citonova:
  - `https://www.app.citonova.cl/*`
- Permisos utilizados:
  - `activeTab`
  - `clipboardRead`
  - `scripting`

---

## 📦 Instalación 

### Opción recomendada
👉 [**Instalación directa desde Chrome Web Store**](https://chromewebstore.google.com/detail/quickfill-para-citonova/nofkpkmfjmikegbopmnedkmmeepcabhk)

### Modo desarrollador (alternativo)

1. Clonar o descargar este repositorio
2. Abrir Chrome y navegar a: chrome://extensions
3. Activar **Modo desarrollador**
4. Presionar **Cargar descomprimida**
5. Seleccionar la carpeta del proyecto
6. Verificar que la extensión aparezca habilitada

---

## 🧪 Uso de la extensión

1. Copiar una **fila completa** desde Google Sheets
2. Abrir Citonova en el formulario de enrolamiento
3. Hacer clic en el ícono de la extensión
4. Verificar el estado:
- 🟢 `Citonova detectado`
5. Presionar **📋 Pegar fila**
6. Revisar la información y guardar

---

## 📊 Formato esperado de la fila (Sheets)

Orden de columnas esperado:

1. CHECK IN  
2. CHECK OUT  
3. DEPTO  
4. N° PULSERA  
5. NOMBRE RESIDENTE  
6. RUT RESIDENTE  
7. TELÉFONO  
8. EMAIL  
9. PATENTE VEHÍCULO  
10. FORMA DE PAGO  
11. MONTO  
12. TIPO DE RESIDENTE  
13. CORREDORA / PROPIETARIO  
14. OBSERVACIONES (opcional)

---

## 🧠 Lógica de negocio implementada

### CON / SIN BARRERA
- Se considera **CON BARRERA** si:
- Existe forma de pago **o**
- El monto es mayor a 0
- Caso contrario: **SIN BARRERA**

### Accesos creados automáticamente
- RUT: siempre
- PATENTE: solo si es CON BARRERA y existe patente

### Observaciones generadas
Formato automático: CON BARRERA PATENTE ABCD12 ARRENDATARIO (CORREDORA) 514-1


---

## 🏗️ Arquitectura técnica

### popup.js
- Detecta si la pestaña activa corresponde a Citonova
- Muestra estado visual (punto verde / rojo)
- Lee el portapapeles
- Envía los datos al content script
- Inyecta `content.js` si no existe receptor

### content.js
- Escucha mensajes `PASTE_SHEETS_ROW`
- Parsea la fila TSV
- Normaliza fechas y textos
- Completa campos del formulario
- Gestiona accesos (RUT / PATENTE)
- Marca checkboxes según reglas
- Maneja tiempos de carga del DOM

### manifest.json
- Define permisos mínimos
- Limita ejecución al dominio Citonova
- Configura popup e íconos

---

## ⚠️ Consideraciones técnicas

- El formulario de Citonova es dinámico
- Los accesos se crean mediante eventos `change`
- Se ejecutan reintentos con `setTimeout` para equipos lentos
- No se utilizan librerías externas

---

## 🔐 Seguridad y privacidad

- No se almacenan datos
- No se envía información a servidores externos
- Toda la operación ocurre localmente en el navegador
- Acceso restringido al dominio Citonova

---

## 🧩 Posibles mejoras futuras

- Configuración dinámica de columnas
- Soporte para múltiples condominios
- Logs opcionales para soporte
- Panel de configuración simple

---

## 👤 Autor

Desarrollado por Eliam Villegas para uso operativo en **Puerto Velero**.

---

## 📄 Licencia

Uso interno / operativo.  
Distribución y modificación sujetas a autorización.


