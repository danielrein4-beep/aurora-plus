// Servicio de comunicacion con basculas ganaderas para manga de pesaje
// Soporta Web Bluetooth (BLE/SPP), Web Serial (USB-RS232) y Simulador Digital de Manga.

export type TipoConexionBascula = "bluetooth" | "serial" | "simulador" | "ninguna";
export type EstadoConexionBascula = "desconectado" | "conectando" | "conectado" | "error";

export interface LecturaBascula {
  peso: number;
  estable: boolean;
  unidad: "kg" | "lb";
  tara: boolean;
  timestamp: number;
  tramaOriginal: string;
}

export interface ConfiguracionBascula {
  baudRate: number;
  sensibilidadEstabilidad: number; // Variacion en kg considerada estable (ej. 0.5)
}

// UUIDs estandar para balanzas ganaderas y adaptadores RS232-Bluetooth (Tru-Test, Gallagher, Torrey, HC-05)
const BLUETOOTH_SERVICES = [
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART
  "0000ffe0-0000-1000-8000-00805f9b34fb", // CC2540 / HM-10 / HC-08
  "000018f0-0000-1000-8000-00805f9b34fb", // Servicio de balanzas genericas
];

const BLUETOOTH_CHARACTERISTICS = [
  "6e400003-b5a3-f393-e0a9-e50e24dcca9e", // Nordic TX Notify
  "0000ffe1-0000-1000-8000-00805f9b34fb", // HM-10 Notify
];

class BasculaGanaderaService {
  private bluetoothDevice: any = null;
  private serialPort: any = null;
  private serialReader: any = null;
  private simuladorInterval: any = null;
  private tipoActual: TipoConexionBascula = "ninguna";
  private estadoActual: EstadoConexionBascula = "desconectado";

  private bufferTexto = "";
  private ultimoPeso = 0;
  private lecturasRecientes: number[] = [];

  // Callbacks
  private onLecturaCallback: ((lectura: LecturaBascula) => void) | null = null;
  private onEstadoCallback: ((estado: EstadoConexionBascula, mensaje?: string) => void) | null = null;

  public soportaBluetooth(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  public soportaSerial(): boolean {
    return typeof navigator !== "undefined" && "serial" in (navigator as any);
  }

  public getEstado(): EstadoConexionBascula {
    return this.estadoActual;
  }

  public getTipoConexion(): TipoConexionBascula {
    return this.tipoActual;
  }

  private setEstado(estado: EstadoConexionBascula, mensaje?: string) {
    this.estadoActual = estado;
    if (this.onEstadoCallback) {
      this.onEstadoCallback(estado, mensaje);
    }
  }

  // Parser universal de tramas ASCII de indicadores de pesaje (Tru-Test, Gallagher, Torrey, Rhino)
  public parsearTrama(trama: string): LecturaBascula | null {
    const limpia = trama.trim();
    if (!limpia) return null;

    let estable = false;
    let peso = 0;
    let unidad: "kg" | "lb" = "kg";
    let tara = limpia.toUpperCase().includes("TA") || limpia.toUpperCase().includes("NET");

    // Formato Tru-Test / Gallagher continuo: ST,GS,+  452.5 kg  o  US,GS,+  449.0 kg
    if (limpia.startsWith("ST") || limpia.includes("STABLE") || limpia.includes("ESTABLE")) {
      estable = true;
    } else if (limpia.startsWith("US") || limpia.includes("MOTION")) {
      estable = false;
    }

    if (limpia.toLowerCase().includes("lb")) {
      unidad = "lb";
    }

    // Extraccion de digitos y punto decimal
    const coincidencia = limpia.match(/[-+]?\s*(\d+(?:\.\d+)?)/);
    if (coincidencia && coincidencia[1]) {
      peso = parseFloat(coincidencia[1]);
    } else {
      return null;
    }

    // Evaluacion de estabilidad por ventana movil si la trama no trae bandera ST/US explicita
    if (!limpia.startsWith("ST") && !limpia.startsWith("US")) {
      this.lecturasRecientes.push(peso);
      if (this.lecturasRecientes.length > 5) {
        this.lecturasRecientes.shift();
      }
      if (this.lecturasRecientes.length >= 4) {
        const min = Math.min(...this.lecturasRecientes);
        const max = Math.max(...this.lecturasRecientes);
        // Si en las ultimas 4 lecturas la variacion es menor a 0.5kg, consideramos estable
        estable = (max - min) <= 0.5 && peso > 5;
      }
    }

    return {
      peso,
      estable,
      unidad,
      tara,
      timestamp: Date.now(),
      tramaOriginal: limpia,
    };
  }

  // Conexion via Web Bluetooth
  public async conectarBluetooth(
    onLectura: (lectura: LecturaBascula) => void,
    onEstado: (estado: EstadoConexionBascula, mensaje?: string) => void
  ): Promise<boolean> {
    this.desconectar();
    this.onLecturaCallback = onLectura;
    this.onEstadoCallback = onEstado;

    if (!this.soportaBluetooth()) {
      this.setEstado("error", "Este navegador no soporta Web Bluetooth. Use Google Chrome o Microsoft Edge.");
      return false;
    }

    try {
      this.setEstado("conectando", "Buscando balanza ganadera Bluetooth...");
      const nav: any = navigator;

      this.bluetoothDevice = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLUETOOTH_SERVICES,
      });

      if (!this.bluetoothDevice) {
        this.setEstado("desconectado", "Conexion cancelada.");
        return false;
      }

      this.bluetoothDevice.addEventListener("gattserverdisconnected", () => {
        this.setEstado("desconectado", "Balanza desconectada.");
      });

      const server = await this.bluetoothDevice.gatt.connect();
      let characteristicEncontrada: any = null;

      for (const serviceUuid of BLUETOOTH_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          for (const charUuid of BLUETOOTH_CHARACTERISTICS) {
            try {
              const char = await service.getCharacteristic(charUuid);
              characteristicEncontrada = char;
              break;
            } catch {
              // Probar siguiente caracteristica
            }
          }
          if (characteristicEncontrada) break;
        } catch {
          // Probar siguiente servicio
        }
      }

      if (!characteristicEncontrada) {
        throw new Error("No se encontro canal serial GATT de pesaje compatible en el dispositivo.");
      }

      await characteristicEncontrada.startNotifications();
      characteristicEncontrada.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = event.target.value;
        const decoder = new TextDecoder("utf-8");
        const chunk = decoder.decode(value);
        this.procesarChunkSerial(chunk);
      });

      this.tipoActual = "bluetooth";
      this.setEstado("conectado", `Balanza conectada: ${this.bluetoothDevice.name || "Indicador Ganadero"}`);
      return true;
    } catch (e: any) {
      this.setEstado("error", e.message || "Fallo al conectar Bluetooth.");
      return false;
    }
  }

  // Conexion via Cable USB / Puerto Serie RS232 (Web Serial API)
  public async conectarSerial(
    baudRate = 9600,
    onLectura: (lectura: LecturaBascula) => void,
    onEstado: (estado: EstadoConexionBascula, mensaje?: string) => void
  ): Promise<boolean> {
    this.desconectar();
    this.onLecturaCallback = onLectura;
    this.onEstadoCallback = onEstado;

    if (!this.soportaSerial()) {
      this.setEstado("error", "Este navegador no soporta Web Serial. Use Google Chrome o Microsoft Edge en PC/Laptop.");
      return false;
    }

    try {
      this.setEstado("conectando", "Seleccione el puerto serie COM de la balanza...");
      const nav: any = navigator;
      this.serialPort = await nav.serial.requestPort();

      await this.serialPort.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
      });

      this.tipoActual = "serial";
      this.setEstado("conectado", `Balanza conectada por cable USB/Serial (${baudRate} bps)`);

      this.leerFlujoSerial();
      return true;
    } catch (e: any) {
      this.setEstado("error", e.message || "Fallo al conectar puerto serial.");
      return false;
    }
  }

  private async leerFlujoSerial() {
    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      this.serialReader = reader;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          this.procesarChunkSerial(value);
        }
      }
    } catch {
      if (this.estadoActual === "conectado") {
        this.setEstado("desconectado", "Puerto serial cerrado o desconectado.");
      }
    }
  }

  private procesarChunkSerial(chunk: string) {
    this.bufferTexto += chunk;
    const lineas = this.bufferTexto.split(/\r?\n/);
    // Preservar la ultima linea incompleta en el buffer
    this.bufferTexto = lineas.pop() || "";

    for (const linea of lineas) {
      if (!linea.trim()) continue;
      const lectura = this.parsearTrama(linea);
      if (lectura && this.onLecturaCallback) {
        this.ultimoPeso = lectura.peso;
        this.onLecturaCallback(lectura);
      }
    }
  }

  // Simulador de Balanza Ganadera en Manga (Animal en movimiento estabilizandose)
  public iniciarSimulador(
    pesoObjetivo = 465.0,
    onLectura: (lectura: LecturaBascula) => void,
    onEstado: (estado: EstadoConexionBascula, mensaje?: string) => void
  ) {
    this.desconectar();
    this.onLecturaCallback = onLectura;
    this.onEstadoCallback = onEstado;

    this.tipoActual = "simulador";
    this.setEstado("conectado", "Simulador Digital de Manga Activo");

    let paso = 0;
    const totalPasos = 14;

    this.simuladorInterval = setInterval(() => {
      paso++;
      let pesoActual = 0;
      let estable = false;

      if (paso <= 3) {
        // Entrada del animal al brete (peso en subida rapida)
        pesoActual = (pesoObjetivo * 0.4) + (Math.random() * 40 - 20);
        estable = false;
      } else if (paso <= 9) {
        // Animal pateando o moviendose en la balanza
        const oscilacion = (Math.random() * 12 - 6);
        pesoActual = pesoObjetivo + oscilacion;
        estable = false;
      } else {
        // Balanza estabilizada: variacion minima menor a 0.2 kg
        const jitter = (Math.random() * 0.4 - 0.2);
        pesoActual = pesoObjetivo + jitter;
        estable = true;
      }

      const lectura: LecturaBascula = {
        peso: Math.round(pesoActual * 10) / 10,
        estable,
        unidad: "kg",
        tara: false,
        timestamp: Date.now(),
        tramaOriginal: `${estable ? "ST" : "US"},GS,+${pesoActual.toFixed(1)} kg`,
      };

      if (this.onLecturaCallback) {
        this.onLecturaCallback(lectura);
      }
    }, 350);
  }

  public desconectar() {
    if (this.simuladorInterval) {
      clearInterval(this.simuladorInterval);
      this.simuladorInterval = null;
    }

    if (this.serialReader) {
      try {
        this.serialReader.cancel();
      } catch {}
      this.serialReader = null;
    }

    if (this.serialPort) {
      try {
        this.serialPort.close();
      } catch {}
      this.serialPort = null;
    }

    if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch {}
    }
    this.bluetoothDevice = null;

    this.tipoActual = "ninguna";
    this.setEstado("desconectado");
    this.bufferTexto = "";
    this.lecturasRecientes = [];
  }
}

export const basculaGanaderaService = new BasculaGanaderaService();
