let Palettes;
let maxIterations = 1000;
let colours;
let imageData;
let canvas, ctx;
let butchSize = 30000;
let drawI = 0;
let zoom = 1;
let pos = [-0.75, 0];
var forceRefresh = false;
var readyForInputs = false;
let downloadBtn;
var renderType = 1;
var clearCanvas = true;
var inputData = [true, 0];
var mouseDown = false
var lastRenderType = 0;


document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    imageData = ctx.createImageData(canvas.width, canvas.height);
    downloadBtn = document.getElementById("download-btn");
    canvasRect = canvas.getBoundingClientRect();

    initEventListeners();

    fetch("/assets/palettes.json")
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then((data) => {
            console.log("JSON data:", data);
            Palettes = data;
            startMainScript(data);
        })
        .catch((error) => {
            console.error("Error fetching JSON:", error);
        });
});

function initEventListeners() {
    document.addEventListener('mousedown', () => {
        mouseDown = true;
    });

    document.addEventListener('mouseup', () => {
        mouseDown = false;
    });
}

function startMainScript() {
    createPaletteButtons();
    generateColours(Palettes[0]);
    console.log(colours);
    requestAnimationFrame(draw);
}

function getRGBfromInt(c) {
    r = Math.floor(c / (256 * 256));
    g = Math.floor((c - 256 * 256 * r) / 256);
    b = c % 256;
    return [r, g, b];
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function generateColours(palette) {
    cc = [];
    for (let i = 0; i < palette["colours"].length; i++) {
        cc.push(getRGBfromInt(palette["colours"][i]));
    }
    cc.push(cc[0]);
    console.log(JSON.stringify(cc));
    colours = [];
    let temp = 0;
    let interpolationSize = palette["interpolation"];
    while (colours.length < maxIterations) {
        let j = temp % interpolationSize;
        let i = Math.floor(temp / interpolationSize) % (cc.length - 1);
        let cr = Math.round(lerp(cc[i][0], cc[i + 1][0], j / interpolationSize));
        let cg = Math.round(lerp(cc[i][1], cc[i + 1][1], j / interpolationSize));
        let cb = Math.round(lerp(cc[i][2], cc[i + 1][2], j / interpolationSize));
        colours.push([cr, cg, cb]);
        temp += 1;
    }
    colours.push([0, 0, 0]);
}

function createPaletteButtons() {
    const palettesDiv = document.querySelector(".palettes");
    let o = 0;
    Palettes.forEach((palette) => {
        const button = document.createElement("button");
        button.textContent = palette["title"];
        button.id = palette["id"];
        button.classList.add("palette-button");
        if (o == 0) {
            button.style.backgroundColor = "#30f090";
        }
        button.addEventListener("click", function () {
            resetCanvas();
            for (let i = 0; i < Palettes.length; i++) {
                const btn = document.getElementById(Palettes[i]["id"]);
                if (btn.id == button.id) {
                    btn.style.backgroundColor = "#30f090";
                    generateColours(Palettes[i]);
                } else {
                    btn.style.backgroundColor = "#007bff";
                }
            }
        });
        o += 1;
        palettesDiv.appendChild(button);
    });
}

function resetCanvas() {
    forceRefresh = true;
    clearCanvas = true;
}

function draw() {
    const res = [imageData.width, imageData.height];
    const prod = res[0] * res[1];
    const curTime = Date.now();
    //console.log(inputData[0], !inputData[0], (curTime-inputData[1] > 2000), curTime-inputData[1]);
    if (forceRefresh || drawI < res[0] * res[1] || lastRenderType == 0) {
        

        if (forceRefresh) {
            drawI = 0;
            if (clearCanvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                imageData = ctx.createImageData(canvas.width, canvas.height);
            }
            forceRefresh = false;
        }

        const outSize = [6 / zoom, (6 * res[1]) / (zoom * res[0])];
        if (inputData[0] || (!inputData[0] && (curTime - inputData[1] > 2000))) {
            renderType = 1;
            inputData[0] = true;
        } else {
            renderType = 0;
            inputData[0] = false;
        }

        if (renderType == 1) {
            lastRenderType = 1;
            downloadBtn.disabled = true;
            readyForInputs = false;
            downloadBtn.textContent = `${Math.round(10000 * drawI / prod) / 100}%`;
            for (let i = 0; i < butchSize; i++) {
                let temp = (i + drawI) % prod;
                if (temp >= prod) {
                    break;
                }
                let ix = Math.floor(temp / res[1]);
                let iy = temp % res[1];

                let x = outSize[0] * (ix / (res[0] - 1)) - outSize[0] / 2 + pos[0];
                let y = outSize[1] / 2 - (outSize[1] * iy) / (res[1] - 1) + pos[1];

                let x0 = x;
                let y0 = y;
                let x2 = 0;
                let y2 = 0;
                let j = 0;

                while (j < maxIterations && x2 + y2 < 4) {
                    x2 = x * x;
                    y2 = y * y;
                    y = 2 * x * y + y0;
                    x = x2 - y2 + x0;
                    j += 1;
                }
                setPixel(ix, iy, colours[j]);
            }

            ctx.putImageData(imageData, 0, 0);
            drawI += butchSize;
        } else {
            lastRenderType = 0;
            downloadBtn.disabled = true;
            readyForInputs = false;
            downloadBtn.textContent = `Wait...`;
            const pixSize = 30;
            for (let ix = 0; ix < res[0] / pixSize; ix++) {
                for (let iy = 0; iy < res[1] / pixSize; iy++) {
                    let x = outSize[0] * ((ix + 0.5) * pixSize / (res[0] - 1)) - outSize[0] / 2 + pos[0];
                    let y = outSize[1] / 2 - (outSize[1] * (iy + 0.5) * pixSize) / (res[1] - 1) + pos[1];

                    let x0 = x;
                    let y0 = y;
                    let x2 = 0;
                    let y2 = 0;
                    let j = 0;

                    while (j < maxIterations && x2 + y2 < 4) {
                        x2 = x * x;
                        y2 = y * y;
                        y = 2 * x * y + y0;
                        x = x2 - y2 + x0;
                        j += 1;
                    }
                    drawFilledRectangle(ix * pixSize, iy * pixSize, pixSize, pixSize, colours[j])
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    } else {
        downloadBtn.disabled = false;
        downloadBtn.textContent = "Download"
        readyForInputs = true;
    }
    requestAnimationFrame(draw);
}

function setPixel(x, y, rgb) {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = rgb[0];
    imageData.data[index + 1] = rgb[1];
    imageData.data[index + 2] = rgb[2];
    imageData.data[index + 3] = 255;
}

function downloadImg() {
    const dataUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = 'MandelbrotSet.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function drawFilledRectangle(startX, startY, width, height, rgb) {
    let w, h;
    w = imageData.width;
    h = imageData.height;

    for (let i = startY; i < startY + height; i++) {
        if (i>h-1) {
            break;
        }
        for (let j = startX; j < startX + width; j++) {
            if (j>w-1) {
                break;
            }
            const index = (i * w + j) * 4;
            imageData.data[index] = rgb[0];
            imageData.data[index + 1] = rgb[1];
            imageData.data[index + 2] = rgb[2];
            imageData.data[index + 3] = 255;
        }
    }
}

function zoomIn() {
    clearCanvas = false;
    forceRefresh = true;
    zoom *= 1.1;
    inputData = [false, Date.now()];
}

function zoomOut() {
    clearCanvas = false;
    forceRefresh = true;
    zoom /= 1.1;
    inputData = [false, Date.now()];
}

function moveLeft() {
    clearCanvas = false;
    forceRefresh = true;
    pos[0] -= 0.1 / zoom;
    inputData = [false, Date.now()];
}

function moveRight() {
    clearCanvas = false;
    forceRefresh = true;
    pos[0] += 0.1 / zoom;
    inputData = [false, Date.now()];
}

function moveTop() {
    clearCanvas = false;
    forceRefresh = true;
    pos[1] += 0.1 / zoom;
    inputData = [false, Date.now()];
}

function moveBottom() {
    clearCanvas = false;
    forceRefresh = true;
    pos[1] -= 0.1 / zoom;
    inputData = [false, Date.now()];
}