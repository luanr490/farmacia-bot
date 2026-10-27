function cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, "");
}

function weightedSum(digits: number[], initialWeight: number): number {

    let sum = 0;
    let weight = initialWeight;

    for (const digit of digits) {
        sum += digit * weight;
        weight--;
    }
    return sum;
}

function calculateCheckDigit(digits: number[], initialWeight: number): number {

    const sum = weightedSum(digits, initialWeight);

    const remainder = sum % 11;

    let digit: number;

    if (remainder < 2) {
        digit = 0;
    } else {
        digit = 11 - remainder;
    }

    return digit;
}

export function validateCpf(rawCpf: string): boolean {

    const cpf = cleanCpf(rawCpf);

    if (cpf.length !== 11){
        return false;
    }

    if (new Set(cpf).size === 1 ){
        return false;
    }

    const allDigits = cpf.split("").map(char => Number(char));

    const firstNine = allDigits.slice(0, 9);

    const calculatedFirstDigit = calculateCheckDigit(firstNine, 10);

    const tenDigits = firstNine.concat(calculatedFirstDigit);

    const calculateSecondDigit = calculateCheckDigit(tenDigits, 11);

    if (calculatedFirstDigit === Number(cpf[9]) && calculateSecondDigit === Number(cpf[10])){
        return true
    } else {
        return false;
    }
}
