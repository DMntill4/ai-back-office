import { theme } from "./theme";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
  const isInteractive = Boolean(process.stdout.isTTY && !process.env.CI);

  if (!isInteractive) {
    console.log(theme.dim(`... ${message}`));
    return await fn();
  }

  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${theme.mintBold(frames[i++ % frames.length])} ${theme.muted(message)} `);
  }, 80);

  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r${theme.success("[OK]")} ${theme.bold(message)}\n`);
    return result;
  } catch (err) {
    clearInterval(interval);
    process.stdout.write(`\r${theme.danger("[ERROR]")} ${theme.redBold(message)}\n`);
    throw err;
  }
}
