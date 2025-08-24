const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    "https://repsol-comparativa.onrender.com", 
    "https://factura-pdf.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "2mb" }));

// Docker-optimized Puppeteer configuration
const getPuppeteerConfig = () => {
  const isDocker = fs.existsSync('/.dockerenv');
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  
  console.log('🐳 Docker detected:', isDocker);
  console.log('🏗️ Render detected:', isRender);
  
  if (isDocker || isRender) {
    console.log('🚀 Using production Docker config');
    return {
      headless: 'new',
      executablePath: '/usr/bin/google-chrome-stable', // Chrome path in Docker image
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ],
      timeout: 60000
    };
  }
  
  console.log('💻 Using local development config');
  return { 
    headless: 'new',
    timeout: 30000
  };
};

// Asset loading with error handling
const toDataUri = (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" :
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
          ext === ".svg" ? "image/svg+xml" :
            "application/octet-stream";
    const data = fs.readFileSync(filePath);
    const base64 = data.toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    console.warn(`⚠️ Could not load asset: ${filePath}`);
    return "";
  }
};

// Load assets
const assetsDir = path.resolve(__dirname, "assets");
console.log('📁 Assets directory:', assetsDir);

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
const header2Uri = toDataUri(path.join(assetsDir, "header.svg"));

// Utility functions
function wattsToKwNumber(watts) {
  const n = Number(String(watts ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return n / 1000;
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

// Complete buildHtml function
const buildHtml = (data = {}) => {
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
  } = data;
  
  const potenciaKwNum = wattsToKwNumber(potencia);
  const potenciaKwText = formatNumberComma(potenciaKwNum, 1);
  const diasNum = Number(String(diasFactura ?? "").replace(",", ".")) || 0;
  
  let importeP1 = 0;
  let importeP2 = 0;
  let totalTerminoFijo = 0;
  const t = String(tarifa || "").trim();

  if (t === "Indexado") {
    importeP1 = potenciaKwNum * diasNum * 0.0717;
    importeP2 = potenciaKwNum * diasNum * 0.0031;
    totalTerminoFijo = importeP1 + importeP2;
  } else {
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

  const consumoTotal = toNum(consumo);
  const cP1 = toNum(consumoP1);
  const cP2 = toNum(consumoP2);
  const cP3 = toNum(consumoP3);

  let priceP1 = 0, priceP2 = 0, priceP3 = 0;
  let kWh1 = 0, kWh2 = 0, kWh3 = 0;

  if (t === "Indexado") {
    kWh1 = cP1; kWh2 = cP2; kWh3 = cP3;
    priceP1 = 0.154; priceP2 = 0.103; priceP3 = 0.0724;
  } else if (t === "Exclusivo") {
    kWh1 = consumoTotal; kWh2 = 0; kWh3 = 0;
    priceP1 = 0.1099; priceP2 = 0.1099; priceP3 = 0.1099;
  } else {
    kWh1 = consumoTotal; kWh2 = 0; kWh3 = 0;
    priceP1 = 0.1299; priceP2 = 0.1299; priceP3 = 0.1299;
  }

  const impP1 = kWh1 * priceP1;
  const impP2 = kWh2 * priceP2;
  const impP3 = kWh3 * priceP3;
  const totalEnergia = impP1 + impP2 + impP3;

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
    ? (bonoTotalFront / diasN) : bonoBaseDia;
  const alquilerDia = (Number.isFinite(alquilerTotalFront) && alquilerTotalFront > 0 && diasN > 0)
    ? (alquilerTotalFront / diasN) : alquilerBaseDia;

  const totalBono = bonoDia * diasN;
  const totalAlquiler = alquilerDia * diasN;
  const totalVarios = totalBono + totalAlquiler;
  const bonoDiaText = `${formatNumberComma(bonoDia, 6)} €/día`;
  const alquilerDiaText = `${formatNumberComma(alquilerDia, 5)} €/día`;
  
  const baseImpuestoElectrico = (totalTerminoFijo || 0) + (totalEnergia || 0);
  const tipoImpuestoElectrico = 0.0511269632;
  const importeImpuestoElectrico = baseImpuestoElectrico * tipoImpuestoElectrico;
  const baseIVA = baseImpuestoElectrico + (totalVarios || 0) + importeImpuestoElectrico;
  const tipoIVA = 0.21;
  const importeIVA = baseIVA * tipoIVA;
  const totalImpuestos = importeImpuestoElectrico + importeIVA;

  const baseImpElecText = `${formatNumberComma(baseImpuestoElectrico, 2)} €`;
  const tipoImpElecText = `${formatNumberComma(tipoImpuestoElectrico * 100, 8)} %`;
  const impElecText = euro(importeImpuestoElectrico);
  const tipoIVAText = `${formatNumberComma(tipoIVA * 100, 2)} %`;
  const ivaText = euro(importeIVA);
  const totalImpuestosText = euro(totalImpuestos);
  
  const totalGeneral = (totalEnergia || 0) + (totalTerminoFijo || 0) + (totalVarios || 0) + (totalImpuestos || 0);
  const totalGeneralText = euro(totalGeneral);
  
  const otrosNum = Number(String(otros ?? "").replace(",", ".")) || 0;
  const actualText = euro(otrosNum);
  const ahorroBruto = otrosNum - (totalGeneral || 0);
  const ahorroNum = Math.max(0, ahorroBruto);
  const ahorroText = euro(ahorroNum);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>PDF - ${name}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    img { display:block; }
  </style>
</head>
<body class="min-h-screen bg-white">
  <div class="pdf-root flex justify-center">
    <div class="py-2.5 px-3.5 grid gap-4 w-full">

      <!-- Cabecera -->
      <div class="bg-[#F8EEE4] h-[90px] flex items-center overflow-hidden justify-between rounded-[20px]">
        <div class="ml-[40px] flex items-center w-auto space-x-[32px] rounded-xl">
          <img src="${logoRepsolUri}" alt="Logo" class="translate-y-[2px] h-8 mr-1" />
          <div class="h-7 w-[2px] bg-[#011E37] rounded-full"></div>
          <div class="text-base text-[#011E37] font-medium">
            Comparativa Repsol
          </div>
        </div>
        <img src="${iconRepsolUri}" alt="Logo" class="translate-x-[70px] translate-y-[6px] rotate-6 h-44" />
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
            <div class="flex items-center space-x-1 font-semibold">
              <img src="${boltUri}" alt="Logo" class="h-4 w-4" />
              <div>Término fijo</div>
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

        <!-- Fila Varios -->
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
                <div>Alquiler del contador</div>
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

        <!-- Fila Impuestos -->
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
        
        <!-- Total Row -->
        <div class="text-[12px] rounded-b-[20px] font-medium py-3 -mt-[2px] text-[#011E37] px-3 border-[2px] border-[#DBE6F0] flex justify-between gap-[8px] my-2">
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

      <!-- Beneficios Section -->
      <div class="text-[12px] font-medium -mt-[8px] py-3 rounded-[20px] text-[#011E37] px-4 border-[2px] border-[#DBE6F0] grid grid-cols-[1fr_1fr_1fr] gap-x-3.5 gap-y-2">
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
              <div>Recarga eléctrica</div>
              <div>75%</div>
            </div>
          </div>
        </div>

        <div class="flex flex-col space-y-1.5">
        </div>

        <div class="flex flex-col space-y-1.5">
          <div class="flex space-y-1 h-full items-start">
            <div class="flex justify-between text-[10px]">
              Aquí tienes otros importes a tu favor que has conseguido por estar en Repsol, como cashbacks de Waylet, ahorro en la gasolina, en recargas eléctricas en las vías públicas y tarjetas regalo.
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="text-[12px] font-medium text-[#011E37] grid grid-cols-7 gap-x-3.5 gap-y-2">
        <div class="bg-[#DBE6F0] rounded-[20px] w-full col-span-3 py-4 px-4 space-y-1.5">
          <div class="gap-1">
            <div class="text-[12px]">Comercial</div>
            <div class="flex items-center gap-1">
              <img src="${userUri}" alt="Logo" class="h-4 w-4" />
              <div class="font-semibold text-sm">${comercial}</div>
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
        
        <div class="border-[2px] border-[#DBE6F0] w-full rounded-[20px] col-span-4 flex py-3 px-4">
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
</html>`;
};

// Health check endpoints
app.get("/", (req, res) => {
  res.json({ 
    status: "Backend running", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    docker: fs.existsSync('/.dockerenv'),
    render: !!process.env.RENDER,
    puppeteerPath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable (Docker)',
    puppeteerVersion: require('puppeteer/package.json').version
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    puppeteer: "ready",
    docker: fs.existsSync('/.dockerenv')
  });
});

// Preview endpoint
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

// PDF inline endpoint
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
    console.log('📄 Starting PDF generation (inline)...');
    const config = getPuppeteerConfig();
    
    browser = await puppeteer.launch(config);
    console.log('✅ Browser launched successfully');
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise(r => setTimeout(r, 200));
    
    const pdfBuffer = await page.pdf({ 
      format: "A4", 
      printBackground: true,
      timeout: 30000
    });
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error("❌ Error pdf-inline:", e);
    return res.status(500).json({ 
      error: "Error generando PDF inline", 
      details: e.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr);
      }
    }
  }
});

// Main PDF endpoint
app.post("/pdf", async (req, res) => {
  const {
    name, comercial, tarifa,
    consumo, potencia, diasFactura, bonoSocial, alquilerContador, otros,
    consumoP1, consumoP2, consumoP3,
  } = req.body || {};

  console.log('📋 PDF Request received:', { name, comercial, tarifa });

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
    console.log('=== 📊 PDF Generation Start ===');
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('🐳 Docker env:', fs.existsSync('/.dockerenv'));
    console.log('🏗️ Render env:', !!process.env.RENDER);
    
    const config = getPuppeteerConfig();
    console.log('⚙️ Puppeteer config ready');
    console.log('🎯 Chrome path:', config.executablePath || 'bundled');
    
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch(config);
    console.log('✅ Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('📄 New page created');
    
    await page.setContent(html, { 
      waitUntil: "networkidle0", 
      timeout: 60000 
    });
    console.log('✅ Content set successfully');
    
    await new Promise(r => setTimeout(r, 500));
    console.log('⏱️ Waiting period completed');
    
    const pdfBuffer = await page.pdf({ 
      format: "A4", 
      printBackground: true,
      timeout: 60000,
      preferCSSPageSize: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
    console.log('🎉 PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Repsol_${(name || "sin_nombre")
        .toString()
        .replace(/[^\w\d-_]/g, "_")}.pdf"`
    );
    
    console.log('=== ✅ PDF Generation Complete ===');
    return res.status(200).send(pdfBuffer);
    
  } catch (err) {
    console.error("=== ❌ PDF Generation Error ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Error name:", err.name);
    
    // Additional debugging for Docker environment
    if (fs.existsSync('/.dockerenv')) {
      console.log('🐳 Docker environment detected - checking Chrome installation...');
      const chromePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];
      
      chromePaths.forEach(chromePath => {
        try {
          if (fs.existsSync(chromePath)) {
            console.log('✅ Found Chrome at:', chromePath);
          } else {
            console.log('❌ Not found:', chromePath);
          }
        } catch (e) {
          console.log('❌ Error checking:', chromePath);
        }
      });
    }
    
    return res.status(500).json({ 
      error: "No se pudo generar el PDF", 
      details: err.message,
      errorName: err.name,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      docker: fs.existsSync('/.dockerenv')
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser closed successfully');
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr);
      }
    }
  }
});

const port = process.env.PORT || 10000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log('📁 Environment:', process.env.NODE_ENV || 'development');
  console.log('🐳 Docker environment:', fs.existsSync('/.dockerenv'));
  console.log('🏗️ Render deployment:', !!process.env.RENDER);
  console.log('🤖 Puppeteer version:', require('puppeteer/package.json').version);
  console.log('🎯 Chrome executable path: /usr/bin/google-chrome-stable (Docker)');
  console.log('💡 Assets loaded and ready to generate PDFs!');
});