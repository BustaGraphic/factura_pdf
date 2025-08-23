const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

// En local, el front suele estar en http://localhost:5173
// En producción cambia el origin a tu dominio de Vercel
app.use(
  cors({
    origin: [
      "https://repsol-comparativa.onrender.com",
      "http://localhost:5173",
    ],
  })
);
// ...rutas después

app.use(express.json({ limit: "2mb" }));

// Utilidad: convierte un archivo (png/jpg/svg) a data URI
const toDataUri = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        ext === ".svg" ? "image/svg+xml" :
          "application/octet-stream";
  const data = fs.readFileSync(filePath);
  const base64 = data.toString("base64");
  return `data:${mime};base64,${base64}`;
};

// Rutas a tus imágenes en ./assets
const assetsDir = path.resolve(__dirname, "assets");

// Carga imágenes una sola vez
const logoRepsolUri = toDataUri(path.join(assetsDir, "repsol.svg"));
const iconRepsolUri = toDataUri(path.join(assetsDir, "repsol_icon.jpg"));
const boltUri = toDataUri(path.join(assetsDir, "bolt.svg"));
const bombillaUri = toDataUri(path.join(assetsDir, "bombilla2.svg"));
const addUri = toDataUri(path.join(assetsDir, "add.svg"));
const moneyUri = toDataUri(path.join(assetsDir, "money.svg"));
const approveUri = toDataUri(path.join(assetsDir, "approve.svg"));
const actualUri = toDataUri(path.join(assetsDir, "actual.svg"));
const savingsUri = toDataUri(path.join(assetsDir, "savings.svg"));
const savings2Uri = toDataUri(path.join(assetsDir, "economia-y-finanzas_hucha.svg"));
const oregonUri = toDataUri(path.join(assetsDir, "oregon.svg"));
const callUri = toDataUri(path.join(assetsDir, "call.svg"));

const userUri = toDataUri(path.join(assetsDir, "user.svg"));

const mailUri = toDataUri(path.join(assetsDir, "mail.svg"));

const percentUri = toDataUri(path.join(assetsDir, "percent.svg"));
const headerUri = toDataUri(path.join(assetsDir, "repsol_header.png"));
const header2Uri = toDataUri(path.join(assetsDir, "header.svg")); // si no la usas, puedes quitarla

function wattsToKwNumber(watts) {
  const n = Number(String(watts ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return n / 1000; // 4600 -> 4.6
}
function toNum(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function formatNumberComma(n, dec = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dec).replace(".", ",");
}

function euro(n) {
  const t = formatNumberComma(n, 2);
  return (t === "—" ? "—" : `${t}€`);
}


// Plantilla HTML (usa class, no className). Añadimos ".pdf-root" como ancla estable.
const buildHtml = (data = {}) => {
  const {
    name = "Ejemplo",
    comercial = "",
    tarifa = "",

    // Fijo/Exclusivo
    consumo = "",
    potencia = "",
    diasFactura = "",
    bonoSocial = "",
    alquilerContador = "",
    otros = "",

    // Indexado
    consumoP1 = "",
    consumoP2 = "",
    consumoP3 = "",
  } = data;
  const potenciaKwNum = wattsToKwNumber(potencia);            // 4.6 para 4600W
  const potenciaKwText = formatNumberComma(potenciaKwNum, 1); // "4,6"
  const diasNum = Number(String(diasFactura ?? "").replace(",", ".")) || 0;
 // Cálculo del término fijo por periodos
let importeP1 = 0;
let importeP2 = 0;
let totalTerminoFijo = 0;
  const t = String(tarifa || "").trim();

if (t === "Indexado") {
  // Periodo 1 y 2 con precios distintos
  importeP1 = potenciaKwNum * diasNum * 0.0717;
  importeP2 = potenciaKwNum * diasNum * 0.0031;
  totalTerminoFijo = importeP1 + importeP2;
} else {
  // Fijo / Exclusivo: ambos periodos con el mismo precio 0.0819
  const precioKwDia = 0.0819;
  const importeTerminoFijo = potenciaKwNum * diasNum * precioKwDia;
  importeP1 = importeTerminoFijo;
  importeP2 = importeTerminoFijo;
  totalTerminoFijo = importeP1 + importeP2;
}

let precioKwDiaTextP1 = "0,0819 €/kW día";
let precioKwDiaTextP2 = "0,0819 €/kW día";

if (t === "Indexado") {
  precioKwDiaTextP1 = "0,0717 €/kW día";
  precioKwDiaTextP2 = "0,0031 €/kW día";
}
  // Consumos numéricos
  const consumoTotal = toNum(consumo);
  const cP1 = toNum(consumoP1);
  const cP2 = toNum(consumoP2);
  const cP3 = toNum(consumoP3);

  // Precios por kWh
  let priceP1 = 0, priceP2 = 0, priceP3 = 0;
  let kWh1 = 0, kWh2 = 0, kWh3 = 0;

  if (t === "Indexado") {
    kWh1 = cP1;
    kWh2 = cP2;
    kWh3 = cP3;
    priceP1 = 0.154;
    priceP2 = 0.103;
    priceP3 = 0.0724;
  } else if (t === "Exclusivo") {
    kWh1 = consumoTotal;
    kWh2 = 0;
    kWh3 = 0;
    priceP1 = 0.1099;
    priceP2 = 0.1099; // no usados
    priceP3 = 0.1099;
  } else {
    // Fijo (por defecto)
    kWh1 = consumoTotal;
    kWh2 = 0;
    kWh3 = 0;
    priceP1 = 0.1299;
    priceP2 = 0.1299; // no usados
    priceP3 = 0.1299;
  }

  // Importes de energía
  const impP1 = kWh1 * priceP1;
  const impP2 = kWh2 * priceP2;
  const impP3 = kWh3 * priceP3;
  const totalEnergia = impP1 + impP2 + impP3;

  // Textos formateados
  const kWh1Text = `${formatNumberComma(kWh1, 2)} kWh`;
  const kWh2Text = `${formatNumberComma(kWh2, 2)} kWh`;
  const kWh3Text = `${formatNumberComma(kWh3, 2)} kWh`;

  const priceP1Text = `${formatNumberComma(priceP1, 4)} €/kWh`;
  const priceP2Text = `${formatNumberComma(priceP2, 4)} €/kWh`;
  const priceP3Text = `${formatNumberComma(priceP3, 4)} €/kWh`;
  const diasN = Number(String(diasFactura ?? "").replace(",", ".")) || 0;
  const bonoTotalFront = Number(String(bonoSocial ?? "").replace(",", "."));
  const alquilerTotalFront = Number(String(alquilerContador ?? "").replace(",", "."));

  const bonoBaseDia = 0.012742;
  const alquilerBaseDia = 0.02663;

  const bonoDia = (Number.isFinite(bonoTotalFront) && bonoTotalFront > 0 && diasN > 0)
    ? (bonoTotalFront / diasN)
    : bonoBaseDia;

  const alquilerDia = (Number.isFinite(alquilerTotalFront) && alquilerTotalFront > 0 && diasN > 0)
    ? (alquilerTotalFront / diasN)
    : alquilerBaseDia;

  // Totales a mostrar en cabecera "Varios"
  const totalBono = bonoDia * diasN;
  const totalAlquiler = alquilerDia * diasN;
  const totalVarios = totalBono + totalAlquiler;

  // Textos formateados
  const bonoDiaText = `${formatNumberComma(bonoDia, 6)} €/día`;
  const alquilerDiaText = `${formatNumberComma(alquilerDia, 5)} €/día`; // ajusta decimales si quieres
  // =====================
  // Cálculo Impuestos
  // =====================

  // Base para Impuesto Eléctrico: suma de término fijo + energía
  const baseImpuestoElectrico = (totalTerminoFijo || 0) + (totalEnergia || 0);

  // Tipo de Impuesto Eléctrico (5,11269632%)
  const tipoImpuestoElectrico = 0.0511269632;

  // Importe de Impuesto Eléctrico
  const importeImpuestoElectrico = baseImpuestoElectrico * tipoImpuestoElectrico;

  // Base para IVA: suma de término fijo + energía + varios + impuesto eléctrico
  const baseIVA = baseImpuestoElectrico + (totalVarios || 0) + importeImpuestoElectrico;

  // Tipo de IVA (21%)
  const tipoIVA = 0.21;

  // Importe de IVA
  const importeIVA = baseIVA * tipoIVA;

  // Total de la sección "Impuestos"
  const totalImpuestos = importeImpuestoElectrico + importeIVA;

  // Textos formateados para mostrar
  const baseImpElecText = `${formatNumberComma(baseImpuestoElectrico, 2)} €`;
  const tipoImpElecText = `${formatNumberComma(tipoImpuestoElectrico * 100, 8)} %`;
  const impElecText = euro(importeImpuestoElectrico);

  const tipoIVAText = `${formatNumberComma(tipoIVA * 100, 2)} %`;
  const ivaText = euro(importeIVA);
  const totalImpuestosText = euro(totalImpuestos);
  // =====================
  // TOTAL GENERAL
  // =====================
  const totalGeneral = (totalEnergia || 0) + (totalTerminoFijo || 0) + (totalVarios || 0) + (totalImpuestos || 0);
  const totalGeneralText = euro(totalGeneral);
  // =====================
  // ACTUAL y AHORRO
  // =====================
 // ACTUAL: exactamente el valor de "otros" que llega del front
const otrosNum = Number(String(otros ?? "").replace(",", ".")) || 0;
const actualText = euro(otrosNum);

// AHORRO: otros - totalGeneral, pero nunca negativo
const ahorroBruto = otrosNum - (totalGeneral || 0);
const ahorroNum = Math.max(0, ahorroBruto);
const ahorroText = euro(ahorroNum);


  return `
<!DOCTYPE html>
<html lang="es">
<head> <meta charset="UTF-8" /> <title>PDF - ${name}</title> <meta name="viewport" content="width=device-width, initial-scale=1" /> <!-- Tailwind CDN --> <script src="https://cdn.tailwindcss.com"></script> <!-- Google Fonts: Montserrat --> <link rel="preconnect" href="https://fonts.googleapis.com"> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"> <style> @page { margin: 0mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; } img { display:block; } </style> </head>
<body class="min-h-screen bg-white">
  <div class="pdf-root flex justify-center  ">
    <div class="py-2.5 px-3.5 grid gap-4  w-full">

      <!-- Cabecera -->
      <div class="bg-[#F8EEE4] h-[90px] flex items-center overflow-hidden justify-between rounded-[20px]">
        <div class="ml-[40px] flex items-center w-auto space-x-[32px] rounded-xl">
          <img src="${logoRepsolUri}" alt="Logo" class=" translate-y-[2px] h-8 mr-1 " />
          <div class="h-7 w-[2px] bg-[#011E37] rounded-full"></div>
          <div class="text-base text-[#011E37] font-medium">
            Comparativa Repsol
          </div>
        </div>
         <img src="${iconRepsolUri}" alt="Logo" class=" translate-x-[70px] translate-y-[6px] rotate-6 h-44  " />
      </div>

      <!-- Bloque: título + cabeceras de tabla -->
      <div class="flex flex-col">
        <div class="bg-[#F0F5F8] text-sm font-medium py-1 pl-4 flex items-center rounded-t-[20px] border-[2px] border-[#DBE6F0]">
          SIMULACIÓN DE TU FACTURA CON REPSOL
        </div>

        <div class="text-xs font-medium py-1 -mt-[2px] text-[#6A8298] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-3.5">
          <div class="flex justify-between">
            <div>Concepto</div>
            <div>Importe</div>
          </div>
          <div>Cálculo</div>
          <div>Descripción</div>
        </div>

        <!-- Fila Término fijo -->
        <div class="text-[12px] font-medium py-3 -mt-[2px] text-[#011E37] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-x-3.5 gap-y-2">
          <div class="col-span-3 flex justify-between py-1 px-1.5 rounded-md bg-[#FFEBCC] w-[calc((100%-2*8px)/3+5px)] -ml-[4px] -mr-[4px] justify-self-start">
            <div class="flex items-center space-x-1 font-semibold ">
              <img src="${boltUri}" alt="Logo" class="h-4 w-4" />
              <div >Término fijo</div>
            </div>
<div class="font-semibold">${euro(totalTerminoFijo)}</div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex flex-col space-y-1">
              <div class="flex justify-between">
                <div>Período 1</div>
                <div>${euro(importeP1)}</div>
              </div>
              <div class="flex justify-between">
                <div>Período 2</div>
                <div>${euro(importeP2)}</div>
              </div>
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex flex-col space-y-1">
              <div class="flex justify-between w-full">
  <div>${potenciaKwText} kW</div>
  <div>×</div>
  <div>${diasFactura} días</div>
  <div>×</div>
<div>${precioKwDiaTextP1}</div>
</div>
<div class="flex justify-between w-full">
  <div>${potenciaKwText} kW</div>
  <div>×</div>
  <div>${diasFactura} días</div>
  <div>×</div>
<div>${precioKwDiaTextP2}</div>
</div>

            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex space-y-1 h-full items-start">
              <div class="flex justify-between text-[10px]">
                Es el importe que pagas por estar conectado a la red a tu distribuidora y por la cuota de comercialización a Repsol.
              </div>
            </div>
          </div>
        </div>

        <!-- Fila Energía -->
        <div class="text-[12px] font-medium py-3 -mt-[2px] text-[#011E37] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-x-3.5 gap-y-2">
          <div class="col-span-3 flex justify-between py-1 px-1.5 rounded-md bg-[#FFEBCC] w-[calc((100%-2*8px)/3+5px)] -ml-[4px] -mr-[4px] justify-self-start">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${bombillaUri}" alt="Logo" class="h-4 w-4" />
              <div>Energía</div>
            </div>
<div class="font-semibold">${euro(totalEnergia)}</div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex flex-col space-y-1">
              <div class="flex justify-between">
                <div>Consumo (P1)</div>
<div>${euro(impP1)}</div>
              </div>
              <div class="flex justify-between">
                <div>Consumo (P2)</div>
<div>${euro(impP2)}</div>
              </div>
              <div class="flex justify-between">
                <div>Consumo (P3)</div>
<div>${euro(impP3)}</div>
              </div>
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
           <div class="flex space-x-1 w-full justify-end">
  <div>${kWh1Text}</div>
  <div>×</div>
  <div>${priceP1Text}</div>
</div>
<div class="flex space-x-1 w-full justify-end">
  <div>${kWh2Text}</div>
  <div>×</div>
  <div>${priceP2Text}</div>
</div>
<div class="flex space-x-1 w-full justify-end">
  <div>${kWh3Text}</div>
  <div>×</div>
  <div>${priceP3Text}</div>
</div>

          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex space-y-1 h-full items-start">
              <div class="flex justify-between text-[10px]">
                Es el importe variable que pagas por la electricidad que has utilizado. Se calcula en función de los kWh consumidos y el precio de cada kWh.
              </div>
            </div>
          </div>

        </div>
        <div class="text-[12px] font-medium py-3 -mt-[2px] text-[#011E37] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-x-3.5 gap-y-2">
          <div class="col-span-3 flex justify-between py-1 px-1.5 rounded-md bg-[#DAF5FB] w-[calc((100%-2*8px)/3+5px)] -ml-[4px] -mr-[4px] justify-self-start">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${addUri}" alt="Logo" class="h-4 w-4" />
              <div>Varios</div>
            </div>
<div class="font-semibold">${euro(totalVarios)}</div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex flex-col space-y-1">
              <div class="flex justify-between">
                <div>Financiación del Bono Social</div>
<div>${euro(totalBono)}</div>

              </div>
              <div class="flex justify-between">
                <div>  Alquiler del contador </div>
<div>${euro(totalAlquiler)}</div>

              </div>
              
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex space-x-1 w-full justify-end">
  <div>${diasFactura} días</div>
  <div>×</div>
  <div>${bonoDiaText}</div>
</div>
<div class="flex space-x-1 w-full justify-end">
  <div>${diasFactura} días</div>
  <div>×</div>
  <div>${alquilerDiaText}</div>
</div>

           
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex space-y-1 h-full items-start">
              <div class="flex justify-between text-[10px]">
                Aquí se muestra la financiación del bono social y el alquiler del contador si no es de tu propiedad.
              </div>
            </div>
          </div>

        </div>
        <div class="text-[12px] font-medium py-3 -mt-[2px] text-[#011E37] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-x-3.5 gap-y-2">
          <div class="col-span-3 flex justify-between py-1 px-1.5 rounded-md bg-[#DAF5FB] w-[calc((100%-2*8px)/3+5px)] -ml-[4px] -mr-[4px] justify-self-start">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${percentUri}" alt="Logo" class="h-4 w-4" />
              <div>Impuestos</div>
            </div>
<div class="font-semibold">${totalImpuestosText}</div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex flex-col space-y-1">
              <div class="flex justify-between">
               <div>Impuesto Eléctrico</div>
<div>${impElecText}</div>

              </div>
              <div class="flex justify-between">
                <div>IVA (21%)</div>
<div>${ivaText}</div>

              </div>
             
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
<div class="flex space-x-1 w-full justify-end">
  <div>${baseImpElecText}</div>
  <div>×</div>
  <div>${tipoImpElecText}</div>
</div>
<div class="flex space-x-1 w-full justify-end">
  <div>${formatNumberComma(baseIVA, 2)} €</div>
  <div>×</div>
  <div>${tipoIVAText}</div>
</div>

            
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex space-y-1 h-full items-start">
              <div class="flex justify-between text-[10px]">
                Incluimos en tu factura los impuestos regulados, como el Impuesto Eléctrico sobre el consumo y el IVA sobre el total.
              </div>
            </div>
          </div>

        </div>
        
        <div class="text-[12px] rounded-b-[20px] font-medium py-3 -mt-[2px] text-[#011E37] px-3 border-[2px] border-[#DBE6F0] flex justify-between gap-[8px] my-2 ">
          <div class="flex justify-between py-1 px-1.5 rounded-md bg-[#DBE6F0] basis-[33%] shrink-0 grow-0">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${approveUri}" alt="Logo" class="h-4 w-4" />
              <div>TOTAL</div>
            </div>
<div class="font-semibold">${totalGeneralText}</div>
          </div>
<div class="flex justify-between py-1 px-1.5 rounded-md bg-[#DBE6F0] flex-1 min-w-0">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${actualUri}" alt="Logo" class="h-4 w-4" />
              <div>ACTUAL</div>
            </div>
<div class="font-semibold">${actualText}</div>
          </div>
          <div class="flex justify-between py-1 px-1.5 rounded-md bg-[#DBE6F0] flex-1 min-w-0">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${savingsUri}" alt="Logo" class="h-4 w-4" />
              <div>AHORRO</div>
            </div>
<div class="font-semibold">${ahorroText}</div>
          </div>
          

        </div>
      </div>
<div class="text-[12px] font-medium -mt-[8px]  py-3 rounded-[20px]  text-[#011E37] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-x-3.5 gap-y-2">
          <div class="col-span-3 flex justify-between py-1 px-1.5 rounded-md bg-[#D3F3DB] w-[calc((100%-2*8px)/3+5px)] -ml-[4px] -mr-[4px] justify-self-start">
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${moneyUri}" alt="Logo" class="h-4 w-4" />
              <div>Beneficios</div>
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <div class="flex flex-col space-y-1">
              <div class="flex justify-between">
                <div>Gasolina</div>
                <div>15c€/L</div>
              </div>
              
              <div class="flex justify-between">
                <div>Tarjeta Regalo</div>
                <div>80€</div>
              </div>
              <div class="flex justify-between">
                <div>Recarga electrica</div>
                <div>75%</div>
              </div>
             
              
            </div>
          </div>

          

          <div class="flex flex-col space-y-1.5">
            <div class="flex space-y-1 h-full items-start">
              <div class="flex justify-between text-[10px]">
                Aquí tienes otros importes a tu favor que has
                conseguido por estar en Repsol, como cashbacks
                de Waylet, ahorro en la gasolina, en recargas eléctricas en las vías públicas y tarjetas regaló.
              </div>
            </div>
          </div>

        </div>
        <div class="text-[12px] font-medium     text-[#011E37]   grid grid-cols-7 gap-x-3.5 gap-y-2">
         <div class="bg-[#DBE6F0] rounded-[20px] w-full col-span-3 py-4 px-4 space-y-1.5">
         
          <div class="gap-1">
            <div class="text-[12px]">Comercial</div>
            <div class="flex items-center gap-1">
              <img src="${userUri}" alt="Logo" class="h-4 w-4" />
              <div class="font-semibold text-sm">${comercial} </div>
            </div>
          </div>
          <div class="gap-1">
            <div class="text-[12px]">Email</div>
            <div class="flex items-center gap-1">
              <img src="${mailUri}" alt="Logo" class="h-4 w-4" />
              <div class="font-semibold text-sm">dbustamanterepsol@gmail.com</div>
            </div>
          </div>
          <div class="gap-1">
            <div class="text-[12px]">Contacto</div>
            <div class="flex items-center gap-1">
              <img src="${callUri}" alt="Logo" class="h-4 w-4" />
              <div class="font-semibold text-sm">643602308</div>
            </div>
          </div>
         
        </div>
            <div class=" border-[2px] border-[#DBE6F0] w-full rounded-[20px] col-span-4 flex  py-3 px-4">
                  <div>
                      <div class="text-[16px] font-semibold">
                      ${name} 
                      </div>
                      <div class="text-[14px] font-medium">
                      Comparativa a fecha 12/07/2025, en base a los consumos de la factura el plan más recomendado es el Plan Fijo las 24h con el cual obtienes un ahorro estimado de 500,34€
                      </div>
                  
                  </div>
                  <img src="${savings2Uri}" alt="Logo" class="h-32 w-auto" />
            </div>
      </div>
    </div>
  </div>
</body>
</html>
`};

// Vista HTML para iterar estilos rápido (sin generar PDF)
app.get("/preview", (req, res) => {
  const {
    name = "Ejemplo",
    comercial = "",
    tarifa = "",
    consumo = "",
    potencia = "",
    diasFactura = "",
    bonoSocial = "",
    alquilerContador = "",
    otros = "",
    consumoP1 = "",
    consumoP2 = "",
    consumoP3 = "",
  } = req.query || {};

  const html = buildHtml({
    name, comercial, tarifa,
    consumo, potencia, diasFactura, bonoSocial, alquilerContador, otros,
    consumoP1, consumoP2, consumoP3,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
});

// PDF inline (application/pdf en respuesta, sin "attachment")
app.post("/pdf-inline", async (req, res) => {
  const {
    name, comercial, tarifa,
    consumo, potencia, diasFactura, bonoSocial, alquilerContador, otros,
    consumoP1, consumoP2, consumoP3,
  } = req.body || {};

  const html = buildHtml({
    name: name || "Sin nombre",
    comercial: comercial || "",
    tarifa: tarifa || "",
    consumo: consumo || "",
    potencia: potencia || "",
    diasFactura: diasFactura || "",
    bonoSocial: bonoSocial || "",
    alquilerContador: alquilerContador || "",
    otros: otros || "",
    consumoP1: consumoP1 || "",
    consumoP2: consumoP2 || "",
    consumoP3: consumoP3 || "",
  });

  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    // pequeño buffer por si hay cargas externas
    await new Promise(r => setTimeout(r, 120));
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error("Error pdf-inline:", e);
    return res.status(500).send("Error");
  } finally {
    if (browser) await browser.close();
  }
});

// PDF con descarga (attachment)
app.post("/pdf", async (req, res) => {
  const {
    name, comercial, tarifa,
    consumo, potencia, diasFactura, bonoSocial, alquilerContador, otros,
    consumoP1, consumoP2, consumoP3,
  } = req.body || {};

  const html = buildHtml({
    name: name || "Sin nombre",
    comercial: comercial || "",
    tarifa: tarifa || "",
    consumo: consumo || "",
    potencia: potencia || "",
    diasFactura: diasFactura || "",
    bonoSocial: bonoSocial || "",
    alquilerContador: alquilerContador || "",
    otros: otros || "",
    consumoP1: consumoP1 || "",
    consumoP2: consumoP2 || "",
    consumoP3: consumoP3 || "",
  });

  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 120));
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Repsol_${(name || "sin_nombre")
        .toString()
        .replace(/[^\w\d-_]/g, "_")}.pdf"`
    );
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("Error generando PDF:", err);
    return res.status(500).json({ error: "No se pudo generar el PDF" });
  } finally {
    if (browser) await browser.close();
  }
});

const port = process.env.PORT || 10000
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`)
})