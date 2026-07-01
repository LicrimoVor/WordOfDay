const QR_VERSION = 5;
const QR_SIZE = 17 + QR_VERSION * 4;
const DATA_CODEWORDS = 108;
const ECC_CODEWORDS = 26;
const ALIGNMENT_POSITIONS = [6, 30];

const gfExp: number[] = [];
const gfLog: number[] = Array(256).fill(0);

let value = 1;
for (let i = 0; i < 255; i += 1) {
    gfExp[i] = value;
    gfLog[value] = i;
    value <<= 1;
    if (value & 0x100) {
        value ^= 0x11d;
    }
}
for (let i = 255; i < 512; i += 1) {
    gfExp[i] = gfExp[i - 255];
}

function gfMultiply(left: number, right: number) {
    if (left === 0 || right === 0) {
        return 0;
    }

    return gfExp[gfLog[left] + gfLog[right]];
}

function polynomialMultiply(left: number[], right: number[]) {
    const result = Array(left.length + right.length - 1).fill(0);

    for (let i = 0; i < left.length; i += 1) {
        for (let j = 0; j < right.length; j += 1) {
            result[i + j] ^= gfMultiply(left[i], right[j]);
        }
    }

    return result;
}

function createGeneratorPolynomial(degree: number) {
    let result = [1];

    for (let i = 0; i < degree; i += 1) {
        result = polynomialMultiply(result, [1, gfExp[i]]);
    }

    return result;
}

function createErrorCorrection(data: number[]) {
    const generator = createGeneratorPolynomial(ECC_CODEWORDS);
    const result = [...data, ...Array(ECC_CODEWORDS).fill(0)];

    for (let i = 0; i < data.length; i += 1) {
        const factor = result[i];
        if (factor === 0) {
            continue;
        }

        for (let j = 0; j < generator.length; j += 1) {
            result[i + j] ^= gfMultiply(generator[j], factor);
        }
    }

    return result.slice(data.length);
}

class BitBuffer {
    bits: number[] = [];

    append(valueToAppend: number, length: number) {
        for (let i = length - 1; i >= 0; i -= 1) {
            this.bits.push((valueToAppend >>> i) & 1);
        }
    }

    appendBytes(bytes: number[]) {
        bytes.forEach((byte) => this.append(byte, 8));
    }

    toCodewords() {
        const result: number[] = [];
        for (let i = 0; i < this.bits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j += 1) {
                byte = (byte << 1) | (this.bits[i + j] || 0);
            }
            result.push(byte);
        }
        return result;
    }
}

function encodeData(valueToEncode: string) {
    const bytes = Array.from(new TextEncoder().encode(valueToEncode));
    if (bytes.length > 106) {
        throw new Error('QR content is too long');
    }

    const buffer = new BitBuffer();
    buffer.append(0b0100, 4);
    buffer.append(bytes.length, 8);
    buffer.appendBytes(bytes);

    const totalBits = DATA_CODEWORDS * 8;
    buffer.append(0, Math.min(4, totalBits - buffer.bits.length));
    while (buffer.bits.length % 8 !== 0) {
        buffer.append(0, 1);
    }

    const codewords = buffer.toCodewords();
    const pads = [0xec, 0x11];
    let padIndex = 0;
    while (codewords.length < DATA_CODEWORDS) {
        codewords.push(pads[padIndex % pads.length]);
        padIndex += 1;
    }

    return codewords;
}

function createMatrix() {
    return {
        modules: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false) as boolean[]),
        reserved: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false) as boolean[]),
    };
}

function setFunctionModule(
    modules: boolean[][],
    reserved: boolean[][],
    x: number,
    y: number,
    isDark: boolean,
) {
    if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) {
        return;
    }

    modules[y][x] = isDark;
    reserved[y][x] = true;
}

function drawFinder(modules: boolean[][], reserved: boolean[][], left: number, top: number) {
    for (let y = -1; y <= 7; y += 1) {
        for (let x = -1; x <= 7; x += 1) {
            const absoluteX = left + x;
            const absoluteY = top + y;
            const isInside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
            const isDark =
                isInside &&
                (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
            setFunctionModule(modules, reserved, absoluteX, absoluteY, isDark);
        }
    }
}

function drawAlignment(modules: boolean[][], reserved: boolean[][], centerX: number, centerY: number) {
    for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) {
            const distance = Math.max(Math.abs(x), Math.abs(y));
            setFunctionModule(modules, reserved, centerX + x, centerY + y, distance === 2 || distance === 0);
        }
    }
}

function drawFunctionPatterns(modules: boolean[][], reserved: boolean[][]) {
    drawFinder(modules, reserved, 0, 0);
    drawFinder(modules, reserved, QR_SIZE - 7, 0);
    drawFinder(modules, reserved, 0, QR_SIZE - 7);

    for (let i = 8; i < QR_SIZE - 8; i += 1) {
        setFunctionModule(modules, reserved, i, 6, i % 2 === 0);
        setFunctionModule(modules, reserved, 6, i, i % 2 === 0);
    }

    ALIGNMENT_POSITIONS.forEach((y) => {
        ALIGNMENT_POSITIONS.forEach((x) => {
            const overlapsFinder =
                (x === 6 && y === 6) || (x === 6 && y === QR_SIZE - 7) || (x === QR_SIZE - 7 && y === 6);
            if (!overlapsFinder) {
                drawAlignment(modules, reserved, x, y);
            }
        });
    });

    for (let i = 0; i <= 8; i += 1) {
        if (i !== 6) {
            setFunctionModule(modules, reserved, 8, i, false);
            setFunctionModule(modules, reserved, i, 8, false);
        }
    }
    for (let i = 0; i < 8; i += 1) {
        setFunctionModule(modules, reserved, QR_SIZE - 1 - i, 8, false);
        setFunctionModule(modules, reserved, 8, QR_SIZE - 1 - i, false);
    }
    setFunctionModule(modules, reserved, 8, QR_SIZE - 8, true);
}

function getFormatBits(mask: number) {
    const errorCorrectionLow = 1;
    const formatData = (errorCorrectionLow << 3) | mask;
    let bits = formatData << 10;
    const generator = 0x537;

    for (let i = 14; i >= 10; i -= 1) {
        if (((bits >>> i) & 1) !== 0) {
            bits ^= generator << (i - 10);
        }
    }

    return ((formatData << 10) | bits) ^ 0x5412;
}

function drawFormatBits(modules: boolean[][], reserved: boolean[][], mask: number) {
    const bits = getFormatBits(mask);
    const bit = (index: number) => ((bits >>> index) & 1) !== 0;

    for (let i = 0; i <= 5; i += 1) {
        setFunctionModule(modules, reserved, 8, i, bit(i));
    }
    setFunctionModule(modules, reserved, 8, 7, bit(6));
    setFunctionModule(modules, reserved, 8, 8, bit(7));
    setFunctionModule(modules, reserved, 7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) {
        setFunctionModule(modules, reserved, 14 - i, 8, bit(i));
    }

    for (let i = 0; i < 8; i += 1) {
        setFunctionModule(modules, reserved, QR_SIZE - 1 - i, 8, bit(i));
    }
    for (let i = 8; i < 15; i += 1) {
        setFunctionModule(modules, reserved, 8, QR_SIZE - 15 + i, bit(i));
    }
    setFunctionModule(modules, reserved, 8, QR_SIZE - 8, true);
}

function shouldMask(x: number, y: number) {
    return (x + y) % 2 === 0;
}

function drawCodewords(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
    const bits = codewords.flatMap((codeword) =>
        Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1),
    );
    let bitIndex = 0;
    let upward = true;

    for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
        if (right === 6) {
            right -= 1;
        }

        for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
            const y = upward ? QR_SIZE - 1 - vertical : vertical;
            for (let x = right; x >= right - 1; x -= 1) {
                if (reserved[y][x]) {
                    continue;
                }

                const bit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
                modules[y][x] = shouldMask(x, y) ? !bit : bit;
                bitIndex += 1;
            }
        }

        upward = !upward;
    }
}

export function createQrMatrix(content: string) {
    const data = encodeData(content);
    const codewords = [...data, ...createErrorCorrection(data)];
    const { modules, reserved } = createMatrix();

    drawFunctionPatterns(modules, reserved);
    drawCodewords(modules, reserved, codewords);
    drawFormatBits(modules, reserved, 0);

    return modules;
}
