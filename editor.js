const fileInput = document.querySelector("input");
const resetFilterButton = document.querySelector("#reset");
const jsGrayscaleButton = document.querySelector("#grayscale-js");
const wasmGrayscaleButton = document.querySelector("#grayscale-wasm");
const performanceDisplay = document.querySelector("#performance");
const logsContainer = document.querySelector("#logs");
const clearLogsButton = document.querySelector("#clear-logs");

let originalImageSrc = document.getElementById("image").src;

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const image = document.getElementById("image");
  image.title = file.name;

  const reader = new FileReader();

  reader.onload = (event) => {
    image.src = event.target.result;
    originalImageSrc = event.target.result;
  };

  reader.readAsDataURL(file);
});

resetFilterButton.addEventListener("click", () => {
  const image = document.getElementById("image");
  image.src = originalImageSrc;
  logMessage("Image reset to original.");
});

function imageToCanvas(image) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0);
  return { canvas, context };
}

function applyGrayscaleFilterJS(canvas, context) {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const startTime = performance.now();

  for (let i = 0, n = pixels.length; i < n; i += 4) {
    if (i + 3 < n) {
      const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      pixels[i] = avg;
      pixels[i + 1] = avg;
      pixels[i + 2] = avg;
    }
  }

  const endTime = performance.now();

  logMessage(`JS Grayscale: ${(endTime - startTime).toFixed(2)}ms.`);

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg");
}

jsGrayscaleButton.addEventListener("click", () => {
  const image = document.getElementById("image");
  const { canvas, context } = imageToCanvas(image);
  const base64 = applyGrayscaleFilterJS(canvas, context);
  image.src = base64;
});

function logMessage(message) {
  const logEntry = document.createElement("p");
  logEntry.textContent = message;
  logsContainer.appendChild(logEntry);
}

clearLogsButton.addEventListener("click", () => {
  logsContainer.innerHTML = "";
});

async function applyGrayscaleFilterWasm() {
  const imageElement = document.getElementById("image");
  const { canvas, context } = imageToCanvas(imageElement);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("./editor/target/wasm32-unknown-unknown/release/editor.wasm")
  );

  const { memory, allocate, deallocate, grayscaleFilter } = instance.exports;

  const imageBytes = new Uint8Array(imageData.data.buffer);
  const wasmPtr = allocate(imageBytes.length);
  const wasmArray = new Uint8ClampedArray(
    memory.buffer,
    wasmPtr,
    imageBytes.length
  );
  wasmArray.set(imageBytes);

  const startTime = performance.now();
  grayscaleFilter(wasmPtr, imageBytes.length);
  const endTime = performance.now();
  logMessage(`WASM Grayscale: ${(endTime - startTime).toFixed(2)}ms.`);

  imageData.data.set(wasmArray);
  context.putImageData(imageData, 0, 0);
  imageElement.src = canvas.toDataURL("image/jpeg");

  deallocate(wasmPtr, imageBytes.length);
}

wasmGrayscaleButton.addEventListener("click", applyGrayscaleFilterWasm);
