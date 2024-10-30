// Función que permite conectarse a una hoja de google sheet 
function conectarHoja(sheetName) {
  var spreadsheetId = '1yuzgn5-E9fceoEMo_m70YYitQBawip1gedtuwFVW8ho'; // Reemplaza con el id de la hoja 
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  if (sheetName) {
    return spreadsheet.getSheetByName(sheetName);
  } else {
    return spreadsheet.getActiveSheet(); // Retorna la pestaña activa si no se especifica un nombre
  }
}

function obtenerDatos(sheetName) {
  var sheet = conectarHoja(sheetName);
  var data = sheet.getDataRange().getValues();
  return data;
}

function obtenerDatosLogistica(sheetName) {
  var sheet = conectarHoja(sheetName);
  var data = sheet.getDataRange().getValues();
  return data;
}

function conectarHojaLogistica(sheetName) {
  var spreadsheetId = '1hl2ZUnPzlI8T_a0A8wQUSu19NQD4o697zDsuk3e8zx0'; // Reemplaza con el id de la hoja 
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  if (sheetName) {
    return spreadsheet.getSheetByName(sheetName);
  } else {
    return spreadsheet.getActiveSheet(); // Retorna la pestaña activa si no se especifica un nombre
  }
}

// Incluir archivo HTML
function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

// Función que se activa cada vez que el responsable aprueba o desaprueba una solicitud
function doGet(e) {

  // Obtener el email de la persona que está aprobando la solicitud 
  var userEmail = Session.getActiveUser().getEmail();
  console.log("User Email in the function doGet: " + userEmail);

  // obteniendo el id de la solicitud
  var filterData = obtenerUltimosRegistros(e.parameter.solicitudId);

  if (filterData.length > 0) {
    //Obtener la primera fila 
    var primeraFila = filterData[0];
    var estado = e.parameter.estado;

    // Lo está aprobando el jefe o gerente de área 
    if (e.parameter.numberAprobadores == 1) {
      if (primeraFila[15] == "Aprobado") {
        return ContentService.createTextOutput(
          "LA SOLICITUD NO PUEDE SER " + e.parameter.estado + " PORQUE YA FUÉ APROBADA."
        );
      } else if (primeraFila[15] == "Desaprobado") {
        return ContentService.createTextOutput(
          "LA SOLICITUD NO PUEDE SER " + e.parameter.estado + " PORQUE YA FUÉ DESAPROBADA."
        );
      }

    } // Lo está aprobando el gerente general
    else if (e.parameter.numberAprobadores == 2) {
      if (primeraFila[18] == "Aprobado") {
        return ContentService.createTextOutput(
          "LA SOLICITUD NO PUEDE SER " + e.parameter.estado + " PORQUE YA FUÉ APROBADA."
        );
      } else if (primeraFila[18] == "Desaprobado") {
        return ContentService.createTextOutput(
          "LA SOLICITUD NO PUEDE SER " + e.parameter.estado + " PORQUE YA FUÉ DESAPROBADA."
        );
      }
    }
  }

  if (
    (e.parameter.solicitudId && e.parameter.estado && e.parameter.aprobadoresEmail)
  ) {

    //if (!isUserAuthorized(userEmail)) {
    //  return HtmlService.createHtmlOutput('No tienes permiso para realizar esta actividad, por favor contacta al área de IT para más información.');
    //}
    // Envía como parámetros el objeto e y la URL de la cotización
    console.log("Resultado de isUserAuthorized: " + isUserAuthorized(userEmail));
    return handleEstadoRequest(e, filterData[0][21]);

  }

  var template = HtmlService.createTemplateFromFile("index");
  template.pubUrl = ScriptApp.getService().getUrl(); // Obtener la URL del script dinámicamente
  return template.evaluate();
}

//Verifica que el usuario está autorizado o no a aprobar la solicitud. 
function isUserAuthorized(email) {
  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios_Autorizados');
  //var data = sheet.getDataRange().getValues();
  var data = obtenerDatos("users");
  console.log("Listado de usuarios isUserAuthorized: " + data);
  return data.some(row => row[2].toLowerCase() === email.toLowerCase());
}


// Función para verificar las credenciales del usuario
function checkUserCredentials(username, password) {

  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");
  //var data = sheet.getDataRange().getValues();
  var data = obtenerDatos("users");

  // Transformar el nombre de usuario a minúsculas y eliminar espacios
  username = username.trim().toLowerCase();
  password = password.trim();

  //Cargar las solicitudes de compra hechas por el usuario que se está logueando

  for (var i = 1; i < data.length; i++) {

    var dbUsername = String(data[i][1]).trim().toLowerCase();
    var dbPassword = String(data[i][2]).trim();

    if (dbUsername === username && dbPassword === password) {

      if (data[i][6] == 0) {
        return {
          isValid: false,
          message: "El usuario no tiene permiso. Por favor, contacte al area de IT."
        };
      }
      return {
        isValid: true,
        user: data[i]
      };
    }
  }
  return { isValid: false, message: "Credenciales incorrectas" };
}

function getUserEmail() {
  var email = Session.getActiveUser().getEmail();
  return { email: email };
}

function checkUserEmail(email) {
  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");
  //var data = sheet.getDataRange().getValues();

  var data = obtenerDatos("users");

  email = email.trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var dbEmail = String(data[i][2]).trim().toLowerCase(); // Asumiendo que el email está en la columna 3

    if (dbEmail === email) {
      //Verificar que el usuario esté habilitado para realizar solicitudes de compra
      if (data[i][6] == 0) {
        return {
          isValid: false,
          message: "El usuario no tiene permiso. Por favor, contacte al area de IT."
        };
      }
      return {
        isValid: true,
        user: data[i]
      };
    }
  }
  return { isValid: false, message: "Correo electrónico no registrado" };
}

function formatSolicitudesPorEmail(email) {
  var solicitudesPorUsuario = cargarSolicitudesUsuarioPorEmail(email);
  var formatSolicitudes = adaptarSolicitudesUsuario(solicitudesPorUsuario);
  return JSON.stringify(formatSolicitudes);
}

// Función para cargar las solicitudes hechas por el usuario logueado 
function cargarSolicitudesUsuarioPorEmail(email) {

  var data = obtenerDatos("index");
  var solicitudes = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === email) {
      solicitudes.push(data[i]);
    }
  }

  // Ordenar las solicitudes de manera descendente por fecha
  solicitudes.sort(function (a, b) {
    // Asumiendo que la fecha está en la columna 5
    var dateA = new Date(a[4]);
    var dateB = new Date(b[4]);
    return dateB - dateA; // Orden descendente
  });

  return solicitudes;
}

// Función para dar formato a las solicitudes hechas por el usuario logeado, adaptando a la estructura de la tabla 
function adaptarSolicitudesUsuario(solicitudes) {
  var solicitudesAdaptadas = [];

  solicitudes.forEach((solicitud) => {
    var id = solicitud[0];
    var existente = solicitudesAdaptadas.find((item) => item.id === id);

    if (!existente) {
      var nuevaSolicitud = {
        id: id,
        razonCompra: solicitud[3],
        fechaRegistro: solicitud[4],
        justificacion: solicitud[6],
        totalCompra: parseFloat(solicitud[13]) || 0,
        estadoJefe: solicitud[15],
        estadoGerente: solicitud[18] ? solicitud[18] : "x",
        estado: ""
      };
      solicitudesAdaptadas.push(nuevaSolicitud);
    } else {
      existente.totalCompra += parseFloat(solicitud[13]) || 0;
    }
  });

  // Determinar el estado de cada solicitud
  solicitudesAdaptadas.forEach((solicitud) => {
    solicitud.estado = determinarEstadoSolicitud(solicitud.totalCompra, solicitud.estadoJefe, solicitud.estadoGerente);
  });
  return solicitudesAdaptadas;
}


//Función para determinar el estado de la solicitud teniendo en cuenta los campos de estado que se manejan
function determinarEstadoSolicitud(totalCompra, columnaEstadoJefe, columnaEstadoGerente) {

  if (totalCompra <= 500 && columnaEstadoJefe == "Pendiente") {
    return "Pendiente";

  } else if (totalCompra <= 500 && columnaEstadoJefe == "Aprobado") {
    return "Aprobado";

  } else if (totalCompra <= 500 && columnaEstadoJefe == "Desaprobado") {
    return "Desaprobado";

  } else if (totalCompra > 500 && columnaEstadoGerente == "Pendiente") {
    return "Pendiente";

  } else if (totalCompra > 500 && columnaEstadoGerente == "Aprobado") {
    return "Aprobado";

  } else if (totalCompra > 500 && columnaEstadoGerente == "Desaprobado") {
    return "Desaprobado";
  } else {
    return "Desconocido";
  }

}

/*
// Función que se ejecuta cada vez que el usuario envía una solicitud de compra
function uploadFiles(form) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRegistro = ss.getSheetByName("index");


  // Obtener la información del usuario logueado
  var userId = form.loggedUser ? form.loggedUser : null;

  if (!userId) {

    return "NO SE PASA COMO PARÁMETRO EL USUARIO LOGUEADO.";
  }

  //Verificar si el usuario está autorizado para realizar la compra 
  var solicitantes = cargarDataUsers(userId);

  //Transformar el objeto encontrado en un diccionario clave-valor
  var formatSolicitante = transformarData(solicitantes);

  var solicitudId = generarSolicitudId(sheetRegistro);

  var cotizacionUrl = guardaCotizacionEnDrive(form, solicitudId);

  var totalCompra = registrarProductos(form, solicitudId, sheetRegistro, cotizacionUrl, formatSolicitante);

  // Esperar 4 segundos para asegurarse de que los cambios se guarden en la hoja de cálculo
  Utilities.sleep(2000);

  // Enviar correo electrónico de notificación
  enviarEmail(totalCompra, solicitudId, formatSolicitante, false);


  return "TU SOLICITUD DE COMPRA SE ENVIÓ CORRECTAMENTE";
}
  */

function uploadFiles(form) {
  //var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var sheetRegistro = ss.getSheetByName("index");
  //var sheetRegistro = obtenerDatos("index");
  console.log("Entra a la función uploadFiles");


  var sheetRegistro = conectarHoja("index");
  console.log("Hoja de registro: " + sheetRegistro);

  // Verificar si el usuario está logueado
  var userId = form.loggedUser ? form.loggedUser : null;
  if (!userId) {
    return "ERROR: Usuario no logueado.";
  }

  var solicitantes = cargarDataUsers(userId);
  console.log("Solicitantes en la función cargarDataUsers: " + solicitantes);
  if (!solicitantes) {
    return "ERROR: No se encontró al usuario en la base de datos.";
  }

  var formatSolicitante = transformarData(solicitantes);
  var solicitudId = generarSolicitudId(sheetRegistro);

  console.log("Solicitud ID en la función formatSolicitante: " + formatSolicitante);
  console.log("LLama a la función generarSolicitudId : " + solicitudId);

  var cotizacionUrl;
  try {
    cotizacionUrl = guardaCotizacionEnDrive(form, solicitudId);
    console.log("LLama a la función guardaCotizacionEnDrive : " + cotizacionUrl);
  } catch (error) {
    return "ERROR: No se pudo guardar la cotización. " + error.message;
  }

  var totalCompra;
  try {
    totalCompra = registrarProductos(form, solicitudId, sheetRegistro, cotizacionUrl, formatSolicitante);
    console.log("LLama a la función registrarProductos : " + totalCompra);
  } catch (error) {
    return "ERROR: No se pudieron registrar los productos. " + error.message;
  }

  Utilities.sleep(2000);
  console.log("");

  try {
    var enviarMail = enviarEmail(totalCompra, solicitudId, formatSolicitante, false);
    console.log("LLama a la función enviarEmail : " + enviarMail);
  } catch (error) {
    return "ERROR: No se pudo enviar el email. " + error.message;
  }

  console.log("Tu solicitud de compra se envió correctamente");
  return "Tu solicitud de compra se envió correctamente";
}


//Función para guardar la cotización en el drive
function guardaCotizacionEnDrive(form, solicitudId) {
  const folder = DriveApp.getFolderById('18fFmBROdo78YBHU-1NV45qLRJIWHkSrR');
  const fileBlob = form.file;

  // Obtén el nombre original del archivo
  const originalFileName = fileBlob.getName();

  // Genera el nuevo nombre de archivo
  const newFileName = `Coti_${solicitudId}_${originalFileName}`;

  // Crea el archivo en la carpeta con el nuevo nombre
  const file = folder.createFile(fileBlob).setName(newFileName);

  const fileUrl = file.getUrl();
  return fileUrl;
}

// Genera un ID único para la solicitud
function generarSolicitudId(sheetRegistro) {
  var lastRow = sheetRegistro.getLastRow();
  if (lastRow > 1) {
    var lastId = sheetRegistro.getRange(lastRow, 1).getValue();
    return lastId + 1;
  }
  return 1000;
}

// Registra los productos en la hoja de cálculo
function registrarProductos(form, solicitudId, sheetRegistro, cotizacionUrl, formatSolicitante) {
  var fechaRegistro = new Date();
  var totalCompra = 0;
  var productos = obtenerDatosProductos(form);

  var observaciones = form.observaciones ? form.observaciones : "";

  productos.forEach((producto) => {
    var subtotal = calcularSubtotal(producto.cantidad, producto.precio);
    totalCompra += subtotal;
  });

  productos.forEach((producto) => {
    var subtotal = calcularSubtotal(producto.cantidad, producto.precio);

    var fila = [
      solicitudId,
      formatSolicitante.solicitante.names,
      formatSolicitante.solicitante.email,
      form.razonCompra,
      fechaRegistro,
      form.prioridad,
      form.justificacion,
      producto.nombre,
      producto.marca,
      producto.especificaciones,
      producto.centroCosto,
      producto.cantidad,
      producto.precio,
      subtotal,
      observaciones
    ];

    if (totalCompra <= 500) {
      var jefeArea = determinarDestinatario(totalCompra, formatSolicitante);

      fila.push("Pendiente", jefeArea.solicitante.email, "", "", "", "", cotizacionUrl);
    } else {
      var primerAprobador = determinarDestinatario(totalCompra, formatSolicitante);
      var segundoAprobador = determinarDestinatario(totalCompra, primerAprobador);
      fila.push("Pendiente", primerAprobador.solicitante.email, "", "Pendiente", segundoAprobador.solicitante.email, "", cotizacionUrl);
    }
    sheetRegistro.appendRow(fila);
  });

  return totalCompra;
}


// Maneja la solicitud de actualización de estado
function handleEstadoRequest(e, cotizacionUrl) {
  var solicitudId = parseInt(e.parameter.solicitudId, 10);
  var nuevoEstado = e.parameter.estado;
  //Id de la persona que aprobó o desaprobó la solicitud 
  var aprobadorId = e.parameter.aprobadoresEmail;
  var numberAprobadores = e.parameter.numberAprobadores;

  if (!solicitudId || !nuevoEstado || !aprobadorId) {
    return ContentService.createTextOutput(
      "Solicitud ID o estado faltante o aprobadorEmail."
    );
  }

  var resultado = actualizarEstado(solicitudId, nuevoEstado, aprobadorId, numberAprobadores, cotizacionUrl);

  return ContentService.createTextOutput(resultado);
}

// Determina la columna de estado a actualizar según el total de la compra y el ID de la solicitud
function obtenerColumnaEstado(totalCompra, solicitudId, numberAprobadores) {
  //var data = cargarDataHoja("index");
  var data = obtenerDatos("index");

  var columnaEstado = 0;
  console.log("Número de aprobadores en la función obtenerColumnaEstado: " + numberAprobadores);
  data.forEach((row, i) => {
    if (row[0] == solicitudId) {
      if (totalCompra <= 500) {
        columnaEstado = 15; // Columna para jefe del área
      } else {

        if (numberAprobadores == 1) {
          columnaEstado = 15; // Columna para gerente de área
        } else if (numberAprobadores == 2) {
          columnaEstado = 18; // Columna para gerente general
        }
      }
    }
  });
  return columnaEstado;
}

// Extrae los datos de los productos del evento POST
function obtenerDatosProductos(form) {

  var nombres = limpiarCadena(form["productNames[]"]).split(",");
  var marcas = limpiarCadena(form["productBrands[]"]).split(",");
  var cantidades = limpiarCadena(form["productQuantities[]"]).split(",");
  var precios = limpiarCadena(form["productPrices[]"]).split(",");
  var especificaciones = limpiarCadena(form["productSpecs[]"]).split(",");
  var centroCostos = limpiarCadena(form["productCentroCostos[]"]).split(",");

  /*const nombres = limpiarCadena(document.getElementById("productNames").value.split(","));
  const marcas = limpiarCadena(document.getElementById("productBrands").value.split(","));
  const cantidades = limpiarCadena(document.getElementById("productQuantities").value.split(","));
  const precios = limpiarCadena(document.getElementById("productPrices").value.split(","));
  const especificaciones = limpiarCadena(document.getElementById("productSpecs").value.split(","));
  const centroCostos = limpiarCadena(document.getElementById("productCentroCostos").value.split(",")); */

  return nombres.map((nombre, i) => ({
    nombre: nombre,
    marca: marcas[i] || "",
    cantidad: parseFloat(cantidades[i]) || 0,
    precio: parseFloat(precios[i]) || 0,
    especificaciones: especificaciones[i] || "",
    centroCosto: centroCostos[i] || ""
  }));
}
function limpiarCadena(cadena) {
  if (cadena == undefined || cadena == null) {
    return "";
  }
  return cadena.replace(/,\s*$/, "");
}

// Calcula el subtotal de un producto
function calcularSubtotal(cantidad, precio) {
  if (!isNaN(cantidad) && !isNaN(precio)) {
    return cantidad * precio;
  }
  return 0;
}

function actualizarEstado(solicitudId, nuevoEstado, aprobadorId, numberAprobadores, cotizacionUrl) {
  //var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var sheet = ss.getSheetByName("index");
  //var data = sheet.getDataRange().getValues();

  var sheet = conectarHoja("index");
  var data = obtenerDatos("index");

  var totalCompra = costoTotalSolicitud(solicitudId);
  var solicitanteEmail = null;
  var columnaEstado = obtenerColumnaEstado(totalCompra, solicitudId, numberAprobadores);
  var usuarioAprobador = buscarSolicitantePorId(aprobadorId);
  var formatoUsuarioAprobador = transformarData(usuarioAprobador);

  var registrosActualizados = [];

  if (columnaEstado > 0) {
    data.forEach((row, i) => {
      if (row[0] == solicitudId) {
        //verificar si el estado actual se puede modificar
        var estadoActual = row[columnaEstado];

        if (estadoActual === "Pendiente" || estadoActual === "Observado") {

          //Determinar quién fué el que aprobó la solicitud
          /*var aprobador = '';
          if (columnaEstado == 15 && totalCompra <= 500) {
            aprobador = formatoSolicitante.jefeArea.email;
          } else if (columnaEstado == 15 && totalCompra > 500) {
            aprobador = formatoSolicitante.gerenteArea.email;
          } else if (columnaEstado == 18) {
            aprobador = formatoSolicitante.gerenteGeneral.email;
          } */

          sheet.getRange(i + 1, columnaEstado + 1).setValue(nuevoEstado);
          sheet.getRange(i + 1, columnaEstado + 2).setValue(formatoUsuarioAprobador.solicitante.email);
          sheet.getRange(i + 1, columnaEstado + 3).setValue(new Date());
          registrosActualizados.push(row);
          solicitanteEmail = row[2];
        } else {
          return ContentService.createTextOutput(
            `La solicitud ya ha sido ${estadoActual} y no puede ser actualizada nuevamente. `
          );
        }
      }
    });
  } else {
    // Esta opción se cumplicará siempre y la columna de estado sea igual a cero lo que implica que la solicitud ha sido aprobada o desaprobada
    return "No se pudo determinar la columna de estado.";
  }


  if (registrosActualizados.length > 0) {
    if (solicitanteEmail) {
      // Enviar correo para notificación al emisor del correo
      enviarCorreoRemitente(solicitanteEmail, solicitudId, nuevoEstado, formatoUsuarioAprobador, columnaEstado, totalCompra);
    }
    // Solo si el nuevo estado es aprobado entonces el flujo continúa. 
    if (nuevoEstado === "Aprobado") {
      enviarCorreoAprobado(registrosActualizados, totalCompra, formatoUsuarioAprobador, columnaEstado, cotizacionUrl);
    }

    //Termina el flujo cada vez que se actualiza la solicitud con un estado de rechazado 
    return `El estado de la solicitud ha sido actualizado a: ${nuevoEstado}`;
  } else {
    return "Solicitud no encontrada. xxxxxxxx";
  }
}


// Función para actualizar el estado de la solicitud en la hoja
function actualizarEstadoSolicitud(solicitudId, totalCompra, nuevoEstado, usuario) {
  //var hoja = cargarDataHoja("index"); // Asegúrate de que esta función cargue correctamente los datos de la hoja
  var hoja = obtenerDatos("index")
  var columnaEstado = obtenerColumnaEstado(totalCompra, solicitudId);

  hoja.forEach((row, i) => {
    if (row[0] == solicitudId) {
      if (columnaEstado > 0) {
        // Verifica si el estado puede ser actualizado
        var estadoActual = row[columnaEstado];
        if (estadoActual === "Pendiente" || estadoActual === "Observado") {
          hoja.getRange(i + 1, columnaEstado + 1).setValue(nuevoEstado);
          console.log(`Estado actualizado a '${nuevoEstado}' en la columna ${columnaEstado} por el usuario ${usuario}`);
        } else {
          console.log(`La solicitud ya ha sido ${estadoActual} y no puede ser actualizada nuevamente por ${usuario}`);
        }
      } else {
        console.log("No se pudo determinar la columna de estado.");
      }
    }
  });
}

//Funcion para cargar la data de la hoja de google sheet
function cargarDataHoja(nombreOja) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(nombreOja);
  var data = hoja.getDataRange().getValues();
  return data;
}

// Calcula el costo total de la solicitud
function costoTotalSolicitud(solicitudId) {
  //var data = cargarDataHoja("index");
  var data = obtenerDatos("index");
  var totalCompra = 0;

  data.forEach((row) => {
    if (row[0] == solicitudId) {
      totalCompra += parseFloat(row[13]);
    }
  });

  return totalCompra;
}

// Enviar correo electrónico de aprobación
function enviarCorreoAprobado(registros, totalCompra, formatoUsuarioAprobador, columnaEstado, cotizacionUrl) {

  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Compras");
  //var data = sheet.getDataRange().getValues();

  var data = obtenerDatos("Compras");

  var destinatario = data[1][1];

  if (totalCompra <= 500) {

    //destinatario = "jerrytocto@gmail.com"; //Correo del área de compras
    const namesAprobador = formatoUsuarioAprobador.solicitante.names;
    const cargoAprobador = formatoUsuarioAprobador.solicitante.cargo;

    var nombreCargoAprobador = formatoUsuarioAprobador.solicitante.names + " - " + formatoUsuarioAprobador.solicitante.cargo;
    enviarCorreoCompras(registros, nombreCargoAprobador, destinatario, totalCompra, cotizacionUrl);
    eviarSolicitudAprobadaAlDBLogistica(registros, totalCompra, cotizacionUrl, namesAprobador, cargoAprobador);
  } else {
    //Verificar la columna de estado que se ha modificado.
    if (columnaEstado == 15) {

      //Fué aprobado por el gerente de área, por lo que se debe extraer el correo del gerente general 
      var aprobadorId = formatoUsuarioAprobador.solicitante.jefe;
      var jefeAprobador = cargarDataUsers(aprobadorId);
      var formatoJefeAprobador = transformarData(jefeAprobador);
      console.log("Si lee que la solicitud está entre 500 y 1000. Y se envía al correo de compras: " + columnaEstado)
      destinatario = formatoJefeAprobador.solicitante.email; //Correo del gerente general



      var nombreAreaGA = formatoJefeAprobador.solicitante.nombre + " - " + formatoJefeAprobador.solicitante.cargo;

      enviarCorreoGerenteGeneral(
        registros,
        formatoUsuarioAprobador,
        destinatario,
        totalCompra,
        cotizacionUrl,
        false
      );

      //Correo ha sido revisado y aprobado por el gerente general
    } else if (columnaEstado == 18) {
      //Luego de la aprobación del gerente general se envía el correo al área de compras
      //destinatario = "jerrytocto@gmail.com"; //Correo del área de compras

      //var arrayAprobadores = convertOfStringToArray(nombreAprobador);

      //var emailJefeArea = registros[0][16];
      //var gerenteArea = buscarUserPorEmail(emailJefeArea);
      //var formatoGerenteArea = transformarData(gerenteArea);
      //var nombreAreaGA = formatoGerenteArea.solicitante.names + " - " + formatoGerenteArea.solicitante.cargo;
      var nombreAreaGG = formatoUsuarioAprobador.solicitante.names + " - " + formatoUsuarioAprobador.solicitante.cargo;
      const aprobador = formatoUsuarioAprobador.solicitante.names;
      const cargoAprobador = formatoUsuarioAprobador.solicitante.cargo;

      //var nombreCargoAprobadores = nombreAreaGA + " y " + nombreAreaGG;
      var nombreCargoAprobadores = nombreAreaGG;
      // Generar el CAPEX firmado
      if (totalCompra > 1000) {
        var idSolicitud = registros[0][0];
        var capexFirmado = generateCapex(totalCompra, registros, nombreCargoAprobadores, true, nombreAreaGG);
        //enviarCorreoGerenteGeneral
        agregarLinkCapexFirmado(idSolicitud, capexFirmado.link);
      }

      enviarCorreoCompras(
        registros,
        (nombreAreaGG),
        destinatario,
        totalCompra,
        cotizacionUrl
      );
      eviarSolicitudAprobadaAlDBLogistica(registros, totalCompra, cotizacionUrl, aprobador, cargoAprobador);
    }
  }
}

//Enviar data al sheet de logística 
function eviarSolicitudAprobadaAlDBLogistica(registrosAprobados, totalCompra, cotizacionUrl, namesAprobador, cargoAprobador) {
  var sheetLogistica = conectarHojaLogistica("Solicitudes");
  var fecha = new Date();
  //const totalCompra = totalCompra.toFixed(2);
  const nombreAprobador = namesAprobador;
  const cargoApro = cargoAprobador;
  //const cotizacionFile = obtenerCotizacionDeDrive(cotizacionUrl);

  const solicitudId = registrosAprobados[0][0];
  const emisor = registrosAprobados[0][1];
  const emailEmisor = registrosAprobados[0][1];
  const razonDeCompra = registrosAprobados[0][3];
  const fechaSolicitud = registrosAprobados[0][4];
  const prioridad = registrosAprobados[0][5];
  const justificacion = registrosAprobados[0][6];
  const observaciones = registrosAprobados[0][14] ? registrosAprobados[0][14] : "";

  registrosAprobados.forEach((producto) => {
    var subtotal = calcularSubtotal(producto[11], producto[12]);

    var fila = [
      solicitudId,
      emisor,
      emailEmisor,
      razonDeCompra,
      fechaSolicitud,
      prioridad,
      justificacion,
      producto[7],
      producto[8],
      producto[9],
      producto[10],
      producto[11],
      producto[12],
      subtotal,
      observaciones,
      nombreAprobador,
      cargoApro,
      fecha,
      cotizacionUrl
    ];

    sheetLogistica.appendRow(fila);
  });
}

//Función para buscar un users por email 
function buscarUserPorEmail(email) {
  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");
  //var data = sheet.getDataRange().getValues();

  var data = obtenerDatos("users");

  for (var i = 0; i < data.length; i++) {
    if (data[i][4] === email) {
      return data[i];
    }
  }

}

// Función para añadir nuevo link del capex firmado
function agregarLinkCapexFirmado(idSolicitud, nuevoCapexLink) {
  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("index");
  //var data = sheet.getDataRange().getValues();
  var sheet = conectarHoja("index");
  var data = obtenerDatos("index");

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === idSolicitud) {
      sheet.getRange(i + 1, 24).setValue(nuevoCapexLink);
    }
  }
}


// Enviar correo al gerente general
/*
function enviarCorreoGerenteGeneral(
  registrosAprobados,
  formatoSolicitante, //aprobadoresEmail,
  destinatario,
  totalCompra,
  cotizacionUrl,
  esNotificacion
) {
  var htmlTemplate = HtmlService.createTemplateFromFile("tablaRequisitosEmail");

  htmlTemplate.solicitudId = registrosAprobados[0][0];
  htmlTemplate.emisor = registrosAprobados[0][1];
  htmlTemplate.razonDeCompra = registrosAprobados[0][3];
  htmlTemplate.fechaSolicitud = registrosAprobados[0][4];
  htmlTemplate.justificacion = registrosAprobados[0][6];
  htmlTemplate.centroDeCosto = registrosAprobados[0][10];
  htmlTemplate.observaciones = registrosAprobados[0][14];
  htmlTemplate.tablaSolicitud = registrosAprobados;
  htmlTemplate.numberAprobadores = 2;

  var nombreAreaGA = formatoSolicitante.solicitante.names + " - " + formatoSolicitante.solicitante.cargo;

  // Se añade a la variable aprobadoresEmail el id del gerente general
  htmlTemplate.aprobadoresEmail = formatoSolicitante.solicitante.jefe;
  htmlTemplate.nombreCargoAprobador = nombreAreaGA;

  htmlTemplate.mostrarCampoAprobador = 1;
  htmlTemplate.paraAprobar = true;

  var cotizacionFile = obtenerCotizacionDeDrive(cotizacionUrl);

  //Verificación si la compra es mayor a 1000 generar el capex y añadirlo al correo
  if (totalCompra > 1000) {

    if (!esNotificacion) { // Si no es notificación se debe generar el capex
      var capex = generateCapex(totalCompra, registrosAprobados, nombreAreaGA, false); // Llamar a generateCapex
    }
    else { // Si es notificación se debe obtener el capex sin firmar
      var capexUrl = registrosAprobados[0][22];
      var capex = obtenerCapexSinFirmarDeDrive(capexUrl);
    }

    htmlTemplate.totalCompra = totalCompra.toFixed(2);

    var html = htmlTemplate.evaluate().getContent();

    // En caso de no ser notificación se debe añadir el link del capex a la hoja index
    if (!esNotificacion) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("index");
      var data = sheet.getDataRange().getValues(); // Obtener todos los datos de la hoja

      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(htmlTemplate.solicitudId)) { // Si el ID de la solicitud coincide
          //var lastColumn = data[i].length + 1; // Obtener la última columna
          sheet.getRange(i + 1, 23).setValue(capex.link); // Establecer el valor de la última columna al enlace
        }
      }
    }


    GmailApp.sendEmail(
      destinatario,
      esNotificacion ? `Notificación de aprobación para la compra ${htmlTemplate.solicitudId}` : `Nueva Solicitud de Compra Aprobada`,
      "Nueva solicitud de compra aprobada.",
      {
        htmlBody: html,
        attachments: [esNotificacion ? capex : capex.pdf, cotizacionFile.getAs(MimeType.PDF)]
      }
    ); 

    if (esNotificacion) {
      GmailApp.sendEmail(
        destinatario,
        `Notificación de aprobación para la compra ${htmlTemplate.solicitudId}`,
        "Nueva solicitud de compra aprobada.",
        {
          htmlBody: html,
          attachments: [capex, cotizacionFile.getAs(MimeType.PDF)]
        }
      );
    } else {
      GmailApp.sendEmail(
        destinatario,
        `Nueva solicitud de compra aprobada`,
        "Nueva solicitud de compra aprobada.",
        {
          htmlBody: html,
          attachments: [capex.pdf, cotizacionFile.getAs(MimeType.PDF)]
        }
      );
    }


  } else {
    //Solo se envía el correo con los datos de la solicitud
    htmlTemplate.totalCompra = totalCompra.toFixed(2);

    var html = htmlTemplate.evaluate().getContent();

    GmailApp.sendEmail(
      destinatario,
      esNotificacion ? `Notificación de aprobación para la compra ${htmlTemplate.solicitudId}` : "Nueva Solicitud de Compra Aprobada",
      "Nueva solicitud de compra aprobada.",
      {
        htmlBody: html,
        attachments: [cotizacionFile.getAs(MimeType.PDF)]
      }
    );
  }
}
*/

function enviarCorreoGerenteGeneral(
  registrosAprobados,
  formatoSolicitante,
  destinatario,
  totalCompra,
  cotizacionUrl,
  esNotificacion
) {
  var htmlTemplate = HtmlService.createTemplateFromFile("tablaRequisitosEmail");
  var scriptUrl = ScriptApp.getService().getUrl(); // Obtén la URL del script

  // Configuración del template HTML
  htmlTemplate.solicitudId = registrosAprobados[0][0];
  htmlTemplate.emisor = registrosAprobados[0][1];
  htmlTemplate.razonDeCompra = registrosAprobados[0][3];
  htmlTemplate.fechaSolicitud = registrosAprobados[0][4];
  htmlTemplate.justificacion = registrosAprobados[0][6];
  htmlTemplate.centroDeCosto = registrosAprobados[0][10];
  htmlTemplate.observaciones = registrosAprobados[0][14] ? registrosAprobados[0][14] : "";
  htmlTemplate.tablaSolicitud = registrosAprobados;
  htmlTemplate.numberAprobadores = 2;
  htmlTemplate.scriptUrl = scriptUrl; // Pasar la URL del script a la plantilla

  var nombreAreaGA = formatoSolicitante.solicitante.names + " - " + formatoSolicitante.solicitante.cargo;

  htmlTemplate.aprobadoresEmail = formatoSolicitante.solicitante.jefe;
  htmlTemplate.nombreCargoAprobador = nombreAreaGA;
  htmlTemplate.mostrarCampoAprobador = 1;
  htmlTemplate.paraAprobar = !esNotificacion;
  htmlTemplate.totalCompra = totalCompra.toFixed(2);

  var cotizacionFile = obtenerCotizacionDeDrive(cotizacionUrl);
  var adjuntos = [cotizacionFile.getAs(MimeType.PDF)];

  var asunto;
  if (totalCompra > 1000) {
    if (!esNotificacion) {
      var capex = generateCapex(totalCompra, registrosAprobados, nombreAreaGA, false);
      actualizarHojaConEnlaceCapex(htmlTemplate.solicitudId, capex.link);
      adjuntos.push(capex.pdf);
      asunto = "Nueva Solicitud de Compra Aprobada";
    } else {
      var capexUrl = registrosAprobados[0][22];
      var capex = obtenerCapexSinFirmarDeDrive(capexUrl);
      adjuntos.push(capex);
      asunto = `Notificación de aprobación para la compra aa ${htmlTemplate.solicitudId}`;
    }
  } else {
    if (esNotificacion) {
      asunto = `Notificación de aprobación para la compra aa ${htmlTemplate.solicitudId}`;
    } else {
      asunto = "Nueva Solicitud de Compra";
    }
  }

  var html = htmlTemplate.evaluate().getContent();

  // Enviar un solo correo
  GmailApp.sendEmail(
    destinatario,
    asunto,
    "Nueva solicitud de compra.",
    {
      htmlBody: html,
      attachments: adjuntos
    }
  );
}
//https://drive.google.com/drive/folders/1T_vTy4BVj3ypQbes5jMm4yWYOaWmacF3
//function actualizarHojaConEnlaceCapex(solicitudId, enlaceCapex)
function actualizarHojaConEnlaceCapex(solicitudId, enlaceCapex) {
  //var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("index");
  //var data = sheet.getDataRange().getValues();
  console.log("Solicitud Id: Función actualizarHojaConEnlaceCapex:  " + solicitudId);
  console.log("Enlace de capex : Función actualizarHojaConEnlaceCapex:  " + enlaceCapex);


  var spreadsheetId = '1yuzgn5-E9fceoEMo_m70YYitQBawip1gedtuwFVW8ho'; // Id de la hoja sheet
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName("index");
  var data = sheet.getDataRange().getValues();

  //var sheet = conectarHoja("index");
  //var data = obtenerDatos("index");
  var actualizaciones = [];

  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(solicitudId)) {
      actualizaciones.push({
        range: sheet.getRange(i + 1, 23),
        value: enlaceCapex
      });
    }
  }

  // Aplicar todas las actualizaciones de una vez
  if (actualizaciones.length > 0) {
    actualizaciones.forEach(function (update) {
      update.range.setValue(update.value);
    });
    Logger.log('Se actualizaron ' + actualizaciones.length + ' registros para la solicitud ' + solicitudId);
  } else {
    Logger.log('No se encontraron registros para la solicitud ' + solicitudId);
  }
}


// Enviar correo de notificación al remitente
function enviarCorreoRemitente(email, solicitudId, estado, formatoSolicitante, columnaEstado, totalCompra) {

  //Notificar cuando la solicitud es menor a 500
  if (totalCompra <= 500 && estado != "Aprobado") {
    var subject = `Novedades en tu solicitud de compra #${solicitudId}`;
    var body = `TU SOLICITUD DE COMPRA CON  ID ${solicitudId} ha sido ${estado}  POR ${formatoSolicitante.solicitante.names} - ${formatoSolicitante.solicitante.cargo}. GRACIAS`;

  } else if (totalCompra <= 500 && estado === "Aprobado") {
    var subject = `Novedades en tu solicitud de compra #${solicitudId}`;
    var body = `TU SOLICITUD DE COMPRA CON  ID ${solicitudId} ha sido ${estado}  POR ${formatoSolicitante.solicitante.names} - ${formatoSolicitante.solicitante.cargo}
                Y SE DERIVÓ AL ÁREA DE COMPRAS. GRACIAS`;

  } else if (totalCompra > 500 && columnaEstado == 15 && estado === "Aprobado") {

    var aprobadorId = formatoSolicitante.solicitante.jefe;
    var jefeAprobador = cargarDataUsers(aprobadorId);
    var formatoJefeAprobador = transformarData(jefeAprobador);

    var subject = `Novedades en tu solicitud de compra #${solicitudId}`;
    var body = `TU SOLICITUD DE COMPRA CON  ID ${solicitudId} ha sido ${estado}  POR ${formatoSolicitante.solicitante.names} - ${formatoSolicitante.solicitante.cargo}. 
                AHORA ESTÁ SIENDO EVALUADA POR ${formatoJefeAprobador.solicitante.names} - ${formatoJefeAprobador.solicitante.cargo}. GRACIAS`;

  } else if (totalCompra > 500 && columnaEstado == 15 && estado != "Aprobado") {
    var subject = `Novedades en tu solicitud de compra #${solicitudId}`;
    var body = `TU SOLICITUD DE COMPRA CON  ID ${solicitudId} ha sido ${estado}  POR ${formatoSolicitante.solicitante.names} - ${formatoSolicitante.solicitante.cargo}. GRACIAS`;

  } else if (totalCompra > 500 && columnaEstado == 18 && estado === "Aprobado") {
    var subject = `Novedades en tu solicitud de compra #${solicitudId}`;
    var body = `TU SOLICITUD DE COMPRA CON  ID ${solicitudId} ha sido ${estado}  POR ${formatoSolicitante.solicitante.names} - ${formatoSolicitante.solicitante.cargo}.
                AHORA ESTÁ SIENDO EVALUADA POR EL ÁREA DE COMPRAS. GRACIAS`;

  } else if (totalCompra > 500 && columnaEstado == 18 && estado != "Aprobado") {
    var subject = `Novedades en tu solicitud de compra #${solicitudId}`;
    var body = `TU SOLICITUD DE COMPRA CON  ID ${solicitudId} ha sido ${estado}  POR ${formatoSolicitante.solicitante.names} - ${formatoSolicitante.solicitante.cargo}. GRACIAS`;
  }


  GmailApp.sendEmail(email, subject, body);
}

// Enviar correo al área de compras
function enviarCorreoCompras(
  registrosAprobados,
  aprobadoresEmail,
  destinatario,
  totalCompra,
  cotizacionUrl
) {
  var htmlTemplate = HtmlService.createTemplateFromFile("tablaRequisitosEmail");
  var scriptUrl = ScriptApp.getService().getUrl(); // Obtén la URL del script

  htmlTemplate.solicitudId = registrosAprobados[0][0];
  htmlTemplate.emisor = registrosAprobados[0][1];
  htmlTemplate.razonDeCompra = registrosAprobados[0][3];
  htmlTemplate.fechaSolicitud = registrosAprobados[0][4];
  htmlTemplate.justificacion = registrosAprobados[0][6];
  htmlTemplate.centroDeCosto = registrosAprobados[0][10];
  htmlTemplate.observaciones = registrosAprobados[0][14] ? registrosAprobados[0][14] : "";
  htmlTemplate.tablaSolicitud = registrosAprobados;
  htmlTemplate.aprobadoresEmail = aprobadoresEmail;
  htmlTemplate.mostrarCampoAprobador = 1;
  htmlTemplate.paraAprobar = false;
  htmlTemplate.numberAprobadores = 1;
  htmlTemplate.scriptUrl = scriptUrl; // Pasar la URL del script a la plantilla

  htmlTemplate.nombreCargoAprobador = aprobadoresEmail;

  htmlTemplate.totalCompra = totalCompra.toFixed(2);

  var html = htmlTemplate.evaluate().getContent();

  var cotizacionFile = obtenerCotizacionDeDrive(cotizacionUrl);

  GmailApp.sendEmail(
    destinatario,
    "Nueva Solicitud de Compra Aprobada con Id: " + registrosAprobados[0][0],
    "Nueva solicitud de compra aprobada.",
    {
      htmlBody: html,
      attachments: [cotizacionFile.getAs(MimeType.PDF)]
    }
  );
}

// Función para enviar email para su aprobación
function enviarEmail(totalCompra, solicitudId, formatSolicitante, esAviso) {
  var filteredData = obtenerUltimosRegistros(solicitudId);
  console.log("Estos son los registros para enviar en la función enviarEmail: " + filteredData);

  var htmlTemplate = HtmlService.createTemplateFromFile("tablaRequisitosEmail");
  var scriptUrl = ScriptApp.getService().getUrl(); // Obtén la URL del script

  htmlTemplate.tablaSolicitud = filteredData;
  htmlTemplate.totalCompra = totalCompra ? totalCompra.toFixed(2) : "0.00";
  htmlTemplate.solicitudId = solicitudId;
  htmlTemplate.emisor = formatSolicitante.solicitante.names + " - " + formatSolicitante.solicitante.cargo;
  htmlTemplate.razonDeCompra = filteredData[0][3];
  htmlTemplate.fechaSolicitud = filteredData[0][4];
  htmlTemplate.justificacion = filteredData[0][6];
  htmlTemplate.centroDeCosto = filteredData[0][10];
  htmlTemplate.observaciones = filteredData[0][14] ? filteredData[0][14] : "";
  htmlTemplate.mostrarCampoAprobador = 0;
  htmlTemplate.paraAprobar = true;
  htmlTemplate.nombreCargoAprobador = '';
  htmlTemplate.numberAprobadores = 1;
  htmlTemplate.scriptUrl = scriptUrl; // Pasar la URL del script a la plantilla

  var destinatario = determinarDestinatario(totalCompra, formatSolicitante);

  var destinatarioId = destinatario.solicitante.id;

  htmlTemplate.aprobadoresEmail = destinatarioId;

  // Obtener el enlace del documento PDF desde la columna 21
  var pdfUrl = filteredData[0][21];
  var cotizacionFile = obtenerCotizacionDeDrive(pdfUrl);

  //var fileId = pdfUrl.match(/[-\w]{25,}/); // Extrae el ID del archivo del enlace
  //var file = DriveApp.getFileById(fileId);

  // Configurar el correo para el solicitante
  if (!esAviso) {
    var html = htmlTemplate.evaluate().getContent();
    //Correo para la persona encargada de la aprobación
    GmailApp.sendEmail(destinatario.solicitante.email, ("SOLICITUD DE COMPRA " + filteredData[0][0]), "MENSAJE DEL EMAIL", {
      htmlBody: html,
      attachments: [cotizacionFile.getAs(MimeType.PDF)]
    });

    htmlTemplate.mostrarCampoAprobador = 0;
    htmlTemplate.paraAprobar = false;
    var htmlParaSolicitante = htmlTemplate.evaluate().getContent();

    // Enviar correo para el solicitante
    GmailApp.sendEmail(formatSolicitante.solicitante.email, ("EL REGISTRO DE TU SOLICITUD DE COMPRA " + filteredData[0][0]) + " FUE EXITOSA", "ESTIMADO, TU SOLICITUD DE COMPRA ESTÁ EN CURSO", {
      htmlBody: htmlParaSolicitante,
      attachments: [cotizacionFile.getAs(MimeType.PDF)]
    });

    const correosDeCompras = obtenerCorreosCompras();

    correosDeCompras.forEach((email) => {
      //Enviar correo inicial para el área de compras 
      GmailApp.sendEmail(email, ("NUEVA SOLICITUD DE COMPRA GENERADA CON ID" + filteredData[0][0]) + "", "ESTIMADO(A), ESTA SOLICITUD ESTÁ PENDIENTE DE APROBACIÓN", {
        htmlBody: htmlParaSolicitante,
        attachments: [cotizacionFile.getAs(MimeType.PDF)]
      });
    });

  } else {
    var html = htmlTemplate.evaluate().getContent();
    //Correo para la persona encargada de la aprobación
    GmailApp.sendEmail(destinatario.solicitante.email, ("NOTIFICACIÓN DE APROBACIÓN PARA LA SOLICITUD DE COMPRA " + filteredData[0][0]), "MENSAJE DEL EMAIL", {
      htmlBody: html,
      attachments: [cotizacionFile.getAs(MimeType.PDF)]
    });
  }
}

//Extraer lista de correos para el área de compras 
function obtenerCorreosCompras() {

  var correos = [];
  var data = obtenerDatos("Compras");

  // Comenzar desde el índice 1 para omitir el encabezado
  for (let i = 1; i < data.length; i++) {
    correos.push(data[i][1]); // Asume que los correos están en la segunda columna
  }
  console.log("Estos son los correos de compras: " + correos);
  return correos;
}


//Determinar el destinatario
function determinarDestinatario(totalCompra, formatoSolicitante) {

  //Verificar el código del cargo del solicitante 
  var cargo = formatoSolicitante.solicitante.codigoCargo;

  if (cargo == 2) { //Solicitud hecha por el gerente de área
    //Enviar correo hacia el mismo gerente de área
    return formatoSolicitante;

  } else if (cargo == 3) {  //Solicitud hecha por el jefe de área
    if (totalCompra <= 500) {
      //Enviar correo hacia el mismo jefe de área
      return formatoSolicitante;

    } else {
      //enviar correo hacia el gerente de área 
      var jefeId = formatoSolicitante.solicitante.jefe;

      var userReceptor = cargarDataUsers(jefeId);
      var formatoUserReceptor = transformarData(userReceptor);
      return formatoUserReceptor;
    }

  } else if (cargo == 4) {  // Solicitud hecha por otros cargos

    var jefeId = formatoSolicitante.solicitante.jefe;
    var userReceptor = cargarDataUsers(jefeId);
    var formatoUserReceptor = transformarData(userReceptor);

    if (totalCompra <= 500) {
      //Enviar correo hacia el jefe de área
      return formatoUserReceptor;

    } else {
      //Enviar correo hacia el gerente de área
      var gerenteAreaId = formatoUserReceptor.solicitante.jefe;
      var userGerenteArea = cargarDataUsers(gerenteAreaId);
      var formatoGerenteArea = transformarData(userGerenteArea);
      return formatoGerenteArea;
    }
  }
}

function obtenerCotizacionDeDrive(cotizacionUrl) {
  var fileId = cotizacionUrl.match(/[-\w]{25,}/); // Extrae el ID del archivo del enlace
  var cotizacionFile = DriveApp.getFileById(fileId);
  return cotizacionFile;
}

function obtenerCapexSinFirmarDeDrive(capexUrl) {
  var match = capexUrl.match(/[-\w]{25,}/); // Extrae el ID del archivo del enlace
  if (match && match[0]) { // Verifica si se encontró alguna coincidencia
    var fileId = match[0]; // Accede al primer elemento del array de coincidencias, que es el ID del archivo
    var capexFile = DriveApp.getFileById(fileId); // Obtiene el archivo usando el ID
    return capexFile;
  } else {
    throw new Error('No se pudo extraer el ID del archivo de la URL proporcionada.');
  }

}

// Obtener los últimos registros de una solicitud
function obtenerUltimosRegistros(solicitudId) {
  console.log("Id de la solicitud: " + solicitudId);
  //var libro = SpreadsheetApp.getActiveSpreadsheet();
  //var hoja = libro.getSheetByName("index");
  //var data = hoja.getDataRange().getValues();
  var data = obtenerDatos("index");
  //var totalCompra = costoTotalSolicitud(solicitudId);
  var filteredData = data.filter((row) => row[0] == solicitudId);

  console.log("Este es el filteredData en la función obtenerUltimosRegistros: " + filteredData);
  return filteredData;
}

//obtener los registros por id en tipo array
function obtenerRegistrosPorId(solicitudId) {
  //var libro = SpreadsheetApp.getActiveSpreadsheet();
  //var hoja = libro.getSheetByName("index");
  //var data = hoja.getDataRange().getValues();
  var data = obtenerDatos("index");
  var registros = [];

  data.forEach((row) => {
    if (row[0] == solicitudId) {
      registros.push(row);
    }
  });
  console.log("Este es el array de registros en la función obtenerRegistrosPorId: " + JSON.stringify(registros))
  return JSON.stringify(registros);

}


function seguimientoSolicitudPorId(solicitudId) {

  var registrosSolicitud = obtenerUltimosRegistros(solicitudId);
  var totalCompra = costoTotalSolicitud(solicitudId);
  var solicitanteEmail = registrosSolicitud[0][2].trim();

  console.log("Email de la perona que realizó la solicitud: " + solicitanteEmail)

  //Obtener el solicitante de la solicitud por email
  var solicitanteData = cargarDataUsersPorEmail(solicitanteEmail);
  if (!solicitanteData) {
    console.log("Este es el solicitante de la solicitud: " + solicitanteData);
    return "NO lo encontró";
  }

  var formatSolicitante = transformarData(solicitanteData);

  console.log("Este es el solicitante de la solicitud: " + formatSolicitante.solicitante);
  console.log(" Este es su nombre: " + formatSolicitante.solicitante.names + " " + formatSolicitante.solicitante.jefe)

  var aprobadores = [{
    nombreAprobador: '',
    cargo: '',
    fecha: '',
    estado: ''
  }];

  //Solicitud con un monto total menor a 500 y hecha por un empleado con tipo de cargo otros
  if (totalCompra <= 500 && formatSolicitante.solicitante.codigoCargo == 4) {

    // La solicitud debe ser aprobada por el jefe de área
    var jefeAprobador = cargarDataUsers(formatSolicitante.solicitante.jefe);
    var jefeAprobadorTrans = transformarData(jefeAprobador);

    aprobadores.push({
      nombreAprobador: jefeAprobadorTrans.solicitante.names,
      cargo: jefeAprobadorTrans.solicitante.cargo,
      fecha: registrosSolicitud[0][17] ? registrosSolicitud[0][17] : '',
      estado: registrosSolicitud[0][15]
    })

  } else if (totalCompra <= 500 && formatSolicitante.solicitante.codigoCargo != 4) {
    // Solicitud hecha por un jefe 
    aprobadores.push({
      nombreAprobador: formatSolicitante.solicitante.names,
      cargo: formatSolicitante.solicitante.cargo,
      fecha: registrosSolicitud[0][17] ? registrosSolicitud[0][17] : '',
      estado: registrosSolicitud[0][15]
    })

  } else if (totalCompra > 500 && formatSolicitante.solicitante.codigoCargo == 4) {

    // Llamamos al gerente general, pero para ello primero llamamos al jefe
    var jefeAprobador = cargarDataUsers(formatSolicitante.solicitante.jefe);
    var jefeAprobadorTrans = transformarData(jefeAprobador);

    //Cargamos al gerente de área 
    var gerenteAprobador = cargarDataUsers(jefeAprobadorTrans.solicitante.jefe);
    var gerenteAprobadorTrans = transformarData(gerenteAprobador);

    aprobadores.push({
      nombreAprobador: gerenteAprobadorTrans.solicitante.names,
      cargo: gerenteAprobadorTrans.solicitante.cargo,
      fecha: registrosSolicitud[0][17] ? registrosSolicitud[0][17] : '',
      estado: registrosSolicitud[0][15]
    })

    //Cargamos los datos del gerente general
    var gerenteGeneral = cargarDataUsers(gerenteAprobadorTrans.solicitante.jefe);
    var gerenteGeneralTrans = transformarData(gerenteGeneral);
    aprobadores.push({
      nombreAprobador: gerenteGeneralTrans.solicitante.names,
      cargo: gerenteGeneralTrans.solicitante.cargo,
      fecha: registrosSolicitud[0][20] ? registrosSolicitud[0][20] : '',
      estado: registrosSolicitud[0][18]
    })

  } else if (totalCompra > 500 && formatSolicitante.solicitante.codigoCargo == 3) { //Solicitud hecha por el jefe de área
    //Cargamos los datos del gerente de área
    var gerenteArea = cargarDataUsers(formatSolicitante.solicitante.jefe);
    var gerenteAreaTrans = transformarData(gerenteArea);

    aprobadores.push({
      nombreAprobador: gerenteAreaTrans.solicitante.names,
      cargo: gerenteAreaTrans.solicitante.cargo,
      fecha: registrosSolicitud[0][17] ? registrosSolicitud[0][17] : '',
      estado: registrosSolicitud[0][15]
    })

    //Cargamos los datos del gerente general
    var gerenteGeneral = cargarDataUsers(gerenteAreaTrans.solicitante.jefe);
    var gerenteGeneralTrans = transformarData(gerenteGeneral);
    aprobadores.push({
      nombreAprobador: gerenteGeneralTrans.solicitante.names,
      cargo: gerenteGeneralTrans.solicitante.cargo,
      fecha: registrosSolicitud[0][20] ? registrosSolicitud[0][20] : '',
      estado: registrosSolicitud[0][18]
    })

  } else if (totalCompra > 500 && formatSolicitante.solicitante.codigoCargo == 2) { // Solicitud hecha por un gerente de área 

    //var solicitanteData = cargarDataUsersPorEmail(solicitanteEmail);
    //var formatSolicitante = transformarData(solicitanteData); formatSolicitante
    aprobadores.push({
      nombreAprobador: formatSolicitante.solicitante.names,
      cargo: formatSolicitante.formatSolicitante.cargo,
      fecha: registrosSolicitud[0][17] ? registrosSolicitud[0][17] : '',
      estado: registrosSolicitud[0][15]
    })

    // Cargamos al gerente general
    var gerenteGeneral = cargarDataUsers(formatSolicitante.jefe);
    var gerenteGeneralTrans = transformarData(gerenteGeneral);
    aprobadores.push({
      nombreAprobador: gerenteGeneralTrans.formatSolicitante.names,
      cargo: gerenteGeneralTrans.formatSolicitante.cargo,
      fecha: registrosSolicitud[0][20] ? registrosSolicitud[0][20] : '',
      estado: registrosSolicitud[0][18]
    })
  }

  console.log("Lista de aprobadores: " + aprobadores);
  return JSON.stringify(aprobadores);
}

// FUNCIÓN PARA TRANSFORMAR EL NOMBRE DE UN APROBADOR
function convertEmailANombre(aprobadoresEmail) {
  var nombresAprobadores = '';

  for (var i = 0; i < aprobadoresEmail.length; i++) {
    var email = aprobadoresEmail[i];
    var partes = email.split('@')[0].split('.');
    var nombre = partes[0];
    var apellido = partes[1];

    // Capitalizar la primera letra del nombre y apellido
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    apellido = apellido.charAt(0).toUpperCase() + apellido.slice(1);

    nombresAprobadores += nombre + ' ' + apellido;

    // Añadir una coma y espacio si no es el último elemento
    if (i < aprobadoresEmail.length - 1) {
      nombresAprobadores += ', ';
    }
  }

  return nombresAprobadores;
}

//FUNCIÓN PARA CONVERTIR UN STRING A UN ARRAY
function convertOfStringToArray(aprobadoresEmail) {
  var arrayAprobadoresEmail = [];

  //Convertimos el string en un array
  if (typeof aprobadoresEmail === 'string') {
    arrayAprobadoresEmail = aprobadoresEmail.split(',');
  }
  return arrayAprobadoresEmail;
}

//Cargar data de usuarios 
function cargarDataUsers(userId) {
  //var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var sheet = ss.getSheetByName("users");
  //var data = sheet.getDataRange().getValues();
  var data = obtenerDatos("users");
  var flujoData = null;

  data.forEach((row) => {
    if (row[0] == userId) {
      flujoData = row; // Guarda el registro completo
    }
  });
  return flujoData; // Devuelve el registro encontrado o null si no se encuentra
}

//Cargar data de usuarios 
function cargarDataUsersPorEmail(userEmail) {
  //var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var sheet = ss.getSheetByName("users");
  //var data = sheet.getDataRange().getValues();
  var data = obtenerDatos("users");
  var flujoData = null;

  data.forEach((row) => {
    if (row[2] == userEmail) {
      console.log("SI lo encontró en la función cargarDataUsersPorEmail: " + row);
      flujoData = row; // Guarda el registro completo
    }
  });
  console.log("SI lo encontró en la función cargarDataUsersPorEmail: " + flujoData);
  return flujoData; // Devuelve el registro encontrado o null si no se encuentra
}

//Buscar el solicitante en la hoja de google sheet por id 
function buscarSolicitantePorId(solicitanteId) {
  //var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var sheet = ss.getSheetByName("users");
  //var data = sheet.getDataRange().getValues();
  var data = obtenerDatos("users");
  var flujoData = null;

  data.forEach((row) => {
    if (row[0] == solicitanteId) {
      flujoData = row; // Guarda el registro completo
    }
  });

  return flujoData; // Devuelve el registro encontrado o null si no se encuentra
}

//Transformar el objeto encontrado en un diccionario clave-valor
function transformarData(data) {
  // Transformar la fila en un objeto estructurado
  var formatSolicitante = {
    solicitante: {
      id: data[0],
      //username: data[1],
      //password: data[2],
      names: data[1],
      email: data[2],
      area: data[3],
      cargo: data[4],
      jefe: data[5],
      estado: data[6],
      codigoCargo: data[7]
    }
  };
  return formatSolicitante;
}