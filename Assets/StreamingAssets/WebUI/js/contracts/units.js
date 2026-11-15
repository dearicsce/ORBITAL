const checked = value => {
  if (!Number.isFinite(value)) throw new Error('Unit conversion requires a finite number.');
  return value;
};
export const whToJ = n => checked(checked(n) * 3600);
export const jToWh = n => checked(n) / 3600;
export const gbToBits = n => checked(checked(n) * 8e9);
export const bitsToGb = n => checked(n) / 8e9;
export const gbDayToBitSec = n => gbToBits(n) / 86400;
export const bitSecToGbDay = n => bitsToGb(n * 86400);
export const celsiusToKelvin = n => checked(n) + 273.15;
export const kelvinToCelsius = n => checked(n) - 273.15;
export const degreesToRadians = n => checked(checked(n) * Math.PI / 180);
export const radiansToDegrees = n => checked(checked(n) * 180 / Math.PI);
