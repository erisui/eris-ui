const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: number) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
export const dim = c(2);
export const green = c(32);
export const yellow = c(33);
export const red = c(31);
export const bold = c(1);

export const log = {
  step: (s: string) => console.log(`${green("•")} ${s}`),
  info: (s: string) => console.log(`  ${dim(s)}`),
  warn: (s: string) => console.log(`${yellow("!")} ${s}`),
  error: (s: string) => console.error(`${red("✕")} ${s}`),
};
