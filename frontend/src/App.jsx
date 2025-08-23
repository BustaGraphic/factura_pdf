import { useState, useEffect } from "react";
import down from "./assets/down.svg"
import repsol from "./assets/repsol.svg"

function App() {
  const [page, setPage] = useState("")
  const [selected, setSelected] = useState("Fijo")
  const [selector, setSelector] = useState(false)
  const [name, setName] = useState("");
  const [comercial, setComercial] = useState("");
  const [consumo, setConsumo] = useState("");
  const [potencia, setPotencia] = useState("");
  const [diasFactura, setDiasFactura] = useState("");
  const [bonoSocial, setBonoSocial] = useState("");
  const [alquilerContador, setAlquilerContador] = useState("");
  const [otros, setOtros] = useState("");

  // Datos para Indexado
  const [consumoP1, setConsumoP1] = useState("");
  const [consumoP2, setConsumoP2] = useState("");
  const [consumoP3, setConsumoP3] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [precioRepsol, setPrecioRepsol] = useState(""); // string mostrado en el input

  const BACKEND = "http://localhost:3001";

  const handlePreview = async () => {
    setErrorMsg("");
    setPdfUrl("");
    if (!name.trim()) {
      setErrorMsg("Introduce un nombre.");
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch(`${BACKEND}/pdf-inline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Error servidor: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e) {
      console.error(e);
      setErrorMsg("No se pudo generar el preview. ¿Backend activo?");
    } finally {
      setLoadingPreview(false);
    }
  };
  // formateo y parsing
  const toNum = (v) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const wattsToKw = (w) => toNum(w) / 1000; // 4600 -> 4.6
  const fmtMoney = (n) => (Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "0,00");
  useEffect(() => {
    const dias = toNum(diasFactura);
    const potenciaKw = wattsToKw(potencia);

    let energia = 0;
    let terminoFijo = 0;
    let totalVarios = 0;
    let impElectrico = 0;

    if (selected === "Fijo") {
      const consumoNum = toNum(consumo);
      energia = consumoNum * 0.1299;
      terminoFijo = potenciaKw * dias * 0.0819 * 2;

      // Varios: bono y alquiler (reglas actuales)
      const bonoTotalFront = toNum(bonoSocial);
      const alquilerTotalFront = toNum(alquilerContador);
      const bonoBaseDia = 0.012742;
      const alquilerBaseDia = 0.02663;
      const bonoTotal = bonoTotalFront > 0 ? bonoTotalFront : dias * bonoBaseDia;
      const alquilerTotal = alquilerTotalFront > 0 ? alquilerTotalFront : dias * alquilerBaseDia;
      totalVarios = bonoTotal + alquilerTotal;

      // Impuesto eléctrico: 5,11269632% sobre (energía + término fijo)
      impElectrico = (energia + terminoFijo) * 0.0511269632;

    } else if (selected === "Exclusivo") {
      const consumoNum = toNum(consumo);
      energia = consumoNum * 0.1099;
      terminoFijo = potenciaKw * dias * 0.0819 * 2;

      const bonoTotalFront = toNum(bonoSocial);
      const alquilerTotalFront = toNum(alquilerContador);
      const bonoBaseDia = 0.012742;
      const alquilerBaseDia = 0.02663;
      const bonoTotal = bonoTotalFront > 0 ? bonoTotalFront : dias * bonoBaseDia;
      const alquilerTotal = alquilerTotalFront > 0 ? alquilerTotalFront : dias * alquilerBaseDia;
      totalVarios = bonoTotal + alquilerTotal;

      impElectrico = (energia + terminoFijo) * 0.0511269632;

    } else if (selected === "Indexado") {
      const cP1 = toNum(consumoP1);
      const cP2 = toNum(consumoP2);
      const cP3 = toNum(consumoP3);
      energia = cP1 * 0.154 + cP2 * 0.103 + cP3 * 0.0724;

      const tramo1 = potenciaKw * dias * 0.0717;
      const tramo2 = potenciaKw * dias * 0.0031;
      terminoFijo = tramo1 + tramo2;

      const bonoTotalFront = toNum(bonoSocial);
      const alquilerTotalFront = toNum(alquilerContador);
      const bonoBaseDia = 0.012742;
      const alquilerBaseDia = 0.02663;
      const bonoTotal = bonoTotalFront > 0 ? bonoTotalFront : dias * bonoBaseDia;
      const alquilerTotal = alquilerTotalFront > 0 ? alquilerTotalFront : dias * alquilerBaseDia;
      totalVarios = bonoTotal + alquilerTotal;

      impElectrico = (energia + terminoFijo) * 0.0511269632;

    } else if (selected === "Gas") {
      // Gas: sin potencia, sin bono; reglas específicas
      const consumoNum = toNum(consumo);

      // Energía
      energia = consumoNum * 0.079;

      // Término fijo
      terminoFijo = dias * 0.216;

      // Varios: solo alquiler = días * 0.0209
      totalVarios = dias * 0.019;

      // Impuesto eléctrico del gas (según tu indicación): kWh * 0.00234 €
      impElectrico = consumoNum * 0.00234;
    }

    const subtotal = energia + terminoFijo + totalVarios + impElectrico;
    const totalConIva = subtotal * 1.21;

    setPrecioRepsol(fmtMoney(totalConIva));
  }, [
    selected,
    consumo,
    consumoP1,
    consumoP2,
    consumoP3,
    potencia,
    diasFactura,
    bonoSocial,
    alquilerContador,
  ]);



  const handleDownload = async () => {
    setErrorMsg("");

    // Validación mínima
    if (!name.trim()) {
      setErrorMsg("Introduce un nombre.");
      return;
    }
    if (!comercial.trim()) {
      setErrorMsg("Introduce el comercial.");
      return;
    }

    // Construye payload según la tarifa
    const base = {
      name: name.trim(),
      comercial: comercial.trim(),
      tarifa: selected, // "Fijo" | "Exclusivo" | "Indexado"
    };

    let payload;

    if (selected === "Indexado") {
      payload = {
        ...base,
        consumoP1: consumoP1.trim(),
        consumoP2: consumoP2.trim(),
        consumoP3: consumoP3.trim(),
        potencia: potencia.trim(),
        diasFactura: diasFactura.trim(),
        bonoSocial: bonoSocial.trim(),
        alquilerContador: alquilerContador.trim(),
        otros: otros.trim(),
      };
    } else {
      // Fijo o Exclusivo
      payload = {
        ...base,
        consumo: consumo.trim(),
        potencia: potencia.trim(),
        diasFactura: diasFactura.trim(),
        bonoSocial: bonoSocial.trim(),
        alquilerContador: alquilerContador.trim(),
        otros: otros.trim(),
      };
    }

    setLoadingDownload(true);
    try {
      const res = await fetch(`${BACKEND}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Error servidor: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pdf_generado_${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setErrorMsg("No se pudo descargar el PDF. ¿Backend activo?");
    } finally {
      setLoadingDownload(false);
    }
  };

  const handleContinuar = () => {
    // Si los inputs son controlados, name y comercial ya están en estado
    setPage(selected);
  };
  return (
    <div className="w-full mb-32 flex flex-col items-center  mt-20 font-medium">
      {page == "" ? ("") : (
        <>
          <button onClick={() => setPage("")} className=" absolute top-6 left-6 bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none" >
            <img src={down} alt="down" className={`h-6 w-6 select-none transition-transform duration-200 rotate-90`} />

          </button>
        </>
      )}
      <img src={repsol} alt="down" className="h-32 w-auto select-none" />
      {(page === "Fijo" || page === "Exclusivo") ? (
        <div className="flex-col flex items-center w-screen space-y-2 mt-6">
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Consumo
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={consumo} onChange={(e) => setConsumo(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                kW
              </div>
            </div>

          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Potencia
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={potencia}
                onChange={(e) => setPotencia(e.target.value)} placeholder="ej. 4600" className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                W
              </div>
            </div>

          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Días Factura
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={diasFactura}
                onChange={(e) => setDiasFactura(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                Días
              </div>
            </div>

          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Financiación Bono Social
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={bonoSocial}
                onChange={(e) => setBonoSocial(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>

          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Alquiler Contador
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={alquilerContador}
                onChange={(e) => setAlquilerContador(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>

          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Precio Actual Factura
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={otros}
                onChange={(e) => setOtros(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>


          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Precio con Repsol
            </div>
            <div className="relative w-full flex justify-center">
              <input
                type="text"
                value={precioRepsol}
                readOnly
                className="w-full max-w-80 appearance-none bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none"
              />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>


          </div>
          <button onClick={handleDownload} className="w-full max-w-80 bg-[#FC9F36] mt-2  border-2 border-[#FC9F36]/50 text-white rounded-lg py-1.5 px-2 font-medium  ">
            Descargar
          </button>

        </div>
      ) : page == "Indexado" ? (<div className="flex-col flex items-center w-screen space-y-2 mt-6">
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Consumo
          </div>
          <div className="relative w-full flex justify-center mb-2">
            <input type="text" placeholder="P1" value={consumoP1}
              onChange={(e) => setConsumoP1(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              kW
            </div>
          </div>
          <div className="relative w-full flex justify-center mb-2">
            <input type="text" placeholder="P2" value={consumoP2}
              onChange={(e) => setConsumoP2(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              kW
            </div>
          </div>
          <div className="relative w-full flex justify-center">
            <input type="text" placeholder="P3" value={consumoP3}
              onChange={(e) => setConsumoP3(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              kW
            </div>
          </div>

        </div>
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Potencia
          </div>
          <div className="relative w-full flex justify-center">
            <input type="text" value={potencia}
              onChange={(e) => setPotencia(e.target.value)} placeholder="ej. 4600" className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              W
            </div>
          </div>

        </div>
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Días Factura
          </div>
          <div className="relative w-full flex justify-center">
            <input type="text" value={diasFactura}
              onChange={(e) => setDiasFactura(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              Días
            </div>
          </div>

        </div>
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Financiación Bono Social
          </div>
          <div className="relative w-full flex justify-center">
            <input type="text" value={bonoSocial}
              onChange={(e) => setBonoSocial(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              €
            </div>
          </div>

        </div>
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Alquiler Contador
          </div>
          <div className="relative w-full flex justify-center">
            <input type="text" value={alquilerContador}
              onChange={(e) => setAlquilerContador(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              €
            </div>
          </div>

        </div>
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Precio Actual Factura
          </div>
          <div className="relative w-full flex justify-center">
            <input type="text" value={otros}
              onChange={(e) => setOtros(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              €
            </div>
          </div>

        </div>
        <div className=" w-full max-w-80 flex flex-col items-start" >
          <div className=" text-[#43637D] ">
            Precio con Repsol
          </div>
          <div className="relative w-full flex justify-center">
            <input
              type="text"
              value={precioRepsol}
              readOnly
              className="w-full max-w-80 appearance-none bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none"
            />
            <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
              €
            </div>
          </div>


        </div>
        <button onClick={handleDownload} className="w-full max-w-80 bg-[#FC9F36] mt-2  border-2 border-[#FC9F36]/50 text-white rounded-lg py-1.5 px-2 font-medium  ">
          Descargar
        </button>
      </div>) : page == "Gas" ? (
        <div className="flex-col flex items-center w-screen space-y-2 mt-6">
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Consumo
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={consumo} onChange={(e) => setConsumo(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                kW
              </div>
            </div>

          </div>

          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Días Factura
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={diasFactura}
                onChange={(e) => setDiasFactura(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                Días
              </div>
            </div>

          </div>

          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Alquiler Contador
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={alquilerContador}
                onChange={(e) => setAlquilerContador(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>

          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Precio Actual Factura
            </div>
            <div className="relative w-full flex justify-center">
              <input type="text" value={otros}
                onChange={(e) => setOtros(e.target.value)} className="w-full max-w-80 appearance-none  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>


          </div>
          <div className=" w-full max-w-80 flex flex-col items-start" >
            <div className=" text-[#43637D] ">
              Precio con Repsol
            </div>
            <div className="relative w-full flex justify-center">
              <input
                type="text"
                value={precioRepsol}
                readOnly
                className="w-full max-w-80 appearance-none bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none"
              />
              <div className="absolute inset-y-0 right-2 flex items-center text-[#43637D] pointer-events-none">
                €
              </div>
            </div>


          </div>
          <button onClick={handleDownload} className="w-full max-w-80 bg-[#FC9F36] mt-2  border-2 border-[#FC9F36]/50 text-white rounded-lg py-1.5 px-2 font-medium  ">
            Descargar
          </button>

        </div>
      ) : (
        <div className="flex-col flex items-center w-screen space-y-2 mt-6">

          <div className="text-xl font-medium mb-3 ">
            Selecciona una Tarifa
          </div>
          <div className="relative w-full max-w-80 text-[#43637D]   ">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre Cliente" className="w-full max-w-80 appearance-none mb-2 bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
            <div onClick={() => setSelector(prev => !prev)} className="flex items-center justify-between w-full max-w-80  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium ">
              <div>
                {selected == "Fijo" ? ("Plan Fijo 24h") : selected == "Exclusivo" ? ("Fijo Explusivo") : selected == "Indexado" ? ("Plan Indexado") : ("Plan Gas")}
              </div>
              <img src={down} alt="down" className={`h-6 w-6 select-none transition-transform duration-200 ${selector ? "rotate-180" : "rotate-0"}`} />
            </div>

            {
              selector === true ? (
                <div className="absolute w-full mt-1 max-w-80  bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg font-medium">
                  <div
                    onClick={() => { setSelected("Fijo"); setSelector(false); }}
                    className="hover:bg-[#DBE6F0] hover:cursor-pointer p-1.5 select-none"
                  >
                    Plan Fijo 24h
                  </div>
                  <div
                    onClick={() => { setSelected("Exclusivo"); setSelector(false); }}
                    className="hover:bg-[#DBE6F0] hover:cursor-pointer p-1.5 select-none"
                  >
                    Fijo Exclusivo
                  </div>
                  <div
                    onClick={() => { setSelected("Indexado"); setSelector(false); }}
                    className="hover:bg-[#DBE6F0] hover:cursor-pointer p-1.5 select-none "
                  >
                    Plan Indexado
                  </div>
                  <div
                    onClick={() => { setSelected("Gas"); setSelector(false); }}
                    className="hover:bg-[#DBE6F0] hover:cursor-pointer p-1.5 select-none "
                  >
                    Plan Gas
                  </div>
                </div>
              ) : null
            }
          </div>
          <input type="text" placeholder="Comercial" value={comercial}
            onChange={(e) => setComercial(e.target.value)} className="text-[#43637D] w-full max-w-80 appearance-none mb-2 bg-[#F0F5F8] border-2 border-[#DBE6F0] rounded-lg py-1.5 px-2 font-medium outline-none " />
          <button onClick={handleContinuar} className="w-full max-w-80 bg-[#FC9F36]  border-2 border-[#FC9F36]/50 text-white rounded-lg py-1.5 px-2 font-medium  ">
            Continuar
          </button>


        </div>
      )}

    </div>

  );
}

export default App;
