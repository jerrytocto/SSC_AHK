

/*function guardarUrlScript() {
    var scriptUrl = ScriptApp.getService().getUrl(); // Obtiene la URL del script desplegado
    if (scriptUrl) {
        PropertiesService.getScriptProperties().setProperty('SCRIPT_URL', scriptUrl); // Guarda la URL
        console.log("URL guardada:", scriptUrl); // Registro de la URL en el log para confirmar
    } else {
        console.error("No se pudo obtener la URL del script. Verifica si el script está desplegado.");
    }
} */


function guardarUrlProduccion(urlProduccion) {
    if (urlProduccion) {
        PropertiesService.getScriptProperties().setProperty('SCRIPT_URL', urlProduccion);
        console.log("URL de producción guardada:", urlProduccion);
    } else {
        console.error("No se proporcionó una URL de producción válida.");
    }
}

function guardarUrlActual() {
    guardarUrlProduccion('https://script.google.com/macros/s/AKfycbyIAq50aTnnbpx-cpFxCDliixkUFxbVCVvN8dAGX_5Db3hbvukQ6jw5jOYU9hMop5WW3Q/exec');
}

